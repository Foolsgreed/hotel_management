const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const checkPermission = require('../middleware/checkPermission');

// GET /api/bookings (Staff only ideally)
router.get('/', checkPermission('view_bookings'), bookingController.getAllBookings);

// POST /api/bookings/order (Batch booking)
router.post('/order', bookingController.createBookingOrder);

// POST /api/bookings
router.post('/', bookingController.createBooking);

// PUT /api/bookings/:id/status
router.put('/:id/status', checkPermission('manage_bookings'), bookingController.updateBookingStatus);

// GET /api/bookings/statistics
router.get('/statistics', checkPermission('view_statistics'), bookingController.getBookingStatistics);

// GET /api/bookings/guest/:guestId
router.get('/guest/:guestId', bookingController.getBookingsByGuest);

// PUT /api/bookings/:id/cancel
router.put('/:id/cancel', bookingController.cancelBooking);

module.exports = router;
