const Stripe = require('stripe');
const mongoose = require('mongoose');
const moment = require('moment');

class SubscriptionService {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    this.plans = {
      free: {
        name: 'Gratuito',
        price: 0,
        features: ['3 análises por dia', 'Dicas básicas', 'Comandos de voz limitados'],
        limits: { dailyAnalyses: 3, voiceCommands: 5, dietGenerations: 0 }
      },
      premium: {
        name: 'Premium',
        price: 29.90,
        annualPrice: 299,
        features: ['Análises ilimitadas', 'Dietas personalizadas', 'Comandos de voz completos', 'Relatórios semanais'],
        limits: { dailyAnalyses: -1, voiceCommands: -1, dietGenerations: 10 }
      },
      pro: {
        name: 'Pro',
        price: 59.90,
        annualPrice: 599,
        features: ['Tudo do Premium', 'Coaching nutricional 24/7', 'Metas personalizadas', 'Analytics avançados', 'Gamificação'],
        limits: { dailyAnalyses: -1, voiceCommands: -1, dietGenerations: -1 }
      },
      vip: {
        name: 'VIP',
        price: 99.90,
        annualPrice: 999,
        features: ['Tudo do Pro', 'Consultoria 1:1 mensal', 'Receitas exclusivas', 'Suporte VIP 24/7', 'Acesso antecipado'],
        limits: { dailyAnalyses: -1, voiceCommands: -1, dietGenerations: -1 }
      }
    };
  }

  async createSubscription(userPhone, planType, billingCycle = 'monthly') {
    try {
      const plan = this.plans[planType];
      if (!plan) {
        throw new Error('Plano inválido');
      }

      // Verificar se o usuário já tem uma assinatura ativa
      const existingSubscription = await this.getActiveSubscription(userPhone);
      if (existingSubscription && existingSubscription.status === 'active') {
        throw new Error('Usuário já possui uma assinatura ativa');
      }

      // Criar customer no Stripe
      const customer = await this.stripe.customers.create({
        metadata: {
          userPhone: userPhone
        }
      });

      // Criar produto no Stripe se não existir
      const product = await this.createOrGetProduct(planType, plan);

      // Criar preço no Stripe
      const price = await this.createOrGetPrice(product.id, plan, billingCycle);

      // Criar sessão de checkout
      const session = await this.stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.BASE_URL}/cancel`,
        metadata: {
          userPhone: userPhone,
          planType: planType,
          billingCycle: billingCycle
        }
      });

      return {
        sessionId: session.id,
        url: session.url,
        customerId: customer.id
      };
    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      throw error;
    }
  }

  async createOrGetProduct(planType, plan) {
    try {
      // Buscar produto existente
      const products = await this.stripe.products.list({
        limit: 100
      });

      const existingProduct = products.data.find(p => p.metadata.planType === planType);
      if (existingProduct) {
        return existingProduct;
      }

      // Criar novo produto
      return await this.stripe.products.create({
        name: `Dieta Bot - ${plan.name}`,
        description: plan.features.join(', '),
        metadata: {
          planType: planType
        }
      });
    } catch (error) {
      console.error('Erro ao criar/buscar produto:', error);
      throw error;
    }
  }

  async createOrGetPrice(productId, plan, billingCycle) {
    try {
      const prices = await this.stripe.prices.list({
        product: productId,
        limit: 100
      });

      const existingPrice = prices.data.find(p => 
        p.metadata.billingCycle === billingCycle && p.active
      );

      if (existingPrice) {
        return existingPrice;
      }

      const amount = billingCycle === 'annual' ? plan.annualPrice * 100 : plan.price * 100;
      const interval = billingCycle === 'annual' ? 'year' : 'month';

      return await this.stripe.prices.create({
        product: productId,
        unit_amount: amount,
        currency: 'brl',
        recurring: {
          interval: interval
        },
        metadata: {
          billingCycle: billingCycle
        }
      });
    } catch (error) {
      console.error('Erro ao criar/buscar preço:', error);
      throw error;
    }
  }

  async handleWebhook(event) {
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object);
          break;
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;
        default:
          console.log(`Evento não tratado: ${event.type}`);
      }
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      throw error;
    }
  }

  async handleCheckoutCompleted(session) {
    try {
      const { userPhone, planType, billingCycle } = session.metadata;
      
      // Buscar a assinatura criada
      const subscription = await this.stripe.subscriptions.retrieve(session.subscription);
      
      // Salvar no banco de dados
      await this.saveSubscription(userPhone, {
        stripeCustomerId: session.customer,
        stripeSubscriptionId: subscription.id,
        planType: planType,
        billingCycle: billingCycle,
        status: 'active',
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        createdAt: new Date()
      });

      // Atualizar usuário
      await this.updateUserPlan(userPhone, planType);

      console.log(`Assinatura criada para ${userPhone}: ${planType}`);
    } catch (error) {
      console.error('Erro ao processar checkout completado:', error);
      throw error;
    }
  }

  async handlePaymentSucceeded(invoice) {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(invoice.subscription);
      const customer = await this.stripe.customers.retrieve(subscription.customer);
      const userPhone = customer.metadata.userPhone;

      // Atualizar status da assinatura
      await this.updateSubscriptionStatus(userPhone, 'active', {
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      });

      console.log(`Pagamento processado para ${userPhone}`);
    } catch (error) {
      console.error('Erro ao processar pagamento bem-sucedido:', error);
      throw error;
    }
  }

  async handlePaymentFailed(invoice) {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(invoice.subscription);
      const customer = await this.stripe.customers.retrieve(subscription.customer);
      const userPhone = customer.metadata.userPhone;

      // Atualizar status da assinatura
      await this.updateSubscriptionStatus(userPhone, 'past_due');

      // Notificar usuário sobre falha no pagamento
      await this.notifyPaymentFailure(userPhone);

      console.log(`Falha no pagamento para ${userPhone}`);
    } catch (error) {
      console.error('Erro ao processar falha no pagamento:', error);
      throw error;
    }
  }

  async handleSubscriptionUpdated(subscription) {
    try {
      const customer = await this.stripe.customers.retrieve(subscription.customer);
      const userPhone = customer.metadata.userPhone;

      await this.updateSubscriptionStatus(userPhone, subscription.status, {
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      });

      console.log(`Assinatura atualizada para ${userPhone}: ${subscription.status}`);
    } catch (error) {
      console.error('Erro ao atualizar assinatura:', error);
      throw error;
    }
  }

  async handleSubscriptionDeleted(subscription) {
    try {
      const customer = await this.stripe.customers.retrieve(subscription.customer);
      const userPhone = customer.metadata.userPhone;

      // Atualizar para plano gratuito
      await this.updateUserPlan(userPhone, 'free');
      await this.updateSubscriptionStatus(userPhone, 'canceled');

      console.log(`Assinatura cancelada para ${userPhone}`);
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      throw error;
    }
  }

  async saveSubscription(userPhone, subscriptionData) {
    const db = mongoose.connection.db;
    const subscriptions = db.collection('subscriptions');
    
    await subscriptions.insertOne({
      userPhone: userPhone,
      ...subscriptionData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  async getActiveSubscription(userPhone) {
    const db = mongoose.connection.db;
    const subscriptions = db.collection('subscriptions');
    
    return await subscriptions.findOne({
      userPhone: userPhone,
      status: { $in: ['active', 'past_due'] }
    });
  }

  async updateSubscriptionStatus(userPhone, status, additionalData = {}) {
    const db = mongoose.connection.db;
    const subscriptions = db.collection('subscriptions');
    
    await subscriptions.updateOne(
      { userPhone: userPhone },
      {
        $set: {
          status: status,
          updatedAt: new Date(),
          ...additionalData
        }
      }
    );
  }

  async updateUserPlan(userPhone, planType) {
    const db = mongoose.connection.db;
    const users = db.collection('users');
    
    await users.updateOne(
      { phone: userPhone },
      {
        $set: {
          planType: planType,
          planUpdatedAt: new Date()
        }
      },
      { upsert: true }
    );
  }

  async getUserPlan(userPhone) {
    const db = mongoose.connection.db;
    const users = db.collection('users');
    
    const user = await users.findOne({ phone: userPhone });
    return user ? user.planType || 'free' : 'free';
  }

  async checkUsageLimit(userPhone, action) {
    try {
      const planType = await this.getUserPlan(userPhone);
      const plan = this.plans[planType];
      
      if (!plan || !plan.limits[action]) {
        return { allowed: true, remaining: -1 };
      }

      const limit = plan.limits[action];
      if (limit === -1) {
        return { allowed: true, remaining: -1 };
      }

      // Verificar uso diário
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const db = mongoose.connection.db;
      const usage = db.collection('usage');
      
      const todayUsage = await usage.findOne({
        userPhone: userPhone,
        date: today,
        action: action
      });

      const used = todayUsage ? todayUsage.count : 0;
      const remaining = Math.max(0, limit - used);
      
      return {
        allowed: remaining > 0,
        remaining: remaining,
        limit: limit
      };
    } catch (error) {
      console.error('Erro ao verificar limite de uso:', error);
      return { allowed: true, remaining: -1 };
    }
  }

  async recordUsage(userPhone, action) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const db = mongoose.connection.db;
      const usage = db.collection('usage');
      
      await usage.updateOne(
        {
          userPhone: userPhone,
          date: today,
          action: action
        },
        {
          $inc: { count: 1 },
          $set: { updatedAt: new Date() }
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('Erro ao registrar uso:', error);
    }
  }

  async getSubscriptionStats() {
    try {
      const db = mongoose.connection.db;
      const subscriptions = db.collection('subscriptions');
      
      const stats = await subscriptions.aggregate([
        {
          $group: {
            _id: '$planType',
            count: { $sum: 1 },
            active: {
              $sum: {
                $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
              }
            }
          }
        }
      ]).toArray();

      return stats;
    } catch (error) {
      console.error('Erro ao buscar estatísticas de assinatura:', error);
      return [];
    }
  }

  async cancelSubscription(userPhone) {
    try {
      const subscription = await this.getActiveSubscription(userPhone);
      if (!subscription) {
        throw new Error('Nenhuma assinatura ativa encontrada');
      }

      await this.stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      
      await this.updateUserPlan(userPhone, 'free');
      await this.updateSubscriptionStatus(userPhone, 'canceled');

      return { success: true, message: 'Assinatura cancelada com sucesso' };
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      throw error;
    }
  }

  async notifyPaymentFailure(userPhone) {
    // Implementar notificação via WhatsApp
    const whatsappBot = require('./whatsappBot');
    await whatsappBot.sendMessage(userPhone, 
      '⚠️ *Falha no Pagamento*\n\n' +
      'Não foi possível processar o pagamento da sua assinatura.\n\n' +
      'Por favor, atualize seus dados de pagamento ou entre em contato conosco.\n\n' +
      'Seu acesso ao plano premium será mantido por mais 3 dias.'
    );
  }

  getPlans() {
    return this.plans;
  }

  getPlanFeatures(planType) {
    return this.plans[planType] || this.plans.free;
  }
}

module.exports = new SubscriptionService();
