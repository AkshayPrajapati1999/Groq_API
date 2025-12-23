require("dotenv").config();
const express = require("express");
const { routeQuery } = require("./index");
const { addResponse, updateIntentStatus, readIntents, readCreates, readSchedules, deleteIntent, getIntent } = require("./storage");
const {
  register,
  login,
  refreshAccessToken,
  requestPasswordReset,
  resetPassword,
  getUserProfile,
  updateProfile,
  changePassword
} = require("./auth");
const { authenticateToken, optionalAuth, authorizeAdmin } = require("./authMiddleware");
const { getUserByEmail } = require("./authStorage");

const app = express();
app.use(express.json());

// ============================================
// AUTHENTICATION ROUTES
// ============================================

/**
 * POST /auth/register
 * Register a new user
 * Body: { email, password, name }
 */
app.post("/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const result = await register(email, password, name);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /auth/login
 * Login user
 * Body: { email, password }
 */
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await login(email, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

/**
 * POST /auth/refresh
 * Refresh access token
 * Body: { refreshToken }
 */
app.post("/auth/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token is required" });
    }
    const result = await refreshAccessToken(refreshToken);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

/**
 * POST /auth/forgot-password
 * Request password reset
 * Body: { email }
 */
app.post("/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    const result = await requestPasswordReset(email);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /auth/reset-password
 * Reset password using token
 * Body: { resetToken, newPassword }
 */
app.post("/auth/reset-password", async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    const result = await resetPassword(resetToken, newPassword);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /auth/profile
 * Get user profile (protected)
 * Headers: Authorization: Bearer <token>
 */
app.get("/auth/profile", authenticateToken, async (req, res) => {
  try {
    const result = await getUserProfile(req.user.userId);
    res.json(result);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

/**
 * PUT /auth/profile
 * Update user profile (protected)
 * Headers: Authorization: Bearer <token>
 * Body: { name }
 */
app.put("/auth/profile", authenticateToken, async (req, res) => {
  try {
    const result = await updateProfile(req.user.userId, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /auth/change-password
 * Change password (protected)
 * Headers: Authorization: Bearer <token>
 * Body: { currentPassword, newPassword }
 */
app.post("/auth/change-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await changePassword(req.user.userId, currentPassword, newPassword);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ============================================
// EXISTING ROUTES
// ============================================

/**
 * POST /route
 * Route a query (Authenticated)
 */
app.post("/route", authenticateToken, async (req, res) => {
  const userQuery = req.body?.query;
  const userId = req.user.userId;
  const userEmail = req.user.email;

  if (!userQuery) {
    return res.status(400).json({ error: "Missing 'query' in body" });
  }

  try {
    console.log(`Processing query for ${userEmail}: ${userQuery}`);
    const result = await routeQuery(userQuery, userId);
    res.json(result);
    addResponse(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /intents
 * View intents (User sees own, Admin sees all)
 */
app.get("/intents", authenticateToken, async (req, res) => {
  const { userId, role } = req.user;
  const isAdmin = role === 'admin';
  const intents = await readIntents(userId, isAdmin);
  res.json(intents);
});

/**
 * GET /creates
 * View create intents (User sees own)
 */
app.get("/creates", authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const creates = await readCreates(userId);
  res.json(creates);
});

/**
 * GET /schedules
 * View schedule intents (User sees own)
 */
app.get("/schedules", authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const schedules = await readSchedules(userId);
  res.json(schedules);
});

/**
 * POST /create/:id
 * Accept/Reject create (Owner or Admin)
 */
app.post("/create/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  const { userId, role } = req.user;

  try {
    const intent = await getIntent(id);
    if (!intent) {
      return res.status(404).json({ error: "Intent not found" });
    }

    // Security Check: Only Owner or Admin can update
    if (intent.user_id !== userId && role !== 'admin') {
      return res.status(403).json({ error: "Access denied. You do not own this intent." });
    }

    if (action === "accept") {
      await updateIntentStatus(id, "accepted");
      res.json({ message: "Create intent accepted" });
    } else if (action === "reject") {
      await updateIntentStatus(id, "rejected");
      res.json({ message: "Create intent rejected" });
    } else {
      res.status(400).json({ error: "Invalid action" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /schedule/:id
 * Accept/Reject schedule (Owner only)
 */
app.post("/schedule/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  const { userId } = req.user;

  try {
    const intent = await getIntent(id);
    if (!intent) {
      return res.status(404).json({ error: "Intent not found" });
    }

    // Security Check: Only Owner can update
    if (intent.user_id !== userId) {
      return res.status(403).json({ error: "Access denied. You do not own this intent." });
    }

    if (action === "accept") {
      await updateIntentStatus(id, "accepted");
      res.json({ message: "Schedule intent accepted" });
    } else if (action === "reject") {
      await updateIntentStatus(id, "rejected");
      res.json({ message: "Schedule intent rejected" });
    } else {
      res.status(400).json({ error: "Invalid action" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /intent/:id
 * Delete intent (Owner only)
 */
app.delete("/intent/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;

  try {
    const intent = await getIntent(id);
    if (!intent) {
      return res.status(404).json({ error: "Intent not found" });
    }

    // Security Check: Only Owner can delete
    if (intent.user_id !== userId) {
      return res.status(403).json({ error: "Access denied. You do not own this intent." });
    }

    const success = await deleteIntent(id);
    if (success) {
      res.json({ message: "Intent deleted" });
    } else {
      res.status(404).json({ error: "Intent not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
