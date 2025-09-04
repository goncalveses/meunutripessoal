# 🚀 Guia de Deploy - Dieta Bot

## 📋 Pré-requisitos

### 1. Contas Necessárias
- [ ] **GitHub** - Repositório do código
- [ ] **MongoDB Atlas** - Banco de dados
- [ ] **OpenAI** - API de IA
- [ ] **Stripe** - Pagamentos
- [ ] **Vercel/Heroku** - Hospedagem
- [ ] **WhatsApp Business** - Número para o bot

### 2. Configurações Iniciais

#### MongoDB Atlas
1. Crie uma conta em [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Crie um cluster gratuito
3. Configure usuário e senha
4. Obtenha a string de conexão

#### OpenAI
1. Crie uma conta em [OpenAI](https://platform.openai.com)
2. Gere uma API key
3. Configure billing (necessário para GPT-4)

#### Stripe
1. Crie uma conta em [Stripe](https://stripe.com)
2. Obtenha as chaves de API
3. Configure webhooks

## 🌐 Deploy no Vercel (Recomendado)

### 1. Preparar o Projeto
```bash
# Clone o repositório
git clone https://github.com/seu-usuario/dieta-bot.git
cd dieta-bot

# Instale dependências
npm install

# Configure variáveis de ambiente
cp env.example .env
```

### 2. Configurar Vercel
```bash
# Instale Vercel CLI
npm i -g vercel

# Login no Vercel
vercel login

# Deploy
vercel --prod
```

### 3. Configurar Variáveis de Ambiente no Vercel
```bash
vercel env add OPENAI_API_KEY
vercel env add MONGODB_URI
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_PUBLISHABLE_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add WHATSAPP_PHONE_NUMBER
vercel env add PIX_KEY
vercel env add JWT_SECRET
```

## 🐳 Deploy com Docker

### 1. Criar Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### 2. Criar docker-compose.yml
```yaml
version: '3.8'

services:
  dieta-bot:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
    restart: unless-stopped
```

### 3. Deploy
```bash
docker-compose up -d
```

## ☁️ Deploy no Heroku

### 1. Preparar Heroku
```bash
# Instale Heroku CLI
npm install -g heroku

# Login
heroku login

# Criar app
heroku create dieta-bot
```

### 2. Configurar Variáveis
```bash
heroku config:set OPENAI_API_KEY=your_key
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set STRIPE_SECRET_KEY=your_stripe_key
heroku config:set NODE_ENV=production
```

### 3. Deploy
```bash
git push heroku main
```

## 🖥️ Deploy em VPS

### 1. Configurar Servidor
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm nginx

# Instalar PM2
npm install -g pm2
```

### 2. Configurar Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Deploy
```bash
# Clonar repositório
git clone https://github.com/seu-usuario/dieta-bot.git
cd dieta-bot

# Instalar dependências
npm install

# Configurar variáveis
cp env.example .env
nano .env

# Iniciar com PM2
pm2 start src/index.js --name dieta-bot
pm2 startup
pm2 save
```

## 📱 Configurar WhatsApp

### 1. Número do Bot
- Use um número dedicado para o bot
- Configure WhatsApp Business
- Mantenha o número sempre online

### 2. QR Code
- Execute o bot pela primeira vez
- Escaneie o QR Code
- Mantenha a sessão ativa

### 3. Webhook (Opcional)
```javascript
// Configurar webhook para receber mensagens
app.post('/webhook/whatsapp', (req, res) => {
  // Processar mensagens recebidas
});
```

## 🔧 Configurações Pós-Deploy

### 1. Domínio Personalizado
```bash
# Vercel
vercel domains add your-domain.com

# Heroku
heroku domains:add your-domain.com
```

### 2. SSL/HTTPS
- Vercel: Automático
- Heroku: Automático
- VPS: Use Let's Encrypt

### 3. Monitoramento
```bash
# PM2 logs
pm2 logs dieta-bot

# PM2 monitor
pm2 monit
```

## 📊 Configurar Analytics

### 1. Google Analytics
```html
<!-- Adicionar no index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### 2. Facebook Pixel
```html
<!-- Adicionar no index.html -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', 'YOUR_PIXEL_ID');
  fbq('track', 'PageView');
</script>
```

## 🔒 Configurações de Segurança

### 1. Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // limite de 100 requests por IP
});

app.use('/api/', limiter);
```

### 2. CORS
```javascript
const cors = require('cors');

app.use(cors({
  origin: ['https://your-domain.com', 'https://www.your-domain.com'],
  credentials: true
}));
```

### 3. Helmet
```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      scriptSrc: ["'self'", "https://cdn.tailwindcss.com"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
```

## 📈 Monitoramento e Logs

### 1. Logs Estruturados
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### 2. Health Check
```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

### 3. Métricas
```javascript
const prometheus = require('prom-client');

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});
```

## 🚨 Troubleshooting

### Problemas Comuns

#### 1. Bot não responde
- Verificar se a sessão WhatsApp está ativa
- Verificar logs de erro
- Reiniciar o processo

#### 2. Erro de conexão MongoDB
- Verificar string de conexão
- Verificar firewall
- Verificar credenciais

#### 3. Erro OpenAI API
- Verificar API key
- Verificar billing
- Verificar rate limits

#### 4. Erro Stripe
- Verificar chaves de API
- Verificar webhooks
- Verificar modo (test/production)

### Comandos Úteis
```bash
# Ver logs em tempo real
pm2 logs dieta-bot --lines 100

# Reiniciar aplicação
pm2 restart dieta-bot

# Ver status
pm2 status

# Ver uso de recursos
pm2 monit
```

## 📞 Suporte

### Contatos
- **Email**: suporte@dietabot.com
- **Discord**: [Servidor do Dieta Bot](https://discord.gg/dietabot)
- **GitHub Issues**: [Reportar bugs](https://github.com/seu-usuario/dieta-bot/issues)

### Documentação
- [WhatsApp Web.js](https://wwebjs.dev/)
- [OpenAI API](https://platform.openai.com/docs)
- [Stripe API](https://stripe.com/docs)
- [MongoDB Atlas](https://docs.atlas.mongodb.com/)

---

**🎉 Parabéns! Seu Dieta Bot está no ar!**

Agora você tem um nutricionista pessoal 24/7 funcionando via WhatsApp! 🍽️🤖
