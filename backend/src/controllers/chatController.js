const { getPool, sql } = require('../config/db');

// 1. Khách hàng: Lấy hoặc khởi tạo cuộc hội thoại tư vấn Skincare của mình
exports.getCustomerConversation = async (req, res) => {
    try {
        const customerId = req.user.id;
        const pool = await getPool();

        let convResult = await pool.request()
            .input('customerId', sql.Int, customerId)
            .query('SELECT * FROM ChatConversations WHERE customer_id = @customerId');

        let conversation;
        if (convResult.recordset.length === 0) {
            const createConv = await pool.request()
                .input('customerId', sql.Int, customerId)
                .input('welcomeMsg', sql.NVarChar, 'Xin chào! Chào mừng bạn đến với Moccoon Skincare. Bạn đang cần tư vấn về vấn đề da nào hôm nay ạ?')
                .query(`
                    INSERT INTO ChatConversations (customer_id, last_message, unread_customer_count)
                    OUTPUT INSERTED.*
                    VALUES (@customerId, @welcomeMsg, 1);
                `);
            conversation = createConv.recordset[0];

            // Thêm tin nhắn chào mừng tự động từ hệ thống/chuyên viên
            const adminUser = await pool.request()
                .query("SELECT TOP 1 id FROM Users WHERE role = 'ADMIN'");
            const adminId = adminUser.recordset.length > 0 ? adminUser.recordset[0].id : customerId;

            await pool.request()
                .input('convId', sql.Int, conversation.id)
                .input('senderId', sql.Int, adminId)
                .input('msg', sql.NVarChar, 'Xin chào! Chào mừng bạn đến với Moccoon Skincare. Bạn đang cần tư vấn về vấn đề da nào hôm nay ạ?')
                .query("INSERT INTO ChatMessages (conversation_id, sender_id, sender_type, message_text) VALUES (@convId, @senderId, 'ADMIN', @msg)");
        } else {
            conversation = convResult.recordset[0];
        }

        return res.status(200).json({
            success: true,
            data: conversation
        });
    } catch (error) {
        console.error('getCustomerConversation error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi tải cuộc hội thoại.', error: error.message });
    }
};

// 2. Lấy danh sách tin nhắn trong cuộc hội thoại
exports.getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'ADMIN';

        const pool = await getPool();

        // Kiểm tra quyền truy cập vào cuộc hội thoại
        const convRes = await pool.request()
            .input('convId', sql.Int, conversationId)
            .query('SELECT * FROM ChatConversations WHERE id = @convId');

        if (convRes.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy cuộc hội thoại.' });
        }

        const conv = convRes.recordset[0];
        if (!isAdmin && conv.customer_id !== userId) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xem cuộc hội thoại này.' });
        }

        const query = `
            SELECT 
                cm.id, cm.conversation_id, cm.sender_id, cm.sender_type,
                cm.message_text, cm.image_url, cm.is_read, cm.created_at,
                u.full_name AS sender_name, u.avatar_url AS sender_avatar
            FROM ChatMessages cm
            INNER JOIN Users u ON cm.sender_id = u.id
            WHERE cm.conversation_id = @convId
            ORDER BY cm.created_at ASC
        `;

        const messagesRes = await pool.request()
            .input('convId', sql.Int, conversationId)
            .query(query);

        // Đánh dấu đã đọc
        if (isAdmin) {
            await pool.request()
                .input('convId', sql.Int, conversationId)
                .query("UPDATE ChatConversations SET unread_admin_count = 0 WHERE id = @convId");
        } else {
            await pool.request()
                .input('convId', sql.Int, conversationId)
                .query("UPDATE ChatConversations SET unread_customer_count = 0 WHERE id = @convId");
        }

        return res.status(200).json({
            success: true,
            data: messagesRes.recordset
        });
    } catch (error) {
        console.error('getMessages error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi tải tin nhắn.', error: error.message });
    }
};

// 3. Gửi tin nhắn qua REST API (Dự phòng cho Socket.io)
exports.sendMessage = async (req, res) => {
    try {
        const senderId = req.user.id;
        const senderType = req.user.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER';
        const { conversation_id, message_text, image_url } = req.body;

        if (!conversation_id || (!message_text && !image_url)) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp nội dung tin nhắn hoặc hình ảnh.' });
        }

        const pool = await getPool();

        const insertMsgQuery = `
            INSERT INTO ChatMessages (conversation_id, sender_id, sender_type, message_text, image_url, is_read)
            OUTPUT INSERTED.*
            VALUES (@conversation_id, @senderId, @senderType, @message_text, @image_url, 0)
        `;

        const msgResult = await pool.request()
            .input('conversation_id', sql.Int, conversation_id)
            .input('senderId', sql.Int, senderId)
            .input('senderType', sql.VarChar, senderType)
            .input('message_text', sql.NVarChar, message_text || (image_url ? '[Hình ảnh]' : ''))
            .input('image_url', sql.NVarChar, image_url || null)
            .query(insertMsgQuery);

        const newMsg = msgResult.recordset[0];
        newMsg.sender_name = req.user.full_name;
        newMsg.sender_avatar = req.user.avatar_url;

        // Cập nhật cuộc hội thoại
        const updateConvQuery = `
            UPDATE ChatConversations
            SET last_message = @last_message,
                last_message_at = GETDATE(),
                unread_customer_count = CASE WHEN @senderType = 'ADMIN' THEN unread_customer_count + 1 ELSE unread_customer_count END,
                unread_admin_count = CASE WHEN @senderType = 'CUSTOMER' THEN unread_admin_count + 1 ELSE unread_admin_count END
            WHERE id = @conversation_id
        `;

        await pool.request()
            .input('conversation_id', sql.Int, conversation_id)
            .input('last_message', sql.NVarChar, message_text || '[Hình ảnh]')
            .input('senderType', sql.VarChar, senderType)
            .query(updateConvQuery);

        return res.status(201).json({
            success: true,
            data: newMsg
        });
    } catch (error) {
        console.error('sendMessage error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi gửi tin nhắn.', error: error.message });
    }
};

// 4. Admin: Lấy danh sách toàn bộ các cuộc hội thoại khách hàng cần tư vấn
exports.getAdminConversations = async (req, res) => {
    try {
        const pool = await getPool();
        const query = `
            SELECT 
                c.id, c.customer_id, c.last_message, c.last_message_at,
                c.unread_admin_count, c.status,
                u.full_name AS customer_name,
                u.phone AS customer_phone,
                u.email AS customer_email,
                u.avatar_url AS customer_avatar
            FROM ChatConversations c
            INNER JOIN Users u ON c.customer_id = u.id
            ORDER BY c.unread_admin_count DESC, c.last_message_at DESC
        `;

        const result = await pool.request().query(query);

        return res.status(200).json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('getAdminConversations error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi tải danh sách cuộc hội thoại.', error: error.message });
    }
};
