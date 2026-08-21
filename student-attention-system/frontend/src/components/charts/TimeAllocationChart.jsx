import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { formatDuration } from '../../utils/formatting';

export default function TimeAllocationChart({ durations, totalSeconds, height = 280 }) {
  if (!durations || !totalSeconds) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.85rem' }}>
        No duration metrics available
      </div>
    );
  }

  const data = [
    { name: 'Attentive Focus', value: durations.attentive_seconds || 0, color: '#10b981' },
    { name: 'Looking Away', value: durations.looking_away_seconds || 0, color: '#fbbf24' },
    { name: 'Qualified Distraction', value: durations.distraction_seconds || 0, color: '#ef4444' },
    { name: 'No Face Detected', value: durations.no_face_seconds || 0, color: '#dc2626' },
    { name: 'Possible Drowsiness', value: durations.drowsiness_seconds || 0, color: '#f97316' },
    { name: 'Multiple Faces', value: durations.multiple_faces_seconds || 0, color: '#ec4899' },
  ].filter((item) => item.value > 0);

  return (
    <div style={{ height, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            innerRadius={50}
            paddingAngle={3}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(val) => [
              `${formatDuration(val)} (${Math.round((val / totalSeconds) * 100)}%)`,
              'Duration'
            ]}
            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          />
          <Legend
            formatter={(val) => <span style={{ color: '#334155', fontSize: '0.8rem', fontWeight: 600 }}>{val}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
