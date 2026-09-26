const fs = require('fs');
const path = require('path');
const { getPool, sql } = require('../src/config/db');

async function exportFullDb() {
    try {
        const pool = await getPool();
        console.log('Connected to SQL Server for exporting...');

        const tables = [
            'Users', 'Categories', 'Products', 'ProductImages', 'UserAddresses',
            'Carts', 'CartItems', 'Coupons', 'Orders', 'OrderItems',
            'ProductReviews', 'UserFavorites', 'Notifications', 'Conversations', 'Messages'
        ];

        let sqlDump = '-- =============================================\n';
        sqlDump += '-- MOCCOON E-COMMERCE DATABASE FULL EXPORT\n';
        sqlDump += '-- Generated at: ' + new Date().toISOString() + '\n';
        sqlDump += '-- =============================================\n\n';
        sqlDump += 'IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = \'MoccoonDB\')\n';
        sqlDump += 'BEGIN\n    CREATE DATABASE MoccoonDB;\nEND\nGO\n\nUSE MoccoonDB;\nGO\n\n';

        const initDbPath = path.join(__dirname, '../../database/init_db.sql');
        if (fs.existsSync(initDbPath)) {
            sqlDump += '-- 1. CẤU TRÚC BẢNG VÀ RÀNG BUỘC BAN ĐẦU\n';
            sqlDump += fs.readFileSync(initDbPath, 'utf8') + '\nGO\n\n';
        }

        // Đảm bảo có bảng Coupons nếu init_db.sql chưa cập nhật
        sqlDump += `
-- Đảm bảo cấu trúc Coupons
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Coupons')
BEGIN
    CREATE TABLE Coupons (
        id INT IDENTITY(1,1) PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        title NVARCHAR(255) NOT NULL,
        description NVARCHAR(500) NULL,
        discount_type VARCHAR(20) NOT NULL DEFAULT 'PERCENT',
        discount_value DECIMAL(18,2) NOT NULL,
        max_discount_amount DECIMAL(18,2) NULL,
        min_order_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
        usage_limit INT NOT NULL DEFAULT 100,
        times_used INT NOT NULL DEFAULT 0,
        start_date DATETIME NULL,
        end_date DATETIME NULL,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NOT NULL DEFAULT GETDATE()
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Orders') AND name = 'coupon_code')
BEGIN
    ALTER TABLE Orders ADD coupon_code VARCHAR(50) NULL;
END
GO
`;

        sqlDump += '\n-- 2. DỮ LIỆU HIỆN TẠI TRONG CƠ SỞ DỮ LIỆU\n';

        for (const t of tables) {
            try {
                const res = await pool.request().query('SELECT * FROM ' + t);
                const rows = res.recordset;
                if (rows.length > 0) {
                    sqlDump += `-- Data for ${t} (${rows.length} rows)\n`;
                    sqlDump += `SET IDENTITY_INSERT ${t} ON;\n`;
                    for (const row of rows) {
                        const cols = Object.keys(row);
                        const colNames = cols.join(', ');
                        const valStrings = cols.map(c => {
                            const val = row[c];
                            if (val === null || val === undefined) return 'NULL';
                            if (typeof val === 'boolean') return val ? 1 : 0;
                            if (typeof val === 'number') return val;
                            if (val instanceof Date) {
                                return "'" + val.toISOString().slice(0, 19).replace('T', ' ') + "'";
                            }
                            const strVal = String(val).replace(/'/g, "''");
                            return "N'" + strVal + "'";
                        });
                        sqlDump += `IF NOT EXISTS (SELECT 1 FROM ${t} WHERE id = ${row.id || 0}) `;
                        sqlDump += `INSERT INTO ${t} (${colNames}) VALUES (${valStrings.join(', ')});\n`;
                    }
                    sqlDump += `SET IDENTITY_INSERT ${t} OFF;\nGO\n\n`;
                }
            } catch (err) {
                console.warn(`Table ${t} warning:`, err.message);
            }
        }

        const outputPath = path.join(__dirname, '../../database/MoccoonDB_Full_Export.sql');
        fs.writeFileSync(outputPath, sqlDump, 'utf8');
        console.log(`✓ Successfully exported to ${outputPath} (${sqlDump.length} bytes)!`);
        process.exit(0);
    } catch (e) {
        console.error('Export failed:', e);
        process.exit(1);
    }
}

exportFullDb();
