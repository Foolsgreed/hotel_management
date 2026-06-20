const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

// GET /api/bookings (Staff only ideally)
router.get('/', bookingController.getAllBookings);

// POST /api/bookings/order (Batch booking)
router.post('/order', bookingController.createBookingOrder);

// POST /api/bookings
router.post('/', bookingController.createBooking);

// PUT /api/bookings/:id/status
router.put('/:id/status', bookingController.updateBookingStatus);

// GET /api/bookings/statistics
router.get('/statistics', bookingController.getBookingStatistics);

// GET /api/bookings/guest/:guestId
router.get('/guest/:guestId', bookingController.getBookingsByGuest);

// PUT /api/bookings/:id/cancel
router.put('/:id/cancel', bookingController.cancelBooking);

// GET /api/bookings/:invoiceNo/details
router.get('/:invoiceNo/details', bookingController.getBookingDetailsByInvoice);

// PUT /api/bookings/:invoiceNo/checkin
router.put('/:invoiceNo/checkin', bookingController.checkInBooking);

// POST /api/bookings/walkin
router.post('/walkin', bookingController.createWalkinBooking);

module.exports = router;
