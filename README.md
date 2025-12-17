## Groq Intent Router

Routes a user query to either a create or schedule action using Groq for intent classification (with a fast keyword shortcut).

### Setup
- Install Node.js 18+.
- Create a `.env` file with `GROQ_API_KEY=your_api_key_here`.
- Install deps: `npm install`.
- Run: `npm start -- "schedule a meeting tomorrow"`.

### How it works
- `intent.js` tries keyword detection, then calls Groq (`mixtral-8x7b-32768`) to return `create` or `schedule`.
- `index.js` routes to `actions/create.js` or `actions/schedule.js` and prints the result.

### Extending
- Replace the placeholder handlers in `actions/` with real logic.
- Swap the model in `intent.js` or add logging/analytics as needed.

