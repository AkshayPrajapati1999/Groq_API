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
    status TEXT DEFAULT 'pending',
    user_id TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    created_at TEXT
  )`);

  // Add user_id column if it doesn't exist (for existing databases)
  db.run(`ALTER TABLE intents ADD COLUMN user_id TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding user_id column:', err);
    }
  });
});

function addResponse(response) {
  const id = Date.now().toString();
  const data = JSON.stringify(response);
  const timestamp = new Date().toISOString();
  db.run('INSERT INTO responses (id, data, timestamp) VALUES (?, ?, ?)', [id, data, timestamp]);
}

function addIntent(type, intent, userId = null) {
  return new Promise((resolve) => {
    const id = Date.now().toString();
    const data = JSON.stringify(intent);
    db.run('INSERT INTO intents (id, type, data, status, user_id) VALUES (?, ?, ?, ?, ?)', [id, type, data, 'pending', userId], function (err) {
      if (err) {
        console.error('Error adding intent:', err);
        resolve(null);
      } else {
        resolve(id);
      }
    });
  });
}

function updateIntentStatus(id, status) {
  return new Promise((resolve) => {
    db.run('UPDATE intents SET status = ? WHERE id = ?', [status, id], function (err) {
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
        intent.user_id = row.user_id;
        resolve(intent);
      } else {
        resolve(null);
      }
    });
  });
}

function readIntents(userId = null) {
  return new Promise((resolve) => {
    let query = 'SELECT * FROM intents WHERE user_id = ?';
    let params = [userId];

    query += ' ORDER BY id DESC';

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error reading intents:', err);
        resolve([]);
        return;
      }
      const intents = rows.map(row => {
        try {
          const intent = JSON.parse(row.data);
          intent.id = row.id;
          intent.type = row.type;
          intent.user_id = row.user_id;
          if (row.type === 'schedule') {
            intent.status = row.status;
          }
          return intent;
        } catch (e) {
          console.error('Error parsing intent data:', e, 'Data:', row.data);
          return null;
        }
      }).filter(intent => intent !== null);
      resolve(intents);
    });
  });
}

function readCreates(userId = null) {
  return new Promise((resolve) => {
    let query = 'SELECT * FROM intents WHERE type = ? AND user_id = ?';
    let params = ['create', userId];

    query += ' ORDER BY id DESC';

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error reading creates:', err);
        resolve([]);
        return;
      }
      const intents = rows.map(row => {
        const intent = JSON.parse(row.data);
        return {
          intent: intent.intent,
          image_generation_prompt: intent.image_generation_prompt,
          caption_prompt: intent.caption_prompt,
          id: row.id,
          user_id: row.user_id
        };
      });
      resolve(intents);
    });
  });
}

function readSchedules(userId = null, isAdmin = false) {
  return new Promise((resolve) => {
    let query = 'SELECT * FROM intents WHERE type = ?';
    let params = ['schedule'];

    if (!isAdmin && userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY id DESC';

    db.all(query, params, (err, rows) => {
      const intents = rows.map(row => {
        const intent = JSON.parse(row.data);
        intent.id = row.id;
        intent.type = row.type;
        intent.status = row.status;
        intent.user_id = row.user_id;
        return intent;
      });
      resolve(intents);
    });
  });
}

function deleteIntent(id) {
  return new Promise((resolve) => {
    db.run('DELETE FROM intents WHERE id = ?', [id], function (err) {
      resolve(this.changes > 0);
    });
  });
}

function getSession(id) {
  return new Promise((resolve) => {
    db.get('SELECT * FROM sessions WHERE id = ?', [id], (err, row) => {
      resolve(row);
    });
  });
}

function createSession(id, userId) {
  return new Promise((resolve, reject) => {
    const createdAt = new Date().toISOString();
    db.run('INSERT INTO sessions (id, user_id, created_at) VALUES (?, ?, ?)', [id, userId, createdAt], function (err) {
      if (err) {
        console.error('Error creating session:', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function readSessions(userId = null, isAdmin = false) {
  return new Promise((resolve) => {
    let query = 'SELECT * FROM sessions';
    let params = [];

    if (!isAdmin && userId) {
      query += ' WHERE user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY created_at DESC';

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error reading sessions:', err);
        resolve([]);
        return;
      }
      resolve(rows);
    });
  });
}

module.exports = { addResponse, addIntent, updateIntentStatus, getIntent, readIntents, readCreates, readSchedules, deleteIntent, getSession, createSession, readSessions };