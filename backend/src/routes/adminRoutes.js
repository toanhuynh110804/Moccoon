const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, requireAdmin } = require('../middlewares/authMiddleware');

router.use(verifyToken, requireAdmin);

router.get('/dashboard', adminController.getDashboardStats);
router.get('/export-excel', adminController.exportExcel);
router.get('/customers', adminController.getCustomers);
router.put('/customers/:id/status', adminController.toggleCustomerStatus);
router.delete('/customers/:id', adminController.deleteCustomer);

module.exports = router;
