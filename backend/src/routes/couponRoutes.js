const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const { verifyToken, requireAdmin } = require('../middlewares/authMiddleware');

// Khách hàng
router.get('/available', couponController.getAvailableCoupons);
router.post('/apply', couponController.applyCoupon);

// Quản trị viên
router.get('/admin/all', verifyToken, requireAdmin, couponController.getAdminCoupons);
router.post('/admin/create', verifyToken, requireAdmin, couponController.createCoupon);
router.put('/admin/:id/status', verifyToken, requireAdmin, couponController.toggleCouponStatus);
router.delete('/admin/:id', verifyToken, requireAdmin, couponController.deleteCoupon);

module.exports = router;
