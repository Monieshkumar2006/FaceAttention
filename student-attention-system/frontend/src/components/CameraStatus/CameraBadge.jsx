import React from 'react';
import { Camera, CameraOff, AlertCircle } from 'lucide-react';

export default function CameraBadge({ isStreaming = false, error = null, fps = 5 }) {
  if (error) {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.25rem 0.6rem',
        borderRadius: '6px',
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        color: '#f87171',
        fontSize: '0.75rem',
        fontWeight: 600,
        border: '1px solid rgba(239, 68, 68, 0.3)'
      }}>
        <CameraOff size={14} />
        <span>Camera Error</span>
      </div>
    );
  }

  if (isStreaming) {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.25rem 0.6rem',
        borderRadius: '6px',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        color: '#34d399',
        fontSize: '0.75rem',
        fontWeight: 600,
        border: '1px solid rgba(16, 185, 129, 0.3)'
      }}>
        <Camera size={14} className="pulse-live" />
        <span>Live ({fps} FPS)</span>
      </div>
    );
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.4rem',
      padding: '0.25rem 0.6rem',
      borderRadius: '6px',
      backgroundColor: 'rgba(148, 163, 184, 0.15)',
      color: '#94a3b8',
      fontSize: '0.75rem',
      fontWeight: 500,
      border: '1px solid rgba(148, 163, 184, 0.3)'
    }}>
      <CameraOff size={14} />
      <span>Standby</span>
    </div>
  );
}
