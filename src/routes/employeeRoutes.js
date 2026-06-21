const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { verifyToken, checkPermission } = require('../middleware/authMiddleware');

// GET /api/employees
router.get('/', verifyToken, checkPermission('manage_employees'), employeeController.getAllEmployees);

// GET /api/employees/roles
router.get('/roles', verifyToken, checkPermission('manage_employees'), employeeController.getRoles);

// POST /api/employees
router.post('/', verifyToken, checkPermission('manage_employees'), employeeController.addEmployee);

// DELETE /api/employees/:id
router.delete('/:id', verifyToken, checkPermission('manage_employees'), employeeController.deleteEmployee);

module.exports = router;
