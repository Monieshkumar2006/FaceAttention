import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebcam(options = {}) {
  const {
    videoWidth = 640,
    videoHeight = 480,
    autoStart = false,
    compressionQuality = 0.6,
  } = options;

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  // ── Mirror state (toggle horizontal flip) ───────────────────────────────────
  const [isMirrored, setIsMirrored] = useState(true);
  const toggleMirror = useCallback(() => setIsMirrored((prev) => !prev), []);

  // ── Measured FPS tracking ────────────────────────────────────────────────────
  const [measuredFps, setMeasuredFps] = useState(0);
  const fpsFrameCountRef = useRef(0);
  const fpsTimerRef = useRef(null);

  const startFpsCounter = useCallback(() => {
    if (fpsTimerRef.current) clearInterval(fpsTimerRef.current);
    fpsFrameCountRef.current = 0;
    fpsTimerRef.current = setInterval(() => {
      setMeasuredFps(fpsFrameCountRef.current);
      fpsFrameCountRef.current = 0;
    }, 1000);
  }, []);

  const stopFpsCounter = useCallback(() => {
    if (fpsTimerRef.current) {
      clearInterval(fpsTimerRef.current);
      fpsTimerRef.current = null;
    }
    setMeasuredFps(0);
  }, []);

  // ── Enumerate video devices ──────────────────────────────────────────────────
  const getDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = deviceList.filter((d) => d.kind === 'videoinput');
      setDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (err) {
      console.warn('Unable to enumerate video devices:', err);
    }
  }, [selectedDeviceId]);

  // ── Start webcam stream ──────────────────────────────────────────────────────
  const startCamera = useCallback(
    async (deviceId = null) => {
      try {
        setError(null);
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          const isIpAddress =
            window.location.hostname !== 'localhost' &&
            window.location.hostname !== '127.0.0.1';
          if (isIpAddress && window.location.protocol === 'http:') {
            throw new Error(
              'Webcam is blocked on non-secure IP addresses by your browser. Please open the app at http://localhost:5173 or enable Demo Mode.'
            );
          }
          throw new Error('Webcam API is not supported in this browser environment.');
        }

        // Stop existing stream if running
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }

        const targetDeviceId = deviceId || selectedDeviceId || null;

        const constraints = {
          video: {
            width: { ideal: videoWidth },
            height: { ideal: videoHeight },
            facingMode: 'user',
            ...(targetDeviceId ? { deviceId: { exact: targetDeviceId } } : {}),
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        setIsStreaming(true);
        setPermissionGranted(true);
        startFpsCounter();
        await getDevices();
      } catch (err) {
        setIsStreaming(false);
        setPermissionGranted(false);
        stopFpsCounter();
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError(
            'Camera permission was denied. Please allow webcam access in your browser settings.'
          );
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No camera device detected. Please connect a webcam.');
        } else {
          setError(err.message || 'Failed to access webcam.');
        }
      }
    },
    [videoWidth, videoHeight, selectedDeviceId, getDevices, startFpsCounter, stopFpsCounter]
  );

  // ── Stop webcam stream ───────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    stopFpsCounter();
    setIsStreaming(false);
  }, [stopFpsCounter]);

  // ── Capture current frame as base64 JPEG ────────────────────────────────────
  const captureFrame = useCallback(
    (targetWidth = 320, targetHeight = 240) => {
      if (!videoRef.current || !isStreaming || videoRef.current.readyState < 2) {
        return null;
      }

      const video = videoRef.current;
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      // Apply mirror when capturing (match what user sees on screen)
      if (isMirrored) {
        ctx.translate(targetWidth, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
      if (isMirrored) {
        ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
      }

      // Increment FPS counter
      fpsFrameCountRef.current += 1;

      const dataUrl = canvas.toDataURL('image/jpeg', compressionQuality);
      const base64Data = dataUrl.split(',')[1];
      return base64Data;
    },
    [isStreaming, compressionQuality, isMirrored]
  );

  // ── Snapshot download — saves a full-res PNG ─────────────────────────────────
  const downloadSnapshot = useCallback(() => {
    if (!videoRef.current || !isStreaming || videoRef.current.readyState < 2) return;

    const video = videoRef.current;
    const snap = document.createElement('canvas');
    snap.width = video.videoWidth || videoWidth;
    snap.height = video.videoHeight || videoHeight;
    const ctx = snap.getContext('2d');

    if (isMirrored) {
      ctx.translate(snap.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, snap.width, snap.height);

    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const link = document.createElement('a');
    link.download = `snapshot-${ts}.png`;
    link.href = snap.toDataURL('image/png');
    link.click();
  }, [isStreaming, isMirrored, videoWidth, videoHeight]);

  // ── Auto-start ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (autoStart) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  return {
    videoRef,
    isStreaming,
    permissionGranted,
    error,
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
  };
}
