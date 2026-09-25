const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyToken, requireAdmin } = require('../middlewares/authMiddleware');

const reviewRoutes = require('./reviewRoutes');

router.get('/', productController.getProducts);
router.use('/:productId/reviews', reviewRoutes);
router.get('/:identifier', productController.getProductDetail);
router.post('/', verifyToken, requireAdmin, productController.createProduct);
router.put('/:id', verifyToken, requireAdmin, productController.updateProduct);
router.delete('/:id', verifyToken, requireAdmin, productController.deleteProduct);

module.exports = router;
