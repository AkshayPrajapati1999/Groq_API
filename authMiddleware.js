const { verifyToken } = require('./auth');

/**
 * Middleware to authenticate requests using JWT
 */
function authenticateToken(req, res, next) {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            error: 'Access denied. No token provided.'
        });
    }

    try {
        // Verify token
        const decoded = verifyToken(token);

        // Check if it's an access token
        if (decoded.type !== 'access') {
            return res.status(401).json({
                error: 'Invalid token type. Please use an access token.'
            });
        }

        // Attach user info to request
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role
        };

        next();
    } catch (error) {
        return res.status(403).json({
            error: 'Invalid or expired token.'
        });
    }
}

/**
 * Optional authentication - doesn't fail if no token provided
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = verifyToken(token);

        if (decoded.type === 'access') {
            req.user = {
                userId: decoded.userId,
                email: decoded.email
            };
        } else {
            req.user = null;
        }
    } catch (error) {
        req.user = null;
    }

    next();
}

/**
 * Middleware to restrict access to admins only
 */
function authorizeAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            error: 'Access denied. Admin privileges required.'
        });
    }
    next();
}

module.exports = {
    authenticateToken,
    optionalAuth,
    authorizeAdmin
};
