const apiKey = process.env.OPEN_ROUTER_API_KEY;

if (!apiKey) {
  throw new Error('OpenRouter API Key 未設定，請檢查 .env.local');
}

// 推薦使用 openrouter/auto - 自動選擇最便宜可用模型
// 如果需要指定模型，可以用這些有效的模型 ID:
// - 'openrouter/auto' (推薦 - 最便宜)
// - 'anthropic/claude-3.5-sonnet'
// - 'meta-llama/llama-3-8b-instruct' 
// - 'mistral/mistral-7b-instruct'

const AVAILABLE_MODELS = [
  'openrouter/auto',  // 最便宜，自動選擇
];

// 調用 OpenRouter API
async function callOpenRouterAPI(model, messages, maxRetries = 2) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`嘗試使用模型: ${model} (嘗試 ${attempt + 1}/${maxRetries})`);
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'DAT.co Indicator Tracker',
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error?.message || `HTTP ${response.status}`;
        
        console.error(`模型 ${model} 返回錯誤: ${errorMessage}`);
        
        // 檢查是否是配額或暫時錯誤
        if (response.status === 503 || response.status === 429 || errorMessage.includes('limit')) {
          console.warn(`模型 ${model} 遇到限制，${attempt < maxRetries - 1 ? '重試...' : '嘗試下一個方案'}`);
          
          if (attempt < maxRetries - 1) {
            const delayMs = Math.min(1000 * Math.pow(2, attempt), 5000);
            console.log(`等待 ${delayMs}ms 後重試...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
          }
        }
        
        throw new Error(`模型 ${model} 錯誤: ${errorMessage}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error(`模型返回無效響應`);
      }
      
      console.log(`✅ 成功使用模型: ${data.model || model}`);
      return data.choices[0].message.content;
      
    } catch (error) {
      console.error(`模型 ${model} 嘗試 ${attempt + 1} 失敗:`, error.message);
      
      if (attempt < maxRetries - 1) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.log(`等待 ${delayMs}ms 後重試...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  return null;
}

// 生成基礎分析（備用方案）
function generateBasicAnalysis(symbol, data, indicators) {
  const trend = indicators.latestPrice > indicators.sma50 ? '向上' : '向下';
  const volatilityLevel = indicators.volatility > 5 ? '較高' : indicators.volatility > 2 ? '中等' : '較低';
  
  return `【${symbol} 市場分析】

📊 市場趨勢:
${symbol} 當前價格 $${indicators.latestPrice}，相較平均價格 ${indicators.premiumToAveragePrice > 0 ? '+' : ''}${indicators.premiumToAveragePrice}%。
價格趨勢相對 50 日均線呈 ${trend} 走勢。

🔍 關鍵觀察:
1. 波動率為 ${indicators.volatility}，屬於 ${volatilityLevel} 水準
2. 價格範圍在 $${indicators.minPrice} - $${indicators.maxPrice}
3. 20 日均線 ($${indicators.sma20}) 與 50 日均線 ($${indicators.sma50}) 呈 ${indicators.sma20 > indicators.sma50 ? '上升' : '下降'} 排列

💡 建議:
1. 建議關注突破關鍵價位 $${indicators.maxPrice} 的動向
2. 保持警惕波動率變化，設置好止損計畫

⚠️ 注: 此分析為基礎統計，建議搭配其他信息進行決策。`;
}

// 嘗試使用 AI，失敗則使用基礎分析
async function generateSummaryWithFallback(prompt, symbol, data, indicators) {
  try {
    for (let modelIndex = 0; modelIndex < AVAILABLE_MODELS.length; modelIndex++) {
      const model = AVAILABLE_MODELS[modelIndex];
      
      const messages = [
        {
          role: 'user',
          content: prompt,
        },
      ];
      
      const result = await callOpenRouterAPI(model, messages);
      
      if (result) {
        return result;
      }
      
      console.log(`模型 ${model} 失敗，嘗試備用方案...`);
    }
    
    // AI 全部失敗，使用本地基礎分析
    console.warn('⚠️ AI 服務暫時不可用，改用本地基礎分析');
    return generateBasicAnalysis(symbol, data, indicators);
    
  } catch (error) {
    console.error('生成分析時出錯:', error);
    // 最後的備用方案 - 基礎統計分析
    return generateBasicAnalysis(symbol, data, indicators);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { symbol, data, indicators } = body;

    if (!data || !indicators) {
      return Response.json({
        success: false,
        error: '缺少必要的數據',
      }, { status: 400 });
    }

    // 準備數據摘要用於 AI
    const recentData = data.slice(-30); // 最近 30 天
    const priceHistory = recentData.map(d => `${d.date}: $${d.close}`).join('\n');

    const prompt = `你是一位專業的金融數據分析師。請根據以下數據生成一份簡潔的市場分析摘要。

股票代碼: ${symbol}
數據時間範圍: ${data[0]?.date} 至 ${data[data.length - 1]?.date}

關鍵指標:
- 最新價格: $${indicators.latestPrice}
- 平均價格: $${indicators.averagePrice}
- 相對平均價值的溢價: ${indicators.premiumToAveragePrice}%
- 20日移動平均: $${indicators.sma20}
- 50日移動平均: $${indicators.sma50}
- 波動率: ${indicators.volatility}
- 價格範圍: $${indicators.minPrice} - $${indicators.maxPrice}

最近30天價格趨勢:
${priceHistory}

請提供:
1. 市場趨勢分析(1-2句話)
2. 關鍵觀察(2-3個要點)
3. 投資建議(1-2條建議)

分析應該簡潔、客觀，避免過度承諾。請用繁體中文回答。`;

    // 嘗試生成內容（優先用 AI，失敗則用本地分析）
    const summary = await generateSummaryWithFallback(prompt, symbol, data, indicators);

    return Response.json({
      success: true,
      summary: summary,
      symbol: symbol,
      generatedAt: new Date().toISOString(),
      note: summary.includes('【') ? '本分析由本地統計生成，AI 服務暫時不可用' : '本分析由 AI 生成',
    });

  } catch (error) {
    console.error('OpenRouter API 錯誤:', error);
    return Response.json({
      success: false,
      error: error.message || 'AI 分析失敗，請稍後重試',
    }, { status: 503 });
  }
}