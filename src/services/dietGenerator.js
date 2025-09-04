const aiService = require('./aiService');
const database = require('./database');

class DietGenerator {
  constructor() {
    this.defaultCalorieTargets = {
      weight_loss: 1500,
      maintenance: 2000,
      weight_gain: 2500
    };

    this.foodDatabase = {
      proteins: [
        { name: 'Frango grelhado', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
        { name: 'Salmão', calories: 208, protein: 25, carbs: 0, fat: 12 },
        { name: 'Ovos', calories: 155, protein: 13, carbs: 1.1, fat: 11 },
        { name: 'Tofu', calories: 76, protein: 8, carbs: 1.9, fat: 4.8 },
        { name: 'Quinoa', calories: 120, protein: 4.4, carbs: 22, fat: 1.9 },
        { name: 'Feijão preto', calories: 132, protein: 8.9, carbs: 24, fat: 0.5 }
      ],
      carbs: [
        { name: 'Arroz integral', calories: 111, protein: 2.6, carbs: 23, fat: 0.9 },
        { name: 'Batata doce', calories: 86, protein: 1.6, carbs: 20, fat: 0.1 },
        { name: 'Aveia', calories: 68, protein: 2.4, carbs: 12, fat: 1.4 },
        { name: 'Pão integral', calories: 247, protein: 13, carbs: 41, fat: 4.2 },
        { name: 'Banana', calories: 89, protein: 1.1, carbs: 23, fat: 0.3 }
      ],
      vegetables: [
        { name: 'Brócolis', calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
        { name: 'Espinafre', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
        { name: 'Tomate', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
        { name: 'Cenoura', calories: 41, protein: 0.9, carbs: 10, fat: 0.2 },
        { name: 'Abobrinha', calories: 17, protein: 1.2, carbs: 3.4, fat: 0.2 }
      ],
      fats: [
        { name: 'Abacate', calories: 160, protein: 2, carbs: 9, fat: 15 },
        { name: 'Azeite de oliva', calories: 884, protein: 0, carbs: 0, fat: 100 },
        { name: 'Nozes', calories: 654, protein: 15, carbs: 14, fat: 65 },
        { name: 'Sementes de chia', calories: 486, protein: 17, carbs: 42, fat: 31 }
      ]
    };
  }

  async generatePersonalizedDiet(userHistory, preferences = {}) {
    try {
      // Analisar histórico do usuário
      const userProfile = this.analyzeUserProfile(userHistory);
      
      // Determinar objetivo calórico
      const calorieTarget = this.calculateCalorieTarget(userProfile, preferences);
      
      // Gerar plano de refeições
      const mealPlan = await this.createMealPlan(calorieTarget, userProfile, preferences);
      
      // Adicionar dicas personalizadas
      const tips = await this.generatePersonalizedTips(userProfile, mealPlan);
      
      return {
        ...mealPlan,
        tips,
        userProfile,
        generatedAt: new Date(),
        calorieTarget
      };
    } catch (error) {
      console.error('Erro ao gerar dieta personalizada:', error);
      return this.generateDefaultDiet();
    }
  }

  analyzeUserProfile(userHistory) {
    if (!userHistory || userHistory.length === 0) {
      return {
        averageCalories: 2000,
        commonFoods: [],
        mealFrequency: 3,
        preferences: {},
        healthScore: 5
      };
    }

    const totalCalories = userHistory.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    const averageCalories = Math.round(totalCalories / userHistory.length);
    
    const commonFoods = this.extractCommonFoods(userHistory);
    const mealFrequency = this.calculateMealFrequency(userHistory);
    const healthScore = this.calculateHealthScore(userHistory);

    return {
      averageCalories,
      commonFoods,
      mealFrequency,
      preferences: this.extractPreferences(userHistory),
      healthScore
    };
  }

  extractCommonFoods(userHistory) {
    const foodCount = {};
    
    userHistory.forEach(meal => {
      if (meal.content && meal.content.foods) {
        meal.content.foods.forEach(food => {
          foodCount[food.name] = (foodCount[food.name] || 0) + 1;
        });
      }
    });

    return Object.entries(foodCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([food, count]) => ({ name: food, frequency: count }));
  }

  calculateMealFrequency(userHistory) {
    const days = new Set();
    userHistory.forEach(meal => {
      const day = new Date(meal.timestamp).toDateString();
      days.add(day);
    });
    
    return userHistory.length / Math.max(days.size, 1);
  }

  calculateHealthScore(userHistory) {
    let score = 5; // Base score
    
    // Analisar variedade de alimentos
    const uniqueFoods = new Set();
    userHistory.forEach(meal => {
      if (meal.content && meal.content.foods) {
        meal.content.foods.forEach(food => {
          uniqueFoods.add(food.name);
        });
      }
    });
    
    if (uniqueFoods.size > 20) score += 2;
    else if (uniqueFoods.size > 10) score += 1;
    
    // Analisar consumo de vegetais
    const hasVegetables = userHistory.some(meal => 
      meal.content && meal.content.foods && 
      meal.content.foods.some(food => 
        this.isVegetable(food.name)
      )
    );
    
    if (hasVegetables) score += 1;
    
    return Math.min(score, 10);
  }

  isVegetable(foodName) {
    const vegetables = ['brócolis', 'espinafre', 'tomate', 'cenoura', 'abobrinha', 'alface', 'couve', 'repolho'];
    return vegetables.some(veg => foodName.toLowerCase().includes(veg));
  }

  extractPreferences(userHistory) {
    const preferences = {
      vegetarian: false,
      lowCarb: false,
      highProtein: false
    };

    // Analisar padrões alimentares
    const hasMeat = userHistory.some(meal => 
      meal.content && meal.content.foods && 
      meal.content.foods.some(food => 
        ['frango', 'carne', 'peixe', 'porco'].some(meat => 
          food.name.toLowerCase().includes(meat)
        )
      )
    );

    preferences.vegetarian = !hasMeat;

    return preferences;
  }

  calculateCalorieTarget(userProfile, preferences) {
    let baseTarget = userProfile.averageCalories;
    
    // Ajustar baseado em preferências
    if (preferences.goal === 'weight_loss') {
      baseTarget = Math.max(baseTarget - 500, 1200);
    } else if (preferences.goal === 'weight_gain') {
      baseTarget = baseTarget + 300;
    }
    
    return Math.round(baseTarget);
  }

  async createMealPlan(calorieTarget, userProfile, preferences) {
    const mealDistribution = {
      breakfast: 0.25,
      lunch: 0.35,
      dinner: 0.30,
      snacks: 0.10
    };

    const meals = {
      breakfast: this.createMeal(calorieTarget * mealDistribution.breakfast, 'breakfast', userProfile),
      lunch: this.createMeal(calorieTarget * mealDistribution.lunch, 'lunch', userProfile),
      dinner: this.createMeal(calorieTarget * mealDistribution.dinner, 'dinner', userProfile),
      snacks: this.createSnacks(calorieTarget * mealDistribution.snacks, userProfile)
    };

    return {
      ...meals,
      totalCalories: calorieTarget,
      goals: this.generateGoals(userProfile, preferences),
      description: this.generateDietDescription(userProfile, preferences)
    };
  }

  createMeal(targetCalories, mealType, userProfile) {
    const foods = [];
    let currentCalories = 0;
    
    // Adicionar proteína
    const protein = this.selectFood('proteins', targetCalories * 0.3);
    foods.push(protein);
    currentCalories += protein.calories;
    
    // Adicionar carboidrato
    const carb = this.selectFood('carbs', targetCalories * 0.4);
    foods.push(carb);
    currentCalories += carb.calories;
    
    // Adicionar vegetais
    const vegetable = this.selectFood('vegetables', targetCalories * 0.2);
    foods.push(vegetable);
    currentCalories += vegetable.calories;
    
    // Adicionar gordura se necessário
    if (currentCalories < targetCalories * 0.9) {
      const fat = this.selectFood('fats', targetCalories * 0.1);
      foods.push(fat);
      currentCalories += fat.calories;
    }

    return {
      foods: foods.map(f => f.name),
      calories: Math.round(currentCalories),
      description: this.generateMealDescription(foods, mealType),
      nutrients: this.calculateNutrients(foods)
    };
  }

  createSnacks(targetCalories, userProfile) {
    const snacks = [];
    const snackCalories = targetCalories / 2; // 2 lanches
    
    for (let i = 0; i < 2; i++) {
      const snackFoods = [];
      let currentCalories = 0;
      
      // Lanche saudável
      const fruit = this.selectFood('carbs', snackCalories * 0.6);
      snackFoods.push(fruit);
      currentCalories += fruit.calories;
      
      if (currentCalories < snackCalories * 0.9) {
        const nuts = this.selectFood('fats', snackCalories * 0.4);
        snackFoods.push(nuts);
        currentCalories += nuts.calories;
      }

      snacks.push({
        foods: snackFoods.map(f => f.name),
        calories: Math.round(currentCalories),
        description: this.generateSnackDescription(snackFoods),
        nutrients: this.calculateNutrients(snackFoods)
      });
    }

    return snacks;
  }

  selectFood(category, targetCalories) {
    const foods = this.foodDatabase[category];
    const suitableFoods = foods.filter(food => 
      food.calories <= targetCalories * 1.5 && food.calories >= targetCalories * 0.3
    );
    
    if (suitableFoods.length === 0) {
      return foods[Math.floor(Math.random() * foods.length)];
    }
    
    return suitableFoods[Math.floor(Math.random() * suitableFoods.length)];
  }

  calculateNutrients(foods) {
    return foods.reduce((nutrients, food) => ({
      protein: nutrients.protein + food.protein,
      carbs: nutrients.carbs + food.carbs,
      fat: nutrients.fat + food.fat
    }), { protein: 0, carbs: 0, fat: 0 });
  }

  generateMealDescription(foods, mealType) {
    const mealNames = {
      breakfast: 'Café da manhã',
      lunch: 'Almoço',
      dinner: 'Jantar'
    };
    
    return `${mealNames[mealType]} balanceado com ${foods.map(f => f.name).join(', ')}`;
  }

  generateSnackDescription(foods) {
    return `Lanche saudável com ${foods.map(f => f.name).join(' e ')}`;
  }

  generateGoals(userProfile, preferences) {
    const goals = [];
    
    if (preferences.goal === 'weight_loss') {
      goals.push('Perder peso de forma saudável');
      goals.push('Manter saciedade com alimentos nutritivos');
    } else if (preferences.goal === 'weight_gain') {
      goals.push('Ganhar massa muscular');
      goals.push('Aumentar consumo calórico de forma saudável');
    } else {
      goals.push('Manter peso atual');
      goals.push('Melhorar qualidade nutricional');
    }
    
    if (userProfile.healthScore < 7) {
      goals.push('Aumentar variedade de alimentos');
      goals.push('Incluir mais vegetais na dieta');
    }
    
    return goals;
  }

  generateDietDescription(userProfile, preferences) {
    let description = `Dieta personalizada baseada no seu perfil alimentar. `;
    
    if (preferences.goal === 'weight_loss') {
      description += 'Focada em perda de peso saudável com déficit calórico controlado.';
    } else if (preferences.goal === 'weight_gain') {
      description += 'Focada em ganho de peso saudável com superávit calórico moderado.';
    } else {
      description += 'Focada em manutenção do peso e melhoria da qualidade nutricional.';
    }
    
    return description;
  }

  async generatePersonalizedTips(userProfile, mealPlan) {
    const tips = [];
    
    if (userProfile.healthScore < 7) {
      tips.push('Tente incluir mais vegetais coloridos em suas refeições');
      tips.push('Varie as fontes de proteína para obter todos os aminoácidos essenciais');
    }
    
    if (userProfile.mealFrequency < 3) {
      tips.push('Tente fazer pelo menos 3 refeições principais por dia');
      tips.push('Inclua lanches saudáveis entre as refeições');
    }
    
    tips.push('Beba pelo menos 2 litros de água por dia');
    tips.push('Mastigue devagar para melhor digestão e saciedade');
    
    return tips;
  }

  generateDefaultDiet() {
    return {
      breakfast: {
        foods: ['Aveia com banana', 'Leite desnatado'],
        calories: 300,
        description: 'Café da manhã nutritivo e energético',
        nutrients: { protein: 12, carbs: 45, fat: 6 }
      },
      lunch: {
        foods: ['Frango grelhado', 'Arroz integral', 'Brócolis'],
        calories: 500,
        description: 'Almoço balanceado com proteína, carboidrato e vegetais',
        nutrients: { protein: 35, carbs: 50, fat: 8 }
      },
      dinner: {
        foods: ['Salmão', 'Batata doce', 'Espinafre'],
        calories: 450,
        description: 'Jantar leve e nutritivo',
        nutrients: { protein: 30, carbs: 40, fat: 15 }
      },
      snacks: [
        {
          foods: ['Maçã', 'Nozes'],
          calories: 200,
          description: 'Lanche da tarde saudável',
          nutrients: { protein: 5, carbs: 25, fat: 12 }
        }
      ],
      totalCalories: 1450,
      goals: ['Manter alimentação balanceada', 'Incluir variedade de nutrientes'],
      tips: ['Beba bastante água', 'Mastigue devagar', 'Faça refeições regulares'],
      description: 'Dieta padrão balanceada para manutenção da saúde',
      generatedAt: new Date()
    };
  }

  formatForWhatsApp(diet) {
    let message = `🥗 *SUA DIETA PERSONALIZADA*\n\n`;
    
    message += `📊 *Total de calorias:* ${diet.totalCalories} kcal\n\n`;
    
    message += `🌅 *CAFÉ DA MANHÃ* (${diet.breakfast.calories} kcal)\n`;
    message += `${diet.breakfast.foods.join(', ')}\n`;
    message += `${diet.breakfast.description}\n\n`;
    
    message += `🌞 *ALMOÇO* (${diet.lunch.calories} kcal)\n`;
    message += `${diet.lunch.foods.join(', ')}\n`;
    message += `${diet.lunch.description}\n\n`;
    
    message += `🌙 *JANTAR* (${diet.dinner.calories} kcal)\n`;
    message += `${diet.dinner.foods.join(', ')}\n`;
    message += `${diet.dinner.description}\n\n`;
    
    if (diet.snacks && diet.snacks.length > 0) {
      message += `🍎 *LANCHES*\n`;
      diet.snacks.forEach((snack, index) => {
        message += `${index + 1}. ${snack.foods.join(', ')} (${snack.calories} kcal)\n`;
      });
      message += `\n`;
    }
    
    message += `🎯 *OBJETIVOS:*\n`;
    diet.goals.forEach(goal => {
      message += `• ${goal}\n`;
    });
    
    message += `\n💡 *DICAS:*\n`;
    diet.tips.forEach(tip => {
      message += `• ${tip}\n`;
    });
    
    return message;
  }
}

module.exports = new DietGenerator();
