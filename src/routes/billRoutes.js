const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const { verifyToken, checkPermission } = require('../middleware/authMiddleware');

// GET /api/bills
router.get('/', verifyToken, checkPermission('view_bills'), billController.getAllBills);

// GET /api/bills/guest/:guestId
router.get('/guest/:guestId', billController.getBillsByGuest);

// PUT /api/bills/pay/:invoiceNo
router.put('/pay/:invoiceNo', verifyToken, checkPermission('manage_bills'), billController.payInvoice);

// GET /api/bills/:invoiceNo
router.get('/:invoiceNo', verifyToken, checkPermission('view_bills'), billController.getBillDetails);

module.exports = router;
