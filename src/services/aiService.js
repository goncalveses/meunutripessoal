const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async analyzeFoodImage(imagePath) {
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');

      const response = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analise esta imagem de comida e forneça uma análise nutricional detalhada. 
                Identifique todos os alimentos visíveis, estime as quantidades e calcule as calorias totais.
                Responda em formato JSON com a seguinte estrutura:
                {
                  "foods": [
                    {
                      "name": "nome do alimento",
                      "quantity": "quantidade estimada",
                      "calories": número de calorias
                    }
                  ],
                  "totalCalories": número total de calorias,
                  "nutrients": {
                    "protein": gramas de proteína,
                    "carbs": gramas de carboidratos,
                    "fat": gramas de gordura,
                    "fiber": gramas de fibra
                  },
                  "tip": "dica nutricional personalizada"
                }`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      
      // Adicionar propriedades para compatibilidade
      analysis.calories = analysis.totalCalories;
      
      return analysis;
    } catch (error) {
      console.error('Erro ao analisar imagem:', error);
      throw new Error('Falha na análise da imagem');
    }
  }

  async transcribeAudio(audioPath) {
    try {
      const audioBuffer = fs.readFileSync(audioPath);
      
      const response = await this.openai.audio.transcriptions.create({
        file: new File([audioBuffer], 'audio.ogg', { type: 'audio/ogg' }),
        model: "whisper-1",
        language: "pt"
      });

      return response.text;
    } catch (error) {
      console.error('Erro ao transcrever áudio:', error);
      throw new Error('Falha na transcrição do áudio');
    }
  }

  async analyzeMealDescription(description) {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Você é um nutricionista especializado em análise de refeições. 
            Analise a descrição fornecida e calcule as calorias e nutrientes.
            Responda em formato JSON com a seguinte estrutura:
            {
              "foods": [
                {
                  "name": "nome do alimento",
                  "quantity": "quantidade mencionada",
                  "calories": número de calorias
                }
              ],
              "totalCalories": número total de calorias,
              "nutrients": {
                "protein": gramas de proteína,
                "carbs": gramas de carboidratos,
                "fat": gramas de gordura,
                "fiber": gramas de fibra
              },
              "tip": "dica nutricional personalizada"
            }`
          },
          {
            role: "user",
            content: `Analise esta descrição de refeição: "${description}"`
          }
        ],
        max_tokens: 800
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      
      // Adicionar propriedades para compatibilidade
      analysis.calories = analysis.totalCalories;
      
      return analysis;
    } catch (error) {
      console.error('Erro ao analisar descrição:', error);
      throw new Error('Falha na análise da descrição');
    }
  }

  async generateDietPlan(userHistory, preferences = {}) {
    try {
      const historySummary = this.summarizeUserHistory(userHistory);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Você é um nutricionista especializado em criar dietas personalizadas.
            Com base no histórico alimentar do usuário, crie um plano de dieta balanceado.
            Considere as preferências e restrições alimentares.
            Responda em formato JSON com a seguinte estrutura:
            {
              "breakfast": {
                "foods": ["alimento1", "alimento2"],
                "calories": número de calorias,
                "description": "descrição da refeição"
              },
              "lunch": {
                "foods": ["alimento1", "alimento2"],
                "calories": número de calorias,
                "description": "descrição da refeição"
              },
              "dinner": {
                "foods": ["alimento1", "alimento2"],
                "calories": número de calorias,
                "description": "descrição da refeição"
              },
              "snacks": [
                {
                  "foods": ["alimento1"],
                  "calories": número de calorias,
                  "description": "descrição do lanche"
                }
              ],
              "totalCalories": número total de calorias,
              "goals": ["objetivo1", "objetivo2"],
              "tips": ["dica1", "dica2"]
            }`
          },
          {
            role: "user",
            content: `Histórico do usuário: ${historySummary}
            Preferências: ${JSON.stringify(preferences)}
            Crie uma dieta personalizada baseada neste histórico.`
          }
        ],
        max_tokens: 1500
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Erro ao gerar dieta:', error);
      throw new Error('Falha na geração da dieta');
    }
  }

  summarizeUserHistory(userHistory) {
    if (!userHistory || userHistory.length === 0) {
      return "Usuário sem histórico alimentar registrado.";
    }

    const totalCalories = userHistory.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    const averageCalories = Math.round(totalCalories / userHistory.length);
    
    const commonFoods = this.getCommonFoods(userHistory);
    
    return `Média de ${averageCalories} calorias por refeição. Alimentos mais consumidos: ${commonFoods.join(', ')}.`;
  }

  getCommonFoods(userHistory) {
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
      .slice(0, 5)
      .map(([food]) => food);
  }

  async generateNutritionTip(userHistory) {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Você é um nutricionista. Forneça dicas personalizadas baseadas no histórico alimentar do usuário."
          },
          {
            role: "user",
            content: `Com base neste histórico: ${JSON.stringify(userHistory)}, forneça uma dica nutricional personalizada.`
          }
        ],
        max_tokens: 200
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Erro ao gerar dica:', error);
      return "Mantenha uma alimentação balanceada e variada!";
    }
  }
}

module.exports = new AIService();
