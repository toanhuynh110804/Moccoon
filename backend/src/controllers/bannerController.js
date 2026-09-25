const { getPool, sql } = require('../config/db');

// Lấy danh sách banner hiển thị trang chủ
exports.getBanners = async (req, res) => {
    try {
        const pool = await getPool();
        const isAdmin = req.query.all === 'true';
        let query = 'SELECT * FROM Banners';
        if (!isAdmin) {
            query += ' WHERE is_active = 1';
        }
        query += ' ORDER BY sort_order ASC, id DESC';

        const result = await pool.request().query(query);
        return res.status(200).json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('getBanners error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi tải banners.', error: error.message });
    }
};

// Admin: Thêm banner mới
exports.createBanner = async (req, res) => {
    try {
        const { title, subtitle, image_url, link_url, badge_text, sort_order } = req.body;
        if (!title || !image_url) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tiêu đề và hình ảnh banner.' });
        }

        const pool = await getPool();
        const query = `
            INSERT INTO Banners (title, subtitle, image_url, link_url, badge_text, sort_order, is_active)
            OUTPUT INSERTED.*
            VALUES (@title, @subtitle, @image_url, @link_url, @badge_text, @sort_order, 1)
        `;
        const result = await pool.request()
            .input('title', sql.NVarChar, title)
            .input('subtitle', sql.NVarChar, subtitle || null)
            .input('image_url', sql.NVarChar, image_url)
            .input('link_url', sql.NVarChar, link_url || null)
            .input('badge_text', sql.NVarChar, badge_text || null)
            .input('sort_order', sql.Int, sort_order || 0)
            .query(query);

        return res.status(201).json({
            success: true,
            message: 'Tạo banner mới thành công!',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('createBanner error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi tạo banner.', error: error.message });
    }
};

// Admin: Cập nhật banner
exports.updateBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, subtitle, image_url, link_url, badge_text, sort_order, is_active } = req.body;

        const pool = await getPool();
        const query = `
            UPDATE Banners
            SET title = COALESCE(@title, title),
                subtitle = COALESCE(@subtitle, subtitle),
                image_url = COALESCE(@image_url, image_url),
                link_url = COALESCE(@link_url, link_url),
                badge_text = COALESCE(@badge_text, badge_text),
                sort_order = COALESCE(@sort_order, sort_order),
                is_active = COALESCE(@is_active, is_active)
            OUTPUT INSERTED.*
            WHERE id = @id
        `;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('title', sql.NVarChar, title || null)
            .input('subtitle', sql.NVarChar, subtitle || null)
            .input('image_url', sql.NVarChar, image_url || null)
            .input('link_url', sql.NVarChar, link_url || null)
            .input('badge_text', sql.NVarChar, badge_text || null)
            .input('sort_order', sql.Int, sort_order !== undefined ? sort_order : null)
            .input('is_active', sql.Bit, is_active !== undefined ? is_active : null)
            .query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy banner.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Cập nhật banner thành công!',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('updateBanner error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi cập nhật banner.', error: error.message });
    }
};

// Admin: Xóa banner
exports.deleteBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Banners WHERE id = @id');

        return res.status(200).json({
            success: true,
            message: 'Đã xóa banner thành công!'
        });
    } catch (error) {
        console.error('deleteBanner error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi xóa banner.', error: error.message });
    }
};
