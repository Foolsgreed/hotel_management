const RoomModel = require('../models/roomModel');

exports.getAllRooms = async (req, res) => {
    try {
        const rooms = await RoomModel.getAllRooms();
        res.status(200).json(rooms);
    } catch (error) {
        console.error("Error in getAllRooms: ", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.getAvailableSpecificRooms = async (req, res) => {
    try {
        const { arrivalDate, departureDate } = req.body;
        if (!arrivalDate || !departureDate) {
            return res.status(400).json({ message: 'Arrival and Departure dates are required' });
        }
        const rooms = await RoomModel.getAvailableSpecificRooms(arrivalDate, departureDate);
        res.status(200).json(rooms);
    } catch (error) {
        console.error("Error fetching available specific rooms:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.searchRooms = async (req, res) => {
    try {
        const { arrivalDate, departureDate, guests, numRooms } = req.body;
        if (!arrivalDate || !departureDate || !guests) {
            return res.status(400).json({ message: 'Missing parameters' });
        }
        const recommendations = await RoomModel.searchRooms(
            arrivalDate, 
            departureDate, 
            parseInt(guests), 
            numRooms ? parseInt(numRooms) : null
        );
        res.status(200).json(recommendations);
    } catch (error) {
        console.error("Error searching rooms:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.getAllRoomsWithStatus = async (req, res) => {
    try {
        const rooms = await RoomModel.getAllRoomsWithStatus();
        res.status(200).json(rooms);
    } catch (error) {
        console.error("Error in getAllRoomsWithStatus: ", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.updateRoomStatus = async (req, res) => {
    try {
        const roomNo = req.params.roomNo;
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }

        if (req.user && req.user.RoleTitle === 'Housekeeper') {
            if (!['Available', 'Cleaning'].includes(status)) {
                return res.status(403).json({ message: `Housekeeper cannot set room status to '${status}'.` });
            }
        }

        const success = await RoomModel.updateRoomStatus(roomNo, status);
        if (success) {
            res.status(200).json({ message: 'Status updated successfully' });
        } else {
            res.status(404).json({ message: 'Room not found' });
        }
    } catch (error) {
        console.error("Error updating room status:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.getRoomTypes = async (req, res) => {
    try {
        const types = await RoomModel.getRoomTypes();
        res.status(200).json(types);
    } catch (error) {
        console.error('Error fetching room types:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.updateRoomPrice = async (req, res) => {
    try {
        const { type } = req.params;
        const { price } = req.body;
        if (!price) return res.status(400).json({ message: 'Price is required' });
        const success = await RoomModel.updateRoomPrice(type, price);
        if (success) {
            res.status(200).json({ message: 'Price updated successfully' });
        } else {
            res.status(404).json({ message: 'Room type not found' });
        }
    } catch (error) {
        console.error('Error updating room price:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
