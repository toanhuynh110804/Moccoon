const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { verifyToken, requireAdmin } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/conversation', chatController.getCustomerConversation);
router.get('/messages/:conversationId', chatController.getMessages);
router.post('/send', chatController.sendMessage);

// Admin Chat Support
router.get('/admin/conversations', requireAdmin, chatController.getAdminConversations);

module.exports = router;
