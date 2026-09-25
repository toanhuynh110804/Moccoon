const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken, requireAdmin } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.post('/checkout', orderController.checkout);
router.get('/my-orders', orderController.getMyOrders);
router.get('/:identifier', orderController.getOrderDetail);
router.put('/:id/cancel', orderController.cancelOrder);

// Admin Order Management
router.get('/admin/all', requireAdmin, orderController.getAdminOrders);
router.put('/admin/:id/status', requireAdmin, orderController.updateOrderStatus);

module.exports = router;
