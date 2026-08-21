import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSession } from '../services/api';
import { formatDuration, formatDateTime, getScoreGrade } from '../utils/formatting';
import ScoreGauge from '../components/AttentionScore/ScoreGauge';
import { 
  ArrowLeft, 
  BarChart3, 
  Sparkles, 
  FileText, 
  Clock, 
  User, 
  BookOpen, 
  Calendar,
  AlertCircle
} from 'lucide-react';

export default function SessionDetails() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getSession(sessionId);
        setSession(data);
        setError(null);
      } catch (err) {
        setError(err.message || 'Session not found');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: '#475569', fontWeight: 600 }}>Loading session details...</div>;
  }

  if (error || !session) {
    return (
      <div style={{ padding: '2rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#dc2626' }}>
        <AlertCircle size={20} /> {error || 'Session not found'}
      </div>
    );
  }

  const grade = getScoreGrade(session.attention_score);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/history" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#334155', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>
          <ArrowLeft size={16} /> Back to History
        </Link>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link
            to={`/analytics/${session.id}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
            }}
          >
            <BarChart3 size={16} /> Analytics & Charts
          </Link>
          <Link
            to={`/sessions/${session.id}/ai-insights`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#fffbeb',
              color: '#d97706',
              borderRadius: '8px',
              border: '1px solid #fde68a',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 700
            }}
          >
            <Sparkles size={16} /> AI Insights
          </Link>
          <Link
            to={`/sessions/${session.id}/report`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#ffffff',
              color: '#059669',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 700
            }}
          >
            <FileText size={16} /> PDF Report
          </Link>
        </div>
      </div>

      {/* Main Details Card */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#0284c7', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              Study Session #{session.id}
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0.25rem 0' }}>
              {session.subject}
            </h1>
            <p style={{ color: '#475569', fontSize: '0.875rem', margin: 0, fontWeight: 500 }}>
              Created on {formatDateTime(session.created_at)}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontSize: '0.8rem', marginBottom: '0.35rem', fontWeight: 700 }}>
                <User size={15} /> STUDENT
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                {session.student?.name || 'N/A'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                ID: {session.student?.student_id || 'Not provided'}
              </div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontSize: '0.8rem', marginBottom: '0.35rem', fontWeight: 700 }}>
                <Clock size={15} /> DURATION
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-mono)' }}>
                {formatDuration(session.actual_duration)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Target: {session.planned_duration} minutes
              </div>
            </div>
          </div>

          {session.summary && (
            <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 800, marginBottom: '0.75rem' }}>Observable Duration Breakdown</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: '#475569', fontWeight: 600 }}>Attentive:</span>{' '}
                  <strong style={{ color: '#059669' }}>{formatDuration(session.summary.attentive_duration)}</strong>
                </div>
                <div>
                  <span style={{ color: '#475569', fontWeight: 600 }}>Distracted:</span>{' '}
                  <strong style={{ color: '#e11d48' }}>{formatDuration(session.summary.distraction_duration)}</strong>
                </div>
                <div>
                  <span style={{ color: '#475569', fontWeight: 600 }}>Looking Away:</span>{' '}
                  <strong style={{ color: '#0284c7' }}>{formatDuration(session.summary.looking_away_duration)}</strong>
                </div>
                <div>
                  <span style={{ color: '#475569', fontWeight: 600 }}>No Face:</span>{' '}
                  <strong style={{ color: '#dc2626' }}>{formatDuration(session.summary.no_face_duration)}</strong>
                </div>
                <div>
                  <span style={{ color: '#475569', fontWeight: 600 }}>Drowsiness:</span>{' '}
                  <strong style={{ color: '#ea580c' }}>{formatDuration(session.summary.drowsiness_duration)}</strong>
                </div>
                <div>
                  <span style={{ color: '#475569', fontWeight: 600 }}>Total Events:</span>{' '}
                  <strong style={{ color: '#0f172a' }}>{session.summary.event_count}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Score Card */}
        <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <ScoreGauge score={session.attention_score} size={180} />
          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
            Estimated Attention Score
          </div>
        </div>
      </div>
    </div>
  );
}
