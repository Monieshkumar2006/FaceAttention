import { useState, useCallback } from 'react';
import { 
  createSession as apiCreateSession, 
  getSession as apiGetSession, 
  startSession as apiStartSession, 
  pauseSession as apiPauseSession, 
  resumeSession as apiResumeSession, 
  completeSession as apiCompleteSession 
} from '../services/api';

export function useSession(sessionId = null) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSession = useCallback(async (id = sessionId) => {
    if (!id) return null;
    try {
      setLoading(true);
      setError(null);
      const data = await apiGetSession(id);
      setSession(data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to fetch session');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const create = useCallback(async (payload) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiCreateSession(payload);
      setSession(data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to create session');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const start = useCallback(async (id = sessionId) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiStartSession(id);
      setSession(data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to start session');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const pause = useCallback(async (id = sessionId) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiPauseSession(id);
      setSession(data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to pause session');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const resume = useCallback(async (id = sessionId) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiResumeSession(id);
      setSession(data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to resume session');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const complete = useCallback(async (id = sessionId) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiCompleteSession(id);
      setSession(data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to complete session');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  return {
    session,
    loading,
    error,
    fetchSession,
    create,
    start,
    pause,
    resume,
    complete,
    setSession,
  };
}
