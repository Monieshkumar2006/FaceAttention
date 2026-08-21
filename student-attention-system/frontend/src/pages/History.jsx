import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSessions } from '../services/api';
import { formatDuration, formatDateTime, getScoreGrade } from '../utils/formatting';
import { 
  History as HistoryIcon, 
  Search, 
  Filter, 
  BarChart3, 
  Sparkles, 
  FileText, 
  ChevronRight,
  AlertCircle
} from 'lucide-react';

export default function History() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    async function fetchHistory() {
      try {
        setLoading(true);
        const data = await getSessions({ limit: 100 });
        setSessions(data.items || []);
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to retrieve session history');
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch = 
      s.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.student?.name && s.student.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#0f172a' }}>
          Session History & Archive
        </h1>
        <p style={{ fontSize: '0.9rem', color: '#475569', margin: 0, fontWeight: 500 }}>
          Review past study sessions, inspection breakdowns, generated AI summaries, and reports.
        </p>
      </div>

      {/* Filters & Search */}
      <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <input
            type="text"
            placeholder="Search by subject or student..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 1rem 0.6rem 2.4rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#0f172a',
              fontSize: '0.85rem',
              outline: 'none',
              fontWeight: 500
            }}
          />
          <Search size={16} color="#64748b" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} color="#475569" />
          <span style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 600 }}>Status:</span>
          {['ALL', 'COMPLETED', 'RUNNING', 'CREATED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                backgroundColor: statusFilter === st ? '#2563eb' : '#f8fafc',
                color: statusFilter === st ? '#ffffff' : '#334155',
                border: statusFilter === st ? '1px solid #2563eb' : '1px solid #cbd5e1',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions Table */}
      <div className="card" style={{ padding: '1.5rem' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#475569', fontWeight: 600 }}>Loading history...</div>
        ) : error ? (
          <div style={{ padding: '1.5rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} /> {error}
          </div>
        ) : filteredSessions.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            No sessions match your search or filter.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#334155', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Subject</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Student</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Date & Time</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Duration</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Score</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((s) => {
                  const grade = getScoreGrade(s.attention_score);
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '1rem', fontWeight: 700, color: '#0f172a' }}>
                        <Link to={`/sessions/${s.id}`} style={{ color: '#0f172a', textDecoration: 'none' }}>
                          {s.subject}
                        </Link>
                      </td>
                      <td style={{ padding: '1rem', color: '#334155', fontWeight: 600 }}>
                        {s.student?.name || 'Student'}
                      </td>
                      <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.8rem' }}>
                        {formatDateTime(s.created_at)}
                      </td>
                      <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)', color: '#0f172a', fontWeight: 600 }}>
                        {s.actual_duration > 0 ? formatDuration(s.actual_duration) : `${s.planned_duration}m planned`}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {s.attention_score == null ? (
                          <span style={{ color: '#64748b' }}>—</span>
                        ) : (
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
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
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
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <Link
                            to={`/analytics/${s.id}`}
                            title="View Analytics"
                            style={{
                              padding: '0.35rem 0.6rem',
                              backgroundColor: '#f8fafc',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              color: '#0284c7',
                              display: 'flex',
                              alignItems: 'center',
                              textDecoration: 'none'
                            }}
                          >
                            <BarChart3 size={15} />
                          </Link>
                          <Link
                            to={`/sessions/${s.id}/ai-insights`}
                            title="AI Study Insights"
                            style={{
                              padding: '0.35rem 0.6rem',
                              backgroundColor: '#f8fafc',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              color: '#d97706',
                              display: 'flex',
                              alignItems: 'center',
                              textDecoration: 'none'
                            }}
                          >
                            <Sparkles size={15} />
                          </Link>
                          <Link
                            to={`/sessions/${s.id}/report`}
                            title="Session Report"
                            style={{
                              padding: '0.35rem 0.6rem',
                              backgroundColor: '#f8fafc',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              color: '#059669',
                              display: 'flex',
                              alignItems: 'center',
                              textDecoration: 'none'
                            }}
                          >
                            <FileText size={15} />
                          </Link>
                        </div>
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
