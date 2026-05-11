const RoomModel = require('../models/roomModel');

exports.getAllRooms = async (req, res) => {
    try {
        const rooms = await RoomModel.getAllRooms();
        res.json(rooms);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách phòng', error: err.message });
    }
};
