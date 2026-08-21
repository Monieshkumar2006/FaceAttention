import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { EVENT_LABELS, EVENT_COLORS } from '../../utils/constants';
import { formatDuration } from '../../utils/formatting';

export default function EventDistributionChart({ events = [], height = 280 }) {
  if (!events || events.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.85rem' }}>
        No observable distraction events recorded
      </div>
    );
  }

  // Aggregate event counts and durations by type
  const counts = {};
  events.forEach((evt) => {
    const type = evt.event_type;
    if (!counts[type]) {
      counts[type] = { type, count: 0, totalDuration: 0 };
    }
    counts[type].count += 1;
    counts[type].totalDuration += evt.duration || 0;
  });

  const data = Object.values(counts).map((item) => ({
    name: EVENT_LABELS[item.type] || item.type,
    count: item.count,
    duration: Math.round(item.totalDuration),
    fill: EVENT_COLORS[item.type] || '#38bdf8'
  }));

  return (
    <div style={{ height, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 25 }}>
          <XAxis 
            dataKey="name" 
            tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} 
            angle={-15} 
            textAnchor="end" 
          />
          <YAxis 
            tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} 
            allowDecimals={false} 
          />
          <Tooltip
            formatter={(val, name) => [
              name === 'count' ? `${val} occurrences` : `${formatDuration(val)}`,
              name === 'count' ? 'Event Count' : 'Total Duration'
            ]}
            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          />
          <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} name="count" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
