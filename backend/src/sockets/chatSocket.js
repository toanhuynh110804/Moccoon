const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/db');

function setupChatSocket(io) {
    // Middleware xác thực token cho Socket.io
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.query.token;
            if (!token) {
                return next(new Error('Authentication error: Token required'));
            }

            const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
            const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET || 'moccoon_super_secret_jwt_key_2026_skincare_ecommerce');

            const pool = await getPool();
            const userRes = await pool.request()
                .input('userId', sql.Int, decoded.id)
                .query('SELECT id, full_name, role, avatar_url, is_active FROM Users WHERE id = @userId');

            if (userRes.recordset.length === 0 || !userRes.recordset[0].is_active) {
                return next(new Error('Authentication error: User inactive or not found'));
            }

            socket.user = userRes.recordset[0];
            next();
        } catch (err) {
            console.error('Socket auth error:', err.message);
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`[Socket] Người dùng kết nối: ${socket.user.full_name} (${socket.user.role}) - Socket ID: ${socket.id}`);

        // Admin tham gia phòng quản trị viên để nhận mọi thông báo chat mới
        if (socket.user.role === 'ADMIN') {
            socket.join('admin_channel');
        }

        // Tham gia phòng của một cuộc hội thoại cụ thể
        socket.on('join_conversation', (conversationId) => {
            const room = `conv_${conversationId}`;
            socket.join(room);
            console.log(`[Socket] ${socket.user.full_name} đã tham gia phòng ${room}`);
        });

        // Rời phòng
        socket.on('leave_conversation', (conversationId) => {
            const room = `conv_${conversationId}`;
            socket.leave(room);
        });

        // Gửi tin nhắn tư vấn trong cuộc hội thoại (Hỗ trợ text, image_url, video_url)
        socket.on('send_message', async (data, callback) => {
            try {
                const { conversation_id, message_text, image_url, video_url } = data;
                if (!conversation_id || (!message_text && !image_url && !video_url)) {
                    if (callback) callback({ success: false, message: 'Nội dung tin nhắn không hợp lệ' });
                    return;
                }

                const senderId = socket.user.id;
                const senderType = socket.user.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER';
                const text = message_text || (image_url ? '[Hình ảnh]' : (video_url ? '[Video clip]' : ''));

                const pool = await getPool();

                // Lưu tin nhắn vào Database
                const insertMsg = await pool.request()
                    .input('convId', sql.Int, conversation_id)
                    .input('senderId', sql.Int, senderId)
                    .input('senderType', sql.VarChar, senderType)
                    .input('text', sql.NVarChar, text)
                    .input('image', sql.NVarChar, image_url || null)
                    .input('video', sql.NVarChar, video_url || null)
                    .query(`
                        INSERT INTO ChatMessages (conversation_id, sender_id, sender_type, message_text, image_url, video_url, is_read)
                        OUTPUT INSERTED.*
                        VALUES (@convId, @senderId, @senderType, @text, @image, @video, 0)
                    `);

                const savedMsg = insertMsg.recordset[0];
                savedMsg.sender_name = socket.user.full_name;
                savedMsg.sender_avatar = socket.user.avatar_url;

                // Cập nhật trạng thái cuộc hội thoại
                await pool.request()
                    .input('convId', sql.Int, conversation_id)
                    .input('lastMsg', sql.NVarChar, text)
                    .input('senderType', sql.VarChar, senderType)
                    .query(`
                        UPDATE ChatConversations
                        SET last_message = @lastMsg,
                            last_message_at = GETDATE(),
                            unread_customer_count = CASE WHEN @senderType = 'ADMIN' THEN unread_customer_count + 1 ELSE unread_customer_count END,
                            unread_admin_count = CASE WHEN @senderType = 'CUSTOMER' THEN unread_admin_count + 1 ELSE unread_admin_count END
                        WHERE id = @convId
                    `);

                const room = `conv_${conversation_id}`;
                // Bắn tin nhắn đến tất cả thành viên trong phòng trò chuyện
                io.to(room).emit('receive_message', savedMsg);

                // Nếu khách nhắn, bắn thông báo đến kênh admin
                if (senderType === 'CUSTOMER') {
                    io.to('admin_channel').emit('new_customer_chat', {
                        conversation_id,
                        customer_name: socket.user.full_name,
                        customer_avatar: socket.user.avatar_url,
                        last_message: text,
                        image_url: image_url || null,
                        video_url: video_url || null,
                        created_at: savedMsg.created_at
                    });

                    // CHỈ tự động trả lời mở đầu cho đúng 2 câu hỏi gợi ý:
                    // 1. "Khiếu nại / thắc mắc?"
                    // 2. "Tư vấn sản phẩm?"
                    // Mọi câu hỏi và tin nhắn khác để Admin trả lời trực tiếp!
                    const trimmedText = text.trim().toLowerCase();
                    const isComplaintPrompt = trimmedText === 'khiếu nại / thắc mắc?' || 
                                              trimmedText === 'khiếu nại / thắc mắc' || 
                                              trimmedText.includes('khiếu nại') || 
                                              trimmedText.includes('thắc mắc');
                    const isConsultPrompt = trimmedText === 'tư vấn sản phẩm?' || 
                                            trimmedText === 'tư vấn sản phẩm';

                    if (isComplaintPrompt || isConsultPrompt) {
                        setTimeout(async () => {
                            try {
                                let replyText = "";
                                if (isComplaintPrompt) {
                                    replyText = "Dạ Moccoon xin chào bạn! Rất tiếc vì trải nghiệm chưa trọn vẹn của bạn. Bạn vui lòng nhắn Mã đơn hàng hoặc nêu rõ vấn đề đang gặp phải (đổi trả, hàng giao trễ, cần bảo hành...), Chuyên viên quản lý Moccoon sẽ liên hệ trực tiếp để hỗ trợ bạn ngay trong ít phút ạ!";
                                } else {
                                    replyText = "Chào bạn! Moccoon mang đến giải pháp làm sạch thuần chay chuẩn y khoa 100%:\n🌿 1. Nước tẩy trang Micellar (Làm sạch sâu bụi mịn & bã nhờn)\n🌿 2. Sữa rửa mặt dịu nhẹ pH 5.5 Bí đao & Tràm trà (Kháng viêm, gom mụn)\n🌿 3. Gel tẩy tế bào chết sinh học\nBạn có thể chia sẻ tình trạng da của mình để chuyên viên tư vấn chi tiết cho bạn nhé!";
                                }

                                const adminReply = await pool.request()
                                    .input('convId', sql.Int, conversation_id)
                                    .input('senderId', sql.Int, 1) // Admin user ID
                                    .input('senderType', sql.VarChar, 'ADMIN')
                                    .input('text', sql.NVarChar, replyText)
                                    .query(`
                                        INSERT INTO ChatMessages (conversation_id, sender_id, sender_type, message_text, is_read)
                                        OUTPUT INSERTED.*
                                        VALUES (@convId, @senderId, @senderType, @text, 0)
                                    `);

                                const botMsg = adminReply.recordset[0];
                                botMsg.sender_name = "Chuyên Viên Da Liễu Moccoon";
                                botMsg.sender_avatar = "/uploads/logo_moccoon.png";

                                await pool.request()
                                    .input('convId', sql.Int, conversation_id)
                                    .input('lastMsg', sql.NVarChar, replyText)
                                    .query(`
                                        UPDATE ChatConversations
                                        SET last_message = @lastMsg,
                                            last_message_at = GETDATE(),
                                            unread_customer_count = unread_customer_count + 1
                                        WHERE id = @convId
                                    `);

                                io.to(room).emit('receive_message', botMsg);
                            } catch (botErr) {
                                console.error('[Bot Reply Error]:', botErr);
                            }
                        }, 1000);
                    }
                }

                if (callback) callback({ success: true, data: savedMsg });
            } catch (err) {
                console.error('[Socket send_message error]:', err);
                if (callback) callback({ success: false, message: err.message });
            }
        });

        // Báo hiệu đang soạn tin nhắn (typing indicator)
        socket.on('typing', ({ conversation_id, is_typing }) => {
            socket.to(`conv_${conversation_id}`).emit('user_typing', {
                user_id: socket.user.id,
                user_name: socket.user.full_name,
                is_typing
            });
        });

        socket.on('disconnect', () => {
            console.log(`[Socket] Ngắt kết nối: ${socket.user.full_name}`);
        });
    });
}

module.exports = setupChatSocket;
