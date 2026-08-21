import React, { useState, useEffect, useRef, useCallback } from 'react';
import CameraBadge from '../CameraStatus/CameraBadge';
import {
  Camera,
  CameraOff,
  RefreshCw,
  Eye,
  Shield,
  Maximize,
  Minimize,
  PictureInPicture,
  PictureInPicture2,
  FlipHorizontal,
  Camera as SnapshotIcon,
  ChevronDown,
  ExternalLink,
  Pause,
} from 'lucide-react';

// ─── Reusable icon button with hover glow ─────────────────────────────────────
function IconBtn({ onClick, title, disabled, active = false, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        borderRadius: '6px',
        border: '1px solid',
        borderColor: active ? '#38bdf8' : hovered && !disabled ? '#38bdf8' : '#23324d',
        backgroundColor: active
          ? 'rgba(56,189,248,0.18)'
          : hovered && !disabled
          ? 'rgba(56,189,248,0.12)'
          : 'rgba(11,15,25,0.7)',
        color: disabled ? '#334155' : active || hovered ? '#38bdf8' : '#94a3b8',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.18s ease',
        backdropFilter: 'blur(6px)',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

// ─── Camera device selector dropdown ─────────────────────────────────────────
function DeviceSelector({ devices, selectedDeviceId, onSwitch }) {
  const [open, setOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!devices || devices.length <= 1) return null;

  const selected = devices.find((d) => d.deviceId === selectedDeviceId);

  return (
    <div ref={dropRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen((p) => !p)}
        title="Switch camera"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
          padding: '0.25rem 0.55rem',
          borderRadius: '6px',
          border: '1px solid #23324d',
          backgroundColor: 'rgba(11,15,25,0.7)',
          color: '#94a3b8',
          fontSize: '0.72rem',
          fontWeight: 600,
          cursor: 'pointer',
          backdropFilter: 'blur(6px)',
          maxWidth: '140px',
          transition: 'all 0.18s ease',
        }}
      >
        <Camera size={13} color="#38bdf8" />
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '80px',
          }}
        >
          {selected?.label || `Camera ${devices.indexOf(selected) + 1}`}
        </span>
        <ChevronDown size={12} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            backgroundColor: '#161f33',
            border: '1px solid #23324d',
            borderRadius: '8px',
            minWidth: '200px',
            zIndex: 50,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            overflow: 'hidden',
          }}
        >
          {devices.map((d, i) => (
            <button
              key={d.deviceId}
              onClick={() => {
                onSwitch(d.deviceId);
                setOpen(false);
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '0.6rem 0.85rem',
                backgroundColor:
                  d.deviceId === selectedDeviceId ? 'rgba(56,189,248,0.1)' : 'transparent',
                color: d.deviceId === selectedDeviceId ? '#38bdf8' : '#cbd5e1',
                border: 'none',
                borderBottom: i < devices.length - 1 ? '1px solid #1e293b' : 'none',
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = 'rgba(56,189,248,0.07)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor =
                  d.deviceId === selectedDeviceId ? 'rgba(56,189,248,0.1)' : 'transparent')
              }
            >
              <div style={{ fontWeight: 600 }}>
                {d.label || `Camera ${i + 1}`}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main WebcamMonitor ───────────────────────────────────────────────────────
export default function WebcamMonitor({
  videoRef,
  isStreaming,
  permissionGranted,
  error,
  onRetry,
  faceCount = 0,
  headDirection = 'CENTER',
  eyeState = 'OPEN',
  isDemo = false,
  sessionStatus = 'RUNNING',
  // Webcam controls
  devices = [],
  selectedDeviceId = '',
  onSwitchDevice,
  isMirrored = true,
  onToggleMirror,
  measuredFps = 0,
  onSnapshot,
  detectedObjects = [],
}) {
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);
  const [fsSupported, setFsSupported] = useState(false);
  const [snapshotFlash, setSnapshotFlash] = useState(false);

  const isPaused = sessionStatus === 'PAUSED';
  const isLive = isStreaming || isDemo;

  // ── Feature detection ──────────────────────────────────────────────────────
  useEffect(() => {
    setPipSupported(
      typeof document !== 'undefined' &&
        !!document.pictureInPictureEnabled &&
        'requestPictureInPicture' in HTMLVideoElement.prototype
    );
    setFsSupported(
      typeof document !== 'undefined' &&
        !!(
          document.fullscreenEnabled ||
          document.webkitFullscreenEnabled ||
          document.mozFullScreenEnabled
        )
    );
  }, []);

  // ── Fullscreen state sync ─────────────────────────────────────────────────
  useEffect(() => {
    const onFsChange = () => {
      const fsEl =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement;
      setIsFullscreen(!!fsEl && fsEl === containerRef.current);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    document.addEventListener('mozfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      document.removeEventListener('mozfullscreenchange', onFsChange);
    };
  }, []);

  // ── PiP state sync ────────────────────────────────────────────────────────
  useEffect(() => {
    const vid = videoRef?.current;
    if (!vid) return;
    const onEnterPiP = () => setIsPiP(true);
    const onLeavePiP = () => setIsPiP(false);
    vid.addEventListener('enterpictureinpicture', onEnterPiP);
    vid.addEventListener('leavepictureinpicture', onLeavePiP);
    return () => {
      vid.removeEventListener('enterpictureinpicture', onEnterPiP);
      vid.removeEventListener('leavepictureinpicture', onLeavePiP);
    };
  }, [videoRef]);

  // ── Fullscreen toggle ─────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      if (!isFullscreen) {
        if (containerRef.current.requestFullscreen)
          await containerRef.current.requestFullscreen();
        else if (containerRef.current.webkitRequestFullscreen)
          containerRef.current.webkitRequestFullscreen();
        else if (containerRef.current.mozRequestFullScreen)
          containerRef.current.mozRequestFullScreen();
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
      }
    } catch (e) {
      console.warn('Fullscreen error:', e);
    }
  }, [isFullscreen]);

  // ── PiP toggle ────────────────────────────────────────────────────────────
  const togglePiP = useCallback(async () => {
    const vid = videoRef?.current;
    if (!vid) return;
    try {
      if (!isPiP) await vid.requestPictureInPicture();
      else await document.exitPictureInPicture();
    } catch (e) {
      console.warn('PiP error:', e);
    }
  }, [isPiP, videoRef]);

  // ── Snapshot with camera flash effect ────────────────────────────────────
  const handleSnapshot = useCallback(() => {
    if (onSnapshot) {
      onSnapshot();
      setSnapshotFlash(true);
      setTimeout(() => setSnapshotFlash(false), 300);
    }
  }, [onSnapshot]);

  const canUsePiP = pipSupported && isStreaming && !isDemo;
  const displayFps = measuredFps > 0 ? measuredFps : 5;

  return (
    <div
      ref={containerRef}
      className="card"
      style={{
        padding: isFullscreen ? '0' : '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: isFullscreen ? '0' : '1rem',
        position: 'relative',
        ...(isFullscreen && {
          backgroundColor: '#000',
          borderRadius: 0,
          height: '100%',
          justifyContent: 'center',
        }),
      }}
    >
      {/* ── Card Header ── */}
      {!isFullscreen && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Left: Label + Device Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
            <Eye size={18} color="#38bdf8" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap' }}>
              {isDemo ? 'SIMULATED STREAM' : 'LIVE WEBCAM'}
            </span>
            {/* Camera device switcher */}
            {!isDemo && isStreaming && (
              <DeviceSelector
                devices={devices}
                selectedDeviceId={selectedDeviceId}
                onSwitch={onSwitchDevice}
              />
            )}
          </div>

          {/* Right: Badges + Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
            <CameraBadge isStreaming={isLive} error={error} fps={displayFps} />

            {/* Mirror toggle */}
            <IconBtn
              onClick={onToggleMirror}
              title={isMirrored ? 'Disable mirror' : 'Enable mirror'}
              disabled={!isStreaming && !isDemo}
              active={isMirrored}
            >
              <FlipHorizontal size={14} />
            </IconBtn>

            {/* Snapshot */}
            <IconBtn
              onClick={handleSnapshot}
              title="Save snapshot (PNG)"
              disabled={!isStreaming || isDemo}
            >
              <SnapshotIcon size={14} />
            </IconBtn>

            {/* PiP */}
            <IconBtn
              onClick={togglePiP}
              title={isPiP ? 'Exit Picture-in-Picture' : 'Float in Picture-in-Picture'}
              disabled={!canUsePiP}
              active={isPiP}
            >
              {isPiP ? <PictureInPicture2 size={14} /> : <PictureInPicture size={14} />}
            </IconBtn>

            {/* Fullscreen */}
            <IconBtn
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              disabled={!fsSupported}
            >
              <Maximize size={14} />
            </IconBtn>
          </div>
        </div>
      )}

      {/* ── Video Container ── */}
      <div
        style={{
          width: '100%',
          aspectRatio: isFullscreen ? 'unset' : '4/3',
          flex: isFullscreen ? 1 : 'unset',
          backgroundColor: '#0b0f19',
          borderRadius: isFullscreen ? '0' : '8px',
          overflow: 'hidden',
          position: 'relative',
          border: isFullscreen ? 'none' : '1px solid #23324d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Live video */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: isFullscreen ? 'contain' : 'cover',
            transform: isMirrored ? 'scaleX(-1)' : 'scaleX(1)',
            display: isStreaming && !isDemo ? 'block' : 'none',
            transition: 'transform 0.2s ease',
          }}
        />

        {/* Bounding box SVG overlay */}
        {isLive && !isPaused && (
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 5,
              transform: isMirrored ? 'scaleX(-1)' : 'scaleX(1)',
            }}
            viewBox="0 0 640 480"
            preserveAspectRatio="none"
          >
            {detectedObjects.map((obj) => {
              const [x1, y1, x2, y2] = obj.bbox;
              const width = x2 - x1;
              const height = y2 - y1;
              
              let color = '#38bdf8'; // Blue for default environmental
              if (obj.class_name === 'cell phone') {
                color = '#f87171'; // Red for cell phone
              } else if (obj.class_name === 'person') {
                color = '#fbbf24'; // Orange/Yellow for person
              } else if (['book', 'laptop', 'keyboard', 'mouse'].includes(obj.class_name)) {
                color = '#34d399'; // Green/Emerald for study related
              }

              return (
                <g key={obj.object_id}>
                  <rect
                    x={x1}
                    y={y1}
                    width={width}
                    height={height}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeDasharray={obj.class_name === 'cell phone' ? "3 2" : "none"}
                  />
                  <rect
                    x={x1}
                    y={y1 - 14 >= 0 ? y1 - 14 : 0}
                    width={obj.class_name.length * 6 + 32}
                    height={14}
                    fill={color}
                    opacity="0.85"
                  />
                  <text
                    x={x1 + 3}
                    y={y1 - 14 >= 0 ? y1 - 4 : 10}
                    fill="#000000"
                    fontSize="8px"
                    fontWeight="800"
                    fontFamily="monospace"
                  >
                    {obj.class_name.toUpperCase()} {Math.round(obj.confidence * 100)}%
                  </text>
                </g>
              );
            })}
          </svg>
        )}

        {/* HUD overlay for detected objects list */}
        {isLive && !isPaused && detectedObjects.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '55px',
              left: '12px',
              backgroundColor: 'rgba(11, 15, 25, 0.85)',
              backdropFilter: 'blur(6px)',
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #23324d',
              color: '#f8fafc',
              pointerEvents: 'none',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.3rem',
              minWidth: '120px',
            }}
          >
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', borderBottom: '1px solid #1e293b', paddingBottom: '0.2rem', marginBottom: '0.1rem' }}>
              Detected Objects
            </div>
            {detectedObjects.map((obj) => (
              <div key={obj.object_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem' }}>
                <span style={{ fontWeight: 600, color: '#cbd5e1' }}>
                  {obj.class_name.charAt(0).toUpperCase() + obj.class_name.slice(1)}
                </span>
                <span style={{ fontWeight: 700, color: obj.class_name === 'cell phone' ? '#f87171' : '#34d399' }}>
                  {Math.round(obj.confidence * 100)}%
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Snapshot flash overlay ── */}
        {snapshotFlash && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(255,255,255,0.4)',
              zIndex: 20,
              pointerEvents: 'none',
              animation: 'none',
            }}
          />
        )}

        {/* ── Paused overlay ── */}
        {isPaused && isStreaming && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              zIndex: 10,
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(251,191,36,0.15)',
                border: '2px solid rgba(251,191,36,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fbbf24',
              }}
            >
              <Pause size={26} />
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fbbf24' }}>
              Session Paused
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Camera is still active — analysis is suspended
            </div>
          </div>
        )}

        {/* ── Demo mode placeholder ── */}
        {isDemo && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#111827',
              color: '#94a3b8',
              padding: '1.5rem',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8',
                marginBottom: '1rem',
                border: '2px dashed #38bdf8',
              }}
            >
              <Eye size={36} className="pulse-live" />
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.25rem' }}>
              Demo Simulation Feed
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '300px' }}>
              Synthesizing deterministic student gaze and posture events for presentation
            </div>
          </div>
        )}

        {/* ── Error / idle state ── */}
        {!isStreaming && !isDemo && (
          <div
            style={{
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '1rem',
            }}
          >
            {error ? (
              <>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#f87171',
                  }}
                >
                  <CameraOff size={26} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f87171', marginBottom: '0.35rem' }}>
                    Camera Access Required
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', maxWidth: '320px', lineHeight: 1.5, marginBottom: '0.5rem' }}>
                    {error}
                  </div>
                  {/* Browser settings help link */}
                  {error.includes('permission') || error.includes('denied') ? (
                    <a
                      href="https://support.google.com/chrome/answer/2693767"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.75rem',
                        color: '#38bdf8',
                        textDecoration: 'underline',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <ExternalLink size={12} /> How to allow camera in browser settings
                    </a>
                  ) : null}
                </div>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.5rem 1.1rem',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
                    }}
                  >
                    <RefreshCw size={14} /> Retry Camera
                  </button>
                )}
              </>
            ) : (
              <>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                  }}
                >
                  <Camera size={24} />
                </div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Click Start Session to activate webcam
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Live HUD overlay ── */}
        {isLive && !isPaused && (
          <div
            style={{
              position: 'absolute',
              bottom: '10px',
              left: '10px',
              right: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                backgroundColor: 'rgba(11, 15, 25, 0.85)',
                backdropFilter: 'blur(6px)',
                padding: '0.3rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                color: '#f8fafc',
                border: '1px solid #23324d',
                display: 'flex',
                gap: '0.6rem',
              }}
            >
              <span>Faces: <strong>{faceCount}</strong></span>
              <span>Pose: <strong>{headDirection}</strong></span>
              <span>Eyes: <strong>{eyeState}</strong></span>
            </div>

            <div
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34d399',
                padding: '0.25rem 0.55rem',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span
                style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}
                className="pulse-live"
              />
              OBSERVING
            </div>
          </div>
        )}

        {/* ── Fullscreen overlay controls ── */}
        {isFullscreen && (
          <>
            {/* Top-left label */}
            <div
              style={{
                position: 'absolute',
                top: '14px',
                left: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'rgba(11, 15, 25, 0.85)',
                backdropFilter: 'blur(6px)',
                padding: '0.3rem 0.7rem',
                borderRadius: '6px',
                border: '1px solid #23324d',
                pointerEvents: 'none',
              }}
            >
              <Eye size={14} color="#38bdf8" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f8fafc' }}>
                {isDemo ? 'DEMO FEED' : 'LIVE WEBCAM'} — FULLSCREEN
              </span>
            </div>

            {/* Top-right controls */}
            <div
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                display: 'flex',
                gap: '0.5rem',
                zIndex: 10,
              }}
            >
              {onToggleMirror && (
                <IconBtn onClick={onToggleMirror} title="Toggle mirror" active={isMirrored}>
                  <FlipHorizontal size={14} />
                </IconBtn>
              )}
              {onSnapshot && !isDemo && (
                <IconBtn onClick={handleSnapshot} title="Save snapshot">
                  <SnapshotIcon size={14} />
                </IconBtn>
              )}
              {canUsePiP && (
                <IconBtn onClick={togglePiP} title={isPiP ? 'Exit PiP' : 'Picture-in-Picture'} active={isPiP}>
                  {isPiP ? <PictureInPicture2 size={14} /> : <PictureInPicture size={14} />}
                </IconBtn>
              )}
              <IconBtn onClick={toggleFullscreen} title="Exit fullscreen">
                <Minimize size={14} />
              </IconBtn>
            </div>
          </>
        )}
      </div>

      {/* ── Privacy note ── */}
      {!isFullscreen && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#64748b' }}>
          <Shield size={14} color="#34d399" />
          <span>Frames are processed for observable cues and discarded immediately. No video is stored.</span>
        </div>
      )}
    </div>
  );
}
