import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export default function AttentionTrendChart({ data = [], height = 240 }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.85rem' }}>
        No attention score samples recorded yet
      </div>
    );
  }

  return (
    <div style={{ height, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="time" 
            tick={{ fill: '#94a3b8', fontSize: 11 }} 
          />
          <YAxis 
            domain={[0, 100]} 
            tick={{ fill: '#94a3b8', fontSize: 11 }} 
          />
          <Tooltip
            formatter={(val) => [`${Math.round(val)}%`, 'Attention Score']}
            contentStyle={{ backgroundColor: '#111827', borderColor: '#23324d', borderRadius: '8px', color: '#f8fafc' }}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#38bdf8"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#scoreGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
