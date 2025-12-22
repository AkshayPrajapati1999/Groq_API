require("dotenv").config();
const express = require("express");
const { routeQuery } = require("./index");
const { addResponse, updateIntentStatus, readIntents, readCreates, readSchedules, deleteIntent } = require("./storage");

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
    addResponse(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/intents", async (req, res) => {
  const intents = await readIntents();
  res.json(intents);
});

app.get("/creates", async (req, res) => {
  const creates = await readCreates();
  res.json(creates);
});

app.get("/schedules", async (req, res) => {
  const schedules = await readSchedules();
  res.json(schedules);
});

app.post("/create/:id", async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  if (action === "accept") {
    const success = await updateIntentStatus(id, "accepted");
    if (success) {
      res.json({ message: "Create intent accepted" });
    } else {
      res.status(404).json({ error: "Create intent not found" });
    }
  } else if (action === "reject") {
    const success = await updateIntentStatus(id, "rejected");
    if (success) {
      res.json({ message: "Create intent rejected" });
    } else {
      res.status(404).json({ error: "Create intent not found" });
    }
  } else {
    res.status(400).json({ error: "Invalid action" });
  }
});

app.post("/schedule/:id", async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  if (action === "accept") {
    const success = await updateIntentStatus(id, "accepted");
    if (success) {
      res.json({ message: "Schedule intent accepted" });
    } else {
      res.status(404).json({ error: "Schedule intent not found" });
    }
  } else if (action === "reject") {
    const success = await updateIntentStatus(id, "rejected");
    if (success) {
      res.json({ message: "Schedule intent rejected" });
    } else {
      res.status(404).json({ error: "Schedule intent not found" });
    }
  } else {
    res.status(400).json({ error: "Invalid action" });
  }
});

app.delete("/intent/:id", async (req, res) => {
  const { id } = req.params;
  const success = await deleteIntent(id);
  if (success) {
    res.json({ message: "Intent deleted" });
  } else {
    res.status(404).json({ error: "Intent not found" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
