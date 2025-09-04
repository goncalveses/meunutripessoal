const mongoose = require('mongoose');

class Database {
  constructor() {
    this.connection = null;
  }

  async init() {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      
      this.connection = mongoose.connection;
      console.log('✅ Conectado ao MongoDB Atlas');
      
      // Criar índices
      await this.createIndexes();
      
    } catch (error) {
      console.error('❌ Erro ao conectar com MongoDB:', error);
      throw error;
    }
  }

  async createIndexes() {
    try {
      const db = mongoose.connection.db;
      
      // Índices para usuários
      await db.collection('users').createIndex({ phone: 1 }, { unique: true });
      await db.collection('users').createIndex({ createdAt: 1 });
      
      // Índices para refeições
      await db.collection('meals').createIndex({ userPhone: 1, timestamp: -1 });
      await db.collection('meals').createIndex({ timestamp: -1 });
      
      // Índices para assinaturas
      await db.collection('subscriptions').createIndex({ userPhone: 1 });
      await db.collection('subscriptions').createIndex({ stripeSubscriptionId: 1 });
      await db.collection('subscriptions').createIndex({ status: 1 });
      
      // Índices para uso
      await db.collection('usage').createIndex({ userPhone: 1, date: 1, action: 1 });
      
      // Índices para pagamentos
      await db.collection('payments').createIndex({ userPhone: 1 });
      await db.collection('payments').createIndex({ status: 1 });
      await db.collection('payments').createIndex({ createdAt: -1 });
      
      console.log('✅ Índices criados com sucesso');
    } catch (error) {
      console.error('❌ Erro ao criar índices:', error);
    }
  }

  // Métodos para MongoDB
  getCollection(name) {
    return mongoose.connection.db.collection(name);
  }

  // Métodos adaptados para MongoDB
  async run(collection, operation, data) {
    try {
      const coll = this.getCollection(collection);
      return await coll[operation](...data);
    } catch (error) {
      console.error('Erro ao executar operação MongoDB:', error);
      throw error;
    }
  }

  async get(collection, query) {
    try {
      const coll = this.getCollection(collection);
      return await coll.findOne(query);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      throw error;
    }
  }

  async all(collection, query = {}, options = {}) {
    try {
      const coll = this.getCollection(collection);
      return await coll.find(query, options).toArray();
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      throw error;
    }
  }

  // Métodos específicos para o aplicativo

  async saveUser(phone, userData = {}) {
    try {
      const coll = this.getCollection('users');
      return await coll.updateOne(
        { phone: phone },
        {
          $set: {
            phone: phone,
            name: userData.name || null,
            preferences: userData.preferences || {},
            planType: userData.planType || 'free',
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      throw error;
    }
  }

  async getUser(phone) {
    try {
      return await this.get('users', { phone: phone });
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      throw error;
    }
  }

  async saveMeal(userPhone, mealData) {
    try {
      const coll = this.getCollection('meals');
      const result = await coll.insertOne({
        userPhone: userPhone,
        type: mealData.type,
        content: mealData.content,
        analysis: mealData.analysis || {},
        calories: mealData.calories || 0,
        nutrients: mealData.nutrients || {},
        timestamp: new Date()
      });
      
      // Atualizar estatísticas diárias
      await this.updateDailyStats(userPhone, mealData);
      
      return result;
    } catch (error) {
      console.error('Erro ao salvar refeição:', error);
      throw error;
    }
  }

  async getUserMeals(userPhone, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      return await this.all('meals', {
        userPhone: userPhone,
        timestamp: { $gte: startDate }
      }, { sort: { timestamp: -1 } });
    } catch (error) {
      console.error('Erro ao buscar refeições do usuário:', error);
      throw error;
    }
  }

  async getUserMealsByDate(userPhone, date) {
    try {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      return await this.all('meals', {
        userPhone: userPhone,
        timestamp: { $gte: startDate, $lte: endDate }
      }, { sort: { timestamp: 1 } });
    } catch (error) {
      console.error('Erro ao buscar refeições por data:', error);
      throw error;
    }
  }

  async saveDiet(userPhone, dietData) {
    try {
      const coll = this.getCollection('diets');
      return await coll.insertOne({
        userPhone: userPhone,
        dietPlan: dietData,
        calorieTarget: dietData.calorieTarget || dietData.totalCalories,
        goals: dietData.goals || [],
        tips: dietData.tips || [],
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Erro ao salvar dieta:', error);
      throw error;
    }
  }

  async getUserDiets(userPhone, limit = 5) {
    try {
      return await this.all('diets', 
        { userPhone: userPhone }, 
        { sort: { createdAt: -1 }, limit: limit }
      );
    } catch (error) {
      console.error('Erro ao buscar dietas do usuário:', error);
      throw error;
    }
  }

  async updateDailyStats(userPhone, mealData) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const calories = mealData.calories || 0;
      const nutrients = mealData.nutrients || {};
      
      const coll = this.getCollection('dailyStats');
      
      await coll.updateOne(
        {
          userPhone: userPhone,
          date: today
        },
        {
          $inc: {
            totalCalories: calories,
            totalProtein: nutrients.protein || 0,
            totalCarbs: nutrients.carbs || 0,
            totalFat: nutrients.fat || 0,
            mealCount: 1
          },
          $set: {
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('Erro ao atualizar estatísticas diárias:', error);
    }
  }

  async getDailyStats(userPhone, days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      return await this.all('dailyStats', {
        userPhone: userPhone,
        date: { $gte: startDate }
      }, { sort: { date: -1 } });
    } catch (error) {
      console.error('Erro ao buscar estatísticas diárias:', error);
      throw error;
    }
  }

  async getWeeklyStats(userPhone) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      const coll = this.getCollection('dailyStats');
      const stats = await coll.aggregate([
        {
          $match: {
            userPhone: userPhone,
            date: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            avgCalories: { $avg: '$totalCalories' },
            avgProtein: { $avg: '$totalProtein' },
            avgCarbs: { $avg: '$totalCarbs' },
            avgFat: { $avg: '$totalFat' },
            totalCalories: { $sum: '$totalCalories' },
            activeDays: { $sum: 1 }
          }
        }
      ]).toArray();
      
      return stats[0] || {
        avgCalories: 0,
        avgProtein: 0,
        avgCarbs: 0,
        avgFat: 0,
        totalCalories: 0,
        activeDays: 0
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas semanais:', error);
      throw error;
    }
  }

  async getTopFoods(userPhone, limit = 10) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      const meals = await this.all('meals', {
        userPhone: userPhone,
        type: 'image',
        timestamp: { $gte: startDate }
      });
      
      const foodCount = {};
      
      meals.forEach(meal => {
        try {
          if (meal.content && meal.content.foods) {
            meal.content.foods.forEach(food => {
              const foodName = food.name || food;
              foodCount[foodName] = (foodCount[foodName] || 0) + 1;
            });
          }
        } catch (error) {
          console.error('Erro ao processar alimentos:', error);
        }
      });
      
      return Object.entries(foodCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, limit)
        .map(([food, count]) => ({ food, count }));
    } catch (error) {
      console.error('Erro ao buscar alimentos mais consumidos:', error);
      throw error;
    }
  }

  async getHealthInsights(userPhone) {
    try {
      const weeklyStats = await this.getWeeklyStats(userPhone);
      const topFoods = await this.getTopFoods(userPhone, 5);
      const recentMeals = await this.getUserMeals(userPhone, 7);
      
      const insights = {
        weeklyStats,
        topFoods,
        mealFrequency: recentMeals.length / 7,
        averageCalories: weeklyStats.avgCalories || 0,
        healthScore: this.calculateHealthScore(weeklyStats, recentMeals)
      };
      
      return insights;
    } catch (error) {
      console.error('Erro ao buscar insights de saúde:', error);
      throw error;
    }
  }

  calculateHealthScore(weeklyStats, recentMeals) {
    let score = 5; // Base score
    
    // Analisar calorias
    if (weeklyStats.avgCalories >= 1500 && weeklyStats.avgCalories <= 2500) {
      score += 2;
    } else if (weeklyStats.avgCalories >= 1200 && weeklyStats.avgCalories <= 3000) {
      score += 1;
    }
    
    // Analisar frequência de refeições
    if (weeklyStats.activeDays >= 5) {
      score += 1;
    }
    
    // Analisar variedade de alimentos
    const uniqueFoods = new Set();
    recentMeals.forEach(meal => {
      if (meal.content && meal.content.foods) {
        meal.content.foods.forEach(food => {
          uniqueFoods.add(food.name || food);
        });
      }
    });
    
    if (uniqueFoods.size > 15) {
      score += 2;
    } else if (uniqueFoods.size > 10) {
      score += 1;
    }
    
    return Math.min(score, 10);
  }

  async close() {
    try {
      if (this.connection) {
        await mongoose.connection.close();
        console.log('✅ Conexão com MongoDB fechada');
      }
    } catch (error) {
      console.error('❌ Erro ao fechar conexão MongoDB:', error);
    }
  }
}

module.exports = new Database();

