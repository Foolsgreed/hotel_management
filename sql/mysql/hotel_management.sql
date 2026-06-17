USE hotel_management;
GO

-- 1. Table Role
CREATE TABLE Role (
    RoleID INT PRIMARY KEY IDENTITY(1,1),
    RoleTitle VARCHAR(100) NOT NULL,
    RoleDesc NVARCHAR(MAX)
);

-- 2. Table Hotel
CREATE TABLE Hotel (
    HotelCode INT PRIMARY KEY IDENTITY(1,1),
    HotelName NVARCHAR(255) NOT NULL,
    Address NVARCHAR(255),
    Postcode VARCHAR(50),
    City NVARCHAR(100),
    Country NVARCHAR(100),
    NumRooms INT,
    PhoneNo VARCHAR(50),
    StarRating INT
);

-- 3. Table RoomType
CREATE TABLE RoomType (
    RoomType VARCHAR(50) PRIMARY KEY,
    RoomPrice DECIMAL(18, 2) NOT NULL,
    DefaultRoomPrice DECIMAL(18, 2),
    RoomImg VARCHAR(255),
    RoomDesc NVARCHAR(MAX)
);

-- 4. Table Room
CREATE TABLE Room (
    RoomNo VARCHAR(50) PRIMARY KEY,
    RoomType VARCHAR(50) FOREIGN KEY REFERENCES RoomType(RoomType),
    HotelCode INT FOREIGN KEY REFERENCES Hotel(HotelCode),
    Occupancy INT,
    FloorNo INT,
    RoomStatus VARCHAR(50)
);

-- 5. Table Employee
CREATE TABLE Employee (
    EmployeeID INT PRIMARY KEY IDENTITY(1,1),
    HotelCode INT FOREIGN KEY REFERENCES Hotel(HotelCode),
    RoleID INT FOREIGN KEY REFERENCES Role(RoleID),
    FirstName NVARCHAR(100) NOT NULL,
    LastName NVARCHAR(100) NOT NULL,
    DOB DATE,
    Gender NVARCHAR(20),
    PhoneNo VARCHAR(50),
    Email VARCHAR(100),
    Password VARCHAR(255) NOT NULL,
    Salary DECIMAL(18, 2)
);

-- 6. Table Guest
CREATE TABLE Guest (
    GuestID INT PRIMARY KEY IDENTITY(1,1),
    GuestTitle NVARCHAR(20),
    FirstName NVARCHAR(100) NOT NULL,
    LastName NVARCHAR(100) NOT NULL,
    DOB DATE,
    Gender NVARCHAR(20),
    PhoneNo VARCHAR(50),
    Email VARCHAR(100),
    Password VARCHAR(255) NOT NULL,
    PassportNo VARCHAR(50),
    Address NVARCHAR(255),
    Postcode VARCHAR(50),
    City NVARCHAR(100),
    Country NVARCHAR(100)
);

-- 7. Table Bill
CREATE TABLE Bill (
    InvoiceNo INT PRIMARY KEY IDENTITY(1,1),
    GuestID INT FOREIGN KEY REFERENCES Guest(GuestID),
    TotalAmount DECIMAL(18, 2),
    RoomService DECIMAL(18, 2),
    RestaurantCharges DECIMAL(18, 2),
    BarCharges DECIMAL(18, 2),
    MiscCharges DECIMAL(18, 2),
    IfLateCheckout BIT,  -- Cờ đánh dấu trả phòng trễ (0 hoặc 1)
    PaymentDate DATE,
    PaymentMode VARCHAR(50),
    PaymentStatus VARCHAR(50),
    CreditCardNo VARCHAR(50),
    ExpireDate DATE,
    ChequeNo VARCHAR(50)
);

-- 8. Table Booking
CREATE TABLE Booking (
    BookingID INT PRIMARY KEY IDENTITY(1,1),
    HotelCode INT FOREIGN KEY REFERENCES Hotel(HotelCode),
    GuestID INT FOREIGN KEY REFERENCES Guest(GuestID),
    RoomNo VARCHAR(50) FOREIGN KEY REFERENCES Room(RoomNo),
    InvoiceNo INT FOREIGN KEY REFERENCES Bill(InvoiceNo),
    BookingDate DATE,
    BookingTime TIME,
    ArrivalDate DATE,
    DepartureDate DATE,
    EstArrivalTime TIME,
    EstDepartureTime TIME,
    NumAdults INT,
    NumChildren INT,
    SpecialReq NVARCHAR(MAX),
    BookingStatus VARCHAR(50)
);

-- 9. Table Review
CREATE TABLE Review (
    ReviewID INT PRIMARY KEY IDENTITY(1,1),
    GuestID INT FOREIGN KEY REFERENCES Guest(GuestID),
    InvoiceNo INT FOREIGN KEY REFERENCES Bill(InvoiceNo),
    Rating INT CHECK (Rating >= 1 AND Rating <= 5),
    Comment NVARCHAR(MAX),
    ReviewDate DATE DEFAULT GETDATE()
);
