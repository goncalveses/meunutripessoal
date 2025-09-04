const axios = require('axios');
const crypto = require('crypto');

class PaymentService {
  constructor() {
    this.pixKey = process.env.PIX_KEY;
    this.merchantName = process.env.PIX_MERCHANT_NAME || 'Dieta Bot';
  }

  async generatePixPayment(amount, description, userPhone) {
    try {
      // Simular geração de PIX (em produção, usar API real como PagSeguro, Mercado Pago, etc.)
      const pixCode = this.generatePixCode(amount, description);
      const qrCode = this.generateQRCode(pixCode);
      
      return {
        pixCode: pixCode,
        qrCode: qrCode,
        amount: amount,
        description: description,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutos
        status: 'pending'
      };
    } catch (error) {
      console.error('Erro ao gerar PIX:', error);
      throw error;
    }
  }

  generatePixCode(amount, description) {
    // Simulação de geração de código PIX
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(8).toString('hex');
    
    // Em produção, usar API real de PIX
    return `00020126580014br.gov.bcb.pix0136${this.pixKey}520400005303986540${amount.toFixed(2)}5802BR5913${this.merchantName}6009SAO PAULO62070503***6304${randomId}`;
  }

  generateQRCode(pixCode) {
    // Simulação de QR Code (em produção, usar biblioteca real)
    return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;
  }

  async processPixPayment(paymentId, userPhone, planType) {
    try {
      // Simular processamento de PIX
      // Em produção, verificar status real do pagamento
      
      const subscriptionService = require('./subscriptionService');
      
      // Simular pagamento aprovado após 30 segundos
      setTimeout(async () => {
        try {
          await this.confirmPixPayment(paymentId, userPhone, planType);
        } catch (error) {
          console.error('Erro ao confirmar pagamento PIX:', error);
        }
      }, 30000);

      return {
        status: 'processing',
        message: 'Pagamento PIX em processamento. Aguarde a confirmação.'
      };
    } catch (error) {
      console.error('Erro ao processar PIX:', error);
      throw error;
    }
  }

  async confirmPixPayment(paymentId, userPhone, planType) {
    try {
      const subscriptionService = require('./subscriptionService');
      
      // Atualizar usuário para o plano
      await subscriptionService.updateUserPlan(userPhone, planType);
      
      // Salvar assinatura manual
      await subscriptionService.saveSubscription(userPhone, {
        planType: planType,
        billingCycle: 'monthly',
        status: 'active',
        paymentMethod: 'pix',
        paymentId: paymentId,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
        createdAt: new Date()
      });

      // Notificar usuário
      const whatsappBot = require('./whatsappBot');
      await whatsappBot.sendMessage(userPhone, 
        '🎉 *Pagamento Confirmado!*\n\n' +
        'Sua assinatura foi ativada com sucesso!\n\n' +
        `📱 Plano: ${subscriptionService.getPlanFeatures(planType).name}\n` +
        '✅ Acesso liberado a todos os recursos\n' +
        '🎯 Comece a usar agora mesmo!\n\n' +
        'Digite *menu* para ver todas as opções disponíveis.'
      );

      console.log(`Pagamento PIX confirmado para ${userPhone}: ${planType}`);
    } catch (error) {
      console.error('Erro ao confirmar pagamento PIX:', error);
      throw error;
    }
  }

  async createPaymentLink(amount, description, userPhone, planType) {
    try {
      const paymentId = crypto.randomUUID();
      
      return {
        paymentId: paymentId,
        amount: amount,
        description: description,
        link: `${process.env.BASE_URL}/payment/${paymentId}`,
        qrCode: await this.generatePixPayment(amount, description, userPhone),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutos
      };
    } catch (error) {
      console.error('Erro ao criar link de pagamento:', error);
      throw error;
    }
  }

  async getPaymentStatus(paymentId) {
    try {
      // Simular verificação de status
      // Em produção, verificar status real na API de pagamento
      
      return {
        status: 'pending',
        message: 'Aguardando pagamento'
      };
    } catch (error) {
      console.error('Erro ao verificar status do pagamento:', error);
      throw error;
    }
  }

  async refundPayment(paymentId, amount) {
    try {
      // Simular reembolso
      // Em produção, processar reembolso real
      
      return {
        status: 'refunded',
        amount: amount,
        refundId: crypto.randomUUID(),
        message: 'Reembolso processado com sucesso'
      };
    } catch (error) {
      console.error('Erro ao processar reembolso:', error);
      throw error;
    }
  }

  async generatePaymentReport(startDate, endDate) {
    try {
      const db = require('mongoose').connection.db;
      const payments = db.collection('payments');
      
      const report = await payments.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]).toArray();

      return report;
    } catch (error) {
      console.error('Erro ao gerar relatório de pagamentos:', error);
      return [];
    }
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  }

  async sendPaymentReminder(userPhone, planType, daysLeft) {
    try {
      const subscriptionService = require('./subscriptionService');
      const plan = subscriptionService.getPlanFeatures(planType);
      
      const whatsappBot = require('./whatsappBot');
      await whatsappBot.sendMessage(userPhone, 
        `⏰ *Lembrete de Renovação*\n\n` +
        `Sua assinatura ${plan.name} expira em ${daysLeft} dias.\n\n` +
        `💰 Valor: ${this.formatCurrency(plan.price)}\n` +
        `🔄 Renovação automática\n\n` +
        `Para cancelar ou alterar, digite *cancelar*`
      );
    } catch (error) {
      console.error('Erro ao enviar lembrete de pagamento:', error);
    }
  }

  async processSubscriptionRenewal(userPhone, planType) {
    try {
      const subscriptionService = require('./subscriptionService');
      const plan = subscriptionService.getPlanFeatures(planType);
      
      // Simular renovação automática
      const paymentId = crypto.randomUUID();
      
      // Atualizar período da assinatura
      await subscriptionService.updateSubscriptionStatus(userPhone, 'active', {
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });

      // Notificar usuário
      const whatsappBot = require('./whatsappBot');
      await whatsappBot.sendMessage(userPhone, 
        '🔄 *Assinatura Renovada!*\n\n' +
        `Sua assinatura ${plan.name} foi renovada automaticamente.\n\n` +
        `💰 Valor: ${this.formatCurrency(plan.price)}\n` +
        `📅 Próxima cobrança: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}\n\n` +
        'Obrigado por continuar conosco! 🎉'
      );

      console.log(`Assinatura renovada para ${userPhone}: ${planType}`);
    } catch (error) {
      console.error('Erro ao processar renovação:', error);
      throw error;
    }
  }
}

module.exports = new PaymentService();
