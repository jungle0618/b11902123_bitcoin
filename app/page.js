'use client';

import { useState, useEffect } from 'react';
import Chart from './components/Chart';

export default function Page() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [symbol, setSymbol] = useState('GBTC');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  // 支持的公司列表
  const companies = {
    'GBTC': 'Grayscale Bitcoin Mini Trust',
    'IBIT': 'iShares Bitcoin ETF',
    'FBTC': 'Fidelity Bitcoin ETF',
    'ETHE': 'Grayscale Ethereum Mini Trust',
    'FETH': 'Fidelity Ethereum ETF',
    'BTC': 'Bitcoin',
    'ETH': 'Ethereum',
  };

  const fetchData = async (selectedSymbol = symbol, start = startDate, end = endDate) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/get_data?symbol=${selectedSymbol}&startDate=${start}&endDate=${end}`
      );
      const result = await response.json();
      if (result.success) {
        setData(result);
      } else {
        setError(result.error || '取得數據失敗');
      }
    } catch (err) {
      setError('請求失敗: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 首次加載數據
  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleSymbolChange = (newSymbol) => {
    setSymbol(newSymbol);
    fetchData(newSymbol, startDate, endDate);
    setSummary(null);
  };

  const generateSummary = async () => {
    if (!data || !data.rawData || !data.indicators) {
      setSummaryError('請先查詢數據');
      return;
    }

    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const response = await fetch('/api/gemini_summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: symbol,
          data: data.rawData,
          indicators: data.indicators,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setSummary(result.summary);
      } else {
        setSummaryError(result.error || 'AI 分析失敗');
      }
    } catch (err) {
      setSummaryError('API 請求失敗: ' + err.message);
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <div className="main-container">
      <h1>數位資產公司財務指標追蹤</h1>

      {/* 搜索表單 */}
      <form onSubmit={handleSearch}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold' }}>選擇公司: </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
            {Object.entries(companies).map(([key, value]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleSymbolChange(key)}
                style={{
                  backgroundColor: symbol === key ? '#0070f3' : '#e8f0ff',
                  color: symbol === key ? 'white' : '#0070f3',
                  border: symbol === key ? 'none' : '2px solid #e8f0ff',
                  fontWeight: symbol === key ? 'bold' : 'normal',
                }}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>開始日期: </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <label style={{ marginTop: '10px', display: 'block' }}>結束日期: </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <button type="submit">查詢數據</button>
      </form>

      {/* 加載和錯誤提示 */}
      {loading && <p style={{ color: '#0070f3', fontSize: '16px' }}>加載中...</p>}
      {error && <p style={{ color: 'red', fontSize: '16px' }}>錯誤: {error}</p>}

      {/* 顯示指標概覽 */}
      {data && data.indicators && (
        <div className="indicators-container">
          <h2>{symbol} - 指標概覽</h2>
          <p><strong>數據筆數:</strong> {data.dataCount}</p>
          <p><strong>時間範圍:</strong> {data.startDate} 至 {data.endDate}</p>
          <ul>
            <li><strong>最新價格:</strong> ${data.indicators.latestPrice}</li>
            <li><strong>平均價格:</strong> ${data.indicators.averagePrice}</li>
            <li><strong>相對平均價值的溢價:</strong> {data.indicators.premiumToAveragePrice}%</li>
            <li><strong>20日移動平均:</strong> ${data.indicators.sma20}</li>
            <li><strong>50日移動平均:</strong> ${data.indicators.sma50}</li>
            <li><strong>波動率:</strong> {data.indicators.volatility}</li>
            <li><strong>最低價格:</strong> ${data.indicators.minPrice}</li>
            <li><strong>最高價格:</strong> ${data.indicators.maxPrice}</li>
            <li><strong>價格範圍:</strong> ${data.indicators.priceRange}</li>
          </ul>
        </div>
      )}

      {/* 顯示圖表 */}
      {data && data.rawData && (
        <Chart data={data.rawData} title={`${symbol} - 價格趨勢圖`} />
      )}

      {/* AI 摘要部分 */}
      {data && data.indicators && (
        <div className="ai-summary-container" style={{
          background: 'white',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          marginTop: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2>AI 智能分析 ✨</h2>
            <button
              onClick={generateSummary}
              disabled={summaryLoading}
              style={{
                padding: '10px 20px',
                backgroundColor: summaryLoading ? '#ccc' : '#6f42c1',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: summaryLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
              }}
            >
              {summaryLoading ? '生成中...' : '生成摘要'}
            </button>
          </div>

          {summaryError && (
            <p style={{ color: '#dc3545', marginBottom: '10px' }}>錯誤: {summaryError}</p>
          )}

          {summary && (
            <div style={{
              background: '#f8f9fa',
              borderLeft: '4px solid #6f42c1',
              padding: '15px',
              borderRadius: '4px',
              lineHeight: '1.8',
              fontSize: '15px',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word'
            }}>
              {summary}
            </div>
          )}

          {!summary && !summaryLoading && !summaryError && (
            <p style={{ color: '#999', fontSize: '14px', fontStyle: 'italic' }}>
              按「生成摘要」按鈕使用 Google Gemini AI 分析市場趨勢
            </p>
          )}
        </div>
      )}
    </div>
  );
}