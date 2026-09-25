const { getPool, sql } = require('../config/db');

// Lấy danh sách danh mục (chỉ lấy danh mục đang hoạt động)
exports.getCategories = async (req, res) => {
    try {
        const pool = await getPool();
        const query = 'SELECT * FROM Categories WHERE is_active = 1 ORDER BY sort_order ASC, id ASC';

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

        // 1. Kiểm tra danh mục có tồn tại không
        const checkCat = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM Categories WHERE id = @id');
        if (checkCat.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Danh mục không tồn tại hoặc đã bị xóa.' });
        }

        // 2. Tìm danh mục thay thế hợp lệ khác đang hoạt động
        const altCatRes = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT TOP 1 id, name FROM Categories WHERE id != @id AND is_active = 1 ORDER BY sort_order ASC, id ASC');

        let targetCatId = null;
        let targetCatName = '';

        if (altCatRes.recordset.length > 0) {
            targetCatId = altCatRes.recordset[0].id;
            targetCatName = altCatRes.recordset[0].name;
        } else {
            // Nếu không còn danh mục nào khác, tự động tạo 1 danh mục "Sản phẩm chung"
            const createDefaultCat = await pool.request()
                .input('name', sql.NVarChar, 'Sản phẩm chung')
                .input('slug', sql.VarChar, 'san-pham-chung')
                .input('desc', sql.NVarChar, 'Danh mục mặc định')
                .query(`
                    INSERT INTO Categories (name, slug, description, sort_order, is_active)
                    OUTPUT INSERTED.id, INSERTED.name
                    VALUES (@name, @slug, @desc, 1, 1)
                `);
            targetCatId = createDefaultCat.recordset[0].id;
            targetCatName = createDefaultCat.recordset[0].name;
        }

        // 3. Chuyển toàn bộ sản phẩm đang thuộc danh mục bị xóa sang danh mục thay thế
        const updateProds = await pool.request()
            .input('id', sql.Int, id)
            .input('targetId', sql.Int, targetCatId)
            .query('UPDATE Products SET category_id = @targetId WHERE category_id = @id');

        const reassignedCount = updateProds.rowsAffected[0] || 0;

        // 4. Xóa vĩnh viễn danh mục khỏi CSDL
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Categories WHERE id = @id');

        let successMsg = 'Đã xóa vĩnh viễn danh mục thành công!';
        if (reassignedCount > 0) {
            successMsg += ` Đã chuyển ${reassignedCount} sản phẩm liên quan sang danh mục "${targetCatName}".`;
        }

        return res.status(200).json({
            success: true,
            message: successMsg
        });
    } catch (error) {
        console.error('deleteCategory error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi xóa danh mục.', error: error.message });
    }
};
