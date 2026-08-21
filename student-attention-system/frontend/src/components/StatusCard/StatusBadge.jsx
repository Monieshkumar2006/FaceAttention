import React from 'react';
import { EVENT_LABELS, EVENT_COLORS } from '../../utils/constants';

export default function StatusBadge({ status = 'ATTENTIVE', size = 'medium' }) {
  const label = EVENT_LABELS[status] || status;
  const color = EVENT_COLORS[status] || '#38bdf8';

  const isSmall = size === 'small';

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: isSmall ? '0.35rem' : '0.5rem',
      padding: isSmall ? '0.2rem 0.5rem' : '0.35rem 0.75rem',
      borderRadius: '8px',
      backgroundColor: `${color}18`,
      border: `1px solid ${color}40`,
      color: color,
      fontSize: isSmall ? '0.75rem' : '0.85rem',
      fontWeight: 600
    }}>
      <span style={{
        width: isSmall ? '6px' : '8px',
        height: isSmall ? '6px' : '8px',
        borderRadius: '50%',
        backgroundColor: color,
        boxShadow: `0 0 8px ${color}`
      }} />
      <span>{label}</span>
    </div>
  );
}
