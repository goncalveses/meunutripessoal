# 🍽️ Meu Nutri Pessoal - MVP Inovador

**Seu Nutricionista Pessoal 24/7 no WhatsApp**

Um bot revolucionário que usa IA multimodal (GPT-4 Vision + Whisper) para analisar fotos de refeições, processar comandos de voz e gerar dietas personalizadas diretamente no WhatsApp.

## 🚀 Funcionalidades Revolucionárias

### 🤖 IA Multimodal
- **Análise de Fotos**: GPT-4 Vision identifica alimentos, porções e calorias
- **Comandos de Voz**: Whisper transcreve comandos naturais em português
- **Chat Inteligente**: Conversa natural sobre nutrição 24/7
- **Respostas Personalizadas**: Baseadas no histórico do usuário

### 🎤 Comandos de Voz Inovadores
```
🎤 "Quero emagrecer 10kg em 3 meses" → Gera dieta personalizada
🎤 "Estou com fome, o que posso comer?" → Sugere lanches saudáveis
🎤 "Gere um cardápio para esta semana" → Cria menu completo
🎤 "Quanto gastei com comida este mês?" → Relatório financeiro
🎤 "Me lembre de beber água" → Configura notificações
🎤 "Convide meu amigo João" → Sistema de referência
🎤 "Quero receitas veganas" → Gera receitas personalizadas
🎤 "Meu progresso está bom?" → Análise de evolução
```

### 💎 Sistema de Planos
- **🆓 Gratuito**: 3 análises/dia, dicas básicas
- **🥈 Premium (R$ 29,90/mês)**: Análises ilimitadas, dietas personalizadas
- **🥇 Pro (R$ 59,90/mês)**: Tudo + coaching + metas + relatórios
- **💎 VIP (R$ 99,90/mês)**: Tudo + consultoria 1:1 + receitas exclusivas

### 💳 Pagamentos Integrados
- **PIX Instantâneo**: Pagamento direto no WhatsApp
- **Cartão de Crédito**: Via Stripe (mensal/anual)
- **Boleto**: Para planos anuais via Stripe

### 🎁 Sistema de Referência
- **R$ 10 por indicação** para quem indica
- **1 mês grátis** para ambos
- **Programa de afiliados** com comissões
- **Cashback** em compras

## 🛠️ Tecnologias

### Backend
- **Node.js** + **Express**
- **MongoDB Atlas** (banco de dados)
- **WhatsApp Web.js** (integração WhatsApp)
- **OpenAI API** (GPT-4 Vision + Whisper)
- **Stripe** (pagamentos)

### Frontend
- **HTML5** + **CSS3** + **JavaScript**
- **Tailwind CSS** (design responsivo)
- **Chart.js** (gráficos e analytics)

### IA e ML
- **GPT-4 Vision** (análise de imagens)
- **Whisper** (transcrição de áudio)
- **GPT-3.5/4** (conversas e dietas)

## 📁 Estrutura do Projeto

```
meu-nutri-pessoal/
├── src/
│   ├── index.js                 # Servidor principal
│   ├── routes/
│   │   └── web.js              # API REST
│   └── services/
│       ├── whatsappBot.js      # Bot WhatsApp
│       ├── aiService.js        # Integração OpenAI
│       ├── dietGenerator.js    # Gerador de dietas
│       ├── database.js         # MongoDB
│       ├── subscriptionService.js # Assinaturas
│       ├── paymentService.js   # Pagamentos
│       ├── voiceCommandService.js # Comandos de voz
│       └── referralService.js  # Sistema de referência
├── public/
│   ├── index.html              # Landing page
│   └── admin.html              # Dashboard administrativo
├── package.json
├── env.example
└── README.md
```

## 🚀 Instalação e Configuração

### 1. Clone o repositório
```bash
git clone https://github.com/goncalveses/meunutripessoal.git
cd meu-nutri-pessoal
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
```bash
cp env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# WhatsApp
WHATSAPP_SESSION_NAME=dieta_bot_session
WHATSAPP_PHONE_NUMBER=+5511999999999

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/meunutripessoal

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Servidor
PORT=3000
BASE_URL=https://meunutripessoal.com

# PIX
PIX_KEY=your_pix_key_here
PIX_MERCHANT_NAME=Meu Nutri Pessoal
```

### 4. Execute o projeto
```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

### 5. Configure o WhatsApp
1. Acesse `http://localhost:3000`
2. Escaneie o QR Code com seu WhatsApp
3. O bot estará ativo!

## 📱 Como Usar

### Para Usuários
1. **Envie fotos** das suas refeições
2. **Use comandos de voz** naturalmente
3. **Receba análises** completas em segundos
4. **Gere dietas** personalizadas
5. **Acompanhe progresso** com relatórios

### Para Administradores
1. Acesse `/admin.html`
2. Monitore usuários e assinaturas
3. Visualize analytics e métricas
4. Gerencie pagamentos e referências

## 🎯 Comandos Disponíveis

### Texto
- `dieta` - Gera dieta personalizada
- `historico` - Mostra histórico de refeições
- `calorias` - Calorias do dia
- `menu` - Lista de comandos
- `ajuda` - Instruções de uso
- `premium` - Ver planos
- `convidar` - Sistema de referência

### Voz
- "Quero emagrecer X kg"
- "Gere um cardápio"
- "Quanto gastei este mês?"
- "Me lembre de beber água"
- "Convide meu amigo"
- "Quero receitas veganas"

## 📊 Analytics e Métricas

### Dashboard Administrativo
- **Usuários ativos** e crescimento
- **Receita mensal** e conversões
- **Análises realizadas** por dia
- **Planos mais populares**
- **Taxa de retenção**
- **Sistema de referência**

### Métricas de Engajamento
- Tempo médio de sessão
- Uso de comandos de voz
- Análises de fotos
- Geração de dietas
- Taxa de conversão

## 🔒 Segurança e Privacidade

- **Criptografia end-to-end** para mensagens
- **LGPD compliance** para dados pessoais
- **Backup automático** dos dados
- **Anonimização** de informações sensíveis
- **Rate limiting** para prevenir abuso

## 🚀 Deploy

### GitHub Pages (Frontend)
```bash
npm run build
git add .
git commit -m "Deploy to GitHub Pages"
git push origin main
```

### Heroku (Backend)
```bash
heroku create meu-nutri-pessoal
heroku config:set OPENAI_API_KEY=your_key
heroku config:set MONGODB_URI=your_mongodb_uri
git push heroku main
```

### Vercel (Full Stack)
```bash
vercel --prod
```

## 📈 Roadmap

### Fase 1 (MVP) ✅
- [x] Bot básico com IA multimodal
- [x] Sistema de pagamentos
- [x] Landing page profissional
- [x] Dashboard administrativo

### Fase 2 (Em desenvolvimento)
- [ ] Integração com apps de delivery
- [ ] Parcerias com supermercados
- [ ] App mobile nativo
- [ ] API pública

### Fase 3 (Futuro)
- [ ] Expansão internacional
- [ ] IA avançada com emoções
- [ ] Marketplace de receitas
- [ ] Franchising digital

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

- **Email**: suporte@meunutripessoal.com
- **WhatsApp**: +55 11 99999-9999
- **Site**: https://meunutripessoal.com

## 🎉 Agradecimentos

- **OpenAI** pela API GPT-4 e Whisper
- **WhatsApp** pela plataforma
- **Stripe** pelos pagamentos
- **MongoDB** pelo banco de dados
- **Comunidade** pelo feedback e suporte

---

**Desenvolvido com ❤️ para revolucionar a nutrição via WhatsApp**

🍽️ **Meu Nutri Pessoal** - Seu futuro nutricionista pessoal está aqui!
