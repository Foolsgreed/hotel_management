const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { verifyToken, checkPermission } = require('../middleware/authMiddleware');

// GET /api/rooms
router.get('/', roomController.getAllRooms);

// POST /api/rooms/search
router.post('/search', roomController.searchRooms);

// POST /api/rooms/available-specific
router.post('/available-specific', roomController.getAvailableSpecificRooms);

// GET /api/rooms/status
router.get('/status', verifyToken, checkPermission('view_rooms'), roomController.getAllRoomsWithStatus);

// PUT /api/rooms/:roomNo/status
router.put('/:roomNo/status', verifyToken, checkPermission('manage_rooms'), roomController.updateRoomStatus);

// GET /api/rooms/types
router.get('/types', roomController.getRoomTypes);

router.put('/types/:type/price', verifyToken, checkPermission('manage_pricing'), roomController.updateRoomPrice);

module.exports = router;
