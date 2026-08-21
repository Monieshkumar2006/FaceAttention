import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAIInsights, generateAIInsights } from '../services/api';
import { 
  Sparkles, 
  RefreshCw, 
  ArrowLeft, 
  Lightbulb, 
  Compass, 
  ShieldCheck, 
  FileText, 
  BarChart3,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function AIInsights() {
  const { sessionId } = useParams();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState(null);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const res = await getAIInsights(sessionId);
      setInsights(res);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch AI study insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [sessionId]);

  const handleRegenerate = async () => {
    try {
      setRegenerating(true);
      const res = await generateAIInsights(sessionId, true);
      setInsights(res);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to regenerate study insights');
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>
        <Sparkles size={24} className="pulse-live" color="#d97706" style={{ marginBottom: '1rem' }} />
        <div style={{ fontWeight: 600, color: '#0f172a' }}>Synthesizing aggregate session statistics into study habit recommendations...</div>
      </div>
    );
  }

  if (error && !insights) {
    return (
      <div style={{ padding: '2rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#dc2626' }}>
        <AlertCircle size={20} /> {error}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to={`/analytics/${sessionId}`} style={{ color: '#334155', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 600 }}>
            <ArrowLeft size={16} /> Back to Analytics
          </Link>
          <div style={{ height: '16px', width: '1px', backgroundColor: '#cbd5e1' }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={20} color="#d97706" />
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                AI Study Insights & Habits
              </h1>
            </div>
            <span style={{ fontSize: '0.85rem', color: '#475569' }}>
              Generated via <strong style={{ color: '#0f172a' }}>{insights?.provider || 'AI Engine'}</strong>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1.1rem',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: regenerating ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <RefreshCw size={15} className={regenerating ? 'pulse-live' : ''} />
            {regenerating ? 'Updating...' : 'Regenerate'}
          </button>

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
            <FileText size={16} /> PDF Report
          </Link>
        </div>
      </div>

      {/* Main Executive Summary Card */}
      <div className="card" style={{
        padding: '2rem',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#d97706', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          <Compass size={18} /> Executive Session Summary
        </div>
        <p style={{ fontSize: '1.05rem', lineHeight: 1.7, color: '#0f172a', margin: '0 0 1.25rem 0', fontWeight: 500 }}>
          {insights?.summary}
        </p>

        {insights?.main_pattern && (
          <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.35rem' }}>
              Identified Focus Pattern
            </div>
            <div style={{ fontSize: '0.925rem', color: '#0f172a', fontWeight: 600 }}>
              {insights.main_pattern}
            </div>
          </div>
        )}
      </div>

      {/* Actionable Recommendations Grid */}
      <div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem', color: '#0f172a' }}>
          Tailored Study Recommendations
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
          {insights?.recommendations?.map((rec, index) => (
            <div
              key={index}
              className="card"
              style={{
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
                backgroundColor: '#ffffff'
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(2, 132, 199, 0.12)',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '0.1rem'
              }}>
                <Lightbulb size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                  Recommendation #{index + 1}
                </div>
                <div style={{ fontSize: '0.95rem', color: '#0f172a', lineHeight: 1.55, fontWeight: 500 }}>
                  {rec}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Safety & Interpretation Notice */}
      <div style={{
        padding: '1.25rem',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        borderRadius: '8px',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem'
      }}>
        <ShieldCheck size={20} color="#059669" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669', marginBottom: '0.25rem' }}>
            Interpretation Scope & Educational Use
          </div>
          <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.5, fontWeight: 500 }}>
            {insights?.limitations || 'These recommendations are derived from observable webcam visual statistics (head pose, eye closure duration). They are designed for educational productivity self-reflection and do not constitute a medical, sleep, or neurological evaluation.'}
          </div>
        </div>
      </div>
    </div>
  );
}
