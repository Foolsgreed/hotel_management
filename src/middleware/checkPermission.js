const { poolPromise } = require('../config/db');

// Usage: checkPermission('manage_bookings')
// Expects req.body.employeeId or req.query.employeeId (until real sessions exist)
function checkPermission(requiredPermission) {
    return async (req, res, next) => {
        try {
            const employeeId = req.body?.employeeId || req.query.employeeId || req.params.employeeId;
            if (!employeeId) {
                return res.status(401).json({ message: 'Employee identity required' });
            }

            const pool = await poolPromise;
            const result = await pool.request()
                .input('EmployeeID', employeeId)
                .input('PermissionKey', requiredPermission)
                .query(`
                    SELECT 1
                    FROM Employee e
                    JOIN RolePermission rp ON e.RoleID = rp.RoleID
                    JOIN Permission p ON rp.PermissionID = p.PermissionID
                    WHERE e.EmployeeID = @EmployeeID AND p.PermissionKey = @PermissionKey
                `);

            if (result.recordset.length === 0) {
                return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
            }

            next();
        } catch (error) {
            console.error("Permission check failed:", error);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    };
}

module.exports = checkPermission;