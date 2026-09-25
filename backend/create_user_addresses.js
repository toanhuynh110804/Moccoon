const { getPool, sql } = require('./src/config/db');

async function migrate() {
    try {
        const pool = await getPool();
        
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'UserAddresses')
            BEGIN
                CREATE TABLE dbo.UserAddresses (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    user_id INT NOT NULL,
                    recipient_name NVARCHAR(100) NULL,
                    phone NVARCHAR(20) NULL,
                    address_line NVARCHAR(255) NOT NULL,
                    label NVARCHAR(50) NULL DEFAULT N'Địa chỉ nhà',
                    is_default BIT NOT NULL DEFAULT 0,
                    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
                    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
                    CONSTRAINT FK_UserAddresses_User FOREIGN KEY (user_id) REFERENCES dbo.Users(id) ON DELETE CASCADE
                );
                CREATE INDEX IX_UserAddresses_UserId ON dbo.UserAddresses(user_id);

                -- Tự động đưa địa chỉ hiện có của người dùng vào làm địa chỉ mặc định đầu tiên
                INSERT INTO dbo.UserAddresses (user_id, recipient_name, phone, address_line, label, is_default)
                SELECT id, full_name, phone, address, N'Địa chỉ chính', 1
                FROM dbo.Users
                WHERE address IS NOT NULL AND LEN(address) > 0;
            END
        `);

        console.log('✓ Migration UserAddresses completed!');
        const check = await pool.request().query('SELECT * FROM dbo.UserAddresses');
        console.log('UserAddresses records:', check.recordset);
        process.exit(0);
    } catch (e) {
        console.error('Migration error:', e);
        process.exit(1);
    }
}

migrate();
