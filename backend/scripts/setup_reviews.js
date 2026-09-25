const { getPool } = require('../src/config/db');

async function setup() {
    try {
        const pool = await getPool();
        console.log('--- BẮT ĐẦU CẤU HÌNH BẢNG ĐÁNH GIÁ SẢN PHẨM (PRODUCT REVIEWS) ---');

        await pool.request().query(`
            IF OBJECT_ID('dbo.ProductReviews', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.ProductReviews (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    product_id INT NOT NULL FOREIGN KEY REFERENCES dbo.Products(id) ON DELETE CASCADE,
                    user_id INT NOT NULL FOREIGN KEY REFERENCES dbo.Users(id) ON DELETE CASCADE,
                    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
                    comment NVARCHAR(MAX) NOT NULL,
                    image_url NVARCHAR(500) NULL,
                    is_active BIT NOT NULL DEFAULT 1,
                    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
                    updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
                );
                CREATE INDEX IX_ProductReviews_ProductId ON dbo.ProductReviews(product_id);
                CREATE INDEX IX_ProductReviews_UserId ON dbo.ProductReviews(user_id);
                PRINT N'Đã tạo bảng ProductReviews';
            END

            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UX_ProductReviews_Product_User' AND object_id = OBJECT_ID('dbo.ProductReviews'))
            BEGIN
                CREATE UNIQUE NONCLUSTERED INDEX UX_ProductReviews_Product_User 
                ON dbo.ProductReviews(product_id, user_id) 
                WHERE is_active = 1;
                PRINT N'Đã tạo Unique Index UX_ProductReviews_Product_User';
            END

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ProductReviews' AND COLUMN_NAME = 'is_anonymous')
            BEGIN
                ALTER TABLE dbo.ProductReviews ADD is_anonymous BIT NOT NULL DEFAULT 0;
                PRINT N'Đã thêm cột is_anonymous vào ProductReviews';
            END
        `);
        console.log('✓ Bảng ProductReviews, Unique Index và cột is_anonymous đã sẵn sàng.');

        console.log('--- HOÀN TẤT THIẾT LẬP BẢNG ĐÁNH GIÁ ---');
        process.exit(0);
    } catch (err) {
        console.error('Lỗi thiết lập:', err);
        process.exit(1);
    }
}

setup();
