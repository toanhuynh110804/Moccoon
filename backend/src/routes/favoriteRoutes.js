const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.post('/toggle', verifyToken, favoriteController.toggleFavorite);
router.get('/', verifyToken, favoriteController.getMyFavorites);
router.get('/ids', verifyToken, favoriteController.getMyFavoriteIds);

module.exports = router;
