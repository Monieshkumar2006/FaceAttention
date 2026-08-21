import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { createSession } from '../services/api';
import {
  PlayCircle,
  ShieldCheck,
  Clock,
  BookOpen,
  User,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Camera,
  CameraOff,
  RefreshCw,
  Eye,
  ExternalLink,
} from 'lucide-react';

// ─── Camera Pre-flight Test Component ─────────────────────────────────────────
function CameraPreflightTest({ isDemoMode }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle, testing, ready, error
  const [errorMsg, setErrorMsg] = useState('');
  const [deviceName, setDeviceName] = useState('');

  const startTest = useCallback(async () => {
    setStatus('testing');
    setErrorMsg('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const isIp =
          window.location.hostname !== 'localhost' &&
          window.location.hostname !== '127.0.0.1';
        if (isIp && window.location.protocol === 'http:') {
          throw new Error(
            'Webcam is blocked on non-secure origins. Use http://localhost:5173 or enable Demo Mode.'
          );
        }
        throw new Error('Webcam API not supported in this browser.');
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // Get device label
      const devices = await navigator.mediaDevices.enumerateDevices();
      const activeTrack = stream.getVideoTracks()[0];
      const activeDevice = devices.find(
        (d) => d.kind === 'videoinput' && d.label === activeTrack?.label
      );
      setDeviceName(activeDevice?.label || activeTrack?.label || 'Camera');

      setStatus('ready');
    } catch (err) {
      setStatus('error');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg('Camera permission denied. Please allow access in browser settings.');
      } else if (err.name === 'NotFoundError') {
        setErrorMsg('No camera found. Please connect a webcam.');
      } else {
        setErrorMsg(err.message || 'Camera test failed.');
      }
    }
  }, []);

  const stopTest = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // Clean up on unmount or when demo mode enables
  useEffect(() => {
    return () => stopTest();
  }, [stopTest]);

  useEffect(() => {
    if (isDemoMode) {
      stopTest();
      setStatus('idle');
    }
  }, [isDemoMode, stopTest]);

  if (isDemoMode) return null;

  return (
    <div
      style={{
        padding: '1.25rem',
        backgroundColor: '#f8fafc',
        borderRadius: '10px',
        border: `1px solid ${
          status === 'ready'
            ? 'rgba(16,185,129,0.5)'
            : status === 'error'
            ? 'rgba(239,68,68,0.5)'
            : '#cbd5e1'
        }`,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        transition: 'border-color 0.3s ease',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 700,
            color: '#0f172a',
          }}
        >
          <Eye size={16} color="#0284c7" />
          Camera Pre-flight Check
        </div>

        {status === 'idle' && (
          <button
            type="button"
            onClick={startTest}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '6px',
              backgroundColor: '#2563eb',
              color: '#fff',
              border: 'none',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
            }}
          >
            <Camera size={13} /> Test Camera
          </button>
        )}

        {status === 'error' && (
          <button
            type="button"
            onClick={startTest}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              color: '#dc2626',
              border: '1px solid #fca5a5',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} /> Retry
          </button>
        )}

        {status === 'ready' && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '6px',
              backgroundColor: 'rgba(16,185,129,0.12)',
              color: '#059669',
              fontSize: '0.75rem',
              fontWeight: 700,
              border: '1px solid rgba(16,185,129,0.3)',
            }}
          >
            <CheckCircle2 size={13} /> Camera Ready
          </div>
        )}
      </div>

      {/* Preview area */}
      {(status === 'testing' || status === 'ready') && (
        <div
          style={{
            width: '100%',
            aspectRatio: '16/9',
            maxHeight: '180px',
            backgroundColor: '#0b0f19',
            borderRadius: '8px',
            overflow: 'hidden',
            position: 'relative',
            border: '1px solid #cbd5e1',
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)',
            }}
          />
          {status === 'testing' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.6)',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 600
              }}
            >
              Requesting camera access…
            </div>
          )}
        </div>
      )}

      {/* Ready info */}
      {status === 'ready' && deviceName && (
        <div
          style={{
            fontSize: '0.75rem',
            color: '#334155',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontWeight: 600
          }}
        >
          <Camera size={12} color="#059669" />
          <span>
            Active: <strong style={{ color: '#0f172a' }}>{deviceName}</strong>
          </span>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              color: '#dc2626',
              fontWeight: 600
            }}
          >
            <CameraOff size={14} />
            {errorMsg}
          </div>
          {(errorMsg.includes('permission') || errorMsg.includes('denied')) && (
            <a
              href="https://support.google.com/chrome/answer/2693767"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.75rem',
                color: '#0284c7',
                textDecoration: 'underline',
                fontWeight: 600
              }}
            >
              <ExternalLink size={11} /> How to allow camera in browser settings
            </a>
          )}
        </div>
      )}

      {/* Idle hint */}
      {status === 'idle' && (
        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
          Test your webcam before starting the session to ensure everything works correctly.
        </div>
      )}
    </div>
  );
}

// ─── Main StartSession Page ───────────────────────────────────────────────────
export default function StartSession() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: 'Alex Morgan',
    student_id: 'STU-2026-01',
    subject: 'Computer Science & AI',
    planned_duration: 25,
  });

  const [isDemoMode, setIsDemoMode] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const durationPresets = [15, 25, 45, 60];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreedToPrivacy) {
      const msg = 'Please review and accept the Privacy Notice before starting.';
      setError(msg);
      toast.error(msg);
      return;
    }
    if (!formData.name.trim() || !formData.subject.trim()) {
      const msg = 'Please fill in student name and subject.';
      setError(msg);
      toast.error(msg);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const session = await createSession({
        name: formData.name.trim(),
        student_id: formData.student_id.trim() || null,
        subject: formData.subject.trim(),
        planned_duration: Number(formData.planned_duration) || 25,
      });
      console.log('Session created:', session);
      if (!session || (!session.id && !session.session_id)) {
        throw new Error('Invalid session response from server');
      }
      const sessionId = session.id || session.session_id;
      toast.success(`Study session created for ${session.subject}`);
      navigate(`/monitor/${sessionId}`, { state: { demoMode: isDemoMode } });
    } catch (err) {
      console.error('Create session error:', err);
      setError(err.message || 'Failed to initialize study session');
      toast.error(err.message || 'Failed to initialize study session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#0f172a' }}>
          Configure Study Session
        </h1>
        <p style={{ fontSize: '0.9rem', color: '#475569', margin: 0, fontWeight: 500 }}>
          Set up your student profile, subject details, and attention monitoring preferences.
        </p>
      </div>

      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#fef2f2',
          borderRadius: '8px',
          border: '1px solid #fecaca',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontSize: '0.875rem',
          fontWeight: 600
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
        {/* Student Name */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
            Student Name <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Jane Doe"
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.5rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                color: '#0f172a',
                fontSize: '0.9rem',
                outline: 'none',
                fontWeight: 500
              }}
            />
            <User size={16} color="#64748b" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
        </div>

        {/* Student ID */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
            Student ID <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>(Optional)</span>
          </label>
          <input
            type="text"
            value={formData.student_id}
            onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
            placeholder="e.g. STU-8921"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#0f172a',
              fontSize: '0.9rem',
              outline: 'none',
              fontWeight: 500
            }}
          />
        </div>

        {/* Subject */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
            Subject / Study Topic <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="e.g. Data Structures & Algorithms"
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.5rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                color: '#0f172a',
                fontSize: '0.9rem',
                outline: 'none',
                fontWeight: 500
              }}
            />
            <BookOpen size={16} color="#64748b" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
        </div>

        {/* Planned Duration */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
              Planned Duration: <span style={{ color: '#0284c7' }}>{formData.planned_duration} minutes</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {durationPresets.map((preset) => (
              <button
                type="button"
                key={preset}
                onClick={() => setFormData({ ...formData, planned_duration: preset })}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '6px',
                  backgroundColor: formData.planned_duration === preset ? '#2563eb' : '#f8fafc',
                  color: formData.planned_duration === preset ? '#ffffff' : '#0f172a',
                  border: formData.planned_duration === preset ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {preset} min
              </button>
            ))}
          </div>

          <input
            type="range"
            min="5"
            max="120"
            step="5"
            value={formData.planned_duration}
            onChange={(e) => setFormData({ ...formData, planned_duration: Number(e.target.value) })}
            style={{ width: '100%', accentColor: '#2563eb', cursor: 'pointer' }}
          />
        </div>

        {/* Demo Mode Switch */}
        <div style={{
          padding: '1rem',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={16} color="#d97706" /> Presentation Demo Mode
            </div>
            <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500 }}>
              Simulates camera events deterministically without requiring a live webcam
            </div>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
            <input
              type="checkbox"
              checked={isDemoMode}
              onChange={(e) => setIsDemoMode(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute',
              cursor: 'pointer',
              inset: 0,
              backgroundColor: isDemoMode ? '#2563eb' : '#cbd5e1',
              borderRadius: '26px',
              transition: '0.3s'
            }}>
              <span style={{
                position: 'absolute',
                content: '""',
                height: '18px',
                width: '18px',
                left: isDemoMode ? '24px' : '4px',
                bottom: '4px',
                backgroundColor: '#ffffff',
                borderRadius: '50%',
                transition: '0.3s'
              }} />
            </span>
          </label>
        </div>

        {/* ── Camera Pre-flight Test ── */}
        <CameraPreflightTest isDemoMode={isDemoMode} />

        {/* Privacy Notice Box */}
        <div style={{
          padding: '1.25rem',
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          borderRadius: '8px',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#059669', fontSize: '0.85rem', fontWeight: 700 }}>
            <ShieldCheck size={18} /> Privacy & Processing Notice
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8rem', color: '#334155', lineHeight: 1.6, fontWeight: 500 }}>
            <li>Observable signals are analyzed locally for educational self-reflection only.</li>
            <li>No biometric face identification or facial recognition is performed.</li>
            <li>Raw webcam video is <strong>never permanently stored</strong> on disk or cloud servers.</li>
            <li>Attention metrics represent visual cues (head pose, eye state) and do not constitute a medical evaluation.</li>
          </ul>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: '#0f172a', fontWeight: 600, cursor: 'pointer', marginTop: '0.25rem' }}>
            <input
              type="checkbox"
              checked={agreedToPrivacy}
              onChange={(e) => setAgreedToPrivacy(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
            />
            <span>I have read and acknowledge the privacy guidelines.</span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !agreedToPrivacy}
          style={{
            padding: '0.9rem',
            borderRadius: '8px',
            backgroundColor: loading || !agreedToPrivacy ? '#cbd5e1' : '#2563eb',
            color: loading || !agreedToPrivacy ? '#64748b' : '#ffffff',
            border: 'none',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: loading || !agreedToPrivacy ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
            transition: 'all 0.2s ease'
          }}
        >
          <PlayCircle size={20} />
          {loading ? 'Initializing Session...' : isDemoMode ? 'Start Demo Session' : 'Start Live Monitoring'}
        </button>
      </form>
    </div>
  );
}
