# 🔒 Guia de Segurança - Dieta Bot

## 🛡️ Medidas de Segurança Implementadas

### 1. **Autenticação e Autorização**

#### Sistema de Login Administrativo
- ✅ **JWT Tokens** com expiração de 24 horas
- ✅ **Rate Limiting** - máximo 5 tentativas de login por IP
- ✅ **Senhas Hash** com bcrypt (salt rounds: 10)
- ✅ **Sessões seguras** com cookies httpOnly
- ✅ **Verificação de token** em todas as requisições

#### Credenciais Padrão
```
Admin:     admin / admin123
Moderador: moderator / mod123
```

⚠️ **IMPORTANTE**: Altere essas senhas em produção!

### 2. **Proteção de Rotas**

#### Middleware de Autenticação
```javascript
// Todas as rotas administrativas são protegidas
router.get('/dashboard', authMiddleware.authenticate, authMiddleware.authorize(['read']), ...)
```

#### Níveis de Permissão
- **Admin**: read, write, delete, admin
- **Moderador**: read, write

### 3. **Headers de Segurança**

#### Configuração Helmet
```javascript
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

#### Headers Adicionais
- ✅ **X-Frame-Options**: DENY (previne clickjacking)
- ✅ **X-Content-Type-Options**: nosniff
- ✅ **X-XSS-Protection**: 1; mode=block
- ✅ **Referrer-Policy**: strict-origin-when-cross-origin

### 4. **Rate Limiting**

#### Proteção contra Ataques
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // limite de 100 requests por IP
});
```

#### Login Rate Limiting
- Máximo 5 tentativas por IP
- Bloqueio por 15 minutos após exceder limite

### 5. **CORS Configurado**

```javascript
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? ['https://your-domain.com'] : true,
  credentials: true
}));
```

### 6. **Logs de Segurança**

#### Monitoramento de Atividades
- ✅ **Log de tentativas de login**
- ✅ **Log de atividades administrativas**
- ✅ **Log de acessos não autorizados**
- ✅ **Log de mudanças de dados**

### 7. **Proteção de Dados**

#### Criptografia
- ✅ **Senhas**: bcrypt com salt
- ✅ **Tokens JWT**: assinados com chave secreta
- ✅ **Cookies**: httpOnly e secure em produção

#### Validação de Entrada
- ✅ **Sanitização** de dados de entrada
- ✅ **Validação** de tipos e formatos
- ✅ **Escape** de caracteres especiais

## 🚨 Configurações de Produção

### 1. **Variáveis de Ambiente Seguras**

```env
# JWT Secret (use uma chave forte e única)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# MongoDB (use connection string segura)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db

# OpenAI (mantenha a chave privada)
OPENAI_API_KEY=sk-your-openai-key

# Stripe (use chaves de produção)
STRIPE_SECRET_KEY=sk_live_your-stripe-key
```

### 2. **Senhas de Administrador**

#### Gerar Nova Senha Hash
```bash
node src/utils/passwordGenerator.js
```

#### Alterar Senhas em Produção
1. Gere nova senha forte
2. Execute o gerador de hash
3. Atualize o arquivo `src/middleware/auth.js`
4. Reinicie o servidor

### 3. **Configurações do Servidor**

#### HTTPS Obrigatório
```javascript
// Em produção, force HTTPS
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

#### Configuração de Cookies
```javascript
res.cookie('adminToken', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000
});
```

## 🔍 Monitoramento de Segurança

### 1. **Logs de Acesso**

#### Estrutura do Log
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "username": "admin",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "action": "login_success",
  "details": {
    "statusCode": 200
  }
}
```

### 2. **Alertas de Segurança**

#### Configurar Alertas para:
- ✅ Múltiplas tentativas de login falhadas
- ✅ Acessos de IPs suspeitos
- ✅ Tentativas de acesso não autorizado
- ✅ Mudanças em dados críticos

### 3. **Backup de Segurança**

#### Rotina de Backup
```bash
# Backup diário do banco de dados
mongodump --uri="mongodb+srv://..." --out=backup/$(date +%Y%m%d)

# Backup dos logs
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/
```

## 🛠️ Ferramentas de Segurança

### 1. **Análise de Vulnerabilidades**

```bash
# Verificar dependências vulneráveis
npm audit

# Corrigir vulnerabilidades
npm audit fix
```

### 2. **Testes de Segurança**

#### Testes Automatizados
```bash
# Instalar ferramentas de teste
npm install --save-dev jest supertest

# Executar testes de segurança
npm run test:security
```

### 3. **Monitoramento em Tempo Real**

#### Configurar Alertas
- **Email**: Para tentativas de login suspeitas
- **Slack/Discord**: Para alertas críticos
- **SMS**: Para emergências de segurança

## 📋 Checklist de Segurança

### ✅ **Configuração Inicial**
- [ ] Alterar senhas padrão
- [ ] Configurar JWT secret forte
- [ ] Habilitar HTTPS
- [ ] Configurar CORS adequadamente
- [ ] Configurar rate limiting

### ✅ **Monitoramento**
- [ ] Configurar logs de segurança
- [ ] Implementar alertas
- [ ] Configurar backup automático
- [ ] Monitorar tentativas de acesso

### ✅ **Manutenção**
- [ ] Atualizar dependências regularmente
- [ ] Revisar logs de segurança
- [ ] Testar procedimentos de backup
- [ ] Treinar equipe em segurança

## 🚨 Resposta a Incidentes

### 1. **Plano de Resposta**

#### Em caso de violação de segurança:
1. **Isolar** o sistema afetado
2. **Preservar** evidências (logs)
3. **Notificar** equipe de segurança
4. **Investigar** o incidente
5. **Corrigir** vulnerabilidades
6. **Comunicar** com usuários se necessário

### 2. **Contatos de Emergência**

```
Equipe de Segurança: security@dietabot.com
Administrador: admin@dietabot.com
Suporte 24/7: +55 11 99999-9999
```

### 3. **Procedimentos de Recuperação**

#### Restaurar Sistema
1. Parar serviços afetados
2. Restaurar backup limpo
3. Aplicar patches de segurança
4. Verificar integridade
5. Reiniciar serviços

## 📚 Recursos Adicionais

### Documentação
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [JWT Security Best Practices](https://tools.ietf.org/html/rfc8725)

### Ferramentas
- [Helmet.js](https://helmetjs.github.io/) - Headers de segurança
- [bcrypt](https://www.npmjs.com/package/bcrypt) - Hash de senhas
- [express-rate-limit](https://www.npmjs.com/package/express-rate-limit) - Rate limiting

---

**🔒 Lembre-se: Segurança é um processo contínuo, não um destino!**

Mantenha sempre o sistema atualizado e monitore regularmente as atividades suspeitas.
