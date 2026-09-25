const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');
const { verifyToken, requireAdmin } = require('../middlewares/authMiddleware');

router.get('/', bannerController.getBanners);
router.post('/', verifyToken, requireAdmin, bannerController.createBanner);
router.put('/:id', verifyToken, requireAdmin, bannerController.updateBanner);
router.delete('/:id', verifyToken, requireAdmin, bannerController.deleteBanner);

module.exports = router;
