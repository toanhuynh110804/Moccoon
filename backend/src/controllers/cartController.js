const { getPool, sql } = require('../config/db');

// Lấy thông tin giỏ hàng của user hiện tại
exports.getCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const pool = await getPool();

        // Đảm bảo user có giỏ hàng
        let cartResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT id FROM Carts WHERE user_id = @userId');

        let cartId;
        if (cartResult.recordset.length === 0) {
            const createCart = await pool.request()
                .input('userId', sql.Int, userId)
                .query('INSERT INTO Carts (user_id) OUTPUT INSERTED.id VALUES (@userId)');
            cartId = createCart.recordset[0].id;
        } else {
            cartId = cartResult.recordset[0].id;
        }

        // Lấy chi tiết các món trong giỏ hàng
        const itemsQuery = `
            SELECT 
                ci.id AS item_id,
                ci.quantity,
                ci.created_at AS added_at,
                p.id AS product_id,
                p.name AS product_name,
                p.slug AS product_slug,
                p.price,
                p.original_price,
                p.volume,
                p.stock_quantity,
                p.is_active AS product_is_active,
                (
                    SELECT TOP 1 image_url 
                    FROM ProductImages pi 
                    WHERE pi.product_id = p.id 
                    ORDER BY pi.is_primary DESC, pi.sort_order ASC
                ) AS product_image,
                (p.price * ci.quantity) AS item_total
            FROM CartItems ci
            INNER JOIN Products p ON ci.product_id = p.id
            WHERE ci.cart_id = @cartId
            ORDER BY ci.created_at DESC
        `;

        const itemsResult = await pool.request()
            .input('cartId', sql.Int, cartId)
            .query(itemsQuery);

        const items = itemsResult.recordset;
        const totalAmount = items.reduce((sum, item) => sum + Number(item.item_total), 0);
        const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

        return res.status(200).json({
            success: true,
            data: {
                cart_id: cartId,
                items,
                total_quantity: totalQuantity,
                total_amount: totalAmount
            }
        });
    } catch (error) {
        console.error('getCart error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi tải giỏ hàng.', error: error.message });
    }
};

// Thêm sản phẩm vào giỏ hàng
exports.addToCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { product_id, quantity = 1 } = req.body;

        if (!product_id || quantity <= 0) {
            return res.status(400).json({ success: false, message: 'Thông tin sản phẩm hoặc số lượng không hợp lệ.' });
        }

        const pool = await getPool();

        // Kiểm tra sản phẩm có tồn tại và còn hàng không
        const productCheck = await pool.request()
            .input('productId', sql.Int, product_id)
            .query('SELECT id, name, stock_quantity, is_active FROM Products WHERE id = @productId');

        if (productCheck.recordset.length === 0 || !productCheck.recordset[0].is_active) {
            return res.status(404).json({ success: false, message: 'Sản phẩm không khả dụng.' });
        }

        const product = productCheck.recordset[0];
        if (product.stock_quantity < quantity) {
            return res.status(400).json({
                success: false,
                message: `Số lượng tồn kho không đủ (chỉ còn ${product.stock_quantity} sản phẩm).`
            });
        }

        // Lấy hoặc tạo giỏ hàng
        let cartResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT id FROM Carts WHERE user_id = @userId');

        let cartId;
        if (cartResult.recordset.length === 0) {
            const createCart = await pool.request()
                .input('userId', sql.Int, userId)
                .query('INSERT INTO Carts (user_id) OUTPUT INSERTED.id VALUES (@userId)');
            cartId = createCart.recordset[0].id;
        } else {
            cartId = cartResult.recordset[0].id;
        }

        // Kiểm tra xem sản phẩm đã có trong giỏ chưa
        const itemCheck = await pool.request()
            .input('cartId', sql.Int, cartId)
            .input('productId', sql.Int, product_id)
            .query('SELECT id, quantity FROM CartItems WHERE cart_id = @cartId AND product_id = @productId');

        if (itemCheck.recordset.length > 0) {
            const newQty = itemCheck.recordset[0].quantity + parseInt(quantity);
            await pool.request()
                .input('cartId', sql.Int, cartId)
                .input('productId', sql.Int, product_id)
                .input('quantity', sql.Int, newQty)
                .query('UPDATE CartItems SET quantity = @quantity, updated_at = GETDATE() WHERE cart_id = @cartId AND product_id = @productId');
        } else {
            await pool.request()
                .input('cartId', sql.Int, cartId)
                .input('productId', sql.Int, product_id)
                .input('quantity', sql.Int, parseInt(quantity))
                .query('INSERT INTO CartItems (cart_id, product_id, quantity) VALUES (@cartId, @productId, @quantity)');
        }

        return res.status(200).json({
            success: true,
            message: `Đã thêm "${product.name}" vào giỏ hàng thành công!`
        });
    } catch (error) {
        console.error('addToCart error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi thêm vào giỏ hàng.', error: error.message });
    }
};

// Cập nhật số lượng món trong giỏ hàng
exports.updateQuantity = async (req, res) => {
    try {
        const { itemId } = req.params;
        const { quantity } = req.body;

        if (quantity === undefined || quantity < 0) {
            return res.status(400).json({ success: false, message: 'Số lượng không hợp lệ.' });
        }

        const pool = await getPool();

        if (quantity === 0) {
            await pool.request()
                .input('itemId', sql.Int, itemId)
                .query('DELETE FROM CartItems WHERE id = @itemId');
            return res.status(200).json({ success: true, message: 'Đã xóa sản phẩm khỏi giỏ hàng.' });
        }

        await pool.request()
            .input('itemId', sql.Int, itemId)
            .input('quantity', sql.Int, quantity)
            .query('UPDATE CartItems SET quantity = @quantity, updated_at = GETDATE() WHERE id = @itemId');

        return res.status(200).json({ success: true, message: 'Cập nhật số lượng thành công!' });
    } catch (error) {
        console.error('updateQuantity error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật giỏ hàng.', error: error.message });
    }
};

// Xóa 1 món khỏi giỏ hàng
exports.removeItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const pool = await getPool();

        await pool.request()
            .input('itemId', sql.Int, itemId)
            .query('DELETE FROM CartItems WHERE id = @itemId');

        return res.status(200).json({ success: true, message: 'Đã xóa sản phẩm khỏi giỏ hàng.' });
    } catch (error) {
        console.error('removeItem error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi xóa khỏi giỏ hàng.', error: error.message });
    }
};

// Xóa toàn bộ giỏ hàng
exports.clearCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const pool = await getPool();

        await pool.request()
            .input('userId', sql.Int, userId)
            .query('DELETE FROM CartItems WHERE cart_id IN (SELECT id FROM Carts WHERE user_id = @userId)');

        return res.status(200).json({ success: true, message: 'Đã dọn sạch giỏ hàng.' });
    } catch (error) {
        console.error('clearCart error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi dọn giỏ hàng.', error: error.message });
    }
};
