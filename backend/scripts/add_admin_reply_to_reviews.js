const { getPool } = require('../src/config/db');

async function run() {
    try {
        const pool = await getPool();
        const check = await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ProductReviews' AND COLUMN_NAME = 'admin_reply')
            BEGIN
                ALTER TABLE dbo.ProductReviews ADD 
                    admin_reply NVARCHAR(1000) NULL,
                    replied_at DATETIME2 NULL,
                    reply_by NVARCHAR(150) NULL;
                PRINT N'Đã thêm các cột admin_reply, replied_at, reply_by vào ProductReviews';
            END
            ELSE
            BEGIN
                PRINT N'Cột admin_reply đã tồn tại.';
            END
        `);
        console.log('Done migrating ProductReviews for admin reply.');
        process.exit(0);
    } catch (e) {
        console.error('Error migrating ProductReviews:', e);
        process.exit(1);
    }
}

run();
