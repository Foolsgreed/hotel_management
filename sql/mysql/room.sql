USE hotel_management;
GO

INSERT INTO Room (RoomNo, RoomType, HotelCode, Occupancy, FloorNo, RoomStatus)
SELECT seed.RoomNo, seed.RoomType, h.HotelCode, seed.Occupancy, seed.FloorNo, seed.RoomStatus
FROM (
    SELECT '101' AS RoomNo, 'Standard Twin' AS RoomType, 2 AS Occupancy, 1 AS FloorNo, 'Available' AS RoomStatus
    UNION ALL SELECT '102', 'Standard Twin', 2, 1, 'Available'
    UNION ALL SELECT '103', 'Standard Twin', 2, 1, 'Available'
    UNION ALL SELECT '104', 'Standard Twin', 2, 1, 'Available'
    UNION ALL SELECT '105', 'Standard Twin', 2, 1, 'Available'
    UNION ALL SELECT '106', 'Standard Twin', 2, 1, 'Available'
    UNION ALL SELECT '201', 'Standard Double', 4, 2, 'Available'
    UNION ALL SELECT '202', 'Standard Double', 4, 2, 'Available'
    UNION ALL SELECT '203', 'Standard Double', 4, 2, 'Available'
    UNION ALL SELECT '204', 'Standard Double', 4, 2, 'Available'
    UNION ALL SELECT '205', 'Standard Double', 4, 2, 'Available'
    UNION ALL SELECT '206', 'Standard Double', 4, 2, 'Available'
    UNION ALL SELECT '301', 'Deluxe', 4, 3, 'Available'
    UNION ALL SELECT '302', 'Deluxe', 4, 3, 'Available'
    UNION ALL SELECT '303', 'Deluxe', 4, 3, 'Available'
    UNION ALL SELECT '304', 'Deluxe', 4, 3, 'Available'
    UNION ALL SELECT '305', 'Deluxe', 4, 3, 'Available'
    UNION ALL SELECT '306', 'Deluxe', 4, 3, 'Available'
    UNION ALL SELECT '401', 'Suite', 16, 4, 'Available'
    UNION ALL SELECT '402', 'Suite', 16, 4, 'Available'
) AS seed
INNER JOIN Hotel h ON h.HotelName = 'Grand Palace Hotel';
