const { getPool, sql } = require('../config/db');

// 1. Lấy danh sách địa chỉ của khách hàng
exports.getMyAddresses = async (req, res) => {
    try {
        const userId = req.user.id;
        const pool = await getPool();

        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT id, user_id, recipient_name, phone, address_line, label, is_default, created_at, updated_at
                FROM dbo.UserAddresses
                WHERE user_id = @userId
                ORDER BY is_default DESC, id ASC
            `);

        // Nếu chưa có địa chỉ nào trong bảng UserAddresses nhưng có trong Users, tự tạo 1 bản ghi
        if (result.recordset.length === 0) {
            const userRes = await pool.request()
                .input('userId', sql.Int, userId)
                .query('SELECT full_name, phone, address FROM dbo.Users WHERE id = @userId');

            if (userRes.recordset.length > 0 && userRes.recordset[0].address) {
                const u = userRes.recordset[0];
                const insRes = await pool.request()
                    .input('userId', sql.Int, userId)
                    .input('name', sql.NVarChar, u.full_name || 'Khách hàng')
                    .input('phone', sql.NVarChar, u.phone || '')
                    .input('addr', sql.NVarChar, u.address)
                    .query(`
                        INSERT INTO dbo.UserAddresses (user_id, recipient_name, phone, address_line, label, is_default)
                        OUTPUT INSERTED.*
                        VALUES (@userId, @name, @phone, @addr, N'Địa chỉ mặc định', 1)
                    `);
                return res.status(200).json({ success: true, data: insRes.recordset });
            }
        }

        return res.status(200).json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('getMyAddresses error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách địa chỉ.', error: error.message });
    }
};

// 2. Thêm địa chỉ mới (Địa chỉ 2, 3...)
exports.addAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const { recipient_name, phone, address_line, label, is_default } = req.body;

        if (!address_line || !address_line.trim()) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập địa chỉ nhận hàng chi tiết.' });
        }

        const pool = await getPool();

        // Kiểm tra xem user đã có địa chỉ nào chưa
        const countRes = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT COUNT(*) AS total FROM dbo.UserAddresses WHERE user_id = @userId');

        const isFirst = countRes.recordset[0].total === 0;
        const willBeDefault = isFirst || !!is_default;

        // Nếu đặt làm mặc định -> bỏ mặc định của các địa chỉ cũ
        if (willBeDefault) {
            await pool.request()
                .input('userId', sql.Int, userId)
                .query('UPDATE dbo.UserAddresses SET is_default = 0 WHERE user_id = @userId');

            // Cập nhật luôn vào Users.address
            await pool.request()
                .input('userId', sql.Int, userId)
                .input('addr', sql.NVarChar, address_line.trim())
                .query('UPDATE dbo.Users SET address = @addr WHERE id = @userId');
        }

        const insertRes = await pool.request()
            .input('userId', sql.Int, userId)
            .input('name', sql.NVarChar, recipient_name ? recipient_name.trim() : null)
            .input('phone', sql.NVarChar, phone ? phone.trim() : null)
            .input('addr', sql.NVarChar, address_line.trim())
            .input('label', sql.NVarChar, label ? label.trim() : 'Địa chỉ giao hàng')
            .input('isDefault', sql.Bit, willBeDefault ? 1 : 0)
            .query(`
                INSERT INTO dbo.UserAddresses (user_id, recipient_name, phone, address_line, label, is_default)
                OUTPUT INSERTED.*
                VALUES (@userId, @name, @phone, @addr, @label, @isDefault)
            `);

        return res.status(201).json({
            success: true,
            message: 'Đã thêm địa chỉ giao hàng mới thành công! 📍',
            data: insertRes.recordset[0]
        });
    } catch (error) {
        console.error('addAddress error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi thêm địa chỉ mới.', error: error.message });
    }
};

// 3. Đặt địa chỉ làm mặc định
exports.setDefaultAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const addressId = req.params.id;

        const pool = await getPool();

        // Kiểm tra địa chỉ có thuộc về user không
        const check = await pool.request()
            .input('id', sql.Int, addressId)
            .input('userId', sql.Int, userId)
            .query('SELECT address_line FROM dbo.UserAddresses WHERE id = @id AND user_id = @userId');

        if (check.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Địa chỉ không tồn tại hoặc không thuộc quyền sở hữu.' });
        }

        const addrLine = check.recordset[0].address_line;

        // Bỏ mặc định tất cả địa chỉ cũ
        await pool.request()
            .input('userId', sql.Int, userId)
            .query('UPDATE dbo.UserAddresses SET is_default = 0 WHERE user_id = @userId');

        // Đặt địa chỉ này làm mặc định
        await pool.request()
            .input('id', sql.Int, addressId)
            .query('UPDATE dbo.UserAddresses SET is_default = 1, updated_at = GETDATE() WHERE id = @id');

        // Cập nhật Users.address
        await pool.request()
            .input('userId', sql.Int, userId)
            .input('addr', sql.NVarChar, addrLine)
            .query('UPDATE dbo.Users SET address = @addr WHERE id = @userId');

        return res.status(200).json({
            success: true,
            message: 'Đã đặt làm địa chỉ giao hàng mặc định! 🌟'
        });
    } catch (error) {
        console.error('setDefaultAddress error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật địa chỉ mặc định.', error: error.message });
    }
};

// 4. Xóa địa chỉ
exports.deleteAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const addressId = req.params.id;

        const pool = await getPool();

        const check = await pool.request()
            .input('id', sql.Int, addressId)
            .input('userId', sql.Int, userId)
            .query('SELECT is_default FROM dbo.UserAddresses WHERE id = @id AND user_id = @userId');

        if (check.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Địa chỉ không tồn tại.' });
        }

        const isDef = check.recordset[0].is_default;

        // Xóa địa chỉ
        await pool.request()
            .input('id', sql.Int, addressId)
            .query('DELETE FROM dbo.UserAddresses WHERE id = @id');

        // Nếu xóa địa chỉ mặc định, tự động gán địa chỉ đầu tiên còn lại làm mặc định
        if (isDef) {
            const nextAddr = await pool.request()
                .input('userId', sql.Int, userId)
                .query('SELECT TOP 1 id, address_line FROM dbo.UserAddresses WHERE user_id = @userId ORDER BY id ASC');

            if (nextAddr.recordset.length > 0) {
                await pool.request()
                    .input('id', sql.Int, nextAddr.recordset[0].id)
                    .query('UPDATE dbo.UserAddresses SET is_default = 1 WHERE id = @id');

                await pool.request()
                    .input('userId', sql.Int, userId)
                    .input('addr', sql.NVarChar, nextAddr.recordset[0].address_line)
                    .query('UPDATE dbo.Users SET address = @addr WHERE id = @userId');
            } else {
                await pool.request()
                    .input('userId', sql.Int, userId)
                    .query('UPDATE dbo.Users SET address = NULL WHERE id = @userId');
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Đã xóa địa chỉ thành công! 🗑️'
        });
    } catch (error) {
        console.error('deleteAddress error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi xóa địa chỉ.', error: error.message });
    }
};
