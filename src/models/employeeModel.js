const { poolPromise } = require('../config/db');

class EmployeeModel {
    static async login(email, password) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('Email', email)
                .input('Password', password)
                .query(`
                    SELECT e.EmployeeID, e.FirstName, e.LastName, e.Email, e.RoleID, r.RoleTitle 
                    FROM Employee e
                    INNER JOIN Role r ON e.RoleID = r.RoleID
                    WHERE e.Email = @Email AND e.Password = @Password
                `);
            
            if (result.recordset.length === 0) {
                return null;
            }

            const employee = result.recordset[0];

            const permResult = await pool.request()
                .input('RoleID', employee.RoleID)
                .query(`
                    SELECT p.PermissionKey
                    FROM RolePermission rp
                    JOIN Permission p ON rp.PermissionID = p.PermissionID
                    WHERE rp.RoleID = @RoleID
                `);

            employee.Permissions = permResult.recordset.map(p => p.PermissionKey);

            return employee;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = EmployeeModel;