import React from 'react';
import { getScoreGrade } from '../../utils/formatting';

export default function ScoreGauge({ score = 100, size = 160, strokeWidth = 12, showGrade = true }) {
  const safeScore = Math.max(0, Math.min(100, score != null ? Math.round(score) : 100));
  const gradeInfo = getScoreGrade(safeScore);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safeScore / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Animated score arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={gradeInfo.color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.5s ease' }}
          />
        </svg>

        {/* Center Text */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ fontSize: size > 140 ? '2.5rem' : '1.75rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1 }}>
            {safeScore}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.2rem' }}>
            Score
          </span>
        </div>
      </div>

      {showGrade && (
        <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
          <span style={{
            display: 'inline-block',
            padding: '0.2rem 0.6rem',
            borderRadius: '6px',
            backgroundColor: `${gradeInfo.color}20`,
            color: gradeInfo.color,
            fontSize: '0.8rem',
            fontWeight: 700,
            border: `1px solid ${gradeInfo.color}40`
          }}>
            {gradeInfo.grade} • {gradeInfo.label}
          </span>
        </div>
      )}
    </div>
  );
}
