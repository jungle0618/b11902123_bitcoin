'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Chart({ data, title = '價格趨勢圖' }) {
  if (!data || data.length === 0) {
    return <p>暫無數據</p>;
  }

  // 只顯示最近100條數據以保持圖表清晰
  const displayData = data.slice(-100).map(item => ({
    date: new Date(item.date).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' }),
    close: parseFloat(item.close),
    open: parseFloat(item.open),
    high: parseFloat(item.high),
    low: parseFloat(item.low),
  }));

  return (
    <div className="chart-container">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={displayData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            label={{ value: '價格 ($)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            formatter={(value) => `$${value.toFixed(2)}`}
            labelFormatter={(label) => `日期: ${label}`}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="close" 
            stroke="#8884d8" 
            dot={false}
            isAnimationActive={true}
            name="收盤價"
          />
          <Line 
            type="monotone" 
            dataKey="open" 
            stroke="#82ca9d" 
            dot={false}
            isAnimationActive={true}
            name="開盤價"
          />
          <Line 
            type="monotone" 
            dataKey="high" 
            stroke="#ffc658" 
            dot={false}
            isAnimationActive={true}
            name="最高價"
          />
          <Line 
            type="monotone" 
            dataKey="low" 
            stroke="#ff7c7c" 
            dot={false}
            isAnimationActive={true}
            name="最低價"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
