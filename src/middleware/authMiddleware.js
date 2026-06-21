const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const token = authHeader.split(' ')[1]; // Bearer <token>
        if (!token) {
            return res.status(401).json({ message: 'Invalid token format' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hotel_secret_key_123');
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        return res.status(403).json({ message: 'Failed to authenticate token' });
    }
};

exports.checkPermission = (requiredPermission) => {
    return (req, res, next) => {
        if (!req.user || !req.user.Permissions) {
            return res.status(403).json({ message: 'Access Denied: No permissions found' });
        }

        const hasPermission = req.user.Permissions.includes(requiredPermission);
        
        if (hasPermission) {
            next();
        } else {
            res.status(403).json({ message: `Access Denied: Requires ${requiredPermission}` });
        }
    };
};
