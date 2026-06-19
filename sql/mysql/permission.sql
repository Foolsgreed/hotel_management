USE hotel_management;
GO

INSERT INTO Permission (PermissionKey, PermissionDesc)
SELECT 'view_bookings', 'See booking list' WHERE NOT EXISTS (SELECT 1 FROM Permission WHERE PermissionKey = 'view_bookings');

INSERT INTO Permission (PermissionKey, PermissionDesc)
SELECT 'manage_bookings', 'Create/check-in/check-out/cancel bookings' WHERE NOT EXISTS (SELECT 1 FROM Permission WHERE PermissionKey = 'manage_bookings');

INSERT INTO Permission (PermissionKey, PermissionDesc)
SELECT 'view_rooms', 'See room list/status' WHERE NOT EXISTS (SELECT 1 FROM Permission WHERE PermissionKey = 'view_rooms');

INSERT INTO Permission (PermissionKey, PermissionDesc)
SELECT 'manage_rooms', 'Change room status' WHERE NOT EXISTS (SELECT 1 FROM Permission WHERE PermissionKey = 'manage_rooms');

INSERT INTO Permission (PermissionKey, PermissionDesc)
SELECT 'view_bills', 'See bills/invoices' WHERE NOT EXISTS (SELECT 1 FROM Permission WHERE PermissionKey = 'view_bills');

INSERT INTO Permission (PermissionKey, PermissionDesc)
SELECT 'manage_bills', 'Generate bills, update payment status' WHERE NOT EXISTS (SELECT 1 FROM Permission WHERE PermissionKey = 'manage_bills');

INSERT INTO Permission (PermissionKey, PermissionDesc)
SELECT 'view_guests', 'See guest list/info' WHERE NOT EXISTS (SELECT 1 FROM Permission WHERE PermissionKey = 'view_guests');

INSERT INTO Permission (PermissionKey, PermissionDesc)
SELECT 'manage_employees', 'Add/edit/remove staff accounts' WHERE NOT EXISTS (SELECT 1 FROM Permission WHERE PermissionKey = 'manage_employees');

INSERT INTO Permission (PermissionKey, PermissionDesc)
SELECT 'manage_roles', 'Edit role permissions' WHERE NOT EXISTS (SELECT 1 FROM Permission WHERE PermissionKey = 'manage_roles');

INSERT INTO Permission (PermissionKey, PermissionDesc)
SELECT 'view_statistics', 'See dashboard stats/analytics' WHERE NOT EXISTS (SELECT 1 FROM Permission WHERE PermissionKey = 'view_statistics');

INSERT INTO Permission (PermissionKey, PermissionDesc)
SELECT 'system_settings', 'Hotel-wide settings' WHERE NOT EXISTS (SELECT 1 FROM Permission WHERE PermissionKey = 'system_settings');
GO

-- ADMIN: Auto-map full quyền (Bao gồm cả quản lý Role và Setting hệ thống)
INSERT INTO RolePermission (RoleID, PermissionID)
SELECT r.RoleID, p.PermissionID
FROM Role r, Permission p
WHERE r.RoleTitle = 'Admin'
  AND NOT EXISTS (
      SELECT 1 FROM RolePermission rp 
      WHERE rp.RoleID = r.RoleID AND rp.PermissionID = p.PermissionID
  );

-- MANAGER: Quyền quản lý vận hành, nhân sự, xem thống kê (Không can thiệp hệ thống)
INSERT INTO RolePermission (RoleID, PermissionID)
SELECT r.RoleID, p.PermissionID
FROM Role r CROSS JOIN Permission p
WHERE r.RoleTitle = 'Manager' 
  AND p.PermissionKey IN (
      'view_bookings', 'manage_bookings', 
      'view_rooms', 'manage_rooms', 
      'view_bills', 'manage_bills', 
      'view_guests', 
      'manage_employees', 
      'view_statistics'
  )
  AND NOT EXISTS (SELECT 1 FROM RolePermission rp WHERE rp.RoleID = r.RoleID AND rp.PermissionID = p.PermissionID);

-- RECEPTIONIST: Quyền Lễ tân (Đã bổ sung quyền xem/xử lý Bill để thu tiền lúc Check-out)
INSERT INTO RolePermission (RoleID, PermissionID)
SELECT r.RoleID, p.PermissionID
FROM Role r CROSS JOIN Permission p
WHERE r.RoleTitle = 'Receptionist' 
  AND p.PermissionKey IN (
      'view_bookings', 'manage_bookings', 
      'view_rooms', 
      'view_guests',
      'view_bills', 'manage_bills'
  )
  AND NOT EXISTS (SELECT 1 FROM RolePermission rp WHERE rp.RoleID = r.RoleID AND rp.PermissionID = p.PermissionID);

-- HOUSEKEEPER: Quyền Buồng phòng (Chỉ xem danh sách và cập nhật trạng thái phòng dọn dẹp)
INSERT INTO RolePermission (RoleID, PermissionID)
SELECT r.RoleID, p.PermissionID
FROM Role r CROSS JOIN Permission p
WHERE r.RoleTitle = 'Housekeeper' 
  AND p.PermissionKey IN ('view_rooms', 'manage_rooms')
  AND NOT EXISTS (SELECT 1 FROM RolePermission rp WHERE rp.RoleID = r.RoleID AND rp.PermissionID = p.PermissionID);

GO