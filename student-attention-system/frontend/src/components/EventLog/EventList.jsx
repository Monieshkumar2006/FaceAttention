import React from 'react';
import { EVENT_LABELS, EVENT_COLORS, SEVERITY_COLORS } from '../../utils/constants';
import { formatDuration } from '../../utils/formatting';
import { AlertTriangle, CheckCircle, EyeOff, Users, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Activity } from 'lucide-react';

const EVENT_ICONS = {
  ATTENTIVE: CheckCircle,
  LOOKING_LEFT: ArrowLeft,
  LOOKING_RIGHT: ArrowRight,
  LOOKING_UP: ArrowUp,
  LOOKING_DOWN: ArrowDown,
  POTENTIAL_DISTRACTION: AlertTriangle,
  DISTRACTED: AlertTriangle,
  POSSIBLE_DROWSINESS: EyeOff,
  NO_FACE: AlertTriangle,
  MULTIPLE_FACES: Users
};

export default function EventList({ events = [], maxHeight = '320px' }) {
  if (!events || events.length === 0) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#64748b',
        fontSize: '0.875rem',
        border: '1px dashed #cbd5e1',
        borderRadius: '8px'
      }}>
        No attention events recorded yet.
      </div>
    );
  }

  return (
    <div style={{
      maxHeight,
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      paddingRight: '0.25rem'
    }}>
      {events.map((evt, idx) => {
        const Icon = EVENT_ICONS[evt.event_type] || Activity;
        const color = EVENT_COLORS[evt.event_type] || '#38bdf8';
        const label = EVENT_LABELS[evt.event_type] || evt.event_type;
        const sevStyle = SEVERITY_COLORS[evt.severity] || SEVERITY_COLORS.INFO;

        const timeString = evt.timestamp 
          ? new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          : '';

        return (
          <div
            key={evt.id || idx}
            style={{
              padding: '0.65rem 0.85rem',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              fontSize: '0.85rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                backgroundColor: `${color}18`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: color,
                flexShrink: 0
              }}>
                <Icon size={16} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{label}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{timeString}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {evt.duration > 0 && (
                <span style={{ fontSize: '0.75rem', color: '#334155', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  {formatDuration(evt.duration)}
                </span>
              )}
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.15rem 0.45rem',
                borderRadius: '4px',
                backgroundColor: sevStyle.bg,
                color: sevStyle.text,
                border: `1px solid ${sevStyle.border}40`
              }}>
                {evt.severity}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
