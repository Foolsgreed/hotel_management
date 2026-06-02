USE hotel_management;
GO

INSERT INTO Bill (
    BookingID, GuestID, RoomCharge, RoomService, RestaurantCharges, BarCharges,
    MiscCharges, IfLateCheckout, PaymentDate, PaymentMode, PaymentStatus,
    CreditCardNo, ExpireDate, ChequeNo
)
SELECT
    b.BookingID,
    b.GuestID,
    seed.RoomCharge,
    seed.RoomService,
    seed.RestaurantCharges,
    seed.BarCharges,
    seed.MiscCharges,
    seed.IfLateCheckout,
    seed.PaymentDate,
    seed.PaymentMode,
    seed.PaymentStatus,
    seed.CreditCardNo,
    seed.ExpireDate,
    seed.ChequeNo
FROM (
    SELECT 'minh.nguyen@example.com' AS GuestEmail, '101' AS RoomNo, '2026-05-10' AS ArrivalDate, '2026-05-12' AS DepartureDate, 120.00 AS RoomCharge, 25.00 AS RoomService, 42.00 AS RestaurantCharges, 0.00 AS BarCharges, 0.00 AS MiscCharges, 0 AS IfLateCheckout, '2026-05-12' AS PaymentDate, 'Credit Card' AS PaymentMode, 'Paid' AS PaymentStatus, '411111******1111' AS CreditCardNo, '2028-12-31' AS ExpireDate, NULL AS ChequeNo
    UNION ALL SELECT 'duc.pham@example.com', '202', '2026-04-28', '2026-04-30', 150.00, 0.00, 30.00, 12.00, 5.00, 0, '2026-04-30', 'Cash', 'Paid', NULL, NULL, NULL
    UNION ALL SELECT 'lan.tran@example.com', '201', '2026-05-18', '2026-05-20', 150.00, 18.00, 0.00, 0.00, 0.00, 0, NULL, NULL, 'Unpaid', NULL, NULL, NULL
) AS seed
INNER JOIN Guest g ON g.Email = seed.GuestEmail
INNER JOIN Booking b
    ON b.GuestID = g.GuestID
   AND b.RoomNo = seed.RoomNo
   AND b.ArrivalDate = seed.ArrivalDate
   AND b.DepartureDate = seed.DepartureDate
WHERE NOT EXISTS (
    SELECT 1
    FROM Bill existing
    WHERE existing.BookingID = b.BookingID
);
