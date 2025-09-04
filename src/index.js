const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const whatsappBot = require('./services/whatsappBot');
const database = require('./services/database');
const webRoutes = require('./routes/web');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? [
    'https://meunutripessoal.vercel.app',
    'https://meunutripessoal-53jbd4qnl-goncalveses-projects.vercel.app'
  ] : true,
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

// Rota para admin (redireciona para login se não autenticado)
app.get('/admin', (req, res) => {
  res.redirect('/admin/login.html');
});

// Rota para admin dashboard (protegida)
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// Inicialização
async function startServer() {
  try {
    // Inicializar banco de dados
    await database.init();
    console.log('✅ Banco de dados inicializado');

    // Inicializar bot do WhatsApp apenas se não estiver no Vercel
    if (process.env.VERCEL !== '1') {
      await whatsappBot.init();
      console.log('✅ Bot do WhatsApp inicializado');
    } else {
      console.log('⚠️ WhatsApp Bot desabilitado no Vercel (use Railway/Heroku para bot)');
    }

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📱 Acesse: http://localhost:${PORT}`);
      console.log('🤖 Bot do WhatsApp ativo e aguardando mensagens...');
    });
  } catch (error) {
    console.error('❌ Erro ao inicializar servidor:', error);
    process.exit(1);
  }
}

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Iniciar aplicação
startServer();
