const { getPool, sql } = require('../config/db');

// Lấy danh sách thông báo của người dùng
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const pool = await getPool();

        const query = `
            SELECT id, title, content, type, reference_id, is_read, created_at
            FROM Notifications
            WHERE user_id = @userId
            ORDER BY created_at DESC
        `;

        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(query);

        const unreadCount = result.recordset.filter(n => !n.is_read).length;

        return res.status(200).json({
            success: true,
            data: {
                notifications: result.recordset,
                unread_count: unreadCount
            }
        });
    } catch (error) {
        console.error('getNotifications error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi tải danh sách thông báo.', error: error.message });
    }
};

// Đánh dấu đã đọc 1 thông báo
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const pool = await getPool();

        await pool.request()
            .input('id', sql.Int, id)
            .input('userId', sql.Int, userId)
            .query('UPDATE Notifications SET is_read = 1 WHERE id = @id AND user_id = @userId');

        return res.status(200).json({
            success: true,
            message: 'Đã đánh dấu đọc thông báo.'
        });
    } catch (error) {
        console.error('markAsRead error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi cập nhật thông báo.', error: error.message });
    }
};

// Đánh dấu đã đọc toàn bộ thông báo
exports.markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const pool = await getPool();

        await pool.request()
            .input('userId', sql.Int, userId)
            .query('UPDATE Notifications SET is_read = 1 WHERE user_id = @userId');

        return res.status(200).json({
            success: true,
            message: 'Đã đánh dấu đọc toàn bộ thông báo.'
        });
    } catch (error) {
        console.error('markAllAsRead error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi cập nhật thông báo.', error: error.message });
    }
};
