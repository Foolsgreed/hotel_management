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
