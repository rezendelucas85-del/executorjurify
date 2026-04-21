const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.')); // Serve static files from current directory

// Database setup
const db = new sqlite3.Database('./jurify.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    createTables();
  }
});

function createTables() {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS hearings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    vara TEXT,
    type TEXT,
    category TEXT,
    judge TEXT,
    process TEXT,
    notes TEXT,
    status TEXT DEFAULT 'pendente',
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);
}

// Routes
app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, password], function(err) {
    if (err) {
      return res.status(400).json({ error: 'User already exists or invalid data' });
    }
    res.json({ id: this.lastID, name, email });
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (row) {
      res.json({ id: row.id, name: row.name, email: row.email });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });
});

app.get('/api/hearings/:userId', (req, res) => {
  const userId = req.params.userId;
  db.all('SELECT * FROM hearings WHERE user_id = ?', [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

app.post('/api/hearings', (req, res) => {
  const { user_id, date, time, vara, type, category, judge, process, notes } = req.body;
  db.run('INSERT INTO hearings (user_id, date, time, vara, type, category, judge, process, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [user_id, date, time, vara, type, category, judge, process, notes, 'pendente'], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ id: this.lastID });
  });
});

app.put('/api/hearings/:id', (req, res) => {
  const id = req.params.id;
  const { date, time, vara, type, category, judge, process, notes, status } = req.body;
  db.run('UPDATE hearings SET date = ?, time = ?, vara = ?, type = ?, category = ?, judge = ?, process = ?, notes = ?, status = ? WHERE id = ?',
    [date, time, vara, type, category, judge, process, notes, status, id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ changes: this.changes });
  });
});

app.delete('/api/hearings/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM hearings WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ changes: this.changes });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});