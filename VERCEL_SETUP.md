# 🚀 Configuração do Vercel - Meu Nutri Pessoal

## 📋 Passo a Passo para Deploy no Vercel

### **1. Acesse o Vercel:**
1. Vá em [vercel.com](https://vercel.com)
2. Clique em **"Sign up"** ou **"Login"**
3. Escolha **"Continue with GitHub"**
4. Autorize o acesso ao GitHub

### **2. Importe seu projeto:**
1. Clique em **"New Project"**
2. Na seção **"Import Git Repository"**
3. Procure por: `goncalveses/meunutripessoal`
4. Clique em **"Import"**

### **3. Configure o projeto:**
- **Project Name**: `meu-nutri-pessoal`
- **Framework Preset**: `Other`
- **Root Directory**: `./` (deixe padrão)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### **4. Configure as variáveis de ambiente:**

#### **🔑 VARIÁVEIS OBRIGATÓRIAS:**

```env
# OpenAI (ESSENCIAL)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# WhatsApp (ESSENCIAL)
WHATSAPP_SESSION_NAME=meu_nutri_pessoal_session
WHATSAPP_PHONE_NUMBER=+5511999999999

# MongoDB (ESSENCIAL)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/meunutripessoal

# Servidor (ESSENCIAL)
NODE_ENV=production
BASE_URL=https://meu-nutri-pessoal.vercel.app

# Stripe (Para pagamentos)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# PIX (Para pagamentos)
PIX_KEY=sua_chave_pix_aqui
PIX_MERCHANT_NAME=Meu Nutri Pessoal

# Segurança (Para admin)
JWT_SECRET=seu_jwt_secret_super_seguro_aqui_123456789
ENCRYPTION_KEY=sua_chave_criptografia_32_caracteres_1234567890123456

# Email (Para notificações)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha_app_gmail

# Analytics (Opcional)
GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX
FACEBOOK_PIXEL_ID=your_pixel_id

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### **5. Deploy:**
1. Clique em **"Deploy"**
2. Aguarde o build (2-3 minutos)
3. Seu site estará em: `https://meu-nutri-pessoal.vercel.app`

### **6. Configurar domínio personalizado (opcional):**
1. Vá em **Settings** > **Domains**
2. Clique em **"Add Domain"**
3. Digite: `meunutripessoal.com`
4. Configure o DNS no seu registrador

## 🔧 Configurações Importantes

### **Build Settings:**
- **Framework Preset**: `Other`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### **Environment Variables:**
- Marque para **Production**, **Preview** e **Development**
- Configure uma por uma
- Use chaves de **teste** primeiro

## 🧪 Como testar:

### **1. Acesse seu site:**
- URL: `https://meu-nutri-pessoal.vercel.app`

### **2. Teste o bot:**
- Vá em **Admin** > **Login**
- Use as credenciais geradas
- Configure o WhatsApp

### **3. Teste o WhatsApp:**
- Escaneie o QR Code
- Envie uma foto de comida
- Veja a análise da IA

## ⚠️ Dicas importantes:

1. **Sempre** marque as 3 opções de ambiente
2. **Teste** com chaves de teste primeiro
3. **Nunca** compartilhe suas chaves
4. **Monitore** os logs no Vercel

## 🎯 Resultado:
Após seguir esses passos, você terá:
- ✅ Site online no Vercel
- ✅ Bot WhatsApp funcionando
- ✅ IA analisando fotos
- ✅ Sistema de pagamentos
- ✅ Dashboard administrativo

**🚀 Seu "Meu Nutri Pessoal" estará online e funcionando!**
