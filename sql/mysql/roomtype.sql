USE hotel_management;
GO

INSERT INTO RoomType (RoomType, RoomPrice,  RoomImg, RoomDesc) VALUES
    ('Standard Twin', 60.00,  'standard.jpg', 'Standard room with 2 single beds for up to 2 guests'),
    ('Standard Double', 75.00,  'standard.jpg', 'Standard room with 2 double beds for up to 4 guests'),
    ('Deluxe', 120.00, 'deluxe.jpg', 'Premium deluxe room with city view for up to 4 guests'),
    ('Suite', 350.00, 'suite.jpg', 'Large luxury suite for families or groups up to 16 guests');
