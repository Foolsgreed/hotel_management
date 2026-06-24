-- =======================================================
-- FAKE DATA SCRIPT CHO HOTEL MANAGEMENT
-- Chạy script này trong SQL Server Management Studio (SSMS) 
-- sau khi đã có dữ liệu mẫu về Khách sạn (Hotel) và Phòng (Room).
-- =======================================================
USE hotel_management;
GO

PRINT 'Bắt đầu thêm dữ liệu giả (Fake Data)...';

-- 1. Xóa dữ liệu cũ (Tùy chọn, để comment nếu muốn giữ lại dữ liệu cũ)
-- DELETE FROM Review;
-- DELETE FROM Booking;
-- DELETE FROM Bill;
-- DELETE FROM Guest;

-- 2. Thêm dữ liệu Khách Hàng (Guest)
INSERT INTO Guest (FirstName, LastName, DOB, Gender, PhoneNo, Email, Password, PassportNo)
VALUES 
('John', 'Doe', '1990-05-15', 'Male', '0123456789', 'john@example.com', 'hashed_pwd_123', 'A1234567'),
('Jane', 'Smith', '1985-08-20', 'Female', '0987654321', 'jane@example.com', 'hashed_pwd_123', 'B9876543'),
('Alice', 'Johnson', '1992-11-10', 'Female', '0555123456', 'alice@example.com', 'hashed_pwd_123', 'C5551234'),
('Bob', 'Brown', '1988-02-28', 'Male', '0555987654', 'bob@example.com', 'hashed_pwd_123', 'D5559876'),
('Charlie', 'Davis', '1995-07-07', 'Male', '0111222333', 'charlie@example.com', 'hashed_pwd_123', 'E1112223');

PRINT 'Thêm Khách Hàng thành công.';
GO

-- 3. Tạo Hóa Đơn (Bill) phân bố đều trong 1 năm qua
DECLARE @Guest1 INT = (SELECT MIN(GuestID) FROM Guest);
DECLARE @Guest2 INT = @Guest1 + 1;
DECLARE @Guest3 INT = @Guest1 + 2;
DECLARE @Guest4 INT = @Guest1 + 3;
DECLARE @Guest5 INT = @Guest1 + 4;

INSERT INTO Bill (GuestID, TotalAmount, RoomService, IfLateCheckout, PaymentDate, PaymentMode, PaymentStatus)
VALUES 
(@Guest1, 1500.00, 50.00, 0, '2025-01-15', 'Credit Card', 'Paid'),
(@Guest2, 2200.00, 100.00, 1, '2025-02-20', 'Cash', 'Paid'),
(@Guest3, 800.00, 0.00, 0, '2025-03-10', 'Credit Card', 'Paid'),
(@Guest4, 3000.00, 200.00, 0, '2025-04-05', 'Bank Transfer', 'Paid'),
(@Guest5, 1200.00, 20.00, 0, '2025-05-12', 'Credit Card', 'Paid'),
(@Guest1, 1800.00, 150.00, 1, '2025-06-18', 'Cash', 'Paid'),
(@Guest2, 950.00, 0.00, 0, '2025-07-22', 'Credit Card', 'Paid'),
(@Guest3, 2500.00, 50.00, 0, '2025-08-30', 'Bank Transfer', 'Paid'),
(@Guest4, 1100.00, 0.00, 0, '2025-09-14', 'Credit Card', 'Paid'),
(@Guest5, 1750.00, 100.00, 1, '2025-10-25', 'Cash', 'Paid'),
(@Guest1, 850.00, 0.00, 0, '2025-11-05', 'Credit Card', 'Paid'),
(@Guest2, 3200.00, 300.00, 0, '2025-12-15', 'Bank Transfer', 'Paid'),
(@Guest3, 1400.00, 50.00, 0, '2026-01-20', 'Credit Card', 'Paid'),
(@Guest4, 2100.00, 150.00, 1, '2026-02-28', 'Cash', 'Paid'),
(@Guest5, 900.00, 0.00, 0, '2026-03-10', 'Credit Card', 'Paid'),
(@Guest1, 1600.00, 100.00, 0, '2026-04-18', 'Bank Transfer', 'Paid'),
(@Guest2, 2400.00, 200.00, 1, '2026-05-22', 'Credit Card', 'Paid'),
(@Guest3, 1150.00, 50.00, 0, '2026-06-05', 'Cash', 'Paid'),
(@Guest4, 1900.00, 0.00, 0, '2026-06-10', 'Credit Card', 'Paid'),
(@Guest5, 2750.00, 150.00, 1, '2026-06-15', 'Bank Transfer', 'Paid');

PRINT 'Thêm Hóa Đơn (Bill) thành công.';
GO

-- 4. Tạo Đặt Phòng (Booking) khớp với số lượng Bill đã tạo
DECLARE @HotelCode INT = (SELECT TOP 1 HotelCode FROM Hotel);

-- Lấy ngẫu nhiên vài mã phòng hiện có trong DB để tránh lỗi Khóa Ngoại
DECLARE @Room1 VARCHAR(50) = (SELECT TOP 1 RoomNo FROM Room);
DECLARE @Room2 VARCHAR(50) = (SELECT TOP 1 RoomNo FROM Room WHERE RoomNo != @Room1);
IF @Room2 IS NULL SET @Room2 = @Room1;

-- Sử dụng con trỏ tạm hoặc lấy trực tiếp các InvoiceNo mới nhất
-- Ở đây ta dùng SELECT kết hợp ROW_NUMBER để an toàn hơn
INSERT INTO Booking (HotelCode, GuestID, RoomNo, InvoiceNo, BookingDate, BookingTime, ArrivalDate, DepartureDate, NumAdults, NumChildren, BookingStatus)
SELECT TOP 20
    @HotelCode, 
    b.GuestID, 
    CASE WHEN (ROW_NUMBER() OVER(ORDER BY b.InvoiceNo) % 2) = 0 THEN @Room1 ELSE @Room2 END, 
    b.InvoiceNo, 
    DATEADD(day, -10, b.PaymentDate), 
    '12:00', 
    DATEADD(day, -5, b.PaymentDate), 
    b.PaymentDate, 
    2, 0, 'Completed'
FROM Bill b
ORDER BY b.InvoiceNo DESC;

PRINT 'Thêm Đặt Phòng (Booking) thành công.';
GO

-- 5. Tạo Review
INSERT INTO Review (GuestID, InvoiceNo, Rating, Comment, ReviewDate)
SELECT TOP 10
    b.GuestID,
    b.InvoiceNo,
    CASE WHEN (ROW_NUMBER() OVER(ORDER BY b.InvoiceNo) % 3) = 0 THEN 4 ELSE 5 END,
    'Kỳ nghỉ tuyệt vời! Khách sạn rất đẹp và nhân viên thân thiện.',
    DATEADD(day, 1, b.PaymentDate)
FROM Bill b
ORDER BY b.InvoiceNo DESC;

PRINT 'Thêm Review thành công. Hoàn tất kịch bản giả lập!';
GO
