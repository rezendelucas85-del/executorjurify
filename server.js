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
app.use(express.static('.')); 

// Database setup
const db = new sqlite3.Database('./jurify.db', (err) => {
  if (err) {
    console.error('Erro ao abrir o banco de dados:', err.message);
  } else {
    console.log('Conectado ao banco SQLite.');
    createTables();
  }
});

function createTables() {
  db.serialize(() => {
    // Tabela de Usuários
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )`);

    // Tabela de Audiências
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

    // Tabela de Tokens (Apenas uma vez)
    db.run(`CREATE TABLE IF NOT EXISTS reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
  });
}

// Rota de Cadastro Corrigida
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Preencha todos os campos.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
    
    db.run(sql, [name, email, hashedPassword], function(err) {
      if (err) {
        console.error("ERRO NO BANCO:", err.message);
        // Se o erro for de 'UNIQUE constraint', o email já existe
        if (err.message.includes("UNIQUE constraint failed")) {
            return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
        }
        // Qualquer outro erro (tabela faltando, etc)
        return res.status(500).json({ error: 'Erro interno: ' + err.message });
      }
      res.json({ id: this.lastID, name, email });
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao processar senha.' });
  }
});

// Rota de Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Erro no banco de dados.' });
    }
    if (!row) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    try {
      const match = await bcrypt.compare(password, row.password);
      if (match) {
        res.json({ id: row.id, name: row.name, email: row.email });
      } else {
        res.status(401).json({ error: 'E-mail ou senha incorretos.' });
      }
    } catch (e) {
      res.status(500).json({ error: 'Erro na autenticação.' });
    }
  });
});

// --- Outras rotas (manter igual ou conforme sua necessidade) ---

app.get('/api/hearings/:userId', (req, res) => {
  const userId = req.params.userId;
  db.all('SELECT * FROM hearings WHERE user_id = ?', [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/hearings', (req, res) => {
  const { user_id, date, time, vara, type, category, judge, process, notes } = req.body;
  db.run('INSERT INTO hearings (user_id, date, time, vara, type, category, judge, process, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [user_id, date, time, vara, type, category, judge, process, notes, 'pendente'], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em: http://localhost:${PORT}`);
});
