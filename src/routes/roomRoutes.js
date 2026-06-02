const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');

// GET /api/rooms
router.get('/', roomController.getAllRooms);

// POST /api/rooms/search
router.post('/search', roomController.searchRooms);

module.exports = router;
