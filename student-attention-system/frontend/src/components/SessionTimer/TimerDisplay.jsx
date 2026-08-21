import React from 'react';
import { formatDuration } from '../../utils/formatting';
import { Clock, Pause, Play } from 'lucide-react';

export default function TimerDisplay({ 
  elapsedSeconds = 0, 
  plannedMinutes = 25, 
  status = 'RUNNING' 
}) {
  const plannedSeconds = plannedMinutes * 60;
  const progress = Math.min(100, (elapsedSeconds / plannedSeconds) * 100);
  const isPaused = status === 'PAUSED';

  return (
    <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
          <Clock size={16} />
          <span>SESSION TIMER</span>
        </div>
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          padding: '0.15rem 0.5rem',
          borderRadius: '4px',
          backgroundColor: isPaused ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          color: isPaused ? '#fbbf24' : '#34d399',
          border: isPaused ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)'
        }}>
          {status}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>
          {formatDuration(elapsedSeconds)}
        </div>
        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
          Target: {plannedMinutes} mins
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100%', height: '6px', backgroundColor: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          backgroundColor: isPaused ? '#f59e0b' : '#38bdf8',
          transition: 'width 0.3s ease'
        }} />
      </div>
    </div>
  );
}
