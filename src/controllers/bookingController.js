const BookingModel = require('../models/bookingModel');

exports.getAllBookings = async (req, res) => {
    try {
        const bookings = await BookingModel.getAllBookings();
        res.status(200).json(bookings);
    } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.createBookingOrder = async (req, res) => {
    try {
        const { guestId, comboParts, arrivalDate, departureDate, numAdults, numChildren, specialReq } = req.body;
        
        if (!guestId || !comboParts || !arrivalDate || !departureDate) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const invoiceNo = await BookingModel.createBookingOrder(guestId, comboParts, arrivalDate, departureDate, numAdults, numChildren, specialReq);
        res.status(201).json({ message: 'Booking order created successfully', invoiceNo: invoiceNo });
    } catch (error) {
        console.error("Error creating booking order:", error);
        res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
};

exports.createBooking = async (req, res) => {
    try {
        const { guestId, roomType, arrivalDate, departureDate } = req.body;
        
        if (!guestId || !roomType || !arrivalDate || !departureDate) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const newBooking = await BookingModel.createBooking(guestId, roomType, arrivalDate, departureDate);
        res.status(201).json({ message: 'Booking created successfully', bookingId: newBooking.BookingID });
    } catch (error) {
        console.error("Error creating booking:", error);
        if (error.message === 'No rooms available for this type.') {
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.updateBookingStatus = async (req, res) => {
    try {
        const bookingId = req.params.id;
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }
        const success = await BookingModel.updateBookingStatus(bookingId, status);
        if (success) {
            res.status(200).json({ message: 'Status updated successfully' });
        } else {
            res.status(404).json({ message: 'Booking not found' });
        }
    } catch (error) {
        console.error("Error updating booking status:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.getBookingStatistics = async (req, res) => {
    try {
        const stats = await BookingModel.getBookingStatistics();
        res.status(200).json(stats);
    } catch (error) {
        console.error("Error fetching booking statistics:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.getBookingsByGuest = async (req, res) => {
    try {
        const guestId = req.params.guestId;
        const bookings = await BookingModel.getBookingsByGuest(guestId);
        res.status(200).json(bookings);
    } catch (error) {
        console.error("Error fetching guest bookings:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.cancelBooking = async (req, res) => {
    try {
        const bookingId = req.params.id;
        const guestId = req.body.guestId; // Should be in body or from auth token
        if (!guestId) {
            return res.status(400).json({ message: 'Guest ID is required' });
        }
        const success = await BookingModel.cancelBooking(bookingId, guestId);
        if (success) {
            res.status(200).json({ message: 'Booking cancelled successfully' });
        } else {
            res.status(400).json({ message: 'Unable to cancel booking. It may have already been cancelled or you do not have permission.' });
        }
    } catch (error) {
        console.error("Error cancelling booking:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
