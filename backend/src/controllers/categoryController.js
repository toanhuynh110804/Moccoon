const { getPool, sql } = require('../config/db');

// Lấy danh sách danh mục
exports.getCategories = async (req, res) => {
    try {
        const pool = await getPool();
        const isAdmin = req.query.all === 'true';
        let query = 'SELECT * FROM Categories';
        if (!isAdmin) {
            query += ' WHERE is_active = 1';
        }
        query += ' ORDER BY sort_order ASC, id ASC';

        const result = await pool.request().query(query);
        return res.status(200).json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('getCategories error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi tải danh mục sản phẩm.', error: error.message });
    }
};

// Admin: Thêm danh mục mới
exports.createCategory = async (req, res) => {
    try {
        const { name, slug, description, image_url, sort_order } = req.body;
        if (!name || !slug) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tên danh mục và đường dẫn (slug).' });
        }

        const pool = await getPool();
        const query = `
            INSERT INTO Categories (name, slug, description, image_url, sort_order, is_active)
            OUTPUT INSERTED.*
            VALUES (@name, @slug, @description, @image_url, @sort_order, 1)
        `;
        const result = await pool.request()
            .input('name', sql.NVarChar, name)
            .input('slug', sql.VarChar, slug)
            .input('description', sql.NVarChar, description || null)
            .input('image_url', sql.NVarChar, image_url || null)
            .input('sort_order', sql.Int, sort_order || 0)
            .query(query);

        return res.status(201).json({
            success: true,
            message: 'Tạo danh mục mới thành công!',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('createCategory error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi tạo danh mục.', error: error.message });
    }
};

// Admin: Chỉnh sửa danh mục
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, slug, description, image_url, sort_order, is_active } = req.body;

        const pool = await getPool();
        const query = `
            UPDATE Categories
            SET name = COALESCE(@name, name),
                slug = COALESCE(@slug, slug),
                description = COALESCE(@description, description),
                image_url = COALESCE(@image_url, image_url),
                sort_order = COALESCE(@sort_order, sort_order),
                is_active = COALESCE(@is_active, is_active)
            OUTPUT INSERTED.*
            WHERE id = @id
        `;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar, name || null)
            .input('slug', sql.VarChar, slug || null)
            .input('description', sql.NVarChar, description || null)
            .input('image_url', sql.NVarChar, image_url || null)
            .input('sort_order', sql.Int, sort_order !== undefined ? sort_order : null)
            .input('is_active', sql.Bit, is_active !== undefined ? is_active : null)
            .query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Cập nhật danh mục thành công!',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('updateCategory error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật danh mục.', error: error.message });
    }
};

// Admin: Xóa danh mục
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        // Kiểm tra xem danh mục có sản phẩm không
        const checkProducts = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT COUNT(*) AS total FROM Products WHERE category_id = @id');

        if (checkProducts.recordset[0].total > 0) {
            // Chuyển sang ẩn danh mục thay vì xóa cứng
            await pool.request()
                .input('id', sql.Int, id)
                .query('UPDATE Categories SET is_active = 0 WHERE id = @id');
            return res.status(200).json({
                success: true,
                message: 'Danh mục đang có sản phẩm liên kết nên đã được chuyển sang trạng thái tạm ngưng.'
            });
        }

        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Categories WHERE id = @id');

        return res.status(200).json({
            success: true,
            message: 'Đã xóa danh mục thành công!'
        });
    } catch (error) {
        console.error('deleteCategory error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi xóa danh mục.', error: error.message });
    }
};
