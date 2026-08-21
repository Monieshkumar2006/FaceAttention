import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSessions } from '../services/api';
import { formatDuration, formatDateTime, getScoreGrade } from '../utils/formatting';
import ScoreGauge from '../components/AttentionScore/ScoreGauge';
import { 
  PlayCircle, 
  TrendingUp, 
  Clock, 
  Award, 
  ArrowRight, 
  BookOpen, 
  Sparkles, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export default function Dashboard() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await getSessions({ limit: 10 });
        setSessions(data.items || []);
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Compute aggregate metrics
  const completedSessions = sessions.filter((s) => s.status === 'COMPLETED');
  const totalSessions = sessions.length;
  const avgScore = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((acc, s) => acc + (s.attention_score || 0), 0) / completedSessions.length)
    : 0;
  const totalStudySeconds = sessions.reduce((acc, s) => acc + (s.actual_duration || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page Header Banner */}
      <div className="card" style={{
        padding: '2rem',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.5rem',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{ maxWidth: '600px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#0284c7', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            <Sparkles size={16} /> Observable Visual Attention Analysis
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
            Welcome to FocusVision AI
          </h1>
          <p style={{ fontSize: '0.925rem', color: '#475569', margin: 0, lineHeight: 1.6, fontWeight: 500 }}>
            Track observable attention patterns, analyze study habits, and gain deterministic insights to optimize your learning sessions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link
            to="/quick-eval"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#f8fafc',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              padding: '0.75rem 1.25rem',
              borderRadius: '10px',
              fontSize: '0.9rem',
              fontWeight: 700,
              textDecoration: 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Sparkles size={18} color="#0284c7" /> AI Simulator
          </Link>
          <Link
            to="/start-session"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              padding: '0.75rem 1.5rem',
              borderRadius: '10px',
              fontSize: '0.95rem',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            <PlayCircle size={20} /> Start Study Session
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        {/* Metric 1 */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(2, 132, 199, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
            <Award size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Avg Attention Score</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {completedSessions.length > 0 ? `${avgScore}/100` : '—'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
              Across {completedSessions.length} completed sessions
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Total Tracked Time</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {formatDuration(totalStudySeconds)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
              Total elapsed study duration
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(217, 119, 6, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
            <BookOpen size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Total Sessions</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {totalSessions}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
              Recorded in history
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sessions List */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Recent Study Sessions</h2>
          <Link to="/history" style={{ color: '#0284c7', textDecoration: 'none', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700 }}>
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#475569', fontWeight: 600 }}>Loading recent sessions...</div>
        ) : error ? (
          <div style={{ padding: '1.5rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} /> {error}
          </div>
        ) : sessions.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 600 }}>No study sessions recorded yet.</p>
            <Link
              to="/start-session"
              style={{
                display: 'inline-block',
                padding: '0.5rem 1.25rem',
                backgroundColor: '#2563eb',
                color: '#fff',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.875rem'
              }}
            >
              Start Your First Session
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#334155', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Subject</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Student</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Duration</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Attention Score</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const grade = getScoreGrade(s.attention_score);
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.9rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                        {s.subject}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', color: '#334155', fontWeight: 600 }}>
                        {s.student?.name || 'Student'}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                        {formatDateTime(s.created_at)}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', fontFamily: 'var(--font-mono)', color: '#0f172a', fontWeight: 600 }}>
                        {s.actual_duration > 0 ? formatDuration(s.actual_duration) : `${s.planned_duration}m planned`}
                      </td>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        {s.attention_score != null ? (
                          <span style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            backgroundColor: `${grade.color}15`,
                            color: grade.color,
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            border: `1px solid ${grade.color}40`
                          }}>
                            {Math.round(s.attention_score)}% ({grade.grade})
                          </span>
                        ) : (
                          <span style={{ color: '#64748b' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: s.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(2, 132, 199, 0.12)',
                          color: s.status === 'COMPLETED' ? '#059669' : '#0284c7'
                        }}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                        {s.status === 'COMPLETED' ? (
                          <Link
                            to={`/analytics/${s.id}`}
                            style={{
                              color: '#0284c7',
                              textDecoration: 'none',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              padding: '0.35rem 0.75rem',
                              backgroundColor: 'rgba(2, 132, 199, 0.1)',
                              borderRadius: '6px',
                              border: '1px solid rgba(2, 132, 199, 0.25)'
                            }}
                          >
                            Analytics
                          </Link>
                        ) : (
                          <Link
                            to={`/monitor/${s.id}`}
                            style={{
                              color: '#059669',
                              textDecoration: 'none',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              padding: '0.35rem 0.75rem',
                              backgroundColor: 'rgba(16, 185, 129, 0.1)',
                              borderRadius: '6px',
                              border: '1px solid rgba(16, 185, 129, 0.25)'
                            }}
                          >
                            Resume
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
