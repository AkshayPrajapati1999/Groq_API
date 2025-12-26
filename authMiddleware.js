const { validateSession, verifyToken } = require('./auth');

/**
 * Middleware to authenticate requests using session ID
 */
function authenticateSession(req, res, next) {
    // Get session ID from header, body, or cookie
    const sessionId = req.headers['x-session-id'] || req.body?.sessionId || req.cookies?.sessionId;

    if (!sessionId) {
        return res.status(401).json({
            error: 'Access denied. Session ID required.'
        });
    }

    try {
        // Validate session
        validateSession(sessionId).then(sessionData => {
            if (!sessionData) {
                return res.status(401).json({
                    error: 'Invalid or expired session.'
                });
            }

            // Attach user info to request
            req.user = sessionData;
            req.sessionId = sessionId;

            next();
        }).catch(err => {
             return res.status(500).json({ error: 'Session validation error' });
        });
    } catch (error) {
        return res.status(403).json({
            error: 'Session validation failed.'
        });
    }
}

/**
 * Middleware to authenticate requests using JWT token
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. Token required.' });
    }

    try {
        const decoded = verifyToken(token);
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.type
        };
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
}

/**
 * Optional authentication - doesn't fail if no code provided
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
    authenticateSession,
    authenticateToken,
    optionalAuth,
    authorizeAdmin
};
