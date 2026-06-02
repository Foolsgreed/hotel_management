USE hotel_management;
GO
INSERT INTO Booking (
    HotelCode, GuestID, RoomNo, BookingDate, BookingTime, ArrivalDate,
    DepartureDate, EstArrivalTime, EstDepartureTime, NumAdults, NumChildren,
    SpecialReq, BookingStatus
)
SELECT
    h.HotelCode,
    g.GuestID,
    seed.RoomNo,
    seed.BookingDate,
    seed.BookingTime,
    seed.ArrivalDate,
    seed.DepartureDate,
    seed.EstArrivalTime,
    seed.EstDepartureTime,
    seed.NumAdults,
    seed.NumChildren,
    seed.SpecialReq,
    seed.BookingStatus
FROM (
    SELECT 'minh.nguyen@example.com' AS GuestEmail, '101' AS RoomNo, '2026-05-01' AS BookingDate, '09:30:00' AS BookingTime, '2026-05-10' AS ArrivalDate, '2026-05-12' AS DepartureDate, '14:00:00' AS EstArrivalTime, '11:00:00' AS EstDepartureTime, 2 AS NumAdults, 0 AS NumChildren, 'Quiet room if available' AS SpecialReq, 'CheckedOut' AS BookingStatus
    UNION ALL SELECT 'lan.tran@example.com', '201', '2026-05-05', '10:15:00', '2026-05-18', '2026-05-20', '15:00:00', '12:00:00', 2, 1, 'Need baby cot', 'Confirmed'
    UNION ALL SELECT 'alex.carter@example.com', '301', '2026-05-10', '11:00:00', '2026-06-01', '2026-06-04', '16:00:00', '10:30:00', 2, 0, 'Airport pickup requested', 'Confirmed'
    UNION ALL SELECT 'yuna.kim@example.com', '401', '2026-05-12', '13:45:00', '2026-06-10', '2026-06-14', '14:00:00', '12:00:00', 4, 2, 'Family trip, high floor preferred', 'Pending'
    UNION ALL SELECT 'duc.pham@example.com', '202', '2026-04-20', '08:20:00', '2026-04-28', '2026-04-30', '13:30:00', '11:30:00', 1, 0, NULL, 'CheckedOut'
) AS seed
INNER JOIN Hotel h ON h.HotelName = 'Grand Palace Hotel'
INNER JOIN Guest g ON g.Email = seed.GuestEmail
WHERE NOT EXISTS (
    SELECT 1
    FROM Booking b
    WHERE b.GuestID = g.GuestID
      AND b.RoomNo = seed.RoomNo
      AND b.ArrivalDate = seed.ArrivalDate
      AND b.DepartureDate = seed.DepartureDate
);
