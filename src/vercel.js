// Vercel serverless function entry point
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const database = require('./services/database');
const webRoutes = require('./routes/web');

const app = express();

// Middlewares
app.use(helmet());
app.use(cors({
  origin: [
    'https://meunutripessoal.vercel.app',
    'https://meunutripessoal-53jbd4qnl-goncalveses-projects.vercel.app'
  ],
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));

// Rotas
app.use('/api', webRoutes);

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Rota para admin
app.get('/admin', (req, res) => {
  res.redirect('/admin/login.html');
});

// Rota para admin dashboard
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Inicialização para Vercel
async function init() {
  try {
    // Inicializar banco de dados
    await database.init();
    console.log('✅ Banco de dados inicializado no Vercel');
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
  }
}

// Inicializar se não estiver no ambiente serverless
if (!process.env.VERCEL) {
  init();
}

module.exports = app;
