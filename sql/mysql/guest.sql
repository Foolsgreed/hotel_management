USE hotel_management;
GO

INSERT INTO Guest (
    GuestTitle, FirstName, LastName, DOB, Gender, PhoneNo, Email, Password,
    PassportNo, Address, Postcode, City, Country
) VALUES
    ('Mr', 'Minh', 'Nguyen', '1995-04-12', 'Male', '0901000001', 'minh.nguyen@example.com', 'guest123', 'P1234567', '12 Ly Thuong Kiet', '10000', 'Hanoi', 'Vietnam'),
    ('Ms', 'Lan', 'Tran', '1998-08-20', 'Female', '0901000002', 'lan.tran@example.com', 'guest123', 'P2234567', '45 Nguyen Hue', '70000', 'Ho Chi Minh City', 'Vietnam'),
    ('Mr', 'Alex', 'Carter', '1988-02-05', 'Male', '0901000003', 'alex.carter@example.com', 'guest123', 'US998877', '88 West Lake', '10000', 'Hanoi', 'United States'),
    ('Ms', 'Yuna', 'Kim', '1992-11-17', 'Female', '0901000004', 'yuna.kim@example.com', 'guest123', 'KR445566', '19 Old Quarter', '10000', 'Hanoi', 'South Korea'),
    ('Mr', 'Duc', 'Pham', '1990-06-30', 'Male', '0901000005', 'duc.pham@example.com', 'guest123', 'P3234567', '7 Tran Phu', '55000', 'Da Nang', 'Vietnam');
