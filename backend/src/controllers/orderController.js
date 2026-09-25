const { getPool, sql } = require('../config/db');

function generateOrderCode() {
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `MC${dateStr}-${randomSuffix}`;
}

// 1. Đặt hàng / Thanh toán (Từ giỏ hàng hoặc Mua ngay)
exports.checkout = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            receiver_name, receiver_phone, shipping_address,
            payment_method = 'COD', note, items, from_cart = true
        } = req.body;

        if (!receiver_name || !receiver_phone || !shipping_address) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp đầy đủ: Tên người nhận, Số điện thoại và Địa chỉ giao hàng.'
            });
        }

        const pool = await getPool();
        let orderItemsToProcess = [];

        if (from_cart) {
            // Lấy các món từ giỏ hàng trong DB
            const cartItemsQuery = `
                SELECT 
                    ci.product_id, ci.quantity,
                    p.name, p.price, p.stock_quantity,
                    (
                        SELECT TOP 1 image_url 
                        FROM ProductImages pi 
                        WHERE pi.product_id = p.id 
                        ORDER BY pi.is_primary DESC, pi.sort_order ASC
                    ) AS primary_image
                FROM CartItems ci
                INNER JOIN Carts c ON ci.cart_id = c.id
                INNER JOIN Products p ON ci.product_id = p.id
                WHERE c.user_id = @userId AND p.is_active = 1
            `;
            const cartRes = await pool.request()
                .input('userId', sql.Int, userId)
                .query(cartItemsQuery);

            if (cartRes.recordset.length === 0) {
                return res.status(400).json({ success: false, message: 'Giỏ hàng của bạn đang trống.' });
            }
            orderItemsToProcess = cartRes.recordset;
        } else {
            // "Mua ngay" trực tiếp truyền danh sách items: [{ product_id, quantity }]
            if (!items || !Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ success: false, message: 'Danh sách sản phẩm thanh toán trống.' });
            }

            for (const item of items) {
                const pRes = await pool.request()
                    .input('pId', sql.Int, item.product_id)
                    .query(`
                        SELECT p.id AS product_id, p.name, p.price, p.stock_quantity,
                        (
                            SELECT TOP 1 image_url 
                            FROM ProductImages pi 
                            WHERE pi.product_id = p.id 
                            ORDER BY pi.is_primary DESC, pi.sort_order ASC
                        ) AS primary_image
                        FROM Products p 
                        WHERE p.id = @pId AND p.is_active = 1
                    `);

                if (pRes.recordset.length === 0) {
                    return res.status(404).json({ success: false, message: `Sản phẩm ID ${item.product_id} không tồn tại hoặc đã ngừng bán.` });
                }
                const prod = pRes.recordset[0];
                prod.quantity = parseInt(item.quantity) || 1;
                orderItemsToProcess.push(prod);
            }
        }

        // Kiểm tra tồn kho cho từng sản phẩm
        for (const item of orderItemsToProcess) {
            if (item.stock_quantity < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Sản phẩm "${item.name}" không đủ số lượng trong kho (chỉ còn ${item.stock_quantity}).`
                });
            }
        }

        // Tính tổng tiền
        const totalAmount = orderItemsToProcess.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
        const shippingFee = totalAmount >= 500000 ? 0 : 30000; // Miễn phí vận chuyển cho đơn từ 500.000đ
        const finalAmount = totalAmount + shippingFee;
        const orderCode = generateOrderCode();

        // Sử dụng Transaction để đảm bảo tính toàn vẹn
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Tạo đơn hàng Orders
            const orderRequest = new sql.Request(transaction);
            const insertOrderQuery = `
                INSERT INTO Orders (
                    order_code, user_id, total_amount, shipping_fee, final_amount,
                    payment_method, payment_status, order_status,
                    receiver_name, receiver_phone, shipping_address, note
                )
                OUTPUT INSERTED.id, INSERTED.order_code, INSERTED.final_amount, INSERTED.order_status, INSERTED.created_at
                VALUES (
                    @order_code, @user_id, @total_amount, @shipping_fee, @final_amount,
                    @payment_method, @payment_status, 'PENDING',
                    @receiver_name, @receiver_phone, @shipping_address, @note
                )
            `;

            orderRequest.input('order_code', sql.VarChar, orderCode);
            orderRequest.input('user_id', sql.Int, userId);
            orderRequest.input('total_amount', sql.Decimal(18, 2), totalAmount);
            orderRequest.input('shipping_fee', sql.Decimal(18, 2), shippingFee);
            orderRequest.input('final_amount', sql.Decimal(18, 2), finalAmount);
            orderRequest.input('payment_method', sql.NVarChar, payment_method);
            orderRequest.input('payment_status', sql.NVarChar, payment_method === 'BANKING' ? 'PAID' : 'UNPAID');
            orderRequest.input('receiver_name', sql.NVarChar, receiver_name);
            orderRequest.input('receiver_phone', sql.NVarChar, receiver_phone);
            orderRequest.input('shipping_address', sql.NVarChar, shipping_address);
            orderRequest.input('note', sql.NVarChar, note || null);

            const orderResult = await orderRequest.query(insertOrderQuery);
            const createdOrder = orderResult.recordset[0];
            const orderId = createdOrder.id;

            // 2. Thêm các mục chi tiết OrderItems và trừ tồn kho Products
            for (const item of orderItemsToProcess) {
                const itemReq = new sql.Request(transaction);
                itemReq.input('order_id', sql.Int, orderId);
                itemReq.input('product_id', sql.Int, item.product_id);
                itemReq.input('product_name', sql.NVarChar, item.name);
                itemReq.input('product_image', sql.NVarChar, item.primary_image || null);
                itemReq.input('price', sql.Decimal(18, 2), item.price);
                itemReq.input('quantity', sql.Int, item.quantity);
                itemReq.input('total_price', sql.Decimal(18, 2), item.price * item.quantity);

                await itemReq.query(`
                    INSERT INTO OrderItems (order_id, product_id, product_name, product_image, price, quantity, total_price)
                    VALUES (@order_id, @product_id, @product_name, @product_image, @price, @quantity, @total_price);

                    UPDATE Products
                    SET stock_quantity = stock_quantity - @quantity
                    WHERE id = @product_id;
                `);
            }

            // 3. Nếu mua từ giỏ hàng -> Xóa sạch giỏ hàng
            if (from_cart) {
                const clearCartReq = new sql.Request(transaction);
                clearCartReq.input('userId', sql.Int, userId);
                await clearCartReq.query('DELETE FROM CartItems WHERE cart_id IN (SELECT id FROM Carts WHERE user_id = @userId)');
            }

            // 4. Tạo thông báo cho khách hàng
            const notiReq = new sql.Request(transaction);
            notiReq.input('userId', sql.Int, userId);
            notiReq.input('title', sql.NVarChar, 'Đặt hàng thành công!');
            notiReq.input('content', sql.NVarChar, `Đơn hàng #${orderCode} đã được Moccoon tiếp nhận và đang chờ xử lý.`);
            notiReq.input('reference_id', sql.NVarChar, orderCode);
            await notiReq.query(`
                INSERT INTO Notifications (user_id, title, content, type, reference_id)
                VALUES (@userId, @title, @content, 'ORDER', @reference_id)
            `);

            await transaction.commit();

            return res.status(201).json({
                success: true,
                message: 'Đặt hàng thành công!',
                data: {
                    order_id: orderId,
                    order_code: orderCode,
                    final_amount: finalAmount,
                    shipping_fee: shippingFee,
                    order_status: 'PENDING'
                }
            });
        } catch (tErr) {
            await transaction.rollback();
            throw tErr;
        }
    } catch (error) {
        console.error('checkout error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi tạo đơn hàng.', error: error.message });
    }
};

// 2. Khách hàng xem lịch sử đơn hàng của mình
exports.getMyOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const pool = await getPool();

        const query = `
            SELECT 
                o.*,
                (
                    SELECT 
                        oi.id, oi.product_id, oi.product_name, oi.product_image, 
                        oi.price, oi.quantity, oi.total_price
                    FROM OrderItems oi 
                    WHERE oi.order_id = o.id
                    FOR JSON PATH
                ) AS items_json
            FROM Orders o
            WHERE o.user_id = @userId
            ORDER BY o.created_at DESC
        `;

        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(query);

        const orders = result.recordset.map(order => ({
            ...order,
            items: order.items_json ? JSON.parse(order.items_json) : []
        }));

        return res.status(200).json({
            success: true,
            data: orders
        });
    } catch (error) {
        console.error('getMyOrders error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi tải lịch sử đơn hàng.', error: error.message });
    }
};

// 3. Xem chi tiết 1 đơn hàng theo ID hoặc OrderCode
exports.getOrderDetail = async (req, res) => {
    try {
        const { identifier } = req.params;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'ADMIN';

        const pool = await getPool();
        const request = pool.request();

        let condition = 'o.order_code = @identifier';
        if (!isNaN(identifier)) {
            condition = '(o.id = @identifierNum OR o.order_code = @identifier)';
            request.input('identifierNum', sql.Int, parseInt(identifier));
        }
        request.input('identifier', sql.VarChar, identifier);

        if (!isAdmin) {
            condition += ' AND o.user_id = @userId';
            request.input('userId', sql.Int, userId);
        }

        const query = `
            SELECT o.*, u.full_name AS customer_name, u.email AS customer_email, u.phone AS customer_phone
            FROM Orders o
            INNER JOIN Users u ON o.user_id = u.id
            WHERE ${condition};

            SELECT oi.*
            FROM OrderItems oi
            INNER JOIN Orders o ON oi.order_id = o.id
            WHERE ${condition};
        `;

        const result = await request.query(query);

        if (result.recordsets[0].length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
        }

        const order = result.recordsets[0][0];
        order.items = result.recordsets[1];

        return res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error('getOrderDetail error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi tải chi tiết đơn hàng.', error: error.message });
    }
};

// 4. Khách hàng hủy đơn hàng (chỉ khi đang ở trạng thái PENDING)
exports.cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const pool = await getPool();
        const orderRes = await pool.request()
            .input('id', sql.Int, id)
            .input('userId', sql.Int, userId)
            .query('SELECT id, order_code, order_status FROM Orders WHERE id = @id AND user_id = @userId');

        if (orderRes.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
        }

        const order = orderRes.recordset[0];
        if (order.order_status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: 'Không thể hủy đơn hàng đã được chuẩn bị hoặc đang giao.'
            });
        }

        // Hoàn lại số lượng tồn kho
        const items = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT product_id, quantity FROM OrderItems WHERE order_id = @id');

        for (const item of items.recordset) {
            await pool.request()
                .input('productId', sql.Int, item.product_id)
                .input('quantity', sql.Int, item.quantity)
                .query('UPDATE Products SET stock_quantity = stock_quantity + @quantity WHERE id = @productId');
        }

        await pool.request()
            .input('id', sql.Int, id)
            .query("UPDATE Orders SET order_status = 'CANCELLED', updated_at = GETDATE() WHERE id = @id");

        return res.status(200).json({
            success: true,
            message: 'Đã hủy đơn hàng thành công.'
        });
    } catch (error) {
        console.error('cancelOrder error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi hủy đơn hàng.', error: error.message });
    }
};

// 5. Admin: Quản lý danh sách đơn hàng (lọc theo trạng thái, tìm kiếm mã đơn / SĐT)
exports.getAdminOrders = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const pool = await getPool();
        const request = pool.request();

        let whereConditions = [];
        if (status && status !== 'ALL') {
            whereConditions.push('o.order_status = @status');
            request.input('status', sql.NVarChar, status);
        }

        if (search) {
            whereConditions.push('(o.order_code LIKE @search OR o.receiver_phone LIKE @search OR o.receiver_name LIKE @search)');
            request.input('search', sql.NVarChar, `%${search}%`);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const query = `
            SELECT 
                o.*,
                u.full_name AS customer_name,
                u.email AS customer_email,
                (SELECT COUNT(*) FROM OrderItems oi WHERE oi.order_id = o.id) AS total_items,
                (
                    SELECT 
                        oi.id, oi.product_id, oi.product_name, oi.product_image, 
                        oi.price, oi.quantity, oi.total_price
                    FROM OrderItems oi 
                    WHERE oi.order_id = o.id
                    FOR JSON PATH
                ) AS items_json
            FROM Orders o
            LEFT JOIN Users u ON o.user_id = u.id
            ${whereClause}
            ORDER BY o.created_at DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

            SELECT COUNT(*) AS total FROM Orders o ${whereClause};
        `;

        request.input('offset', sql.Int, offset);
        request.input('limit', sql.Int, parseInt(limit));

        const result = await request.query(query);

        const orders = result.recordsets[0].map(order => ({
            ...order,
            items: order.items_json ? JSON.parse(order.items_json) : []
        }));

        return res.status(200).json({
            success: true,
            data: {
                orders: orders,
                total: result.recordsets[1][0]?.total || orders.length,
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('getAdminOrders error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách đơn hàng.', error: error.message });
    }
};

// 6. Admin: Cập nhật trạng thái đơn hàng (Duyệt đơn, đang chuẩn bị, đang giao, đã giao, hủy)
exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { order_status, payment_status } = req.body;

        const validStatuses = ['PENDING', 'PREPARING', 'SHIPPING', 'DELIVERED', 'CANCELLED'];
        if (order_status && !validStatuses.includes(order_status)) {
            return res.status(400).json({
                success: false,
                message: `Trạng thái không hợp lệ. Cho phép: ${validStatuses.join(', ')}`
            });
        }

        const pool = await getPool();

        // Lấy thông tin đơn hàng hiện tại
        const orderRes = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT user_id, order_code, order_status FROM Orders WHERE id = @id');

        if (orderRes.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
        }

        const order = orderRes.recordset[0];

        const updateQuery = `
            UPDATE Orders
            SET order_status = COALESCE(@order_status, order_status),
                payment_status = COALESCE(@payment_status, payment_status),
                updated_at = GETDATE()
            OUTPUT INSERTED.*
            WHERE id = @id
        `;

        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('order_status', sql.NVarChar, order_status || null)
            .input('payment_status', sql.NVarChar, payment_status || null)
            .query(updateQuery);

        // Bắn thông báo đẩy cho khách hàng về trạng thái mới
        const statusTextMap = {
            'PREPARING': 'đang được chuẩn bị hàng và đóng gói.',
            'SHIPPING': 'đang trên đường giao đến bạn.',
            'DELIVERED': 'đã được giao thành công. Cảm ơn bạn đã lựa chọn Moccoon!',
            'CANCELLED': 'đã bị hủy.'
        };

        if (order_status && statusTextMap[order_status]) {
            await pool.request()
                .input('userId', sql.Int, order.user_id)
                .input('title', sql.NVarChar, `Cập nhật đơn hàng #${order.order_code}`)
                .input('content', sql.NVarChar, `Đơn hàng #${order.order_code} của bạn ${statusTextMap[order_status]}`)
                .input('reference_id', sql.NVarChar, order.order_code)
                .query(`
                    INSERT INTO Notifications (user_id, title, content, type, reference_id)
                    VALUES (@userId, @title, @content, 'ORDER', @reference_id)
                `);
        }

        return res.status(200).json({
            success: true,
            message: 'Cập nhật trạng thái đơn hàng thành công!',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('updateOrderStatus error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật trạng thái đơn.', error: error.message });
    }
};
