const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

// GET /api/bookings (Staff only ideally)
router.get('/', bookingController.getAllBookings);

// POST /api/bookings
router.post('/', bookingController.createBooking);

// PUT /api/bookings/:id/status
router.put('/:id/status', bookingController.updateBookingStatus);

// GET /api/bookings/statistics
router.get('/statistics', bookingController.getBookingStatistics);

module.exports = router;
