## Groq Intent Router

Routes a user query to either a create or schedule action using Groq for intent classification (with a fast keyword shortcut).

### Features
- 🔐 **Complete Authentication System** - User registration, login, JWT tokens, and profile management
- 🤖 **AI-Powered Intent Detection** - Uses Groq AI to classify user queries as create or schedule
- 📊 **Database Storage** - SQLite database for users, intents, and sessions
- 🔒 **JWT Authentication** - Secure token-based authentication
- 🔄 **Session Management** - Automatic session creation for anonymous users
- 📝 **RESTful API** - Well-documented API endpoints

### Setup

1. **Install Node.js 18+**

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   - Copy `.env.example` to `.env`
   - Add your `GROQ_API_KEY`
   - Update `JWT_SECRET` with a secure random string
   ```env
   GROQ_API_KEY=your_api_key_here
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=24h
   REFRESH_TOKEN_EXPIRES_IN=7d
   PORT=3000
   ```

4. **Run the application:**
   ```bash
   # CLI version
   npm start -- "schedule a meeting tomorrow"

   # Express API server
   npm run serve
   ```

### How it works
- `intent.js` tries keyword detection, then calls Groq (`mixtral-8x7b-32768`) to return `create` or `schedule`.
- `index.js` routes to `actions/create.js` or `actions/schedule.js` and prints the result.
- `auth.js` handles all authentication logic (register, login, password reset, etc.)
- `authStorage.js` manages database operations for users and tokens
- `authMiddleware.js` provides JWT authentication middleware for protected routes

### API Endpoints

The application provides RESTful API endpoints for authentication and intent routing.

#### Authentication Endpoints

**Public Endpoints (No authentication required):**
- `POST /auth/register` - Register a new user account
- `POST /auth/login` - Login and receive access tokens

**Protected Endpoints (Requires Authorization header):**
- `GET /auth/profile` - Get user profile information
- `PUT /auth/profile` - Update user profile (name, email)

#### Intent Management Endpoints

**Route Query:**
- `POST /route` - Route user query to create or schedule intent (auto-creates session if none provided)
- `POST /route` with `Session-Id` header - Route query with existing session

**Intent Operations (Protected):**
- `GET /creates` - Get user's create intents
- `GET /schedules` - Get user's schedule intents
- `POST /create/:id` - Accept or reject an intent

All protected endpoints require an `Authorization: Bearer <TOKEN>` header.

### Testing with Postman

#### 1. Start the API server:
```bash
npm run serve
```
The server will run on `http://localhost:3000` (or the port specified in `PORT` environment variable).

#### 2. Test Authentication Flow:

**Register a new user:**
- **Method**: POST
- **URL**: `http://localhost:3000/auth/register`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }
  ```
- **Response**: Returns access token for subsequent requests

**Login:**
- **Method**: POST
- **URL**: `http://localhost:3000/auth/login`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "email": "test@example.com",
    "password": "password123"
  }
  ```
- **Response**: Returns access token, save for protected routes

**Get Profile (Protected):**
- **Method**: GET
- **URL**: `http://localhost:3000/auth/profile`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_ACCESS_TOKEN`

**Update Profile (Protected):**
- **Method**: PUT
- **URL**: `http://localhost:3000/auth/profile`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_ACCESS_TOKEN`
- **Body**:
  ```json
  {
    "name": "Updated Name",
    "email": "newemail@example.com"
  }
  ```

#### 3. Test Intent Routing:

**Route a query (creates anonymous session):**
- **Method**: POST
- **URL**: `http://localhost:3000/route`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "query": "schedule a meeting tomorrow"
  }
  ```
- **Response**: Returns intent result and auto-generated session ID

**Route a query with existing session:**
- **Method**: POST
- **URL**: `http://localhost:3000/route`
- **Headers**:
  - `Content-Type: application/json`
  - `Session-Id: YOUR_SESSION_ID`
- **Body**:
  ```json
  {
    "query": "create a new project plan"
  }
  ```

**Get create intents:**
- **Method**: GET
- **URL**: `http://localhost:3000/creates`
- **Headers**: `Authorization: Bearer YOUR_ACCESS_TOKEN`

**Get schedule intents:**
- **Method**: GET
- **URL**: `http://localhost:3000/schedules`
- **Headers**: `Authorization: Bearer YOUR_ACCESS_TOKEN`

**Accept/Reject intent:**
- **Method**: POST
- **URL**: `http://localhost:3000/create/INTENT_ID_HERE`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_ACCESS_TOKEN`
- **Body**:
  ```json
  {
    "action": "accept"
  }
  ```

### Automated Testing

Run the authentication test suite:
```bash
node test_auth.js
```

This will test all authentication endpoints and display results.

### Database Schema

The application uses SQLite with the following tables:

**users** - User accounts
- id, email, password (hashed), name, created_at, updated_at

**password_reset_tokens** - Password reset tokens
- id, user_id, token, expires_at, created_at

**intents** - User intents (create/schedule)
- id, type, data, status, user_id

**sessions** - User active sessions
- id, user_id, created_at

**responses** - API responses
- id, data, timestamp

### Security Features

- ✅ Password hashing with bcrypt
- ✅ JWT token-based authentication
- ✅ Access and refresh token support
- ✅ Password reset with expiring tokens
- ✅ Protected routes with middleware
- ✅ Input validation
- ✅ Secure password requirements (min 8 characters)

### Project Structure

```
groq-intent/
├── auth.js                      # Authentication logic
├── authStorage.js               # Database operations for auth
├── authMiddleware.js            # JWT middleware
├── intent.js                    # Intent detection
├── index.js                     # Main routing logic
├── server.js                    # Express API server
├── storage.js                   # Database operations
├── test_auth.js                 # Authentication tests
├── database.db                  # SQLite database
├── .env                         # Environment variables (not in git)
├── .env.example                 # Environment template
├── AUTH_API_DOCUMENTATION.md    # Detailed API docs
└── README.md                    # This file
```

### Extending

- Replace the placeholder handlers in `actions/` with real logic
- Swap the model in `intent.js` or add logging/analytics as needed
- Add more authentication features (email verification, 2FA, etc.)
- Implement role-based access control (RBAC)
- Add email service for password reset notifications

