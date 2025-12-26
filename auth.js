const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const {
    createUser,
    getUserByEmail,
    getUserById,
    updateUserPassword,
    updateUserProfile,
    createPasswordResetToken,
    getPasswordResetToken,
    deletePasswordResetToken,
    createSession,
    getSessionById,
    deleteSession
} = require('./authStorage');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

/**
 * Register a new user
 */
async function register(email, password, name) {
    // Validate input
    if (!email || !password || !name) {
        throw new Error('Email, password, and name are required');
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
        throw new Error('User already exists with this email');
    }

    // Validate password strength
    if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userId = await createUser(email, hashedPassword, name);
    const role = 'user'; // Default role for new registrations

    // Generate session ID
    const sessionId = uuidv4();
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await createSession(userId, sessionId, sessionExpiresAt);

    // Generate tokens
    const accessToken = generateAccessToken(userId, email, role);
    const refreshToken = generateRefreshToken(userId, email, role);

    return {
        success: true,
        message: 'User registered successfully',
        user: {
            id: userId,
            email,
            name,
            role
        },
        sessionId,
        accessToken,
        refreshToken
    };
}

/**
 * Login user
 */
async function login(email, password) {
    // Validate input
    if (!email || !password) {
        throw new Error('Email and password are required');
    }

    // Get user by email
    const user = await getUserByEmail(email);
    if (!user) {
        throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw new Error('Invalid email or password');
    }

    // Generate session ID
    const sessionId = uuidv4();
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await createSession(user.id, sessionId, sessionExpiresAt);

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);

    return {
        success: true,
        message: 'Login successful',
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            createdAt: user.created_at
        },
        sessionId,
        accessToken,
        refreshToken
    };
}

/**
 * Refresh access token
 */
async function refreshAccessToken(refreshToken) {
    try {
        // Verify refresh token
        const decoded = jwt.verify(refreshToken, JWT_SECRET);

        // Get user to ensure they still exist
        const user = await getUserById(decoded.userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Generate new access token
        const accessToken = generateAccessToken(user.id, user.email);

        return {
            success: true,
            accessToken
        };
    } catch (error) {
        throw new Error('Invalid or expired refresh token');
    }
}

/**
 * Request password reset
 */
async function requestPasswordReset(email) {
    // Get user by email
    const user = await getUserByEmail(email);
    if (!user) {
        // Don't reveal if user exists or not for security
        return {
            success: true,
            message: 'If an account exists with this email, a password reset link has been sent'
        };
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

    // Store reset token
    await createPasswordResetToken(user.id, resetToken, expiresAt);

    // In production, you would send an email here
    // For now, we'll return the token (remove this in production)
    return {
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent',
        resetToken // Remove this in production
    };
}

/**
 * Reset password using token
 */
async function resetPassword(resetToken, newPassword) {
    // Validate input
    if (!resetToken || !newPassword) {
        throw new Error('Reset token and new password are required');
    }

    // Validate password strength
    if (newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long');
    }

    // Get reset token from database
    const tokenData = await getPasswordResetToken(resetToken);
    if (!tokenData) {
        throw new Error('Invalid or expired reset token');
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
        await deletePasswordResetToken(resetToken);
        throw new Error('Reset token has expired');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await updateUserPassword(tokenData.user_id, hashedPassword);

    // Delete used reset token
    await deletePasswordResetToken(resetToken);

    return {
        success: true,
        message: 'Password reset successfully'
    };
}

/**
 * Get user profile
 */
async function getUserProfile(userId) {
    const user = await getUserById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    return {
        success: true,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            createdAt: user.created_at
        }
    };
}

/**
 * Update user profile
 */
async function updateProfile(userId, updates) {
    const user = await getUserById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    // Only allow updating name for now
    const { name } = updates;
    if (!name) {
        throw new Error('Name is required');
    }

    await updateUserProfile(userId, name);

    return {
        success: true,
        message: 'Profile updated successfully',
        user: {
            id: userId,
            email: user.email,
            name,
            createdAt: user.created_at
        }
    };
}

/**
 * Change password (when user is logged in)
 */
async function changePassword(userId, currentPassword, newPassword) {
    // Validate input
    if (!currentPassword || !newPassword) {
        throw new Error('Current password and new password are required');
    }

    // Validate new password strength
    if (newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters long');
    }

    // Get user
    const user = await getUserById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await updateUserPassword(userId, hashedPassword);

    return {
        success: true,
        message: 'Password changed successfully'
    };
}

// Helper functions
function generateAccessToken(userId, email) {
    return jwt.sign(
        { userId, email, type: 'access' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

function generateRefreshToken(userId, email) {
    return jwt.sign(
        { userId, email, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );
}

function generateResetToken() {
    return require('crypto').randomBytes(32).toString('hex');
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
}

/**
 * Logout user by deleting session
 */
async function logout(sessionId) {
    if (!sessionId) {
        throw new Error('Session ID is required');
    }

    const success = await deleteSession(sessionId);
    if (!success) {
        throw new Error('Session not found');
    }

    return {
        success: true,
        message: 'Logged out successfully'
    };
}

/**
 * Validate session
 */
async function validateSession(sessionId) {
    if (!sessionId) {
        return null;
    }

    const session = await getSessionById(sessionId);
    if (!session) {
        return null;
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
        await deleteSession(sessionId);
        return null;
    }

    // Get user details
    const user = await getUserById(session.user_id);
    if (!user) {
        await deleteSession(sessionId);
        return null;
    }

    return {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role
    };
}

module.exports = {
    register,
    login,
    refreshAccessToken,
    requestPasswordReset,
    resetPassword,
    getUserProfile,
    updateProfile,
    changePassword,
    verifyToken,
    logout,
    validateSession
};
