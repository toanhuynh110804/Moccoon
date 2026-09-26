const { getPool, sql } = require('../src/config/db');
const bcrypt = require('bcryptjs');

async function resetCleanData() {
    try {
        console.log('--- BẮT ĐẦU DỌN DẸP TOÀN BỘ ĐƠN HÀNG, SẢN PHẨM & TÀI KHOẢN KHÁCH HÀNG ---');
        const pool = await getPool();

        // 1. Xóa toàn bộ đơn hàng
        console.log('1. Xóa toàn bộ đơn hàng và chi tiết đơn hàng...');
        await pool.request().query(`
            DELETE FROM OrderItems;
            DELETE FROM Orders;
            DBCC CHECKIDENT ('Orders', RESEED, 0);
        `);
        console.log('✓ Đã xóa sạch đơn hàng và reset bộ đếm Orders.');

        // 2. Xóa toàn bộ sản phẩm và dữ liệu liên quan (ảnh, đánh giá, yêu thích, giỏ hàng)
        console.log('2. Xóa toàn bộ sản phẩm, hình ảnh, đánh giá...');
        await pool.request().query(`
            DELETE FROM CartItems;
            DELETE FROM ProductReviews;
            DELETE FROM Favorites;
            DELETE FROM ProductImages;
            DELETE FROM Products;
            DBCC CHECKIDENT ('Products', RESEED, 0);
        `);
        console.log('✓ Đã xóa sạch sản phẩm và reset bộ đếm Products.');

        // 3. Xóa tin nhắn, thông báo, địa chỉ và giỏ hàng của khách hàng
        console.log('3. Xóa tin nhắn, thông báo, sổ địa chỉ và giỏ hàng...');
        await pool.request().query(`
            DELETE FROM ChatMessages;
            DELETE FROM ChatConversations;
            DELETE FROM Notifications;
            DELETE FROM UserAddresses;
            DELETE FROM Carts WHERE user_id != 1;
        `);
        console.log('✓ Đã dọn dẹp tin nhắn chat, thông báo và giỏ hàng.');

        // 4. Xóa toàn bộ tài khoản khách hàng, chỉ giữ lại tài khoản ADMIN
        console.log('4. Xóa toàn bộ tài khoản khách hàng (chỉ bảo lưu Quản trị viên ADMIN)...');
        await pool.request().query(`
            DELETE FROM Users WHERE role != 'ADMIN' AND email != 'admin@moccoon.vn';
        `);

        // Đảm bảo mật khẩu Admin là Admin@123456
        const adminPassHash = await bcrypt.hash('Admin@123456', 10);
        await pool.request()
            .input('passHash', sql.NVarChar, adminPassHash)
            .query(`
                IF EXISTS (SELECT 1 FROM Users WHERE email = 'admin@moccoon.vn')
                BEGIN
                    UPDATE Users 
                    SET password_hash = @passHash, 
                        is_active = 1,
                        full_name = N'Quản Trị Viên Moccoon',
                        phone = '0901234567',
                        role = 'ADMIN'
                    WHERE email = 'admin@moccoon.vn';
                END
                ELSE
                BEGIN
                    INSERT INTO Users (full_name, email, phone, password_hash, role, is_active)
                    VALUES (N'Quản Trị Viên Moccoon', 'admin@moccoon.vn', '0901234567', @passHash, 'ADMIN', 1);
                END
            `);
        console.log('✓ Đã bảo toàn và cập nhật tài khoản Admin (admin@moccoon.vn / Admin@123456).');

        // Kiểm tra số lượng bản ghi còn lại
        const checks = [
            'Orders', 'OrderItems', 'Products', 'ProductImages', 'ProductReviews',
            'CartItems', 'Favorites', 'UserAddresses', 'Users'
        ];
        console.log('\n--- KẾT QUẢ KIỂM TRA SAU KHI DỌN DẸP ---');
        for (const tbl of checks) {
            const res = await pool.request().query(`SELECT COUNT(*) AS total FROM ${tbl}`);
            console.log(`- Bảng ${tbl}: ${res.recordset[0].total} bản ghi`);
        }

        console.log('\n🎉 HOÀN TẤT DỌN DẸP DỮ LIỆU THÀNH CÔNG! HỆ THỐNG ĐÃ TRỞ VỀ TRẠNG THÁI TRẮNG SẴN SÀNG.');
        process.exit(0);
    } catch (err) {
        console.error('Lỗi dọn dẹp dữ liệu:', err);
        process.exit(1);
    }
}

resetCleanData();
