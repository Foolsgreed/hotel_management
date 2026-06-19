const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const checkPermission = require('../middleware/checkPermission');

// GET /api/rooms
router.get('/', roomController.getAllRooms);

// POST /api/rooms/search
router.post('/search', roomController.searchRooms);

// GET /api/rooms/status (staff dashboard)
router.get('/status', checkPermission('view_rooms'), roomController.getAllRoomsWithStatus);

// PUT /api/rooms/:roomNo/status (staff dashboard)
router.put('/:roomNo/status', checkPermission('manage_rooms'), roomController.updateRoomStatus);

module.exports = router;
