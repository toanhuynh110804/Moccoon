const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/', cartController.getCart);
router.post('/add', cartController.addToCart);
router.put('/item/:itemId', cartController.updateQuantity);
router.delete('/item/:itemId', cartController.removeItem);
router.delete('/clear', cartController.clearCart);

module.exports = router;
