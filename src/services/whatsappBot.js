const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

const aiService = require('./aiService');
const database = require('./database');
const dietGenerator = require('./dietGenerator');

class WhatsAppBot {
  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: process.env.WHATSAPP_SESSION_NAME || 'dieta_bot_session'
      }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // QR Code para autenticação
    this.client.on('qr', (qr) => {
      console.log('📱 QR Code gerado! Escaneie com seu WhatsApp:');
      qrcode.generate(qr, { small: true });
    });

    // Cliente pronto
    this.client.on('ready', () => {
      console.log('✅ WhatsApp Bot está pronto!');
    });

    // Mensagem recebida
    this.client.on('message', async (message) => {
      try {
        await this.handleMessage(message);
      } catch (error) {
        console.error('Erro ao processar mensagem:', error);
        await this.sendMessage(message.from, '❌ Ocorreu um erro ao processar sua mensagem. Tente novamente.');
      }
    });

    // Erro de autenticação
    this.client.on('auth_failure', (msg) => {
      console.error('❌ Falha na autenticação:', msg);
    });

    // Cliente desconectado
    this.client.on('disconnected', (reason) => {
      console.log('❌ Cliente desconectado:', reason);
    });
  }

  async handleMessage(message) {
    const contact = await message.getContact();
    const chat = await message.getChat();
    
    // Ignorar mensagens de grupos por enquanto
    if (chat.isGroup) return;

    const userPhone = contact.number;
    const messageBody = message.body.toLowerCase();

    // Verificar se é uma imagem
    if (message.hasMedia) {
      const media = await message.downloadMedia();
      if (media.mimetype.startsWith('image/')) {
        await this.handleImageMessage(message, media, userPhone);
        return;
      }
    }

    // Verificar se é um áudio
    if (message.type === 'ptt') {
      await this.handleAudioMessage(message, userPhone);
      return;
    }

    // Comandos de texto
    await this.handleTextMessage(message, messageBody, userPhone);
  }

  async handleImageMessage(message, media, userPhone) {
    await this.sendMessage(message.from, '📸 Analisando sua refeição...');

    try {
      // Salvar imagem temporariamente
      const imagePath = path.join(__dirname, '../temp', `image_${Date.now()}.jpg`);
      fs.writeFileSync(imagePath, media.data, 'base64');

      // Analisar imagem com IA
      const analysis = await aiService.analyzeFoodImage(imagePath);
      
      // Salvar no banco de dados
      await database.saveMeal(userPhone, {
        type: 'image',
        content: analysis,
        timestamp: new Date(),
        calories: analysis.calories,
        nutrients: analysis.nutrients
      });

      // Gerar resposta
      const response = this.formatMealAnalysis(analysis);
      await this.sendMessage(message.from, response);

      // Limpar arquivo temporário
      fs.unlinkSync(imagePath);

    } catch (error) {
      console.error('Erro ao analisar imagem:', error);
      await this.sendMessage(message.from, '❌ Não consegui analisar sua refeição. Tente enviar uma foto mais clara.');
    }
  }

  async handleAudioMessage(message, userPhone) {
    await this.sendMessage(message.from, '🎤 Processando seu áudio...');

    try {
      // Baixar áudio
      const media = await message.downloadMedia();
      const audioPath = path.join(__dirname, '../temp', `audio_${Date.now()}.ogg`);
      fs.writeFileSync(audioPath, media.data, 'base64');

      // Transcrever áudio
      const transcription = await aiService.transcribeAudio(audioPath);
      
      // Processar comando de voz
      const response = await this.processVoiceCommand(transcription, userPhone);
      await this.sendMessage(message.from, response);

      // Limpar arquivo temporário
      fs.unlinkSync(audioPath);

    } catch (error) {
      console.error('Erro ao processar áudio:', error);
      await this.sendMessage(message.from, '❌ Não consegui processar seu áudio. Tente novamente.');
    }
  }

  async handleTextMessage(message, messageBody, userPhone) {
    // Comandos disponíveis
    const commands = {
      'menu': () => this.showMenu(),
      'dieta': () => this.generateDiet(userPhone),
      'historico': () => this.showHistory(userPhone),
      'calorias': () => this.showCalories(userPhone),
      'ajuda': () => this.showHelp(),
      'start': () => this.showWelcome()
    };

    const command = Object.keys(commands).find(cmd => messageBody.includes(cmd));
    
    if (command) {
      const response = await commands[command]();
      await this.sendMessage(message.from, response);
    } else {
      // Tentar processar como descrição de refeição
      const response = await this.processMealDescription(messageBody, userPhone);
      await this.sendMessage(message.from, response);
    }
  }

  async processVoiceCommand(transcription, userPhone) {
    const text = transcription.toLowerCase();
    
    if (text.includes('dieta') || text.includes('diet')) {
      return await this.generateDiet(userPhone);
    } else if (text.includes('histórico') || text.includes('historico')) {
      return await this.showHistory(userPhone);
    } else if (text.includes('calorias')) {
      return await this.showCalories(userPhone);
    } else if (text.includes('menu') || text.includes('ajuda')) {
      return await this.showMenu();
    } else {
      // Processar como descrição de refeição
      return await this.processMealDescription(text, userPhone);
    }
  }

  async processMealDescription(description, userPhone) {
    try {
      const analysis = await aiService.analyzeMealDescription(description);
      
      // Salvar no banco de dados
      await database.saveMeal(userPhone, {
        type: 'text',
        content: description,
        analysis: analysis,
        timestamp: new Date(),
        calories: analysis.calories,
        nutrients: analysis.nutrients
      });

      return this.formatMealAnalysis(analysis);
    } catch (error) {
      console.error('Erro ao analisar descrição:', error);
      return '❌ Não consegui analisar sua refeição. Tente ser mais específico ou envie uma foto.';
    }
  }

  formatMealAnalysis(analysis) {
    let response = `🍽️ *ANÁLISE DA SUA REFEIÇÃO*\n\n`;
    response += `📊 *Calorias:* ${analysis.calories} kcal\n`;
    response += `🥗 *Alimentos identificados:*\n`;
    
    analysis.foods.forEach(food => {
      response += `• ${food.name} (${food.calories} kcal)\n`;
    });

    if (analysis.nutrients) {
      response += `\n📈 *Nutrientes:*\n`;
      response += `• Proteínas: ${analysis.nutrients.protein}g\n`;
      response += `• Carboidratos: ${analysis.nutrients.carbs}g\n`;
      response += `• Gorduras: ${analysis.nutrients.fat}g\n`;
    }

    response += `\n💡 *Dica:* ${analysis.tip}`;
    return response;
  }

  async generateDiet(userPhone) {
    try {
      const userHistory = await database.getUserMeals(userPhone);
      const diet = await dietGenerator.generatePersonalizedDiet(userHistory);
      
      // Salvar dieta no banco
      await database.saveDiet(userPhone, diet);
      
      return diet.formatForWhatsApp();
    } catch (error) {
      console.error('Erro ao gerar dieta:', error);
      return '❌ Não consegui gerar sua dieta personalizada. Tente novamente mais tarde.';
    }
  }

  async showHistory(userPhone) {
    try {
      const meals = await database.getUserMeals(userPhone, 7); // Últimos 7 dias
      
      if (meals.length === 0) {
        return '📝 Você ainda não tem refeições registradas. Envie fotos ou descreva suas refeições!';
      }

      let response = `📊 *SEU HISTÓRICO (Últimos 7 dias)*\n\n`;
      let totalCalories = 0;

      meals.forEach(meal => {
        const date = new Date(meal.timestamp).toLocaleDateString('pt-BR');
        response += `📅 ${date}: ${meal.calories} kcal\n`;
        totalCalories += meal.calories;
      });

      response += `\n🔥 *Total de calorias:* ${totalCalories} kcal`;
      response += `\n📈 *Média diária:* ${Math.round(totalCalories / 7)} kcal`;

      return response;
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      return '❌ Não consegui acessar seu histórico. Tente novamente.';
    }
  }

  async showCalories(userPhone) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayMeals = await database.getUserMealsByDate(userPhone, today);
      const totalCalories = todayMeals.reduce((sum, meal) => sum + meal.calories, 0);

      let response = `🔥 *CALORIAS DE HOJE*\n\n`;
      response += `📊 *Total consumido:* ${totalCalories} kcal\n`;
      response += `🎯 *Meta recomendada:* 2000 kcal\n`;
      
      const percentage = Math.round((totalCalories / 2000) * 100);
      response += `📈 *Progresso:* ${percentage}%\n\n`;

      if (percentage < 50) {
        response += `💡 *Dica:* Você ainda pode comer mais! Considere adicionar um lanche saudável.`;
      } else if (percentage > 100) {
        response += `⚠️ *Atenção:* Você excedeu sua meta diária. Considere fazer mais exercícios.`;
      } else {
        response += `✅ *Parabéns:* Você está no caminho certo! Continue assim.`;
      }

      return response;
    } catch (error) {
      console.error('Erro ao calcular calorias:', error);
      return '❌ Não consegui calcular suas calorias. Tente novamente.';
    }
  }

  showMenu() {
    return `🍽️ *MENU DO DIETA BOT*\n\n` +
           `📸 *Envie uma foto* da sua refeição para análise\n` +
           `🎤 *Envie um áudio* descrevendo sua refeição\n` +
           `💬 *Comandos disponíveis:*\n\n` +
           `• *dieta* - Gerar dieta personalizada\n` +
           `• *historico* - Ver histórico de refeições\n` +
           `• *calorias* - Ver calorias do dia\n` +
           `• *ajuda* - Mostrar este menu\n\n` +
           `🤖 *Como usar:*\n` +
           `1. Envie fotos das suas refeições\n` +
           `2. Descreva o que comeu por texto ou áudio\n` +
           `3. Receba análises automáticas de calorias\n` +
           `4. Gere dietas personalizadas baseadas no seu histórico`;
  }

  showWelcome() {
    return `🎉 *BEM-VINDO AO DIETA BOT!*\n\n` +
           `Sou seu assistente pessoal de nutrição! 🤖\n\n` +
           `📸 *Envie fotos* das suas refeições\n` +
           `🎤 *Envie áudios* descrevendo o que comeu\n` +
           `💬 *Digite comandos* para interagir\n\n` +
           `Digite *menu* para ver todas as opções disponíveis!`;
  }

  showHelp() {
    return `❓ *AJUDA - DIETA BOT*\n\n` +
           `*Como funciona:*\n` +
           `1. 📸 Tire fotos das suas refeições\n` +
           `2. 🤖 Eu analiso automaticamente\n` +
           `3. 📊 Calculo calorias e nutrientes\n` +
           `4. 🥗 Gero dietas personalizadas\n\n` +
           `*Comandos de voz:*\n` +
           `• "Gere uma dieta para mim"\n` +
           `• "Mostre meu histórico"\n` +
           `• "Quantas calorias comi hoje?"\n\n` +
           `*Comandos de texto:*\n` +
           `• dieta, historico, calorias, menu\n\n` +
           `*Dicas:*\n` +
           `• Fotos claras funcionam melhor\n` +
           `• Descreva ingredientes específicos\n` +
           `• Use o bot regularmente para melhores resultados`;
  }

  async sendMessage(to, message) {
    try {
      await this.client.sendMessage(to, message);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  }

  async init() {
    await this.client.initialize();
  }

  async destroy() {
    await this.client.destroy();
  }
}

module.exports = new WhatsAppBot();
