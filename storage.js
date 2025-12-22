const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

// Initialize tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS responses (
    id TEXT PRIMARY KEY,
    data TEXT,
    timestamp TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS intents (
    id TEXT PRIMARY KEY,
    type TEXT,
    data TEXT,
    status TEXT DEFAULT 'pending'
  )`);
});

function addResponse(response) {
  const id = Date.now().toString();
  const data = JSON.stringify(response);
  const timestamp = new Date().toISOString();
  db.run('INSERT INTO responses (id, data, timestamp) VALUES (?, ?, ?)', [id, data, timestamp]);
}

function addIntent(type, intent) {
  const id = Date.now().toString();
  const data = JSON.stringify(intent);
  db.run('INSERT INTO intents (id, type, data, status) VALUES (?, ?, ?, ?)', [id, type, data, 'pending']);
  return id;
}

function updateIntentStatus(id, status) {
  return new Promise((resolve) => {
    db.run('UPDATE intents SET status = ? WHERE id = ?', [status, id], function(err) {
      resolve(this.changes > 0);
    });
  });
}

function getIntent(id) {
  return new Promise((resolve) => {
    db.get('SELECT * FROM intents WHERE id = ?', [id], (err, row) => {
      if (row) {
        const intent = JSON.parse(row.data);
        intent.id = row.id;
        intent.type = row.type;
        intent.status = row.status;
        resolve(intent);
      } else {
        resolve(null);
      }
    });
  });
}

function readIntents() {
  return new Promise((resolve) => {
    db.all('SELECT * FROM intents ORDER BY id DESC', [], (err, rows) => {
      const intents = rows.map(row => {
        const intent = JSON.parse(row.data);
        intent.id = row.id;
        intent.type = row.type;
        if (row.type === 'schedule') {
          intent.status = row.status;
        }
        return intent;
      });
      resolve(intents);
    });
  });
}

function readCreates() {
  return new Promise((resolve) => {
    db.all('SELECT * FROM intents WHERE type = ? ORDER BY id DESC', ['create'], (err, rows) => {
      const intents = rows.map(row => {
        const intent = JSON.parse(row.data);
        return {
          intent: intent.intent,
          image_generation_prompt: intent.image_generation_prompt,
          caption_prompt: intent.caption_prompt,
          id: row.id
        };
      });
      resolve(intents);
    });
  });
}

function readSchedules() {
  return new Promise((resolve) => {
    db.all('SELECT * FROM intents WHERE type = ? ORDER BY id DESC', ['schedule'], (err, rows) => {
      const intents = rows.map(row => {
        const intent = JSON.parse(row.data);
        intent.id = row.id;
        intent.type = row.type;
        intent.status = row.status;
        return intent;
      });
      resolve(intents);
    });
  });
}

function deleteIntent(id) {
  return new Promise((resolve) => {
    db.run('DELETE FROM intents WHERE id = ?', [id], function(err) {
      resolve(this.changes > 0);
    });
  });
}

module.exports = { addResponse, addIntent, updateIntentStatus, getIntent, readIntents, readCreates, readSchedules, deleteIntent };