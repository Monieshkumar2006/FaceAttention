import React from 'react';
import { EVENT_COLORS, EVENT_LABELS } from '../../utils/constants';

export default function TimelineBar({ blocks = [], totalSeconds = 1 }) {
  if (!blocks || blocks.length === 0) {
    return (
      <div style={{
        height: '28px',
        backgroundColor: '#f1f5f9',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748b',
        fontSize: '0.75rem',
        fontWeight: 600,
        border: '1px solid #e2e8f0'
      }}>
        No timeline data available
      </div>
    );
  }

  const safeTotal = Math.max(1, totalSeconds);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {/* Visual Bar */}
      <div style={{
        height: '24px',
        width: '100%',
        backgroundColor: '#f1f5f9',
        borderRadius: '6px',
        overflow: 'hidden',
        display: 'flex',
        border: '1px solid #e2e8f0'
      }}>
        {blocks.map((block, idx) => {
          const widthPct = Math.max(0.5, (block.duration_seconds / safeTotal) * 100);
          const color = EVENT_COLORS[block.status] || '#10b981';
          const label = EVENT_LABELS[block.status] || block.status;

          return (
            <div
              key={idx}
              title={`${label}: ${Math.round(block.duration_seconds)}s`}
              style={{
                width: `${widthPct}%`,
                height: '100%',
                backgroundColor: color,
                transition: 'opacity 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1.0')}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.75rem', color: '#334155', fontWeight: 600 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#10b981' }} />
          <span>Attentive</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#f59e0b' }} />
          <span>Potential Distraction</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#ef4444' }} />
          <span>Distracted</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#f97316' }} />
          <span>Drowsiness</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#dc2626' }} />
          <span>No Face</span>
        </div>
      </div>
    </div>
  );
}
