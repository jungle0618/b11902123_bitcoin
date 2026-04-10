import YahooFinance from 'yahoo-finance2';

// 处理 GET 请求获取数字资产公司的数据
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 获取查询参数：股票代码、开始日期、结束日期
    const symbol = searchParams.get('symbol') || 'GBTC';
    const startDate = searchParams.get('startDate') || '2024-01-01';
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];

    // 常见的数字资产公司股票代码
    const datCompanies = {
      'BTC': 'BTC=F',
      'GBTC': 'GBTC',
      'IBIT': 'IBIT',
      'FBTC': 'FBTC',
      'ETH': 'ETH=F',
      'ETHE': 'ETHE',
      'FETH': 'FETH',
    };

    // 获取对应的 Yahoo Finance 代码
    const yahooSymbol = datCompanies[symbol] || symbol;

    // 初始化 Yahoo Finance 实例 - 抑制弃用警告
    const yf = new YahooFinance({
      suppressNotices: ['ripHistorical'],
    });

    // 设置超时为 10 秒
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      // 使用 chart() 替代 historical() - chart() 推荐使用
      const chartData = await yf.chart(yahooSymbol, {
        period1: new Date(startDate),
        period2: new Date(endDate),
        interval: '1d',
      });

      clearTimeout(timeoutId);

      if (!chartData || !chartData.quotes || chartData.quotes.length === 0) {
        return Response.json({
          success: false,
          error: '没有获取到数据，请检查股票代码是否正确',
        }, { status: 400 });
      }

      // 计算指标
      const data = chartData.quotes.map((candle) => {
        const close = candle.close || 0;
        const open = candle.open || candle.close || 0;
        const high = candle.high || candle.close || 0;
        const low = candle.low || candle.close || 0;

        return {
          date: new Date(candle.date * 1000).toISOString().split('T')[0],
          open: parseFloat(open.toFixed(2)),
          high: parseFloat(high.toFixed(2)),
          low: parseFloat(low.toFixed(2)),
          close: parseFloat(close.toFixed(2)),
          volume: candle.volume || 0,
          adjClose: parseFloat((candle.adjClose || close).toFixed(2)),
          dailyChange: open > 0 ? parseFloat(((close - open) / open * 100).toFixed(2)) : 0,
        };
      });

      // 计算高级指标
      const indicators = calculateIndicators(data);

      return Response.json({
        success: true,
        symbol: yahooSymbol,
        startDate,
        endDate,
        dataCount: data.length,
        rawData: data,
        indicators: indicators,
      });

    } catch (timeoutError) {
      clearTimeout(timeoutId);
      if (timeoutError.name === 'AbortError') {
        return Response.json({
          success: false,
          error: '请求超时，请稍后重试',
        }, { status: 408 });
      }
      throw timeoutError;
    }

  } catch (error) {
    console.error('获取数据错误:', error);
    return Response.json({
      success: false,
      error: error.message || '获取数据失败，请检查网络连接',
    }, { status: 500 });
  }
}

// 计算技术指标（mNAV, Premium/Discount 等）
function calculateIndicators(data) {
  if (data.length === 0) return {};

  const closes = data.map(d => d.close);
  
  // 计算简单移动平均 (SMA)
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);

  // 计算最新的相对于平均值的溢价/折价（作为 Premium/Discount 的替代）
  const latestClose = closes[closes.length - 1];
  const avgPrice = closes.reduce((a, b) => a + b, 0) / closes.length;
  const premiumToAvg = ((latestClose - avgPrice) / avgPrice * 100).toFixed(2);

  // 计算波动率
  const volatility = calculateVolatility(closes);

  return {
    latestPrice: closes[closes.length - 1],
    averagePrice: parseFloat(avgPrice.toFixed(2)),
    premiumToAveragePrice: parseFloat(premiumToAvg),
    discountToAveragePrice: parseFloat((-premiumToAvg).toFixed(2)),
    sma20: parseFloat(sma20.toFixed(2)),
    sma50: parseFloat(sma50.toFixed(2)),
    volatility: parseFloat(volatility.toFixed(2)),
    minPrice: Math.min(...closes),
    maxPrice: Math.max(...closes),
    priceRange: parseInt(Math.max(...closes) - Math.min(...closes)),
  };
}

// 计算简单移动平均
function calculateSMA(prices, period) {
  if (prices.length < period) return prices[prices.length - 1];
  
  const recentPrices = prices.slice(-period);
  return recentPrices.reduce((a, b) => a + b, 0) / period;
}

// 计算波动率（标准差）
function calculateVolatility(prices) {
  if (prices.length < 2) return 0;
  
  const recentPrices = prices.slice(-20); // 最近 20 天
  const mean = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
  const variance = recentPrices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / recentPrices.length;
  
  return Math.sqrt(variance);
}
