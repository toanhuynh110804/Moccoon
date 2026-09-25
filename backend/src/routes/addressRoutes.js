const express = require('express');
const router = express.Router();
const addressController = require('../controllers/addressController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Tất cả các route địa chỉ yêu cầu đăng nhập tài khoản
router.use(verifyToken);

router.get('/', addressController.getMyAddresses);
router.post('/', addressController.addAddress);
router.put('/:id/default', addressController.setDefaultAddress);
router.delete('/:id', addressController.deleteAddress);

module.exports = router;
