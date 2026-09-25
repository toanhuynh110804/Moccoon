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

        // Gửi tin nhắn tư vấn trong cuộc hội thoại
        socket.on('send_message', async (data, callback) => {
            try {
                const { conversation_id, message_text, image_url } = data;
                if (!conversation_id || (!message_text && !image_url)) {
                    if (callback) callback({ success: false, message: 'Nội dung tin nhắn không hợp lệ' });
                    return;
                }

                const senderId = socket.user.id;
                const senderType = socket.user.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER';
                const text = message_text || (image_url ? '[Hình ảnh]' : '');

                const pool = await getPool();

                // Lưu tin nhắn vào Database
                const insertMsg = await pool.request()
                    .input('convId', sql.Int, conversation_id)
                    .input('senderId', sql.Int, senderId)
                    .input('senderType', sql.VarChar, senderType)
                    .input('text', sql.NVarChar, text)
                    .input('image', sql.NVarChar, image_url || null)
                    .query(`
                        INSERT INTO ChatMessages (conversation_id, sender_id, sender_type, message_text, image_url, is_read)
                        OUTPUT INSERTED.*
                        VALUES (@convId, @senderId, @senderType, @text, @image, 0)
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

                // Nếu khách nhắn, bắn thông báo đến kênh admin và kích hoạt phản hồi tự động từ chuyên viên da liễu Moccoon
                if (senderType === 'CUSTOMER') {
                    io.to('admin_channel').emit('new_customer_chat', {
                        conversation_id,
                        customer_name: socket.user.full_name,
                        customer_avatar: socket.user.avatar_url,
                        last_message: text,
                        created_at: savedMsg.created_at
                    });

                    // Tự động phản hồi tư vấn chuẩn y khoa sau 1.2s
                    setTimeout(async () => {
                        try {
                            const lower = text.toLowerCase();
                            let replyText = "Cảm ơn bạn đã liên hệ Moccoon Skincare! Chuyên viên luôn sẵn sàng đồng hành cùng bạn. Bạn có thể chia sẻ cụ thể hơn về tình trạng da (da dầu, khô hay hỗn hợp) để mình tư vấn chu trình phù hợp nhất nhé!";
                            
                            if (lower.includes('mụn') || lower.includes('dầu') || lower.includes('nhờn')) {
                                replyText = "Chào bạn! Với tình trạng da dầu mụn, bạn nên dùng **Nước tẩy trang Moccoon Micellar** để làm sạch cặn dầu bã nhờn sâu trong lỗ chân lông, sau đó dùng **Sữa rửa mặt pH 5.5** chứa chiết xuất tràm trà và rau má để kháng viêm, gom cồi mụn mà không gây căng rát nhé!";
                            } else if (lower.includes('nhạy cảm') || lower.includes('kích ứng') || lower.includes('đỏ')) {
                                replyText = "Làn da nhạy cảm rất an tâm khi sử dụng sản phẩm Moccoon vì toàn bộ đều đạt tiêu chuẩn thuần chay 100% không cồn, không paraben, không hương liệu tổng hợp. Bạn nên rửa mặt nhẹ nhàng và cấp ẩm ngay sau khi rửa nhé!";
                            } else if (lower.includes('thứ tự') || lower.includes('3 bước') || lower.includes('cách dùng') || lower.includes('sử dụng')) {
                                replyText = "Quy trình làm sạch chuẩn 3 bước Moccoon:\n🌿 Bước 1: Nước tẩy trang (loại bỏ bụi mịn PM2.5, bã nhờn).\n🌿 Bước 2: Sữa rửa mặt dịu nhẹ pH 5.5 cân bằng màng sinh học da.\n🌿 Bước 3: Tẩy tế bào chết gel sinh học (sử dụng 1-2 lần/tuần vào buổi tối sau bước rửa mặt).";
                            } else if (lower.includes('combo') || lower.includes('giá') || lower.includes('khuyến mãi') || lower.includes('ưu đãi')) {
                                replyText = "Moccoon hiện đang có chương trình ưu đãi đặc biệt: **Combo Trọn Bộ 3 Bước Làm Sạch Chuyên Sâu** giảm ngay 25%, từ 760.000đ chỉ còn 580.000đ và được Miễn Phí Vận Chuyển toàn quốc! Bạn có thể đặt ngay trong mục Cửa hàng nhé!";
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
                    }, 1200);
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
