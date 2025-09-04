const database = require('./database');
const subscriptionService = require('./subscriptionService');
const paymentService = require('./paymentService');

class ReferralService {
  constructor() {
    this.referralRewards = {
      referrer: {
        cash: 10.00, // R$ 10 por indicação
        freeMonths: 1, // 1 mês grátis
        points: 100 // Pontos de gamificação
      },
      referee: {
        discount: 10.00, // R$ 10 de desconto
        freeMonths: 1, // 1 mês grátis
        points: 50 // Pontos de gamificação
      }
    };
  }

  async generateReferralCode(userPhone) {
    try {
      const code = this.createReferralCode(userPhone);
      
      // Salvar código no banco
      await this.saveReferralCode(userPhone, code);
      
      return code;
    } catch (error) {
      console.error('Erro ao gerar código de referência:', error);
      throw error;
    }
  }

  createReferralCode(userPhone) {
    const phoneDigits = userPhone.replace(/\D/g, '').slice(-4);
    const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `REF${phoneDigits}${randomCode}`;
  }

  async saveReferralCode(userPhone, code) {
    try {
      const coll = database.getCollection('referralCodes');
      await coll.updateOne(
        { userPhone: userPhone },
        {
          $set: {
            userPhone: userPhone,
            code: code,
            createdAt: new Date(),
            isActive: true
          }
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('Erro ao salvar código de referência:', error);
      throw error;
    }
  }

  async processReferral(referralCode, newUserPhone) {
    try {
      // Buscar código de referência
      const referralData = await this.getReferralByCode(referralCode);
      
      if (!referralData) {
        throw new Error('Código de referência inválido');
      }

      if (referralData.userPhone === newUserPhone) {
        throw new Error('Você não pode se referenciar');
      }

      // Verificar se já existe referência entre estes usuários
      const existingReferral = await this.getExistingReferral(referralData.userPhone, newUserPhone);
      if (existingReferral) {
        throw new Error('Referência já processada');
      }

      // Processar recompensas
      await this.processReferralRewards(referralData.userPhone, newUserPhone);

      // Salvar referência
      await this.saveReferral(referralData.userPhone, newUserPhone, referralCode);

      // Notificar usuários
      await this.notifyReferralSuccess(referralData.userPhone, newUserPhone);

      return {
        success: true,
        referrerReward: this.referralRewards.referrer,
        refereeReward: this.referralRewards.referee
      };

    } catch (error) {
      console.error('Erro ao processar referência:', error);
      throw error;
    }
  }

  async getReferralByCode(code) {
    try {
      const coll = database.getCollection('referralCodes');
      return await coll.findOne({ code: code, isActive: true });
    } catch (error) {
      console.error('Erro ao buscar código de referência:', error);
      return null;
    }
  }

  async getExistingReferral(referrerPhone, refereePhone) {
    try {
      const coll = database.getCollection('referrals');
      return await coll.findOne({
        referrerPhone: referrerPhone,
        refereePhone: refereePhone
      });
    } catch (error) {
      console.error('Erro ao buscar referência existente:', error);
      return null;
    }
  }

  async processReferralRewards(referrerPhone, refereePhone) {
    try {
      // Recompensas para quem indicou
      await this.giveReferrerRewards(referrerPhone);
      
      // Recompensas para quem foi indicado
      await this.giveRefereeRewards(refereePhone);

    } catch (error) {
      console.error('Erro ao processar recompensas:', error);
      throw error;
    }
  }

  async giveReferrerRewards(userPhone) {
    try {
      const rewards = this.referralRewards.referrer;
      
      // Adicionar pontos
      await this.addPoints(userPhone, rewards.points);
      
      // Adicionar crédito em dinheiro
      await this.addCashReward(userPhone, rewards.cash);
      
      // Extender assinatura se ativa
      await this.extendSubscription(userPhone, rewards.freeMonths);

    } catch (error) {
      console.error('Erro ao dar recompensas ao referrer:', error);
    }
  }

  async giveRefereeRewards(userPhone) {
    try {
      const rewards = this.referralRewards.referee;
      
      // Adicionar pontos
      await this.addPoints(userPhone, rewards.points);
      
      // Adicionar desconto
      await this.addDiscount(userPhone, rewards.discount);
      
      // Dar mês grátis
      await this.giveFreeMonth(userPhone, rewards.freeMonths);

    } catch (error) {
      console.error('Erro ao dar recompensas ao referee:', error);
    }
  }

  async addPoints(userPhone, points) {
    try {
      const coll = database.getCollection('userPoints');
      await coll.updateOne(
        { userPhone: userPhone },
        {
          $inc: { points: points },
          $set: { updatedAt: new Date() }
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('Erro ao adicionar pontos:', error);
    }
  }

  async addCashReward(userPhone, amount) {
    try {
      const coll = database.getCollection('userCredits');
      await coll.updateOne(
        { userPhone: userPhone },
        {
          $inc: { balance: amount },
          $set: { updatedAt: new Date() }
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('Erro ao adicionar crédito:', error);
    }
  }

  async addDiscount(userPhone, amount) {
    try {
      const coll = database.getCollection('userDiscounts');
      await coll.insertOne({
        userPhone: userPhone,
        amount: amount,
        type: 'referral',
        isUsed: false,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Erro ao adicionar desconto:', error);
    }
  }

  async extendSubscription(userPhone, months) {
    try {
      const subscription = await subscriptionService.getActiveSubscription(userPhone);
      
      if (subscription && subscription.status === 'active') {
        const newEndDate = new Date(subscription.currentPeriodEnd);
        newEndDate.setMonth(newEndDate.getMonth() + months);
        
        await subscriptionService.updateSubscriptionStatus(userPhone, 'active', {
          currentPeriodEnd: newEndDate
        });
      }
    } catch (error) {
      console.error('Erro ao estender assinatura:', error);
    }
  }

  async giveFreeMonth(userPhone, months) {
    try {
      // Dar acesso premium por 1 mês
      await subscriptionService.updateUserPlan(userPhone, 'premium');
      
      // Agendar downgrade para free após o período
      await this.scheduleDowngrade(userPhone, months);
      
    } catch (error) {
      console.error('Erro ao dar mês grátis:', error);
    }
  }

  async scheduleDowngrade(userPhone, months) {
    try {
      const coll = database.getCollection('scheduledTasks');
      await coll.insertOne({
        type: 'downgrade_subscription',
        userPhone: userPhone,
        targetPlan: 'free',
        scheduledFor: new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000),
        status: 'pending',
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Erro ao agendar downgrade:', error);
    }
  }

  async saveReferral(referrerPhone, refereePhone, referralCode) {
    try {
      const coll = database.getCollection('referrals');
      await coll.insertOne({
        referrerPhone: referrerPhone,
        refereePhone: refereePhone,
        referralCode: referralCode,
        status: 'completed',
        rewardsGiven: true,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Erro ao salvar referência:', error);
      throw error;
    }
  }

  async notifyReferralSuccess(referrerPhone, refereePhone) {
    try {
      const whatsappBot = require('./whatsappBot');
      
      // Notificar quem indicou
      await whatsappBot.sendMessage(referrerPhone, 
        '🎉 *Referência Bem-sucedida!*\n\n' +
        'Parabéns! Sua indicação foi aceita.\n\n' +
        '🎁 *Recompensas recebidas:*\n' +
        `• R$ ${this.referralRewards.referrer.cash} em crédito\n` +
        `• ${this.referralRewards.referrer.points} pontos\n` +
        `• ${this.referralRewards.referrer.freeMonths} mês grátis\n\n` +
        'Continue indicando amigos para ganhar mais recompensas!'
      );
      
      // Notificar quem foi indicado
      await whatsappBot.sendMessage(refereePhone, 
        '🎉 *Bem-vindo ao Dieta Bot!*\n\n' +
        'Você foi indicado por um amigo e ganhou recompensas especiais!\n\n' +
        '🎁 *Recompensas recebidas:*\n' +
        `• R$ ${this.referralRewards.referee.discount} de desconto\n` +
        `• ${this.referralRewards.referee.points} pontos\n` +
        `• ${this.referralRewards.referee.freeMonths} mês grátis no Premium\n\n` +
        'Digite *menu* para começar a usar o bot!'
      );
      
    } catch (error) {
      console.error('Erro ao notificar referência:', error);
    }
  }

  async getUserReferralStats(userPhone) {
    try {
      const coll = database.getCollection('referrals');
      
      const stats = await coll.aggregate([
        {
          $match: { referrerPhone: userPhone }
        },
        {
          $group: {
            _id: null,
            totalReferrals: { $sum: 1 },
            completedReferrals: {
              $sum: {
                $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
              }
            },
            totalEarnings: { $sum: this.referralRewards.referrer.cash }
          }
        }
      ]).toArray();

      const userStats = stats[0] || {
        totalReferrals: 0,
        completedReferrals: 0,
        totalEarnings: 0
      };

      // Buscar código de referência do usuário
      const referralCode = await this.getUserReferralCode(userPhone);

      return {
        ...userStats,
        referralCode: referralCode,
        pendingReferrals: userStats.totalReferrals - userStats.completedReferrals
      };

    } catch (error) {
      console.error('Erro ao buscar estatísticas de referência:', error);
      return {
        totalReferrals: 0,
        completedReferrals: 0,
        totalEarnings: 0,
        referralCode: null,
        pendingReferrals: 0
      };
    }
  }

  async getUserReferralCode(userPhone) {
    try {
      const coll = database.getCollection('referralCodes');
      const referralData = await coll.findOne({ userPhone: userPhone, isActive: true });
      return referralData ? referralData.code : null;
    } catch (error) {
      console.error('Erro ao buscar código de referência do usuário:', error);
      return null;
    }
  }

  async getTopReferrers(limit = 10) {
    try {
      const coll = database.getCollection('referrals');
      
      const topReferrers = await coll.aggregate([
        {
          $match: { status: 'completed' }
        },
        {
          $group: {
            _id: '$referrerPhone',
            totalReferrals: { $sum: 1 },
            totalEarnings: { $sum: this.referralRewards.referrer.cash }
          }
        },
        {
          $sort: { totalReferrals: -1 }
        },
        {
          $limit: limit
        }
      ]).toArray();

      return topReferrers;

    } catch (error) {
      console.error('Erro ao buscar top referrers:', error);
      return [];
    }
  }

  async getReferralLeaderboard() {
    try {
      const topReferrers = await this.getTopReferrers(20);
      
      let leaderboard = '🏆 *RANKING DE INDICAÇÕES*\n\n';
      
      topReferrers.forEach((referrer, index) => {
        const position = index + 1;
        const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '🏅';
        
        leaderboard += `${medal} *${position}º lugar*\n`;
        leaderboard += `📱 ${referrer._id.slice(-4)}***\n`;
        leaderboard += `👥 ${referrer.totalReferrals} indicações\n`;
        leaderboard += `💰 R$ ${referrer.totalEarnings.toFixed(2)}\n\n`;
      });
      
      leaderboard += '💡 *Dica:* Indique amigos para subir no ranking e ganhar recompensas!';
      
      return leaderboard;

    } catch (error) {
      console.error('Erro ao gerar leaderboard:', error);
      return '❌ Erro ao gerar ranking. Tente novamente.';
    }
  }

  async validateReferralCode(code) {
    try {
      const referralData = await this.getReferralByCode(code);
      
      if (!referralData) {
        return { valid: false, message: 'Código inválido' };
      }

      if (!referralData.isActive) {
        return { valid: false, message: 'Código expirado' };
      }

      return { valid: true, message: 'Código válido' };

    } catch (error) {
      console.error('Erro ao validar código:', error);
      return { valid: false, message: 'Erro ao validar código' };
    }
  }

  async deactivateReferralCode(userPhone) {
    try {
      const coll = database.getCollection('referralCodes');
      await coll.updateOne(
        { userPhone: userPhone },
        { $set: { isActive: false, deactivatedAt: new Date() } }
      );
    } catch (error) {
      console.error('Erro ao desativar código:', error);
    }
  }

  async generateNewReferralCode(userPhone) {
    try {
      // Desativar código atual
      await this.deactivateReferralCode(userPhone);
      
      // Gerar novo código
      const newCode = await this.generateReferralCode(userPhone);
      
      return newCode;
    } catch (error) {
      console.error('Erro ao gerar novo código:', error);
      throw error;
    }
  }
}

module.exports = new ReferralService();
