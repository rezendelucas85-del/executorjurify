const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

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

  db.run(`CREATE TABLE IF NOT EXISTS reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);
}

// Routes
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword], function(err) {
      if (err) {
        return res.status(400).json({ error: 'User already exists or invalid data' });
      }
      res.json({ id: this.lastID, name, email });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error hashing password' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (row) {
      const match = await bcrypt.compare(password, row.password);
      if (match) {
        res.json({ id: row.id, name: row.name, email: row.email });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });
});

app.post('/api/forgot-password', (req, res) => {
  const { email } = req.body;
  db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'User not found' });
    }
    const token = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour
    db.run('INSERT INTO reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)', [row.id, token, expiresAt], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error generating token' });
      }
      // In a real app, send email with token
      res.json({ message: 'Reset token generated. Use this token to reset password: ' + token });
    });
  });
});

app.post('/api/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  db.get('SELECT user_id, expires_at FROM reset_tokens WHERE token = ?', [token], async (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row || new Date(row.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, row.user_id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error updating password' });
      }
      db.run('DELETE FROM reset_tokens WHERE token = ?', [token]);
      res.json({ message: 'Password reset successfully' });
    });
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