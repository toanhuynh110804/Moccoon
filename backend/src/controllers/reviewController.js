const { getPool, sql } = require('../config/db');

// Hàm che tên người dùng khi chọn đánh giá ẩn danh (Ví dụ: "Nguyễn Thị Mai Linh" -> "N******h")
function maskUserName(fullName) {
    if (!fullName) return 'Người dùng ẩn danh';
    const trimmed = fullName.trim();
    if (trimmed.length <= 2) return trimmed[0] + '***';
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    const middleLen = Math.min(Math.max(trimmed.length - 2, 3), 5);
    return `${first}${'*'.repeat(middleLen)}${last}`;
}

// 1. Lấy danh sách đánh giá của sản phẩm kèm số liệu thống kê (Sao trung bình, tỉ lệ sao)
exports.getProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;
        const pool = await getPool();

        const query = `
            SELECT 
                r.id, r.product_id, r.user_id, r.rating, r.comment, r.image_url, r.is_anonymous, r.created_at,
                r.admin_reply, r.replied_at, r.reply_by,
                u.full_name AS user_name, u.avatar_url AS user_avatar, u.role AS user_role
            FROM ProductReviews r
            INNER JOIN Users u ON r.user_id = u.id
            WHERE r.product_id = @productId AND r.is_active = 1
            ORDER BY r.created_at DESC;
        `;

        const result = await pool.request()
            .input('productId', sql.Int, parseInt(productId))
            .query(query);

        const reviews = result.recordset;
        const total = reviews.length;

        let totalStars = 0;
        const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

        reviews.forEach(r => {
            totalStars += r.rating;
            if (breakdown[r.rating] !== undefined) {
                breakdown[r.rating]++;
            }

            // Xử lý che tên và ảnh đại diện nếu khách chọn Đánh giá ẩn danh
            if (r.is_anonymous) {
                r.display_name = maskUserName(r.user_name);
                r.display_avatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100';
            } else {
                r.display_name = r.user_name;
                r.display_avatar = r.user_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';
            }
        });

        const averageRating = total > 0 ? (totalStars / total).toFixed(1) : "5.0";

        return res.status(200).json({
            success: true,
            data: {
                reviews,
                stats: {
                    total_reviews: total,
                    average_rating: parseFloat(averageRating),
                    breakdown
                }
            }
        });
    } catch (error) {
        console.error('getProductReviews error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi tải danh sách đánh giá sản phẩm.',
            error: error.message
        });
    }
};

// 2. Khách hàng gửi đánh giá mới (Hỗ trợ tùy chọn Ẩn danh hoặc Công khai)
exports.createProductReview = async (req, res) => {
    try {
        const { productId } = req.params;
        const { rating, comment, image_url, is_anonymous } = req.body;
        const userId = req.user.id;
        const isAnonymousBit = is_anonymous ? 1 : 0;

        if (!rating || isNaN(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn số sao đánh giá hợp lệ từ 1 đến 5 sao.'
            });
        }

        if (!comment || !comment.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập nội dung đánh giá và trải nghiệm thực tế của bạn.'
            });
        }

        const pool = await getPool();

        // Kiểm tra xem sản phẩm có tồn tại không
        const checkProd = await pool.request()
            .input('prodId', sql.Int, parseInt(productId))
            .query('SELECT id, name FROM Products WHERE id = @prodId');

        if (checkProd.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm cần đánh giá.'
            });
        }

        // KIỂM TRA QUY TẮC: 1 tài khoản chỉ được đánh giá 1 lần, KHÔNG ĐƯỢC XÓA SỬA
        const existingCheck = await pool.request()
            .input('prodId', sql.Int, parseInt(productId))
            .input('userId', sql.Int, userId)
            .query('SELECT id FROM ProductReviews WHERE product_id = @prodId AND user_id = @userId AND is_active = 1');

        if (existingCheck.recordset.length > 0) {
            return res.status(400).json({
                success: false,
                already_reviewed: true,
                message: 'Bạn đã gửi đánh giá cho sản phẩm này rồi! Theo quy định, mỗi khách hàng chỉ được đánh giá 1 lần và đánh giá không được phép xóa hay chỉnh sửa để đảm bảo tính khách quan.'
            });
        }

        const insertQuery = `
            INSERT INTO ProductReviews (product_id, user_id, rating, comment, image_url, is_anonymous, is_active)
            OUTPUT INSERTED.*
            VALUES (@productId, @userId, @rating, @comment, @image_url, @is_anonymous, 1)
        `;

        const result = await pool.request()
            .input('productId', sql.Int, parseInt(productId))
            .input('userId', sql.Int, userId)
            .input('rating', sql.Int, parseInt(rating))
            .input('comment', sql.NVarChar, comment.trim())
            .input('image_url', sql.NVarChar, image_url ? image_url.trim() : null)
            .input('is_anonymous', sql.Bit, isAnonymousBit)
            .query(insertQuery);

        const newReview = result.recordset[0];
        newReview.display_name = isAnonymousBit ? maskUserName(req.user.full_name) : req.user.full_name;
        newReview.display_avatar = isAnonymousBit ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100' : (req.user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100');
        newReview.user_name = req.user.full_name;
        newReview.user_avatar = req.user.avatar_url;

        return res.status(201).json({
            success: true,
            message: 'Đăng đánh giá sản phẩm thành công! Cảm ơn phản hồi thực tế của bạn 🌿',
            data: newReview
        });
    } catch (error) {
        console.error('createProductReview error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi gửi đánh giá sản phẩm.',
            error: error.message
        });
    }
};

// 3. Quy định: Khách hàng không được phép chỉnh sửa đánh giá
exports.updateProductReview = async (req, res) => {
    return res.status(403).json({
        success: false,
        message: 'Đánh giá của khách hàng không được phép chỉnh sửa sau khi đã gửi.'
    });
};

// 4. Quy định: Khách hàng không được phép xóa đánh giá (Chỉ Quản trị viên mới có quyền kiểm duyệt nếu vi phạm)
exports.deleteProductReview = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Đánh giá của khách hàng không được phép xóa sau khi đã gửi.'
            });
        }

        const { id } = req.params;
        const pool = await getPool();

        await pool.request()
            .input('id', sql.Int, parseInt(id))
            .query('DELETE FROM ProductReviews WHERE id = @id');

        return res.status(200).json({
            success: true,
            message: 'Đã xóa đánh giá thành công (Quyền Quản trị viên)!'
        });
    } catch (error) {
        console.error('deleteProductReview error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa đánh giá.',
            error: error.message
        });
    }
};

// 5. Quản trị viên trả lời / phản hồi bình luận đánh giá của khách hàng
exports.replyProductReview = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Chỉ Quản trị viên mới có quyền trả lời bình luận của khách hàng.'
            });
        }

        const { id } = req.params;
        const { reply } = req.body;

        if (!reply || !reply.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Nội dung trả lời không được để trống.'
            });
        }

        const pool = await getPool();
        const adminName = req.user.full_name || 'Quản Trị Viên Moccoon';

        const updateResult = await pool.request()
            .input('id', sql.Int, parseInt(id))
            .input('reply', sql.NVarChar, reply.trim())
            .input('replyBy', sql.NVarChar, adminName)
            .query(`
                UPDATE ProductReviews 
                SET admin_reply = @reply, 
                    replied_at = GETDATE(),
                    reply_by = @replyBy
                OUTPUT INSERTED.*
                WHERE id = @id AND is_active = 1
            `);

        if (updateResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bình luận cần trả lời.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Đã gửi câu trả lời bình luận thành công!',
            data: updateResult.recordset[0]
        });
    } catch (error) {
        console.error('replyProductReview error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lưu phản hồi đánh giá.',
            error: error.message
        });
    }
};

