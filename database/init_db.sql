-- ====================================================================
-- DỰ ÁN: ỨNG DỤNG THƯƠNG MẠI ĐIỆN TỬ & TƯ VẤN CHĂM SÓC DA MCCOON
-- DATABASE INITIALIZATION SCRIPT - SQL SERVER 2022
-- ====================================================================

USE master;
GO

-- 1. Tạo Database MoccoonDB nếu chưa có
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'MoccoonDB')
BEGIN
    CREATE DATABASE MoccoonDB;
    PRINT N'Đã tạo cơ sở dữ liệu MoccoonDB';
END
GO

-- 2. Tạo SQL Login moccoon_app nếu chưa có
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'moccoon_app')
BEGIN
    CREATE LOGIN moccoon_app WITH PASSWORD = 'Moccoon2026@Pass', CHECK_POLICY = OFF;
    PRINT N'Đã tạo login moccoon_app';
END
GO

USE MoccoonDB;
GO

-- 3. Tạo User trong MoccoonDB và gán quyền db_owner
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'moccoon_app')
BEGIN
    CREATE USER moccoon_app FOR LOGIN moccoon_app;
    ALTER ROLE db_owner ADD MEMBER moccoon_app;
    PRINT N'Đã gán quyền db_owner cho moccoon_app trên MoccoonDB';
END
GO

-- ====================================================================
-- TẠO CÁC BẢNG DỮ LIỆU
-- ====================================================================

-- 4. Bảng Users (Khách hàng & Quản trị viên)
IF OBJECT_ID('dbo.Users', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        full_name NVARCHAR(100) NOT NULL,
        email NVARCHAR(100) NULL,
        phone NVARCHAR(20) NULL,
        password_hash NVARCHAR(255) NOT NULL,
        role NVARCHAR(20) NOT NULL DEFAULT 'CUSTOMER', -- 'CUSTOMER', 'ADMIN', 'STAFF'
        avatar_url NVARCHAR(500) NULL,
        address NVARCHAR(255) NULL,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    CREATE UNIQUE NONCLUSTERED INDEX UX_Users_Email_NotNull ON dbo.Users(email) WHERE email IS NOT NULL;
    CREATE UNIQUE NONCLUSTERED INDEX UX_Users_Phone_NotNull ON dbo.Users(phone) WHERE phone IS NOT NULL;
    PRINT N'Đã tạo bảng Users';
END
GO

-- 5. Bảng Categories (Danh mục sản phẩm)
IF OBJECT_ID('dbo.Categories', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Categories (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description NVARCHAR(500) NULL,
        image_url NVARCHAR(500) NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    PRINT N'Đã tạo bảng Categories';
END
GO

-- 6. Bảng Products (Sản phẩm - Trọng tâm Bộ 3 làm sạch Moccoon)
IF OBJECT_ID('dbo.Products', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Products (
        id INT IDENTITY(1,1) PRIMARY KEY,
        category_id INT NOT NULL FOREIGN KEY REFERENCES dbo.Categories(id),
        name NVARCHAR(200) NOT NULL,
        slug VARCHAR(200) NOT NULL UNIQUE,
        price DECIMAL(18,2) NOT NULL,
        original_price DECIMAL(18,2) NULL,
        stock_quantity INT NOT NULL DEFAULT 0,
        volume NVARCHAR(50) NULL, -- Dung tích (VD: 500ml, 150ml, 100ml)
        skin_type NVARCHAR(100) NULL, -- Loại da phù hợp (VD: Mọi loại da, Da nhạy cảm)
        short_description NVARCHAR(500) NULL,
        description NVARCHAR(MAX) NULL,
        ingredients NVARCHAR(MAX) NULL, -- Thành phần
        benefits NVARCHAR(MAX) NULL, -- Công dụng
        usage_instructions NVARCHAR(MAX) NULL, -- Hướng dẫn sử dụng
        is_featured BIT NOT NULL DEFAULT 0, -- Sản phẩm chủ lực
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_Products_CategoryId ON dbo.Products(category_id);
    CREATE INDEX IX_Products_IsActive ON dbo.Products(is_active);
    PRINT N'Đã tạo bảng Products';
END
GO

-- 7. Bảng ProductImages (Ảnh chi tiết sản phẩm)
IF OBJECT_ID('dbo.ProductImages', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProductImages (
        id INT IDENTITY(1,1) PRIMARY KEY,
        product_id INT NOT NULL FOREIGN KEY REFERENCES dbo.Products(id) ON DELETE CASCADE,
        image_url NVARCHAR(500) NOT NULL,
        is_primary BIT NOT NULL DEFAULT 0,
        sort_order INT NOT NULL DEFAULT 0
    );
    PRINT N'Đã tạo bảng ProductImages';
END
GO

-- 8. Bảng Banners (Quản lý Banner Trang chủ)
IF OBJECT_ID('dbo.Banners', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Banners (
        id INT IDENTITY(1,1) PRIMARY KEY,
        title NVARCHAR(200) NOT NULL,
        subtitle NVARCHAR(300) NULL,
        image_url NVARCHAR(500) NOT NULL,
        link_url NVARCHAR(500) NULL,
        badge_text NVARCHAR(100) NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    PRINT N'Đã tạo bảng Banners';
END
GO

-- 9. Bảng Carts & CartItems (Giỏ hàng)
IF OBJECT_ID('dbo.Carts', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Carts (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL UNIQUE FOREIGN KEY REFERENCES dbo.Users(id) ON DELETE CASCADE,
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    PRINT N'Đã tạo bảng Carts';
END
GO

IF OBJECT_ID('dbo.CartItems', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.CartItems (
        id INT IDENTITY(1,1) PRIMARY KEY,
        cart_id INT NOT NULL FOREIGN KEY REFERENCES dbo.Carts(id) ON DELETE CASCADE,
        product_id INT NOT NULL FOREIGN KEY REFERENCES dbo.Products(id),
        quantity INT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT UQ_Cart_Product UNIQUE(cart_id, product_id)
    );
    PRINT N'Đã tạo bảng CartItems';
END
GO

-- 10. Bảng Orders & OrderItems (Đơn hàng & Thanh toán)
IF OBJECT_ID('dbo.Orders', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Orders (
        id INT IDENTITY(1,1) PRIMARY KEY,
        order_code VARCHAR(30) NOT NULL UNIQUE,
        user_id INT NOT NULL FOREIGN KEY REFERENCES dbo.Users(id),
        total_amount DECIMAL(18,2) NOT NULL,
        shipping_fee DECIMAL(18,2) NOT NULL DEFAULT 0,
        discount_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
        final_amount DECIMAL(18,2) NOT NULL,
        payment_method NVARCHAR(50) NOT NULL DEFAULT 'COD', -- 'COD', 'BANKING'
        payment_status NVARCHAR(50) NOT NULL DEFAULT 'UNPAID', -- 'UNPAID', 'PAID'
        order_status NVARCHAR(50) NOT NULL DEFAULT 'PENDING', 
        -- Trạng thái: 'PENDING' (Đang xử lý), 'PREPARING' (Đang chuẩn bị), 'SHIPPING' (Đang giao), 'DELIVERED' (Đã giao), 'CANCELLED' (Đã hủy)
        receiver_name NVARCHAR(100) NOT NULL,
        receiver_phone NVARCHAR(20) NOT NULL,
        shipping_address NVARCHAR(500) NOT NULL,
        note NVARCHAR(500) NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_Orders_UserId ON dbo.Orders(user_id);
    CREATE INDEX IX_Orders_Status ON dbo.Orders(order_status);
    CREATE INDEX IX_Orders_OrderCode ON dbo.Orders(order_code);
    PRINT N'Đã tạo bảng Orders';
END
GO

IF OBJECT_ID('dbo.OrderItems', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.OrderItems (
        id INT IDENTITY(1,1) PRIMARY KEY,
        order_id INT NOT NULL FOREIGN KEY REFERENCES dbo.Orders(id) ON DELETE CASCADE,
        product_id INT NOT NULL FOREIGN KEY REFERENCES dbo.Products(id),
        product_name NVARCHAR(200) NOT NULL,
        product_image NVARCHAR(500) NULL,
        price DECIMAL(18,2) NOT NULL,
        quantity INT NOT NULL,
        total_price DECIMAL(18,2) NOT NULL
    );
    PRINT N'Đã tạo bảng OrderItems';
END
GO

-- 11. Bảng ChatConversations & ChatMessages (Hệ thống Chat Tư vấn Skincare)
IF OBJECT_ID('dbo.ChatConversations', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ChatConversations (
        id INT IDENTITY(1,1) PRIMARY KEY,
        customer_id INT NOT NULL UNIQUE FOREIGN KEY REFERENCES dbo.Users(id) ON DELETE CASCADE,
        last_message NVARCHAR(1000) NULL,
        last_message_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        unread_customer_count INT NOT NULL DEFAULT 0,
        unread_admin_count INT NOT NULL DEFAULT 0,
        status NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    PRINT N'Đã tạo bảng ChatConversations';
END
GO

IF OBJECT_ID('dbo.ChatMessages', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ChatMessages (
        id INT IDENTITY(1,1) PRIMARY KEY,
        conversation_id INT NOT NULL FOREIGN KEY REFERENCES dbo.ChatConversations(id) ON DELETE CASCADE,
        sender_id INT NOT NULL FOREIGN KEY REFERENCES dbo.Users(id),
        sender_type VARCHAR(10) NOT NULL, -- 'CUSTOMER' hoặc 'ADMIN'
        message_text NVARCHAR(MAX) NOT NULL,
        image_url NVARCHAR(500) NULL,
        video_url NVARCHAR(500) NULL,
        is_read BIT NOT NULL DEFAULT 0,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_ChatMessages_ConversationId ON dbo.ChatMessages(conversation_id);
    PRINT N'Đã tạo bảng ChatMessages';
END
GO

-- 12. Bảng Notifications (Thông báo đẩy & trạng thái đơn hàng)
IF OBJECT_ID('dbo.Notifications', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Notifications (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL FOREIGN KEY REFERENCES dbo.Users(id) ON DELETE CASCADE,
        title NVARCHAR(200) NOT NULL,
        content NVARCHAR(1000) NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'ORDER', -- 'ORDER', 'PROMOTION', 'SYSTEM'
        reference_id NVARCHAR(100) NULL, -- e.g. order_code
        is_read BIT NOT NULL DEFAULT 0,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_Notifications_UserId ON dbo.Notifications(user_id);
    PRINT N'Đã tạo bảng Notifications';
END
GO

-- 13. Bảng ProductReviews (Đánh giá, bình luận và ảnh review từ khách hàng)
IF OBJECT_ID('dbo.ProductReviews', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProductReviews (
        id INT IDENTITY(1,1) PRIMARY KEY,
        product_id INT NOT NULL FOREIGN KEY REFERENCES dbo.Products(id) ON DELETE CASCADE,
        user_id INT NOT NULL FOREIGN KEY REFERENCES dbo.Users(id) ON DELETE CASCADE,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment NVARCHAR(MAX) NOT NULL,
        image_url NVARCHAR(500) NULL,
        is_anonymous BIT NOT NULL DEFAULT 0,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_ProductReviews_ProductId ON dbo.ProductReviews(product_id);
    CREATE INDEX IX_ProductReviews_UserId ON dbo.ProductReviews(user_id);
    CREATE UNIQUE NONCLUSTERED INDEX UX_ProductReviews_Product_User ON dbo.ProductReviews(product_id, user_id) WHERE is_active = 1;
    PRINT N'Đã tạo bảng ProductReviews';
END
GO

-- ====================================================================
-- DỮ LIỆU MẪU (SEED DATA)
-- ====================================================================

-- 13. Khởi tạo tài khoản Quản trị viên (Admin) & Khách hàng mẫu
-- Mật khẩu mặc định: 'Admin@123456' và 'User@123456'
-- bcrypt hash của 'Admin@123456': $2b$10$w8uQZ0rYFpUuJ1P7bE.fTu3j5f5tDkIq7Xb5dM0oMqm5b2kG6dEma
-- bcrypt hash của 'User@123456':  $2b$10$Q7y0r7vYJ3uVv7k6rG1E2.vV4U3hKq8vY5l3nM0oMqm5b2kG6dEma
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE email = 'admin@moccoon.vn')
BEGIN
    INSERT INTO dbo.Users (full_name, email, phone, password_hash, role, avatar_url, address, is_active)
    VALUES (
        N'Quản Trị Viên Moccoon', 
        'admin@moccoon.vn', 
        '0901234567', 
        '$2b$10$k1w1wHZZU5H8h.Hw3Y6/re7p76Mh0r9qL89K.P7mRjF5tK6a02Rz2', -- Mật khẩu: Admin@123456
        'ADMIN', 
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        N'Trụ sở Moccoon Skincare, TP. Hồ Chí Minh',
        1
    );
    PRINT N'Đã tạo tài khoản Quản trị viên admin@moccoon.vn';
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE email = 'khachhang@gmail.com')
BEGIN
    INSERT INTO dbo.Users (full_name, email, phone, password_hash, role, avatar_url, address, is_active)
    VALUES (
        N'Nguyễn Thị Mai Linh', 
        'khachhang@gmail.com', 
        '0912345678', 
        '$2b$10$k1w1wHZZU5H8h.Hw3Y6/re7p76Mh0r9qL89K.P7mRjF5tK6a02Rz2', -- Mật khẩu: Admin@123456
        'CUSTOMER', 
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        N'123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
        1
    );
    PRINT N'Đã tạo tài khoản Khách hàng mẫu khachhang@gmail.com';
END
GO

-- 14. Danh mục sản phẩm
IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE slug = 'nuoc-tay-trang')
BEGIN
    INSERT INTO dbo.Categories (name, slug, description, image_url, sort_order)
    VALUES 
    (N'Nước Tẩy Trang', 'nuoc-tay-trang', N'Làm sạch sâu lớp trang điểm, bụi bẩn và dầu thừa dịu nhẹ', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300', 1),
    (N'Sữa Rửa Mặt', 'sua-rua-mat', N'Rửa sạch bụi mịn, cân bằng độ pH tự nhiên cho làn da ẩm mượt', 'https://images.unsplash.com/photo-1556228722-d0b5be7490bf?w=300', 2),
    (N'Tẩy Tế Bào Chết', 'tay-te-bao-chet', N'Lấy đi tế bào già cỗi, thông thoáng lỗ chân lông, ngừa mụn', 'https://images.unsplash.com/photo-1608248597359-5f75e2e8e9ea?w=300', 3),
    (N'Bộ Combo Làm Sạch', 'combo-lam-sach', N'Trọn bộ 3 bước làm sạch da chuyên sâu Moccoon tối ưu hiệu quả và tiết kiệm', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300', 4);
    PRINT N'Đã khởi tạo danh mục sản phẩm';
END
GO

-- 15. Bộ 3 Sản Phẩm Làm Sạch Da Moccoon + Combo Trọn Bộ
DECLARE @CatTayTrang INT = (SELECT id FROM dbo.Categories WHERE slug = 'nuoc-tay-trang');
DECLARE @CatSuaRuaMat INT = (SELECT id FROM dbo.Categories WHERE slug = 'sua-rua-mat');
DECLARE @CatTayTBC INT = (SELECT id FROM dbo.Categories WHERE slug = 'tay-te-bao-chet');
DECLARE @CatCombo INT = (SELECT id FROM dbo.Categories WHERE slug = 'combo-lam-sach');

-- Sản phẩm 1: Nước tẩy trang
IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE slug = 'nuoc-tay-trang-moccoon-micellar-cleansing-water')
BEGIN
    INSERT INTO dbo.Products (
        category_id, name, slug, price, original_price, stock_quantity, volume, skin_type, 
        short_description, description, ingredients, benefits, usage_instructions, is_featured
    )
    VALUES (
        @CatTayTrang,
        N'Nước Tẩy Trang Dịu Nhẹ Làm Sạch Sâu Moccoon Pure Clean Micellar Water',
        'nuoc-tay-trang-moccoon-micellar-cleansing-water',
        289000, 350000, 150, N'500ml', N'Mọi loại da, kể cả da nhạy cảm & da mụn',
        N'Ứng dụng công nghệ Micellar hiện đại giúp hòa tan và cuốn trôi cặn trang điểm chống nước, bụi mịn PM 2.5 mà không gây khô rát.',
        N'Nước tẩy trang Moccoon Pure Clean Micellar Water là bước khởi đầu hoàn hảo cho chu trình chăm sóc da chuẩn chuyên gia. Công thức giàu khoáng chất kết hợp chiết xuất rau má lên men và cúc la mã giúp làm dịu tức thì làn da kích ứng, kháng viêm và duy trì độ ẩm tự nhiên cho da.',
        N'Nước khoáng tinh khiết, Chiết xuất Rau má Centella Asiatica, Chiết xuất Cúc La Mã, Glycerin, Sodium Hyaluronate, Panthenol (Vitamin B5), Allantoin, Citric Acid.',
        N'1. Cuốn trôi 99% bụi bẩn, dầu nhờn và lớp makeup cứng đầu.\n2. Cấp ẩm tức thì, không gây cảm giác nhờn dính hay cay mắt.\n3. Kháng viêm, làm dịu da nhạy cảm và hỗ trợ se khít lỗ chân lông.',
        N'Thấm một lượng vừa đủ ra bông tẩy trang. Lau nhẹ nhàng khắp mặt theo chiều từ dưới lên trên, từ trong ra ngoài. Đối với vùng mắt và môi, giữ miếng bông 5-10 giây trước khi lau nhẹ.',
        1
    );
END
GO

-- Sản phẩm 2: Sữa rửa mặt
DECLARE @CatSuaRuaMat INT = (SELECT id FROM dbo.Categories WHERE slug = 'sua-rua-mat');
IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE slug = 'sua-rua-mat-moccoon-gentle-foaming-cleanser')
BEGIN
    INSERT INTO dbo.Products (
        category_id, name, slug, price, original_price, stock_quantity, volume, skin_type, 
        short_description, description, ingredients, benefits, usage_instructions, is_featured
    )
    VALUES (
        @CatSuaRuaMat,
        N'Sữa Rửa Mặt Tạo Bọt Mịn Cân Bằng pH Moccoon Gentle Hydro Cleanser',
        'sua-rua-mat-moccoon-gentle-foaming-cleanser',
        245000, 290000, 180, N'150ml', N'Da thường, da dầu mụn, da hỗn hợp thiên dầu',
        N'Độ pH chuẩn 5.5 cùng bọt siêu mịn tơ tằm len lỏi sâu làm sạch dầu thừa trong lỗ chân lông mà vẫn bảo toàn lớp màng lipid bảo vệ da.',
        N'Sữa rửa mặt Moccoon Gentle Hydro Cleanser mang lại cảm giác sảng khoái, mịn màng sau mỗi lần sử dụng. Công thức chứa phức hợp Amino Acid và Ceramide NP củng cố hàng rào bảo vệ da, giúp da khỏe mạnh chống lại tác nhân ô nhiễm từ môi trường.',
        N'Cocamidopropyl Betaine, Potassium Cocoyl Glycinate, Chiết xuất Tràm trà (Tea Tree), Ceramide NP, Hyaluronic Acid thủy phân, Niacinamide (Vitamin B3), Vitamin E.',
        N'1. Làm sạch tận sâu lỗ chân lông, kiềm dầu thừa hiệu quả suốt 8 giờ.\n2. Duy trì độ pH sinh lý 5.5, da không bị khô căng sau khi rửa.\n3. Giảm khuẩn mụn và hỗ trợ làm sáng đều màu da.',
        N'Làm ướt da mặt với nước ấm. Lấy một lượng sữa rửa mặt bằng hạt đậu ra lòng bàn tay, tạo bọt kỹ rồi massage đều lên mặt theo chuyển động tròn trong 60 giây. Rửa sạch lại với nước mát và thấm khô.',
        1
    );
END
GO

-- Sản phẩm 3: Tẩy tế bào chết
DECLARE @CatTayTBC INT = (SELECT id FROM dbo.Categories WHERE slug = 'tay-te-bao-chet');
IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE slug = 'tay-te-bao-chet-moccoon-bio-peeling-gel')
BEGIN
    INSERT INTO dbo.Products (
        category_id, name, slug, price, original_price, stock_quantity, volume, skin_type, 
        short_description, description, ingredients, benefits, usage_instructions, is_featured
    )
    VALUES (
        @CatTayTBC,
        N'Gel Tẩy Tế Bào Chết Sinh Học Dịu Nhẹ Moccoon Gentle Peeling Gel',
        'tay-te-bao-chet-moccoon-bio-peeling-gel',
        265000, 310000, 120, N'100ml', N'Mọi loại da, da sần sùi, da xỉn màu thiếu sức sống',
        N'Cơ chế kết vón cellulose sinh học tự nhiên, nhẹ nhàng loại bỏ lớp sừng già cỗi mà không gây xước da hay bào mòn như các dạng hạt scrub thô.',
        N'Moccoon Gentle Peeling Gel kích thích tái tạo biểu bì da mới, mở đường cho các bước dưỡng serum và kem thẩm thấu tối đa. Chiết xuất đu đủ lên men tự nhiên giàu enzyme Papain kết hợp AHA thực vật làm tan rã tế bào sừng một cách dịu nhẹ.',
        N'Cellulose sinh học, Chiết xuất Đu đủ (Carica Papaya Enzyme), Chiết xuất Táo đỏ (AHA tự nhiên), Chiết xuất Lô hội (Aloe Vera), Trà xanh Camellia Sinensis, Collagen thủy phân.',
        N'1. Loại bỏ tế bào da chết và sợi bã nhờn sần sùi quanh cánh mũi.\n2. Cải thiện làn da sạm màu, giúp da sáng mịn và bắt sáng tức thì.\n3. Ngăn ngừa bít tắc lỗ chân lông gây mụn ẩn.',
        N'Sử dụng sau bước tẩy trang và rửa mặt. Lau khô mặt, lấy lượng gel vừa đủ thoa đều khắp mặt (tránh vùng mắt và môi). Massage nhẹ nhàng 1-2 phút cho đến khi xuất hiện các vón cục tế bào chết. Rửa sạch lại với nước ấm. Dùng 1-2 lần/tuần.',
        1
    );
END
GO

-- Sản phẩm 4: Combo trọn bộ 3 làm sạch Moccoon
DECLARE @CatCombo INT = (SELECT id FROM dbo.Categories WHERE slug = 'combo-lam-sach');
IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE slug = 'combo-bo-3-lam-sach-chuyen-sau-moccoon')
BEGIN
    INSERT INTO dbo.Products (
        category_id, name, slug, price, original_price, stock_quantity, volume, skin_type, 
        short_description, description, ingredients, benefits, usage_instructions, is_featured
    )
    VALUES (
        @CatCombo,
        N'Combo Trọn Bộ 3 Bước Làm Sạch Chuyên Sâu & Phục Hồi Moccoon Pure & Clear Trio',
        'combo-bo-3-lam-sach-chuyen-sau-moccoon',
        699000, 899000, 90, N'Trọn bộ 3 món (500ml + 150ml + 100ml)', N'Giải pháp làm sạch toàn diện cho mọi làn da',
        N'Tiết kiệm hơn 200.000đ khi sở hữu trọn bộ 3 sản phẩm làm sạch da chuẩn y khoa từ Moccoon: Nước tẩy trang 500ml, Sữa rửa mặt 150ml và Tẩy tế bào chết 100ml.',
        N'Bộ 3 làm sạch da Moccoon là nền tảng cốt lõi trong chu trình skincare khoa học. Sự phối hợp nhịp nhàng giữa 3 sản phẩm giúp da được detox hoàn toàn khỏi cặn bẩn, dầu nhờn, kem chống nắng và lớp sừng chết, sẵn sàng hấp thu 100% dưỡng chất ở các bước chăm sóc tiếp theo.',
        N'Công thức đồng bộ kết hợp Rau má lên men, Ceramide NP, Phức hợp Amino Acid và Enzyme trái cây tự nhiên.',
        N'1. Chu trình 3 bước làm sạch chuẩn chuyên gia: Tẩy trang -> Rửa mặt -> Tẩy da chết.\n2. Giảm thiểu nguy cơ phát sinh mụn ẩn, mụn đầu đen đến 85%.\n3. Tiết kiệm chi phí và tặng kèm hộp quà cao cấp Moccoon.',
        N'Bước 1: Dùng Nước tẩy trang làm sạch bụi bẩn và makeup.\nBước 2: Rửa mặt lại với Sữa rửa mặt pH 5.5.\nBước 3: Dùng Gel tẩy tế bào chết (1-2 lần/tuần) để tái tạo bề mặt da mịn màng.',
        1
    );
END
GO

-- 16. Thêm hình ảnh chi tiết cho sản phẩm
DECLARE @P1 INT = (SELECT id FROM dbo.Products WHERE slug = 'nuoc-tay-trang-moccoon-micellar-cleansing-water');
DECLARE @P2 INT = (SELECT id FROM dbo.Products WHERE slug = 'sua-rua-mat-moccoon-gentle-foaming-cleanser');
DECLARE @P3 INT = (SELECT id FROM dbo.Products WHERE slug = 'tay-te-bao-chet-moccoon-bio-peeling-gel');
DECLARE @P4 INT = (SELECT id FROM dbo.Products WHERE slug = 'combo-bo-3-lam-sach-chuyen-sau-moccoon');

IF @P1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.ProductImages WHERE product_id = @P1)
BEGIN
    INSERT INTO dbo.ProductImages (product_id, image_url, is_primary, sort_order)
    VALUES 
    (@P1, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600', 1, 1),
    (@P1, 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600', 0, 2);
END

IF @P2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.ProductImages WHERE product_id = @P2)
BEGIN
    INSERT INTO dbo.ProductImages (product_id, image_url, is_primary, sort_order)
    VALUES 
    (@P2, 'https://images.unsplash.com/photo-1556228722-d0b5be7490bf?w=600', 1, 1),
    (@P2, 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600', 0, 2);
END

IF @P3 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.ProductImages WHERE product_id = @P3)
BEGIN
    INSERT INTO dbo.ProductImages (product_id, image_url, is_primary, sort_order)
    VALUES 
    (@P3, 'https://images.unsplash.com/photo-1608248597359-5f75e2e8e9ea?w=600', 1, 1),
    (@P3, 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600', 0, 2);
END

IF @P4 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.ProductImages WHERE product_id = @P4)
BEGIN
    INSERT INTO dbo.ProductImages (product_id, image_url, is_primary, sort_order)
    VALUES 
    (@P4, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800', 1, 1),
    (@P4, 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800', 0, 2);
END
GO

-- 17. Banner Trang chủ Moccoon
IF NOT EXISTS (SELECT 1 FROM dbo.Banners WHERE title LIKE N'%Bộ 3 làm sạch%')
BEGIN
    INSERT INTO dbo.Banners (title, subtitle, image_url, link_url, badge_text, sort_order, is_active)
    VALUES 
    (
        N'Đột Phá Làm Sạch Da Cùng Bộ 3 Moccoon', 
        N'Giải pháp 3 bước làm sạch sâu chuẩn y khoa - Nước tẩy trang, Sữa rửa mặt, Tẩy tế bào chết', 
        'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1000', 
        '/products/combo-bo-3-lam-sach-chuyen-sau-moccoon', 
        N'SIÊU ƯU ĐÃI - GIẢM 25%', 
        1, 1
    ),
    (
        N'Tư Vấn Chu Trình Skincare Miễn Phí 1:1', 
        N'Kết nối trực tiếp chuyên viên da liễu Moccoon ngay trên ứng dụng để nhận lộ trình riêng biệt', 
        'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1000', 
        '/chat', 
        N'CHUYÊN GIA TƯ VẤN', 
        2, 1
    ),
    (
        N'Mua Trọn Bộ Làm Sạch - Nhận Quà Tinh Tế', 
        N'Tặng ngay băng đô tai mèo và túi đựng mỹ phẩm chống nước cho đơn hàng từ 500k', 
        'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1000', 
        '/categories/combo-lam-sach', 
        N'QUÀ TẶNG KÈM', 
        3, 1
    );
    PRINT N'Đã khởi tạo banner trang chủ';
END
GO

PRINT N'====================================================================';
PRINT N'KHỞI TẠO CƠ SỞ DỮ LIỆU MOCCOON THÀNH CÔNG VỚI ĐẦY ĐỦ BẢNG VÀ DỮ LIỆU!';
PRINT N'====================================================================';
