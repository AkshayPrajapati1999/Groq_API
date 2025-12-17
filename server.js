require("dotenv").config();
const express = require("express");
const { routeQuery } = require("./index");

const app = express();
app.use(express.json());

app.post("/route", async (req, res) => {
  const userQuery = req.body?.query;
  if (!userQuery) {
    return res.status(400).json({ error: "Missing 'query' in body" });
  }

  try {
    const result = await routeQuery(userQuery);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

