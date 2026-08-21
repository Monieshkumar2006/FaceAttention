import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAnalytics } from '../services/api';
import { formatDuration, formatDateTime, getScoreGrade } from '../utils/formatting';
import ScoreGauge from '../components/AttentionScore/ScoreGauge';
import TimelineBar from '../components/Timeline/TimelineBar';
import EventList from '../components/EventLog/EventList';
import TimeAllocationChart from '../components/charts/TimeAllocationChart';
import EventDistributionChart from '../components/charts/EventDistributionChart';
import { 
  BarChart3, 
  Sparkles, 
  FileText, 
  ArrowLeft, 
  Clock, 
  Award, 
  User, 
  BookOpen, 
  AlertCircle, 
  ShieldCheck,
  CheckCircle2,
  TrendingDown,
  Percent,
  Smartphone,
  Users,
  AlertTriangle
} from 'lucide-react';

export default function Analytics() {
  const { sessionId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        const res = await getAnalytics(sessionId);
        setData(res);
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to load session analytics');
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, [sessionId]);

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>
        <div className="pulse-live" style={{ display: 'inline-block', marginBottom: '1rem', color: '#2563eb' }}>
          <BarChart3 size={32} />
        </div>
        <div style={{ fontWeight: 600, color: '#0f172a' }}>Generating observable analytics & visual timeline...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '2rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#dc2626' }}>
        <AlertCircle size={20} /> {error || 'Session analytics not found'}
      </div>
    );
  }

  const { durations, score_breakdown, event_distribution, timeline, recent_events } = data;
  const grade = getScoreGrade(data.attention_score);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header & Quick Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/history" style={{ color: '#334155', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 600 }}>
            <ArrowLeft size={16} /> Back to History
          </Link>
          <div style={{ height: '16px', width: '1px', backgroundColor: '#cbd5e1' }} />
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              {data.subject} — Session Analytics
            </h1>
            <span style={{ fontSize: '0.85rem', color: '#475569' }}>
              Student: <strong style={{ color: '#0f172a' }}>{data.student_name}</strong> • Concluded on {formatDateTime(data.end_time || data.start_time)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link
            to={`/sessions/${sessionId}/ai-insights`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1.1rem',
              backgroundColor: '#fffbeb',
              color: '#d97706',
              borderRadius: '8px',
              border: '1px solid #fde68a',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 700
            }}
          >
            <Sparkles size={16} /> AI Study Insights
          </Link>
          <Link
            to={`/sessions/${sessionId}/report`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1.1rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              borderRadius: '8px',
              border: 'none',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
            }}
          >
            <FileText size={16} /> Download PDF Report
          </Link>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: `${grade.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: grade.color }}>
            <Award size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Final Score</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
              {Math.round(data.attention_score)}%
            </div>
            <div style={{ fontSize: '0.75rem', color: grade.color, fontWeight: 700 }}>
              {grade.grade} • {grade.label}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Actual Duration</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-mono)' }}>
              {formatDuration(data.actual_duration_seconds)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
              Target: {data.planned_duration_minutes}m
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(2, 132, 199, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
            <Percent size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Attentive Ratio</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
              {score_breakdown.attentive_percentage}%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
              {formatDuration(durations.attentive_seconds)} in focus
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(225, 29, 72, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e11d48' }}>
            <TrendingDown size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Penalties Deducted</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#e11d48' }}>
              -{Math.round(score_breakdown.total_penalty)} pts
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
              {recent_events.length} total events
            </div>
          </div>
        </div>
      </div>

      {/* Visual Timeline Bar */}
      <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Observable Session Timeline</h2>
          <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
            Total elapsed: {formatDuration(data.actual_duration_seconds)}
          </span>
        </div>

        <TimelineBar blocks={timeline} totalSeconds={data.actual_duration_seconds} />
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Pie Chart: Time Allocation */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Time Allocation Distribution</h2>
          <TimeAllocationChart durations={durations} totalSeconds={data.actual_duration_seconds} height={280} />
        </div>

        {/* Explainable Score Breakdown */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Explainable Score Calculation</h2>
          <p style={{ fontSize: '0.825rem', color: '#475569', margin: 0, fontWeight: 500 }}>
            Deterministic penalty model: Starts at 100 points with weight deductions per minute of qualified event.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.85rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem' }}>
              <span style={{ color: '#334155', fontWeight: 600 }}>Base Score</span>
              <strong style={{ color: '#0284c7' }}>100.0 pts</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.85rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem' }}>
              <span style={{ color: '#334155', fontWeight: 600 }}>Distraction Penalty ({formatDuration(durations.distraction_seconds)})</span>
              <strong style={{ color: '#e11d48' }}>-{score_breakdown.distraction_penalty} pts</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.85rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem' }}>
              <span style={{ color: '#334155', fontWeight: 600 }}>Looking Away Penalty ({formatDuration(durations.looking_away_seconds)})</span>
              <strong style={{ color: '#d97706' }}>-{score_breakdown.looking_away_penalty} pts</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.85rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem' }}>
              <span style={{ color: '#334155', fontWeight: 600 }}>No Face Detected ({formatDuration(durations.no_face_seconds)})</span>
              <strong style={{ color: '#dc2626' }}>-{score_breakdown.no_face_penalty} pts</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.85rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem' }}>
              <span style={{ color: '#334155', fontWeight: 600 }}>Possible Drowsiness ({formatDuration(durations.drowsiness_seconds)})</span>
              <strong style={{ color: '#ea580c' }}>-{score_breakdown.drowsiness_penalty} pts</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0.85rem', backgroundColor: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.25)', borderRadius: '8px', fontSize: '0.95rem' }}>
              <span style={{ color: '#0f172a', fontWeight: 800 }}>Final Calculated Score</span>
              <strong style={{ color: grade.color }}>{score_breakdown.final_score} / 100 ({grade.grade})</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Object Detection Summary Card */}
      <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Smartphone size={20} color="#0284c7" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              Object Detection Summary
            </h2>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
            Environmental & Distraction Signals
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Phone detected</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
              {data.object_summary?.phone_detection_count || 0} times
            </div>
          </div>

          <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Phone persistent</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d97706', marginTop: '0.25rem' }}>
              {data.object_summary?.phone_persistent_duration || 0} seconds
            </div>
          </div>

          <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Additional person</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#e11d48', marginTop: '0.25rem' }}>
              {data.object_summary?.additional_person_events || 0} {data.object_summary?.additional_person_events === 1 ? 'event' : 'events'}
            </div>
          </div>

          <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Potential object distractions</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626', marginTop: '0.25rem' }}>
              {data.object_summary?.object_distraction_events || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Event Distribution Bar Chart & Events Log */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Event Frequency Breakdown</h2>
          <EventDistributionChart events={recent_events} height={280} />
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Recorded Event Log</h2>
          <EventList events={recent_events} maxHeight="280px" />
        </div>
      </div>
    </div>
  );
}
