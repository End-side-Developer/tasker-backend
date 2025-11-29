# Tasker Backend: Copilot Instructions

Purpose: Provide concise, repo-specific guidance for AI agents working on the Tasker Backend.

## Big Picture

- **Role**: Node.js/Express backend facilitating integration between Tasker (Flutter app) and Zoho Cliq.
- **Core Tech**: Node.js, Express, Firebase Admin SDK (Firestore), Passport.js (OAuth).
- **Key Integrations**:
  - **Zoho Cliq**: Handles slash commands, bots, and incoming webhooks.
  - **Firebase**: Direct access to Firestore `tasks`, `projects`, and user mappings.

## Project Structure

- `src/server.js`: Entry point. Initializes Firebase, OAuth, and starts the server.
- `src/controllers/`: Request handlers. Extract params, call services, send JSON responses.
- `src/services/`: Business logic. Interacts with Firestore and external APIs (Cliq).
- `src/routes/`: Express route definitions. Maps endpoints to controllers and middleware.
- `src/middleware/`: Cross-cutting concerns (Auth, Error Handling, Rate Limiting).
- `src/config/`: Configuration (Firebase, Logger, OAuth).

## Key Patterns & Conventions

### 1. Service-Controller Separation
- **Controllers**: Handle HTTP concerns (req/res), validation, and status codes.
  - *Example*: `widgetController.js` extracts `userId`, calls `cliqService.mapCliqUserToTasker`, then `taskService.listTasks`.
- **Services**: Handle business logic, database operations, and external API calls.
  - *Example*: `taskService.js` interacts with Firestore `tasks` collection.

### 2. Authentication & Security
- **Middleware**: Use `verifyAuth` for protected routes.
- **Dual Auth**: Supports both `x-api-key` (for Cliq extensions) and JWT (Bearer token).
- **User Mapping**: Critical concept. Cliq Users (`cliqUserId`) must be mapped to Tasker Users (`taskerId`) via `cliqService`.

### 3. Logging
- **Do not use `console.log`**. Use the `logger` module (`src/config/logger.js`).
- *Usage*: `logger.info('Message', { metadata })`, `logger.error('Error', error)`.

### 4. Error Handling
- Use `try/catch` blocks in controllers.
- Pass errors to the global error handler or return standard error responses:
  ```javascript
  return res.status(500).json({ success: false, error: 'Message' });
  ```

### 5. Firebase / Firestore
- Use `firebase-admin` for backend access.
- Collections: `tasks`, `projects`, `users`, `cliq_user_mappings`.
- Dates: Handle Firestore `Timestamp` objects (convert using `.toDate()` or `_seconds`).

## Common Workflows

- **Start Dev Server**: `npm run dev` (uses nodemon).
- **Run Tests**: `npm test`.
- **Lint/Format**: Follow existing code style (standard JS, 2 spaces indentation).

## Critical Files

- `src/server.js`: App bootstrapping.
- `src/services/taskService.js`: Core task logic.
- `src/services/cliqService.js`: Cliq integration logic.
- `src/controllers/widgetController.js`: Widget data aggregation.

## Constraints

- **Environment**: Relies heavily on `.env` variables (`FIREBASE_*`, `CLIQ_*`).
- **Stateless**: The server is stateless; rely on Firestore for persistence.
