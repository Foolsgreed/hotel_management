const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { verifyToken, checkPermission } = require('../middleware/authMiddleware');

// GET /api/bookings
router.get('/', verifyToken, checkPermission('view_bookings'), bookingController.getAllBookings);

// POST /api/bookings/order (Batch booking)
router.post('/order', bookingController.createBookingOrder);

// POST /api/bookings
router.post('/', bookingController.createBooking);

// GET /api/bookings/:invoiceNo/details
router.get('/:invoiceNo/details', verifyToken, checkPermission('view_bookings'), bookingController.getBookingDetailsByInvoice);

// PUT /api/bookings/:invoiceNo/checkin
router.put('/:invoiceNo/checkin', verifyToken, checkPermission('manage_bookings'), bookingController.checkInBooking);

// PUT /api/bookings/:id/status
router.put('/:id/status', verifyToken, checkPermission('manage_bookings'), bookingController.updateBookingStatus);

// GET /api/bookings/statistics
router.get('/statistics', verifyToken, checkPermission('view_statistics'), bookingController.getBookingStatistics);

// GET /api/bookings/guest/:guestId
router.get('/guest/:guestId', bookingController.getBookingsByGuest);

// PUT /api/bookings/:id/cancel
router.put('/:id/cancel', bookingController.cancelBooking);

// POST /api/bookings/walkin
router.post('/walkin', bookingController.createWalkinBooking);

module.exports = router;
