import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useWebcam } from '../hooks/useWebcam';
import { useMonitoring } from '../hooks/useMonitoring';
import WebcamMonitor from '../components/WebcamMonitor/WebcamMonitor';
import ScoreGauge from '../components/AttentionScore/ScoreGauge';
import StatusBadge from '../components/StatusCard/StatusBadge';
import TimerDisplay from '../components/SessionTimer/TimerDisplay';
import EventList from '../components/EventLog/EventList';
import { formatDuration } from '../utils/formatting';
import {
  Play,
  Pause,
  CheckCircle,
  Sparkles,
  AlertCircle,
  ArrowLeft,
  Eye,
  User,
  Compass,
  Radio,
  Wifi,
  WifiOff,
  RefreshCw,
  Smartphone,
} from 'lucide-react';

// ── WebSocket connection status badge ────────────────────────────────────────
function WsStatusBadge({ status }) {
  const config = {
    CONNECTED: { color: '#059669', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', label: 'Connected', Icon: Wifi },
    RECONNECTING: { color: '#d97706', bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.3)', label: 'Reconnecting…', Icon: RefreshCw },
    ERROR: { color: '#dc2626', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', label: 'WS Error', Icon: WifiOff },
    DISCONNECTED: { color: '#475569', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)', label: 'Disconnected', Icon: WifiOff },
    CLOSED: { color: '#64748b', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.2)', label: 'Closed', Icon: WifiOff },
  };

  const c = config[status] || config.DISCONNECTED;
  const { Icon } = c;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.2rem 0.6rem',
        borderRadius: '9999px',
        backgroundColor: c.bg,
        border: `1px solid ${c.border}`,
        color: c.color,
        fontSize: '0.72rem',
        fontWeight: 700,
      }}
    >
      <Icon size={12} style={status === 'RECONNECTING' ? { animation: 'spin 1s linear infinite' } : {}} />
      {c.label}
    </div>
  );
}

export default function Monitoring() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const isDemo = Boolean(location.state?.demoMode);

  // ── Webcam hook ────────────────────────────
  const {
    videoRef,
    isStreaming,
    permissionGranted,
    error: cameraError,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    isMirrored,
    toggleMirror,
    measuredFps,
    startCamera,
    stopCamera,
    captureFrame,
    downloadSnapshot,
  } = useWebcam({ autoStart: !isDemo });

  // ── Monitoring state machine ─────────────────────────────────────────────
  const {
    session,
    sessionStatus,
    wsStatus,
    currentStatus,
    attentionScore,
    scoreBreakdown,
    faceCount,
    headDirection,
    eyeState,
    detectedObjects,
    events,
    elapsedSeconds,
    phoneViolations,
    terminationInfo,
    loading,
    error: sessionError,
    handleStart,
    handlePause,
    handleResume,
    handleComplete,
  } = useMonitoring(sessionId, isDemo, captureFrame);

  const [completing, setCompleting] = useState(false);
  const lastAlertTimeRef = useRef(0);

  // Handle Automatic Session Termination upon 3 phone violations
  useEffect(() => {
    if (terminationInfo) {
      stopCamera();
      toast.error('Session Automatically Terminated!', {
        description: terminationInfo.message || 'Session ended due to 3 mobile phone violation events.',
        duration: 5000,
      });
      const timer = setTimeout(() => {
        navigate(`/analytics/${sessionId}`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [terminationInfo, sessionId, navigate, stopCamera]);

  // Real-time toast alert when mobile phone is detected in frame
  useEffect(() => {
    const hasPhone = detectedObjects.some((obj) => obj.class_name === 'cell phone');
    const isPhoneStatus = ['PHONE_DETECTED', 'POTENTIAL_PHONE_DISTRACTION', 'PHONE_PERSISTENT'].includes(currentStatus);
    const now = Date.now();
    if ((hasPhone || isPhoneStatus) && now - lastAlertTimeRef.current > 6000) {
      lastAlertTimeRef.current = now;
      toast.warning('Mobile Phone Detected in Frame!', {
        description: 'Please put away your mobile device to maintain study focus.',
        duration: 3500,
      });
    }
  }, [detectedObjects, currentStatus]);

  // Auto-start session when webcam is ready
  useEffect(() => {
    if (sessionStatus === 'CREATED' && (permissionGranted || isDemo)) {
      handleStart();
      toast.success('Monitoring session started');
    }
  }, [sessionStatus, permissionGranted, isDemo]);

  // ── Switch camera device ─────────────────────────────────────────────────
  const handleSwitchDevice = async (deviceId) => {
    setSelectedDeviceId(deviceId);
    await startCamera(deviceId);
  };

  const onPauseSession = async () => {
    await handlePause();
    toast.info('Session paused');
  };

  const onResumeSession = async () => {
    await handleResume();
    toast.success('Session resumed');
  };

  const onFinishSession = async () => {
    setCompleting(true);
    stopCamera();
    const completed = await handleComplete();
    if (completed) {
      toast.success('Session completed! Loading analytics…');
      navigate(`/analytics/${sessionId}`);
    }
    setCompleting(false);
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#475569', fontWeight: 600 }}>
        Initializing monitoring session…
      </div>
    );
  }

  if (sessionError && !session) {
    return (
      <div style={{ padding: '2rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626' }}>
        <AlertCircle size={20} /> {sessionError}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ── Top Banner / Breadcrumb ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/" style={{ color: '#334155', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 600 }}>
            <ArrowLeft size={16} /> Exit Monitoring
          </Link>
          <div style={{ height: '16px', width: '1px', backgroundColor: '#cbd5e1' }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                {session?.subject || 'Study Session'}
              </h1>
              {isDemo && (
                <span style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  color: '#d97706',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}>
                  <Sparkles size={14} /> DEMO MODE
                </span>
              )}
              {phoneViolations > 0 && (
                <span style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  backgroundColor: phoneViolations >= 3 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: phoneViolations >= 3 ? '#dc2626' : '#d97706',
                  border: `1px solid ${phoneViolations >= 3 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}>
                  <Smartphone size={14} /> Phone Violations: {phoneViolations}/3
                </span>
              )}
            </div>
            <span style={{ fontSize: '0.85rem', color: '#475569' }}>
              Student: <strong style={{ color: '#0f172a' }}>{session?.student?.name || 'Student'}</strong>
            </span>
          </div>
        </div>

        {/* ── WebSocket status + Live controls ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {!isDemo && sessionStatus === 'RUNNING' && (
            <WsStatusBadge status={wsStatus} />
          )}

          {sessionStatus === 'RUNNING' ? (
            <button
              onClick={onPauseSession}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.55rem 1.1rem', backgroundColor: '#ffffff', color: '#d97706',
                borderRadius: '8px', border: '1px solid #cbd5e1',
                fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
              }}
            >
              <Pause size={16} /> Pause
            </button>
          ) : sessionStatus === 'PAUSED' ? (
            <button
              onClick={onResumeSession}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.55rem 1.1rem', backgroundColor: '#2563eb', color: '#ffffff',
                borderRadius: '8px', border: 'none',
                fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
              }}
            >
              <Play size={16} /> Resume
            </button>
          ) : null}

          <button
            onClick={onFinishSession}
            disabled={completing}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.55rem 1.25rem',
              backgroundColor: completing ? '#cbd5e1' : '#059669',
              color: completing ? '#64748b' : '#ffffff',
              borderRadius: '8px', border: 'none',
              fontSize: '0.85rem', fontWeight: 700,
              cursor: completing ? 'not-allowed' : 'pointer',
              boxShadow: completing ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.25)',
            }}
          >
            <CheckCircle size={16} /> {completing ? 'Concluding…' : 'Complete Session'}
          </button>
        </div>
      </div>

      {/* ── Main Grid Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.5rem' }}>
        {/* Left Column: Camera + State indicators */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <WebcamMonitor
            videoRef={videoRef}
            isStreaming={isStreaming}
            permissionGranted={permissionGranted}
            error={cameraError}
            onRetry={() => startCamera()}
            faceCount={faceCount}
            headDirection={headDirection}
            eyeState={eyeState}
            isDemo={isDemo}
            sessionStatus={sessionStatus}
            devices={devices}
            selectedDeviceId={selectedDeviceId}
            onSwitchDevice={handleSwitchDevice}
            isMirrored={isMirrored}
            onToggleMirror={toggleMirror}
            measuredFps={measuredFps}
            onSnapshot={downloadSnapshot}
            detectedObjects={detectedObjects}
          />

          {/* State Cues Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#475569', fontSize: '0.75rem', fontWeight: 700 }}>
                <Compass size={14} color="#0284c7" /> HEAD DIRECTION
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                {headDirection}
              </div>
            </div>

            <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#475569', fontSize: '0.75rem', fontWeight: 700 }}>
                <Eye size={14} color="#059669" /> EYE STATE
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                {eyeState}
              </div>
            </div>

            <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#475569', fontSize: '0.75rem', fontWeight: 700 }}>
                <User size={14} color="#d97706" /> FACES DETECTED
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                {faceCount}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Score, Status, Event Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Timer */}
          <TimerDisplay
            elapsedSeconds={elapsedSeconds}
            plannedMinutes={session?.planned_duration || 25}
            status={sessionStatus}
          />

          {/* Attention status card */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Current Attention Status
              </div>
              <StatusBadge status={currentStatus} />
            </div>
            <ScoreGauge score={attentionScore} size={110} strokeWidth={8} showGrade={false} />
          </div>

          {/* Real-time Event Log */}
          <div className="card" style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0f172a', fontSize: '0.875rem', fontWeight: 800 }}>
                <Radio size={16} color="#0284c7" /> Real-Time Qualified Events
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                {events.length} events logged
              </span>
            </div>
            <EventList events={events} maxHeight="280px" />
          </div>
        </div>
      </div>
    </div>
  );
}
