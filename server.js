require("dotenv").config();
const express = require("express");
const { routeQuery } = require("./index");
const { addResponse, updateIntentStatus, readIntents, readCreates, readSchedules, deleteIntent, getIntent, getSession, createSession, readSessions } = require("./storage");
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
const { authenticateToken, authenticateSession, optionalAuth, authorizeAdmin } = require("./authMiddleware");
const { setupBrand, getUserBrands, getBrandDetails, updateBrandDetails, removeBrand } = require("./brand");

const { getUserByEmail, createUser, getBrandByNameAndUserId, getBrandByWebsiteUrl } = require("./authStorage");

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
app.get("/auth/profile", authenticateSession, async (req, res) => {
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
app.put("/auth/profile", authenticateSession, async (req, res) => {
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
app.post("/auth/change-password", authenticateSession, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await changePassword(req.user.userId, currentPassword, newPassword);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ============================================
// BRAND MANAGEMENT ROUTES
// ============================================

/**
 * POST /brands
 * Create a new brand for the authenticated user
 * Headers: Authorization: Bearer <token>
 * Body: { name, description, industry, website, targetAudience, brandVoice }
 */
app.post("/brands", authenticateSession, async (req, res) => {
  try {
    const result = await setupBrand(req.user.userId, req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /brands
 * Get all brands for the authenticated user
 * Headers: Authorization: Bearer <token>
 */
app.get("/brands", authenticateSession, async (req, res) => {
  try {
    const result = await getUserBrands(req.user.userId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /brands/:id
 * Get details for a specific brand
 * Headers: Authorization: Bearer <token>
 */
app.get("/brands/:id", authenticateSession, async (req, res) => {
  try {
    const result = await getBrandDetails(req.user.userId, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(err.message.includes("denied") ? 403 : 404).json({ error: err.message });
  }
});

/**
 * PUT /brands/:id
 * Update brand details
 * Headers: Authorization: Bearer <token>
 * Body: { name, description, industry, website, targetAudience, brandVoice }
 */
app.put("/brands/:id", authenticateSession, async (req, res) => {
  try {
    const result = await updateBrandDetails(req.user.userId, req.params.id, req.body);
    res.json(result);
  } catch (err) {
    res.status(err.message.includes("denied") ? 403 : 404).json({ error: err.message });
  }
});

/**
 * DELETE /brands/:id
 * Delete a brand
 * Headers: Authorization: Bearer <token>
 */
app.delete("/brands/:id", authenticateSession, async (req, res) => {
  try {
    const result = await removeBrand(req.user.userId, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(err.message.includes("denied") ? 403 : 404).json({ error: err.message });
  }
});

// ============================================
// EXISTING ROUTES
// ============================================

/**
 * POST /route
 * Route a query (Authenticated)
 */
app.post("/route", async (req, res) => {
  const userQuery = req.body?.query;
  let sessionId = req.body?.sessionId || req.headers['session-id'] || req.headers['Session-Id'];
  const sessionProvided = !!(req.body?.sessionId || req.headers['session-id'] || req.headers['Session-Id']);
  let userId;
  let userEmail;

  // Get or create anonymous user
  let anonymousUser = await getUserByEmail('anonymous@example.com');
  if (!anonymousUser) {
    const hashedPassword = await require('bcryptjs').hash('anonymous', 10);
    const anonymousId = await createUser('anonymous@example.com', hashedPassword, 'Anonymous User');
    anonymousUser = { id: anonymousId, email: 'anonymous@example.com' };
  }

  let isAnonymous = false;
  if (sessionId) {
    const session = await getSession(sessionId);
    if (session) {
      userId = session.user_id;
      const user = await require('./authStorage').getUserById(userId);
      userEmail = user ? user.email : 'unknown';
    } else {
      // Invalid sessionId provided
      return res.status(401).json({ error: "Invalid session ID" });
    }
  } else {
    // No sessionId provided
    isAnonymous = true;
    userId = anonymousUser.id;
    userEmail = 'anonymous@example.com';
  }

  if (!userQuery) {
    return res.status(400).json({ error: "Missing 'query' in body" });
  }

  try {
    let brandId = null;
    if (req.body?.website_url || req.body?.brandName) {
      if (isAnonymous) {
        return res.status(401).json({ error: "Session ID is required for brand lookup" });
      }
      if (req.body?.website_url) {
        const brand = await getBrandByWebsiteUrl(userId, req.body.website_url);
        if (brand) {
          brandId = brand.id;
        } else {
          return res.status(404).json({ error: "Brand not found" });
        }
      } else if (req.body?.brandName) {
        const brand = await getBrandByNameAndUserId(userId, req.body.brandName);
        if (brand) {
          brandId = brand.id;
        } else {
          return res.status(404).json({ error: "Brand not found" });
        }
      }
    }
    console.log(`Processing query for ${userEmail}: ${userQuery} (Brand: ${brandId || 'None'})`);
    const result = await routeQuery(userQuery, userId, brandId);
    const response = { ...result };
    if (!sessionProvided) {
      response.sessionId = sessionId;
    }
    res.json(response);
    addResponse(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /intents
 * View intents (User sees own, Admin sees all)
 */
app.get("/intents", authenticateSession, async (req, res) => {
  const intents = await readIntents(null, true); // Show all intents
  res.json(intents);
});

/**
 * GET /creates
 * View create intents (User sees own)
 */
app.get("/creates", authenticateSession, async (req, res) => {
  const { userId } = req.user;
  const creates = await readCreates(userId);
  res.json(creates);
});

/**
 * GET /schedules
 * View schedule intents (User sees own)
 */
app.get("/schedules", authenticateSession, async (req, res) => {
  const { userId } = req.user;
  const schedules = await readSchedules(userId);
  res.json(schedules);
});

/**
 * GET /sessions
 * View sessions (User sees own)
 */
app.get("/sessions", authenticateSession, async (req, res) => {
  const { userId, role } = req.user;
  const isAdmin = role === 'admin';
  const sessions = await readSessions(userId, isAdmin);
  res.json(sessions);
});

/**
 * POST /create/:id
 * Accept/Reject create (Owner or Admin)
 */
app.post("/create/:id", authenticateSession, async (req, res) => {
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
app.post("/schedule/:id", authenticateSession, async (req, res) => {
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
app.delete("/intent/:id", authenticateSession, async (req, res) => {
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
