const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const checkPermission = require('../middleware/checkPermission');

// GET /api/bills (staff dashboard — all bills)
router.get('/', checkPermission('view_bills'), billController.getAllBills);

// GET /api/bills/guest/:guestId
router.get('/guest/:guestId', billController.getBillsByGuest);

// PUT /api/bills/pay/:invoiceNo
router.put('/pay/:invoiceNo', checkPermission('manage_bills'), billController.payInvoice);

module.exports = router;
