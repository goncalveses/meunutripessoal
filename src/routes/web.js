const express = require('express');
const router = express.Router();
const database = require('../services/database');
const moment = require('moment');
const authMiddleware = require('../middleware/auth');

// Rotas de autenticação administrativa
router.post('/admin/login', authMiddleware.loginRateLimit, async (req, res) => {
  try {
    const { username, password, remember } = req.body;
    
    const result = await authMiddleware.login(username, password);
    
    // Set cookie if remember me is checked
    if (remember) {
      res.cookie('adminToken', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
    }
    
    // Record successful login
    authMiddleware.recordLoginAttempt(req.ip, true);
    
    res.json({
      success: true,
      token: result.token,
      user: result.user
    });
    
  } catch (error) {
    // Record failed login
    authMiddleware.recordLoginAttempt(req.ip, false);
    
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/admin/logout', (req, res) => {
  const result = authMiddleware.logout(res);
  res.json(result);
});

router.get('/admin/verify', authMiddleware.authenticate, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Rota para dashboard principal (protegida)
router.get('/dashboard', authMiddleware.authenticate, authMiddleware.authorize(['read']), async (req, res) => {
  try {
    const stats = await database.all(`
      SELECT 
        COUNT(DISTINCT user_phone) as total_users,
        COUNT(*) as total_meals,
        AVG(calories) as avg_calories
      FROM meals 
      WHERE timestamp >= date('now', '-7 days')
    `);

    const recentMeals = await database.all(`
      SELECT m.*, u.name 
      FROM meals m
      LEFT JOIN users u ON m.user_phone = u.phone
      ORDER BY m.timestamp DESC 
      LIMIT 10
    `);

    res.json({
      stats: stats[0] || { total_users: 0, total_meals: 0, avg_calories: 0 },
      recentMeals: recentMeals.map(meal => ({
        ...meal,
        content: JSON.parse(meal.content),
        analysis: meal.analysis ? JSON.parse(meal.analysis) : null,
        nutrients: meal.nutrients ? JSON.parse(meal.nutrients) : null
      }))
    });
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para estatísticas de um usuário específico (protegida)
router.get('/user/:phone/stats', authMiddleware.authenticate, authMiddleware.authorize(['read']), async (req, res) => {
  try {
    const { phone } = req.params;
    const { days = 7 } = req.query;

    const user = await database.getUser(phone);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const insights = await database.getHealthInsights(phone);
    const dailyStats = await database.getDailyStats(phone, days);
    const meals = await database.getUserMeals(phone, days);

    res.json({
      user,
      insights,
      dailyStats,
      meals: meals.map(meal => ({
        ...meal,
        content: JSON.parse(meal.content),
        analysis: meal.analysis ? JSON.parse(meal.analysis) : null,
        nutrients: meal.nutrients ? JSON.parse(meal.nutrients) : null
      }))
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas do usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para listar todos os usuários (protegida)
router.get('/users', authMiddleware.authenticate, authMiddleware.authorize(['read']), async (req, res) => {
  try {
    const users = await database.all(`
      SELECT u.*, 
             COUNT(m.id) as meal_count,
             MAX(m.timestamp) as last_meal
      FROM users u
      LEFT JOIN meals m ON u.phone = m.user_phone
      GROUP BY u.phone
      ORDER BY last_meal DESC
    `);

    res.json(users.map(user => ({
      ...user,
      preferences: user.preferences ? JSON.parse(user.preferences) : {}
    })));
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para refeições de um usuário (protegida)
router.get('/user/:phone/meals', authMiddleware.authenticate, authMiddleware.authorize(['read']), async (req, res) => {
  try {
    const { phone } = req.params;
    const { days = 30, limit = 50 } = req.query;

    const meals = await database.all(`
      SELECT * FROM meals 
      WHERE user_phone = ? 
      AND timestamp >= date('now', '-${days} days')
      ORDER BY timestamp DESC 
      LIMIT ?
    `, [phone, limit]);

    res.json(meals.map(meal => ({
      ...meal,
      content: JSON.parse(meal.content),
      analysis: meal.analysis ? JSON.parse(meal.analysis) : null,
      nutrients: meal.nutrients ? JSON.parse(meal.nutrients) : null
    })));
  } catch (error) {
    console.error('Erro ao buscar refeições:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para dietas de um usuário (protegida)
router.get('/user/:phone/diets', authMiddleware.authenticate, authMiddleware.authorize(['read']), async (req, res) => {
  try {
    const { phone } = req.params;
    const { limit = 5 } = req.query;

    const diets = await database.getUserDiets(phone, limit);
    res.json(diets);
  } catch (error) {
    console.error('Erro ao buscar dietas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para estatísticas gerais (protegida)
router.get('/stats', authMiddleware.authenticate, authMiddleware.authorize(['read']), async (req, res) => {
  try {
    const { period = '7' } = req.query;
    
    const stats = await database.all(`
      SELECT 
        COUNT(DISTINCT user_phone) as total_users,
        COUNT(*) as total_meals,
        AVG(calories) as avg_calories,
        SUM(calories) as total_calories
      FROM meals 
      WHERE timestamp >= date('now', '-${period} days')
    `);

    const dailyBreakdown = await database.all(`
      SELECT 
        date(timestamp) as date,
        COUNT(*) as meal_count,
        AVG(calories) as avg_calories,
        SUM(calories) as total_calories
      FROM meals 
      WHERE timestamp >= date('now', '-${period} days')
      GROUP BY date(timestamp)
      ORDER BY date(timestamp)
    `);

    const topFoods = await database.all(`
      SELECT 
        json_extract(content, '$.foods') as foods_data
      FROM meals 
      WHERE type = 'image'
      AND timestamp >= date('now', '-${period} days')
    `);

    const foodCount = {};
    topFoods.forEach(meal => {
      try {
        const foods = JSON.parse(meal.foods_data);
        if (Array.isArray(foods)) {
          foods.forEach(food => {
            const foodName = food.name || food;
            foodCount[foodName] = (foodCount[foodName] || 0) + 1;
          });
        }
      } catch (error) {
        console.error('Erro ao processar alimentos:', error);
      }
    });

    const topFoodsList = Object.entries(foodCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([food, count]) => ({ food, count }));

    res.json({
      general: stats[0] || { total_users: 0, total_meals: 0, avg_calories: 0, total_calories: 0 },
      dailyBreakdown,
      topFoods: topFoodsList
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para atualizar preferências do usuário (protegida)
router.put('/user/:phone/preferences', authMiddleware.authenticate, authMiddleware.authorize(['write']), async (req, res) => {
  try {
    const { phone } = req.params;
    const { preferences } = req.body;

    await database.saveUser(phone, { preferences });
    res.json({ success: true, message: 'Preferências atualizadas com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar preferências:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para deletar uma refeição (protegida)
router.delete('/meal/:id', authMiddleware.authenticate, authMiddleware.authorize(['delete']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await database.run('DELETE FROM meals WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Refeição não encontrada' });
    }
    
    res.json({ success: true, message: 'Refeição deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar refeição:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para exportar dados de um usuário (protegida)
router.get('/user/:phone/export', authMiddleware.authenticate, authMiddleware.authorize(['read']), async (req, res) => {
  try {
    const { phone } = req.params;
    const { format = 'json' } = req.query;

    const user = await database.getUser(phone);
    const meals = await database.getUserMeals(phone, 365); // Último ano
    const diets = await database.getUserDiets(phone, 10);
    const insights = await database.getHealthInsights(phone);

    const exportData = {
      user,
      meals: meals.map(meal => ({
        ...meal,
        content: JSON.parse(meal.content),
        analysis: meal.analysis ? JSON.parse(meal.analysis) : null,
        nutrients: meal.nutrients ? JSON.parse(meal.nutrients) : null
      })),
      diets,
      insights,
      exportedAt: new Date().toISOString()
    };

    if (format === 'csv') {
      // Implementar exportação CSV se necessário
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="dieta_export_${phone}.json"`);
    }

    res.json(exportData);
  } catch (error) {
    console.error('Erro ao exportar dados:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota de health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;
