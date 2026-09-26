const express = require('express');
const router = express.Router({ mergeParams: true });
const reviewController = require('../controllers/reviewController');
const { verifyToken, requireAdmin } = require('../middlewares/authMiddleware');

// Lấy danh sách đánh giá của sản phẩm (Public)
router.get('/', reviewController.getProductReviews);

// Kiểm tra quyền gửi đánh giá của người dùng (Xác thực mua hàng)
router.get('/eligibility', verifyToken, reviewController.checkReviewEligibility);

// Gửi đánh giá mới cho sản phẩm (Cần đăng nhập - Mỗi tài khoản 1 lần, không được xóa sửa)
router.post('/', verifyToken, reviewController.createProductReview);

// Chặn hành vi sửa đánh giá
router.put('/', verifyToken, reviewController.updateProductReview);

// Chỉ Quản trị viên hệ thống (Admin) mới có quyền xóa/kiểm duyệt đánh giá
router.delete('/:id', verifyToken, requireAdmin, reviewController.deleteProductReview);

// Quản trị viên trả lời đánh giá của khách hàng
router.post('/:id/reply', verifyToken, requireAdmin, reviewController.replyProductReview);

module.exports = router;
