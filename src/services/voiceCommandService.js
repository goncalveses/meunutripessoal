const aiService = require('./aiService');
const subscriptionService = require('./subscriptionService');
const dietGenerator = require('./dietGenerator');

class VoiceCommandService {
  constructor() {
    this.commands = {
      // Comandos de dieta e nutrição
      'dieta': this.handleDietCommand,
      'diet': this.handleDietCommand,
      'emagrecer': this.handleWeightLossCommand,
      'perder peso': this.handleWeightLossCommand,
      'ganhar massa': this.handleMuscleGainCommand,
      'massa muscular': this.handleMuscleGainCommand,
      'cardápio': this.handleMenuCommand,
      'menu': this.handleMenuCommand,
      'receita': this.handleRecipeCommand,
      'receitas': this.handleRecipeCommand,
      
      // Comandos de análise
      'analisar': this.handleAnalyzeCommand,
      'calorias': this.handleCaloriesCommand,
      'nutrientes': this.handleNutrientsCommand,
      'saudável': this.handleHealthCommand,
      
      // Comandos de progresso
      'progresso': this.handleProgressCommand,
      'evolução': this.handleProgressCommand,
      'resultados': this.handleResultsCommand,
      'estatísticas': this.handleStatsCommand,
      
      // Comandos de ajuda
      'ajuda': this.handleHelpCommand,
      'help': this.handleHelpCommand,
      'comandos': this.handleCommandsCommand,
      'tutorial': this.handleTutorialCommand,
      
      // Comandos de configuração
      'configurar': this.handleConfigCommand,
      'preferências': this.handlePreferencesCommand,
      'metas': this.handleGoalsCommand,
      'objetivos': this.handleGoalsCommand,
      
      // Comandos de pagamento
      'assinatura': this.handleSubscriptionCommand,
      'plano': this.handlePlanCommand,
      'upgrade': this.handleUpgradeCommand,
      'premium': this.handlePremiumCommand,
      
      // Comandos sociais
      'convidar': this.handleInviteCommand,
      'referência': this.handleReferralCommand,
      'amigo': this.handleFriendCommand,
      
      // Comandos de notificação
      'lembrete': this.handleReminderCommand,
      'notificação': this.handleNotificationCommand,
      'alerta': this.handleAlertCommand
    };
  }

  async processVoiceCommand(transcription, userPhone) {
    try {
      const text = transcription.toLowerCase().trim();
      
      // Buscar comando correspondente
      const command = this.findMatchingCommand(text);
      
      if (command) {
        return await command.handler(text, userPhone);
      }
      
      // Se não encontrar comando específico, processar como descrição de refeição
      return await this.processMealDescription(text, userPhone);
      
    } catch (error) {
      console.error('Erro ao processar comando de voz:', error);
      return '❌ Ocorreu um erro ao processar seu comando. Tente novamente.';
    }
  }

  findMatchingCommand(text) {
    for (const [keyword, handler] of Object.entries(this.commands)) {
      if (text.includes(keyword)) {
        return { keyword, handler };
      }
    }
    return null;
  }

  async handleDietCommand(text, userPhone) {
    try {
      // Verificar limite de uso
      const usageCheck = await subscriptionService.checkUsageLimit(userPhone, 'dietGenerations');
      if (!usageCheck.allowed) {
        return `⚠️ *Limite atingido*\n\nVocê atingiu o limite de geração de dietas do seu plano.\n\nDigite *premium* para upgrade e ter acesso ilimitado!`;
      }

      // Extrair objetivo da fala
      const goal = this.extractGoalFromText(text);
      
      // Buscar histórico do usuário
      const database = require('./database');
      const userHistory = await database.getUserMeals(userPhone, 30);
      
      // Gerar dieta personalizada
      const diet = await dietGenerator.generatePersonalizedDiet(userHistory, { goal });
      
      // Salvar dieta
      await database.saveDiet(userPhone, diet);
      
      // Registrar uso
      await subscriptionService.recordUsage(userPhone, 'dietGenerations');
      
      return diet.formatForWhatsApp();
      
    } catch (error) {
      console.error('Erro ao gerar dieta:', error);
      return '❌ Não consegui gerar sua dieta. Tente novamente mais tarde.';
    }
  }

  async handleWeightLossCommand(text, userPhone) {
    try {
      // Extrair quantidade de peso
      const weightMatch = text.match(/(\d+)\s*kg/);
      const targetWeight = weightMatch ? parseInt(weightMatch[1]) : 5;
      
      // Extrair prazo
      const timeMatch = text.match(/(\d+)\s*(meses?|semanas?)/);
      const timeFrame = timeMatch ? parseInt(timeMatch[1]) : 2;
      const timeUnit = timeMatch ? timeMatch[2] : 'meses';
      
      const goal = {
        type: 'weight_loss',
        targetWeight: targetWeight,
        timeFrame: timeFrame,
        timeUnit: timeUnit
      };
      
      return await this.handleDietCommand(`dieta para emagrecer ${targetWeight}kg em ${timeFrame} ${timeUnit}`, userPhone);
      
    } catch (error) {
      console.error('Erro ao processar comando de emagrecimento:', error);
      return '❌ Não consegui processar seu objetivo de emagrecimento. Tente ser mais específico.';
    }
  }

  async handleMuscleGainCommand(text, userPhone) {
    try {
      const goal = {
        type: 'muscle_gain',
        targetWeight: 5,
        timeFrame: 3,
        timeUnit: 'meses'
      };
      
      return await this.handleDietCommand('dieta para ganhar massa muscular', userPhone);
      
    } catch (error) {
      console.error('Erro ao processar comando de ganho de massa:', error);
      return '❌ Não consegui processar seu objetivo de ganho de massa. Tente novamente.';
    }
  }

  async handleMenuCommand(text, userPhone) {
    try {
      // Verificar limite de uso
      const usageCheck = await subscriptionService.checkUsageLimit(userPhone, 'dietGenerations');
      if (!usageCheck.allowed) {
        return `⚠️ *Limite atingido*\n\nVocê atingiu o limite de geração de cardápios do seu plano.\n\nDigite *premium* para upgrade!`;
      }

      const database = require('./database');
      const userHistory = await database.getUserMeals(userPhone, 30);
      
      // Gerar cardápio semanal
      const weeklyMenu = await dietGenerator.generateWeeklyMenu(userHistory);
      
      // Registrar uso
      await subscriptionService.recordUsage(userPhone, 'dietGenerations');
      
      return this.formatWeeklyMenu(weeklyMenu);
      
    } catch (error) {
      console.error('Erro ao gerar cardápio:', error);
      return '❌ Não consegui gerar seu cardápio. Tente novamente.';
    }
  }

  async handleRecipeCommand(text, userPhone) {
    try {
      // Extrair tipo de receita
      const recipeType = this.extractRecipeType(text);
      
      const recipes = await aiService.generateRecipes(recipeType, 3);
      
      return this.formatRecipes(recipes);
      
    } catch (error) {
      console.error('Erro ao gerar receitas:', error);
      return '❌ Não consegui gerar receitas. Tente novamente.';
    }
  }

  async handleAnalyzeCommand(text, userPhone) {
    try {
      // Verificar limite de uso
      const usageCheck = await subscriptionService.checkUsageLimit(userPhone, 'dailyAnalyses');
      if (!usageCheck.allowed) {
        return `⚠️ *Limite atingido*\n\nVocê atingiu o limite de análises do seu plano.\n\nDigite *premium* para análises ilimitadas!`;
      }

      return '📸 *Como analisar sua refeição:*\n\n' +
             '1. Tire uma foto da sua comida\n' +
             '2. Envie para este chat\n' +
             '3. Receba análise completa em segundos!\n\n' +
             '✨ *O que você recebe:*\n' +
             '• Calorias totais\n' +
             '• Nutrientes detalhados\n' +
             '• Dicas personalizadas\n' +
             '• Avaliação de saúde';
      
    } catch (error) {
      console.error('Erro ao processar comando de análise:', error);
      return '❌ Erro ao processar comando. Tente novamente.';
    }
  }

  async handleCaloriesCommand(text, userPhone) {
    try {
      const database = require('./database');
      const today = new Date();
      const todayMeals = await database.getUserMealsByDate(userPhone, today);
      
      const totalCalories = todayMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
      
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

  async handleProgressCommand(text, userPhone) {
    try {
      const database = require('./database');
      const insights = await database.getHealthInsights(userPhone);
      
      let response = `📊 *SEU PROGRESSO*\n\n`;
      response += `🏆 *Score de Saúde:* ${insights.healthScore}/10\n`;
      response += `📈 *Calorias Médias:* ${Math.round(insights.averageCalories)} kcal/dia\n`;
      response += `🍽️ *Frequência:* ${insights.mealFrequency.toFixed(1)} refeições/dia\n\n`;
      
      if (insights.topFoods.length > 0) {
        response += `🥗 *Alimentos Favoritos:*\n`;
        insights.topFoods.slice(0, 3).forEach((food, index) => {
          response += `${index + 1}. ${food.food} (${food.count}x)\n`;
        });
      }
      
      response += `\n💡 *Dica:* Continue mantendo uma alimentação variada e balanceada!`;
      
      return response;
      
    } catch (error) {
      console.error('Erro ao buscar progresso:', error);
      return '❌ Não consegui buscar seu progresso. Tente novamente.';
    }
  }

  async handleHelpCommand(text, userPhone) {
    return `❓ *AJUDA - DIETA BOT*\n\n` +
           `*Comandos de Voz Disponíveis:*\n\n` +
           `🎤 *Dieta:* "Quero emagrecer 5kg"\n` +
           `🎤 *Cardápio:* "Gere um cardápio para esta semana"\n` +
           `🎤 *Calorias:* "Quantas calorias comi hoje?"\n` +
           `🎤 *Progresso:* "Como está meu progresso?"\n` +
           `🎤 *Receitas:* "Quero receitas veganas"\n` +
           `🎤 *Análise:* "Como analisar minha comida?"\n\n` +
           `*Outros Comandos:*\n` +
           `• *premium* - Ver planos\n` +
           `• *convidar* - Sistema de referência\n` +
           `• *lembrete* - Configurar notificações\n\n` +
           `*Dicas:*\n` +
           `• Fale naturalmente\n` +
           `• Seja específico nos objetivos\n` +
           `• Use o bot regularmente`;
  }

  async handleSubscriptionCommand(text, userPhone) {
    try {
      const subscriptionService = require('./subscriptionService');
      const currentPlan = await subscriptionService.getUserPlan(userPhone);
      const plans = subscriptionService.getPlans();
      
      let response = `💎 *SEUS PLANOS*\n\n`;
      response += `📱 *Plano Atual:* ${plans[currentPlan].name}\n\n`;
      
      response += `*Planos Disponíveis:*\n\n`;
      
      Object.entries(plans).forEach(([key, plan]) => {
        if (key !== 'free') {
          response += `🥈 *${plan.name}*\n`;
          response += `💰 R$ ${plan.price}/mês\n`;
          response += `✨ ${plan.features.slice(0, 2).join(', ')}\n\n`;
        }
      });
      
      response += `Digite *upgrade* para assinar um plano premium!`;
      
      return response;
      
    } catch (error) {
      console.error('Erro ao mostrar planos:', error);
      return '❌ Erro ao buscar planos. Tente novamente.';
    }
  }

  async handleInviteCommand(text, userPhone) {
    try {
      // Extrair nome do amigo
      const nameMatch = text.match(/convidar\s+(.+)/);
      const friendName = nameMatch ? nameMatch[1] : 'seu amigo';
      
      const referralCode = this.generateReferralCode(userPhone);
      
      return `🎁 *CONVITE PARA ${friendName.toUpperCase()}*\n\n` +
             `Olá! ${friendName}, eu uso o Dieta Bot e estou amando!\n\n` +
             `🤖 *O que é:* Seu nutricionista pessoal 24/7 no WhatsApp\n` +
             `📸 *Como funciona:* Envie fotos das suas refeições\n` +
             `🎤 *Comandos de voz:* "Quero emagrecer 5kg"\n\n` +
             `🎁 *Benefícios para você:*\n` +
             `• 1 mês grátis no plano Premium\n` +
             `• R$ 10 de desconto\n` +
             `• Suporte prioritário\n\n` +
             `📱 *Para começar:*\n` +
             `1. Acesse: ${process.env.BASE_URL}\n` +
             `2. Use o código: ${referralCode}\n` +
             `3. Comece grátis!\n\n` +
             `*Código de referência:* ${referralCode}`;
      
    } catch (error) {
      console.error('Erro ao gerar convite:', error);
      return '❌ Erro ao gerar convite. Tente novamente.';
    }
  }

  async processMealDescription(text, userPhone) {
    try {
      // Verificar limite de uso
      const usageCheck = await subscriptionService.checkUsageLimit(userPhone, 'dailyAnalyses');
      if (!usageCheck.allowed) {
        return `⚠️ *Limite atingido*\n\nVocê atingiu o limite de análises do seu plano.\n\nDigite *premium* para análises ilimitadas!`;
      }

      const analysis = await aiService.analyzeMealDescription(text);
      
      // Salvar no banco de dados
      const database = require('./database');
      await database.saveMeal(userPhone, {
        type: 'text',
        content: text,
        analysis: analysis,
        calories: analysis.calories,
        nutrients: analysis.nutrients
      });

      // Registrar uso
      await subscriptionService.recordUsage(userPhone, 'dailyAnalyses');
      
      return this.formatMealAnalysis(analysis);
      
    } catch (error) {
      console.error('Erro ao analisar descrição:', error);
      return '❌ Não consegui analisar sua refeição. Tente ser mais específico ou envie uma foto.';
    }
  }

  extractGoalFromText(text) {
    if (text.includes('emagrecer') || text.includes('perder peso')) {
      return 'weight_loss';
    } else if (text.includes('ganhar massa') || text.includes('massa muscular')) {
      return 'muscle_gain';
    } else if (text.includes('manter') || text.includes('equilíbrio')) {
      return 'maintenance';
    }
    return 'maintenance';
  }

  extractRecipeType(text) {
    if (text.includes('vegano') || text.includes('vegana')) {
      return 'vegan';
    } else if (text.includes('vegetariano') || text.includes('vegetariana')) {
      return 'vegetarian';
    } else if (text.includes('low carb') || text.includes('baixo carboidrato')) {
      return 'low_carb';
    } else if (text.includes('proteína') || text.includes('proteina')) {
      return 'high_protein';
    }
    return 'balanced';
  }

  generateReferralCode(userPhone) {
    const phoneDigits = userPhone.replace(/\D/g, '').slice(-4);
    const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `REF${phoneDigits}${randomCode}`;
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

  formatWeeklyMenu(menu) {
    let response = `📅 *CARDÁPIO SEMANAL*\n\n`;
    
    const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    
    days.forEach((day, index) => {
      if (menu[`day${index + 1}`]) {
        const dayMenu = menu[`day${index + 1}`];
        response += `*${day}*\n`;
        response += `🌅 Café: ${dayMenu.breakfast.foods.join(', ')}\n`;
        response += `🌞 Almoço: ${dayMenu.lunch.foods.join(', ')}\n`;
        response += `🌙 Jantar: ${dayMenu.dinner.foods.join(', ')}\n\n`;
      }
    });
    
    response += `📊 *Total semanal:* ${menu.totalCalories} kcal\n`;
    response += `💡 *Dica:* Siga o cardápio e ajuste conforme necessário!`;
    
    return response;
  }

  formatRecipes(recipes) {
    let response = `👨‍🍳 *RECEITAS PERSONALIZADAS*\n\n`;
    
    recipes.forEach((recipe, index) => {
      response += `*${index + 1}. ${recipe.name}*\n`;
      response += `⏱️ Tempo: ${recipe.time}\n`;
      response += `👥 Porções: ${recipe.servings}\n`;
      response += `🔥 Calorias: ${recipe.calories} kcal/porção\n\n`;
    });
    
    response += `💡 *Dica:* Experimente essas receitas e me conte como ficaram!`;
    
    return response;
  }
}

module.exports = new VoiceCommandService();
