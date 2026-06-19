const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const checkPermission = require('../middleware/checkPermission');

// GET /api/employees/roles - Get all available roles (must be before /:id)
router.get('/roles', checkPermission('manage_employees'), employeeController.getAllRoles);

// GET /api/employees - Get all employees
router.get('/', checkPermission('manage_employees'), employeeController.getAllEmployees);

// POST /api/employees - Create a new employee
router.post('/', checkPermission('manage_employees'), employeeController.createEmployee);

// DELETE /api/employees/:id - Delete an employee
router.delete('/:id', checkPermission('manage_employees'), employeeController.deleteEmployee);

module.exports = router;
