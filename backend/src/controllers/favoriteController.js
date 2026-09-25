const { getPool, sql } = require('../config/db');

// 1. Thêm hoặc Bỏ yêu thích sản phẩm (Toggle)
exports.toggleFavorite = async (req, res) => {
    try {
        const userId = req.user.id;
        const { product_id } = req.body;

        if (!product_id) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã sản phẩm (product_id).' });
        }

        const pool = await getPool();

        // Kiểm tra xem sản phẩm có tồn tại không
        const checkProd = await pool.request()
            .input('productId', sql.Int, product_id)
            .query('SELECT id, name FROM Products WHERE id = @productId');

        if (checkProd.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại.' });
        }

        const prodName = checkProd.recordset[0].name;

        // Kiểm tra xem đã yêu thích chưa
        const checkFav = await pool.request()
            .input('userId', sql.Int, userId)
            .input('productId', sql.Int, product_id)
            .query('SELECT id FROM Favorites WHERE user_id = @userId AND product_id = @productId');

        if (checkFav.recordset.length > 0) {
            // Đã thích -> Bỏ thích
            await pool.request()
                .input('userId', sql.Int, userId)
                .input('productId', sql.Int, product_id)
                .query('DELETE FROM Favorites WHERE user_id = @userId AND product_id = @productId');

            return res.status(200).json({
                success: true,
                is_favorite: false,
                message: `Đã bỏ lưu "${prodName}" khỏi danh sách yêu thích.`
            });
        } else {
            // Chưa thích -> Lưu vào yêu thích
            await pool.request()
                .input('userId', sql.Int, userId)
                .input('productId', sql.Int, product_id)
                .query('INSERT INTO Favorites (user_id, product_id) VALUES (@userId, @productId)');

            return res.status(200).json({
                success: true,
                is_favorite: true,
                message: `Đã lưu "${prodName}" vào danh sách yêu thích! ❤️`
            });
        }
    } catch (error) {
        console.error('toggleFavorite error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật yêu thích sản phẩm.', error: error.message });
    }
};

// 2. Lấy danh sách sản phẩm yêu thích đầy đủ của khách hàng
exports.getMyFavorites = async (req, res) => {
    try {
        const userId = req.user.id;
        const pool = await getPool();

        const query = `
            SELECT 
                f.id AS favorite_id,
                f.created_at AS favorited_at,
                p.id AS product_id,
                p.id, 
                p.name AS product_name,
                p.name, 
                p.slug, p.price, p.original_price, 
                p.volume, p.skin_type, p.is_active,
                c.name AS category_name,
                (
                    SELECT TOP 1 image_url 
                    FROM ProductImages pi 
                    WHERE pi.product_id = p.id 
                    ORDER BY pi.is_primary DESC, pi.sort_order ASC
                ) AS primary_image
            FROM Favorites f
            JOIN Products p ON f.product_id = p.id
            LEFT JOIN Categories c ON p.category_id = c.id
            WHERE f.user_id = @userId AND p.is_active = 1
            ORDER BY f.created_at DESC
        `;

        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(query);

        return res.status(200).json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('getMyFavorites error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách yêu thích.', error: error.message });
    }
};

// 3. Lấy danh sách các ID sản phẩm đã yêu thích (để render trạng thái tim nhanh)
exports.getMyFavoriteIds = async (req, res) => {
    try {
        const userId = req.user.id;
        const pool = await getPool();

        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT product_id FROM Favorites WHERE user_id = @userId');

        const ids = result.recordset.map(r => r.product_id);
        return res.status(200).json({
            success: true,
            data: ids
        });
    } catch (error) {
        console.error('getMyFavoriteIds error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách ID yêu thích.', error: error.message });
    }
};
