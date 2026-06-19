USE hotel_management;
GO

INSERT INTO Role (RoleTitle, RoleDesc)
SELECT 'Admin', 'System administrator (IT)'
WHERE NOT EXISTS (SELECT 1 FROM Role WHERE RoleTitle = 'Admin');

INSERT INTO Role (RoleTitle, RoleDesc)
SELECT 'Manager', 'Hotel operations manager'
WHERE NOT EXISTS (SELECT 1 FROM Role WHERE RoleTitle = 'Manager');

INSERT INTO Role (RoleTitle, RoleDesc)
SELECT 'Receptionist', 'Handles check-in, check-out, and booking'
WHERE NOT EXISTS (SELECT 1 FROM Role WHERE RoleTitle = 'Receptionist');

INSERT INTO Role (RoleTitle, RoleDesc)
SELECT 'Housekeeper', 'Updates room cleaning status'
WHERE NOT EXISTS (SELECT 1 FROM Role WHERE RoleTitle = 'Housekeeper');

GO