import { useState, useEffect, useRef, useCallback } from 'react';
import { MonitoringWebSocketClient } from '../services/websocket';
import { 
  getSession, startSession, pauseSession, resumeSession, completeSession 
} from '../services/api';

// Demo Sequence defined in Specification
const DEMO_EVENT_SEQUENCE = [
  { status: 'ATTENTIVE', head: 'CENTER', eyes: 'OPEN', faces: 1, duration: 4, objects: [] },
  { status: 'ATTENTIVE', head: 'CENTER', eyes: 'OPEN', faces: 1, duration: 4, objects: [{ object_id: 'obj_book_01', class_name: 'book', confidence: 0.87, bbox: [100, 200, 300, 280], duration: 4.0 }] },
  { status: 'PHONE_DETECTED', head: 'CENTER', eyes: 'OPEN', faces: 1, duration: 3, objects: [{ object_id: 'obj_book_01', class_name: 'book', confidence: 0.87, bbox: [100, 200, 300, 280], duration: 7.0 }, { object_id: 'obj_phone_01', class_name: 'cell phone', confidence: 0.91, bbox: [200, 100, 280, 180], duration: 1.0 }] },
  { status: 'PHONE_PERSISTENT', head: 'CENTER', eyes: 'OPEN', faces: 1, duration: 3, objects: [{ object_id: 'obj_book_01', class_name: 'book', confidence: 0.87, bbox: [100, 200, 300, 280], duration: 10.0 }, { object_id: 'obj_phone_01', class_name: 'cell phone', confidence: 0.91, bbox: [200, 100, 280, 180], duration: 4.0 }] },
  { status: 'LOOKING_DOWN', head: 'DOWN', eyes: 'OPEN', faces: 1, duration: 3, objects: [{ object_id: 'obj_book_01', class_name: 'book', confidence: 0.87, bbox: [100, 200, 300, 280], duration: 13.0 }, { object_id: 'obj_phone_01', class_name: 'cell phone', confidence: 0.91, bbox: [200, 100, 280, 180], duration: 7.0 }] },
  { status: 'POTENTIAL_PHONE_DISTRACTION', head: 'DOWN', eyes: 'OPEN', faces: 1, duration: 5, objects: [{ object_id: 'obj_book_01', class_name: 'book', confidence: 0.87, bbox: [100, 200, 300, 280], duration: 18.0 }, { object_id: 'obj_phone_01', class_name: 'cell phone', confidence: 0.91, bbox: [200, 100, 280, 180], duration: 12.0 }] },
  { status: 'ATTENTIVE', head: 'CENTER', eyes: 'OPEN', faces: 1, duration: 4, objects: [] },
  { status: 'ADDITIONAL_PERSON', head: 'CENTER', eyes: 'OPEN', faces: 2, duration: 4, objects: [{ object_id: 'obj_person_02', class_name: 'person', confidence: 0.85, bbox: [50, 50, 180, 220], duration: 4.0 }] },
  { status: 'ATTENTIVE', head: 'CENTER', eyes: 'OPEN', faces: 1, duration: 4, objects: [] }
];

export function useMonitoring(sessionId, isDemo = false, captureFrameFn = null) {
  const [session, setSession] = useState(null);
  const [sessionStatus, setSessionStatus] = useState('CREATED'); // CREATED, RUNNING, PAUSED, COMPLETED
  const [wsStatus, setWsStatus] = useState('DISCONNECTED'); // CONNECTED, RECONNECTING, DISCONNECTED, ERROR
  
  // Real-time analysis metrics
  const [currentStatus, setCurrentStatus] = useState('ATTENTIVE');
  const [attentionScore, setAttentionScore] = useState(100);
  const [scoreBreakdown, setScoreBreakdown] = useState(null);
  const [faceCount, setFaceCount] = useState(1);
  const [headDirection, setHeadDirection] = useState('CENTER');
  const [eyeState, setEyeState] = useState('OPEN');
  const [detectedObjects, setDetectedObjects] = useState([]);
  const [events, setEvents] = useState([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [phoneViolations, setPhoneViolations] = useState(0);
  const [terminationInfo, setTerminationInfo] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const wsClientRef = useRef(null);
  const frameIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const demoStepRef = useRef(0);
  const demoTimerRef = useRef(0);

  // Load initial session details
  const loadSession = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getSession(sessionId);
      setSession(data);
      setSessionStatus(data.status);
      setAttentionScore(data.attention_score ?? 100);
      setElapsedSeconds(data.actual_duration || 0);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Frame transmission loop
  const stopFrameLoop = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
  }, []);

  const startFrameLoop = useCallback(() => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    if (isDemo) return; // In demo mode, simulate instead of webcam

    frameIntervalRef.current = setInterval(() => {
      if (captureFrameFn && wsClientRef.current) {
        const frameBase64 = captureFrameFn(640, 480);
        if (frameBase64) {
          wsClientRef.current.sendFrame(frameBase64);
        }
      }
    }, 200); // 5 FPS (200ms)
  }, [captureFrameFn, isDemo]);

  // Handle incoming analysis message from WebSocket
  const handleAnalysisMessage = useCallback((data) => {
    if (data.type === 'analysis') {
      setCurrentStatus(data.status);
      setAttentionScore(data.attention_score);
      setScoreBreakdown(data.score_breakdown);
      setFaceCount(data.face_count);
      setHeadDirection(data.head_direction);
      setEyeState(data.eye_state);
      setDetectedObjects(data.objects || []);
      if (typeof data.phone_violations === 'number') {
        setPhoneViolations(data.phone_violations);
      }

      if (data.active_event) {
        setEvents((prev) => [data.active_event, ...prev.slice(0, 49)]);
      }
    } else if (data.type === 'session_terminated') {
      setSessionStatus('COMPLETED');
      setTerminationInfo(data);
      stopFrameLoop();
    }
  }, [stopFrameLoop]);

  // Demo Mode Simulation step runner
  useEffect(() => {
    if (!isDemo || sessionStatus !== 'RUNNING') return;

    const demoInterval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
      demoTimerRef.current += 1;

      const currentStep = DEMO_EVENT_SEQUENCE[demoStepRef.current % DEMO_EVENT_SEQUENCE.length];
      setCurrentStatus(currentStep.status);
      setHeadDirection(currentStep.head);
      setEyeState(currentStep.eyes);
      setFaceCount(currentStep.faces);
      setDetectedObjects(currentStep.objects || []);

      // Score degradation simulation during distractions
      const isDistractedState = ['DISTRACTED', 'POTENTIAL_DISTRACTION', 'POSSIBLE_DROWSINESS', 'POTENTIAL_PHONE_DISTRACTION', 'POTENTIAL_OBJECT_DISTRACTION'].includes(currentStep.status);
      if (isDistractedState) {
        setAttentionScore((prev) => Math.max(45, Math.round(prev - 0.8)));
      } else {
        setAttentionScore((prev) => Math.min(100, Math.round(prev + 0.3)));
      }

      // Transition to next sequence step
      if (demoTimerRef.current >= currentStep.duration) {
        demoTimerRef.current = 0;
        demoStepRef.current += 1;

        if (currentStep.status !== 'ATTENTIVE') {
          let severity = 'MEDIUM';
          if (['DISTRACTED', 'POTENTIAL_PHONE_DISTRACTION'].includes(currentStep.status)) {
            severity = 'HIGH';
          } else if (['PHONE_DETECTED', 'LOOKING_DOWN', 'LOOKING_RIGHT', 'LOOKING_LEFT', 'LOOKING_UP'].includes(currentStep.status)) {
            severity = 'LOW';
          }
          
          // Get object-specific info if simulated
          const primaryObj = currentStep.objects && currentStep.objects[0];

          const newEvent = {
            id: Date.now(),
            session_id: sessionId,
            timestamp: new Date().toISOString(),
            event_type: currentStep.status,
            duration: currentStep.duration,
            severity: severity,
            confidence: 0.92,
            object_id: primaryObj ? primaryObj.object_id : null,
            x1: primaryObj ? primaryObj.bbox[0] : null,
            y1: primaryObj ? primaryObj.bbox[1] : null,
            x2: primaryObj ? primaryObj.bbox[2] : null,
            y2: primaryObj ? primaryObj.bbox[3] : null
          };
          setEvents((prev) => [newEvent, ...prev.slice(0, 49)]);
        }
      }
    }, 1000);

    return () => clearInterval(demoInterval);
  }, [isDemo, sessionStatus, sessionId]);

  // Real Timer Increment for Live sessions
  useEffect(() => {
    if (isDemo || sessionStatus !== 'RUNNING') return;

    timerIntervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isDemo, sessionStatus]);

  // WebSocket Connection Management
  useEffect(() => {
    if (isDemo || sessionStatus !== 'RUNNING') {
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
        wsClientRef.current = null;
      }
      stopFrameLoop();
      return;
    }

    const client = new MonitoringWebSocketClient(
      sessionId,
      handleAnalysisMessage,
      (status) => setWsStatus(status)
    );
    wsClientRef.current = client;
    client.connect();
    startFrameLoop();

    return () => {
      client.disconnect();
      stopFrameLoop();
    };
  }, [sessionId, sessionStatus, isDemo, handleAnalysisMessage, startFrameLoop, stopFrameLoop]);

  // Session Control Actions
  const handleStart = async () => {
    try {
      const updated = await startSession(sessionId);
      setSession(updated);
      setSessionStatus('RUNNING');
    } catch (err) {
      setError(err.message || 'Failed to start session');
    }
  };

  const handlePause = async () => {
    try {
      const updated = await pauseSession(sessionId);
      setSession(updated);
      setSessionStatus('PAUSED');
      stopFrameLoop();
    } catch (err) {
      setError(err.message || 'Failed to pause session');
    }
  };

  const handleResume = async () => {
    try {
      const updated = await resumeSession(sessionId);
      setSession(updated);
      setSessionStatus('RUNNING');
    } catch (err) {
      setError(err.message || 'Failed to resume session');
    }
  };

  const handleComplete = async () => {
    try {
      stopFrameLoop();
      if (wsClientRef.current) wsClientRef.current.disconnect();
      const updated = await completeSession(sessionId);
      setSession(updated);
      setSessionStatus('COMPLETED');
      return updated;
    } catch (err) {
      setError(err.message || 'Failed to complete session');
      return null;
    }
  };

  return {
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
    error,
    handleStart,
    handlePause,
    handleResume,
    handleComplete
  };
}
