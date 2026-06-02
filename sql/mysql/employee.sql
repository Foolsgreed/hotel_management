USE hotel_management;
GO

INSERT INTO Employee (
    HotelCode, RoleID, FirstName, LastName, DOB, Gender, PhoneNo, Email,
    Password, Salary
)
SELECT
    h.HotelCode,
    r.RoleID,
    seed.FirstName,
    seed.LastName,
    seed.DOB,
    seed.Gender,
    seed.PhoneNo,
    seed.Email,
    seed.Password,
    seed.Salary
FROM (
    SELECT 'Admin' AS FirstName, 'System' AS LastName, '1990-01-01' AS DOB, 'Other' AS Gender, '0000000000' AS PhoneNo, 'admin@hotel.com' AS Email, '123456' AS Password, 0.00 AS Salary, 'Manager' AS RoleTitle
) AS seed
INNER JOIN Hotel h ON h.HotelName = 'Grand Palace Hotel'
INNER JOIN Role r ON r.RoleTitle = seed.RoleTitle;
