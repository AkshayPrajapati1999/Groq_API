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

### Testing with Postman
To test the API using Postman:

1. Start the API server:
   ```
   npm run serve
   ```
   The server will run on `http://localhost:3000` (or the port specified in `PORT` environment variable).

2. In Postman, create a new request:
   - **Method**: POST
   - **URL**: `http://localhost:3000/route`
   - **Headers**:
     - Key: `Content-Type`
     - Value: `application/json`
   - **Body**:
     - Select `raw` and choose `JSON` from the dropdown.
     - Enter the JSON payload:
       ```json
       {
         "query": "schedule a meeting tomorrow"
       }
       ```

3. Click **Send** to make the API call.

4. Check the response:
   - A successful response will return a JSON object with the routed action and result.
   - Example response:
     ```json
     {
       "action": "schedule",
       "result": "Meeting scheduled for tomorrow"
     }
     ```
   - If there's an error (e.g., missing query), you'll get a 400 or 500 status with an error message.

### Extending
- Replace the placeholder handlers in `actions/` with real logic.
- Swap the model in `intent.js` or add logging/analytics as needed.
