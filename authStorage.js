const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

// Initialize auth tables
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

    // Password reset tokens table
    db.run(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

    // Create index on email for faster lookups
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);

    // Create index on reset tokens
    db.run(`CREATE INDEX IF NOT EXISTS idx_reset_tokens ON password_reset_tokens(token)`);
});

/**
 * Create a new user
 */
function createUser(email, hashedPassword, name) {
    return new Promise((resolve, reject) => {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const timestamp = new Date().toISOString();

        db.run(
            'INSERT INTO users (id, email, password, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            [id, email.toLowerCase(), hashedPassword, name, timestamp, timestamp],
            function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(id);
                }
            }
        );
    });
}

/**
 * Get user by email
 */
function getUserByEmail(email) {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT * FROM users WHERE email = ?',
            [email.toLowerCase()],
            (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row || null);
                }
            }
        );
    });
}

/**
 * Get user by ID
 */
function getUserById(userId) {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT * FROM users WHERE id = ?',
            [userId],
            (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row || null);
                }
            }
        );
    });
}

/**
 * Update user password
 */
function updateUserPassword(userId, hashedPassword) {
    return new Promise((resolve, reject) => {
        const timestamp = new Date().toISOString();

        db.run(
            'UPDATE users SET password = ?, updated_at = ? WHERE id = ?',
            [hashedPassword, timestamp, userId],
            function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            }
        );
    });
}

/**
 * Update user profile
 */
function updateUserProfile(userId, name) {
    return new Promise((resolve, reject) => {
        const timestamp = new Date().toISOString();

        db.run(
            'UPDATE users SET name = ?, updated_at = ? WHERE id = ?',
            [name, timestamp, userId],
            function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            }
        );
    });
}

/**
 * Update user role
 */
function updateUserRole(userId, role) {
    return new Promise((resolve, reject) => {
        const timestamp = new Date().toISOString();

        db.run(
            'UPDATE users SET role = ?, updated_at = ? WHERE id = ?',
            [role, timestamp, userId],
            function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            }
        );
    });
}

/**
 * Create password reset token
 */
function createPasswordResetToken(userId, token, expiresAt) {
    return new Promise((resolve, reject) => {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const timestamp = new Date().toISOString();

        // First, delete any existing reset tokens for this user
        db.run('DELETE FROM password_reset_tokens WHERE user_id = ?', [userId], (err) => {
            if (err) {
                reject(err);
                return;
            }

            // Then create the new token
            db.run(
                'INSERT INTO password_reset_tokens (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
                [id, userId, token, expiresAt.toISOString(), timestamp],
                function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(id);
                    }
                }
            );
        });
    });
}

/**
 * Get password reset token
 */
function getPasswordResetToken(token) {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT * FROM password_reset_tokens WHERE token = ?',
            [token],
            (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row || null);
                }
            }
        );
    });
}

/**
 * Delete password reset token
 */
function deletePasswordResetToken(token) {
    return new Promise((resolve, reject) => {
        db.run(
            'DELETE FROM password_reset_tokens WHERE token = ?',
            [token],
            function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            }
        );
    });
}

/**
 * Delete expired reset tokens (cleanup function)
 */
function deleteExpiredResetTokens() {
    return new Promise((resolve, reject) => {
        const now = new Date().toISOString();

        db.run(
            'DELETE FROM password_reset_tokens WHERE expires_at < ?',
            [now],
            function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            }
        );
    });
}

// Run cleanup every hour
setInterval(() => {
    deleteExpiredResetTokens().catch(err => {
        console.error('Error cleaning up expired reset tokens:', err);
    });
}, 3600000); // 1 hour

module.exports = {
    createUser,
    getUserByEmail,
    getUserById,
    updateUserPassword,
    updateUserProfile,
    updateUserRole,
    createPasswordResetToken,
    getPasswordResetToken,
    deletePasswordResetToken,
    deleteExpiredResetTokens
};
