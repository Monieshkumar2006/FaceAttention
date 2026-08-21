import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Play, 
  Sliders, 
  Code, 
  Smartphone, 
  EyeOff, 
  Clock, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  TrendingDown,
  RotateCcw,
  Zap,
  BarChart2,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { evaluateCustomMetrics, simulateSession } from '../services/api';

const DEFAULT_METRICS = {
  attention_score: 78,
  session_duration: 60,
  distraction_duration: 8,
  phone_events: 2,
  no_face_duration: 3,
  subject: 'Physics Problem Set & Focus Review',
  student_name: 'Alex Johnson'
};

const PRESETS = [
  {
    name: 'Custom User Scenario',
    metrics: {
      attention_score: 78,
      session_duration: 60,
      distraction_duration: 8,
      phone_events: 2,
      no_face_duration: 3,
      subject: 'Physics Problem Set',
      student_name: 'Alex Johnson'
    }
  },
  {
    name: 'High Focus Pomodoro',
    metrics: {
      attention_score: 94,
      session_duration: 25,
      distraction_duration: 1,
      phone_events: 0,
      no_face_duration: 0,
      subject: 'Deep Coding Sprint',
      student_name: 'Alex Johnson'
    }
  },
  {
    name: 'High Mobile Distraction',
    metrics: {
      attention_score: 62,
      session_duration: 50,
      distraction_duration: 16,
      phone_events: 5,
      no_face_duration: 4,
      subject: 'Exam Prep Review',
      student_name: 'Alex Johnson'
    }
  }
];

export default function QuickEvaluation() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(DEFAULT_METRICS);
  const [jsonInput, setJsonInput] = useState(JSON.stringify({
    attention_score: 78,
    session_duration: 60,
    distraction_duration: 8,
    phone_events: 2,
    no_face_duration: 3
  }, null, 2));

  const [activeTab, setActiveTab] = useState('sliders'); // 'sliders' | 'json'
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Trigger evaluation on initial load or metric change
  const runEvaluation = async (payloadToEval = metrics) => {
    try {
      setIsEvaluating(true);
      const res = await evaluateCustomMetrics(payloadToEval);
      setEvaluationResult(res);
    } catch (err) {
      toast.error(err.message || 'Failed to evaluate custom metrics');
    } finally {
      setIsEvaluating(false);
    }
  };

  useEffect(() => {
    runEvaluation(DEFAULT_METRICS);
  }, []);

  const handleSliderChange = (key, value) => {
    const updated = { ...metrics, [key]: Number(value) };
    setMetrics(updated);
    
    // Sync JSON input view
    const jsonToSync = {
      attention_score: updated.attention_score,
      session_duration: updated.session_duration,
      distraction_duration: updated.distraction_duration,
      phone_events: updated.phone_events,
      no_face_duration: updated.no_face_duration
    };
    setJsonInput(JSON.stringify(jsonToSync, null, 2));
    runEvaluation(updated);
  };

  const handleJsonApply = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const updated = {
        ...metrics,
        attention_score: parsed.attention_score !== undefined ? Number(parsed.attention_score) : 78,
        session_duration: parsed.session_duration !== undefined ? Number(parsed.session_duration) : 60,
        distraction_duration: parsed.distraction_duration !== undefined ? Number(parsed.distraction_duration) : 8,
        phone_events: parsed.phone_events !== undefined ? Number(parsed.phone_events) : 2,
        no_face_duration: parsed.no_face_duration !== undefined ? Number(parsed.no_face_duration) : 3,
      };
      setMetrics(updated);
      runEvaluation(updated);
      toast.success('JSON metrics parsed and evaluated successfully!');
    } catch (err) {
      toast.error('Invalid JSON format. Please verify syntax.');
    }
  };

  const handleApplyPreset = (presetMetrics) => {
    setMetrics(presetMetrics);
    const jsonToSync = {
      attention_score: presetMetrics.attention_score,
      session_duration: presetMetrics.session_duration,
      distraction_duration: presetMetrics.distraction_duration,
      phone_events: presetMetrics.phone_events,
      no_face_duration: presetMetrics.no_face_duration
    };
    setJsonInput(JSON.stringify(jsonToSync, null, 2));
    runEvaluation(presetMetrics);
    toast.info(`Loaded preset: ${presetMetrics.subject || 'Preset'}`);
  };

  const handleSimulateAndSave = async () => {
    try {
      setIsSimulating(true);
      const res = await simulateSession(metrics);
      toast.success(`Session #${res.id} simulated and saved!`);
      navigate(`/analytics/${res.id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to simulate session');
    } finally {
      setIsSimulating(false);
    }
  };

  const score = evaluationResult?.attention_score ?? metrics.attention_score;
  const scoreColor = score >= 80 ? '#059669' : score >= 65 ? '#d97706' : '#dc2626';
  const scoreGrade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'rgba(2, 132, 199, 0.12)',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Zap size={18} />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              Quick AI Evaluation & Session Simulator
            </h1>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#475569', margin: 0, fontWeight: 500 }}>
            Input custom session telemetry (e.g. phone events, distraction durations) to instantly generate AI study habits, score explanations, or simulate complete sessions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleSimulateAndSave}
            disabled={isSimulating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.25rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: isSimulating ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            <Play size={16} fill="#ffffff" />
            {isSimulating ? 'Simulating...' : 'Simulate & Save Full Session'}
          </button>
        </div>
      </div>

      {/* Preset Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 700 }}>Quick Presets:</span>
        {PRESETS.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleApplyPreset(p.metrics)}
            style={{
              padding: '0.35rem 0.85rem',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '20px',
              color: '#0284c7',
              fontSize: '0.775rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s ease'
            }}
          >
            <span>{p.name}</span>
          </button>
        ))}
      </div>

      {/* Main Grid: Input Column & AI Evaluation Column */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1fr) minmax(400px, 1.3fr)', gap: '1.75rem' }}>
        
        {/* Left Column: Metric Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            
            {/* Input Mode Selector */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                Session Telemetry Inputs
              </div>
              <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '3px', border: '1px solid #cbd5e1' }}>
                <button
                  onClick={() => setActiveTab('sliders')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.3rem 0.65rem',
                    borderRadius: '6px',
                    backgroundColor: activeTab === 'sliders' ? '#2563eb' : 'transparent',
                    color: activeTab === 'sliders' ? '#ffffff' : '#334155',
                    border: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Sliders size={13} /> Visual Sliders
                </button>
                <button
                  onClick={() => setActiveTab('json')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.3rem 0.65rem',
                    borderRadius: '6px',
                    backgroundColor: activeTab === 'json' ? '#2563eb' : 'transparent',
                    color: activeTab === 'json' ? '#ffffff' : '#334155',
                    border: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Code size={13} /> Raw JSON
                </button>
              </div>
            </div>

            {activeTab === 'sliders' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Attention Score */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    <span style={{ color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Activity size={15} color="#0284c7" /> Target Attention Score
                    </span>
                    <strong style={{ color: scoreColor, fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{metrics.attention_score}%</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={metrics.attention_score}
                    onChange={(e) => handleSliderChange('attention_score', e.target.value)}
                    style={{ width: '100%', accentColor: scoreColor, cursor: 'pointer' }}
                  />
                </div>

                {/* Session Duration */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    <span style={{ color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Clock size={15} color="#059669" /> Session Duration
                    </span>
                    <strong style={{ color: '#0f172a', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{metrics.session_duration} mins</strong>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="120"
                    step="5"
                    value={metrics.session_duration}
                    onChange={(e) => handleSliderChange('session_duration', e.target.value)}
                    style={{ width: '100%', accentColor: '#059669', cursor: 'pointer' }}
                  />
                </div>

                {/* Distraction Duration */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    <span style={{ color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <AlertTriangle size={15} color="#dc2626" /> Distraction Duration
                    </span>
                    <strong style={{ color: '#dc2626', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{metrics.distraction_duration} mins</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={metrics.session_duration}
                    value={metrics.distraction_duration}
                    onChange={(e) => handleSliderChange('distraction_duration', e.target.value)}
                    style={{ width: '100%', accentColor: '#dc2626', cursor: 'pointer' }}
                  />
                </div>

                {/* Phone Events */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    <span style={{ color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Smartphone size={15} color="#d97706" /> Phone Detection Events
                    </span>
                    <strong style={{ color: '#d97706', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{metrics.phone_events} events</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={metrics.phone_events}
                    onChange={(e) => handleSliderChange('phone_events', e.target.value)}
                    style={{ width: '100%', accentColor: '#d97706', cursor: 'pointer' }}
                  />
                </div>

                {/* No Face Duration */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    <span style={{ color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <EyeOff size={15} color="#dc2626" /> No Face Detected Duration
                    </span>
                    <strong style={{ color: '#dc2626', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{metrics.no_face_duration} mins</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={metrics.session_duration}
                    value={metrics.no_face_duration}
                    onChange={(e) => handleSliderChange('no_face_duration', e.target.value)}
                    style={{ width: '100%', accentColor: '#dc2626', cursor: 'pointer' }}
                  />
                </div>

                {/* Subject and Student Inputs */}
                <div style={{ paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#475569', display: 'block', marginBottom: '0.25rem', fontWeight: 700 }}>Subject Name</label>
                    <input
                      type="text"
                      value={metrics.subject}
                      onChange={(e) => setMetrics({ ...metrics, subject: e.target.value })}
                      style={{ width: '100%', padding: '0.45rem 0.65rem', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', fontSize: '0.85rem', fontWeight: 500 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#475569', display: 'block', marginBottom: '0.25rem', fontWeight: 700 }}>Student Name</label>
                    <input
                      type="text"
                      value={metrics.student_name}
                      onChange={(e) => setMetrics({ ...metrics, student_name: e.target.value })}
                      style={{ width: '100%', padding: '0.45rem 0.65rem', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', fontSize: '0.85rem', fontWeight: 500 }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  rows={9}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    color: '#0f172a',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    lineHeight: '1.4',
                    outline: 'none',
                    fontWeight: 600,
                    resize: 'vertical'
                  }}
                />
                <button
                  onClick={handleJsonApply}
                  style={{
                    padding: '0.55rem',
                    backgroundColor: '#ffffff',
                    border: '1px solid #0284c7',
                    borderRadius: '6px',
                    color: '#0284c7',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <RotateCcw size={14} /> Parse & Evaluate JSON
                </button>
              </div>
            )}
          </div>

          {/* Quick Metrics Summary Tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            <div style={{ padding: '0.85rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', fontWeight: 700 }}>Attentive Focus</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669', marginTop: '0.2rem' }}>
                {evaluationResult?.attentive_duration_minutes ?? (metrics.session_duration - metrics.distraction_duration - metrics.no_face_duration)}m
              </div>
            </div>

            <div style={{ padding: '0.85rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', fontWeight: 700 }}>Distracted</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626', marginTop: '0.2rem' }}>
                {metrics.distraction_duration}m
              </div>
            </div>

            <div style={{ padding: '0.85rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', fontWeight: 700 }}>Phone Events</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#d97706', marginTop: '0.2rem' }}>
                {metrics.phone_events}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Insights & Evaluation Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Executive Score & Pattern Card */}
          <div className="card" style={{
            padding: '1.75rem',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#d97706', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase' }}>
                <Sparkles size={16} /> AI Executive Evaluation
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.25rem 0.65rem',
                borderRadius: '6px',
                backgroundColor: `${scoreColor}15`,
                color: scoreColor,
                fontWeight: 800,
                fontSize: '0.85rem',
                border: `1px solid ${scoreColor}40`
              }}>
                Attention Score: {Math.round(score)}% ({scoreGrade})
              </div>
            </div>

            <p style={{ fontSize: '0.975rem', lineHeight: 1.65, color: '#0f172a', margin: 0, fontWeight: 500 }}>
              {evaluationResult?.insight?.summary || 'Generating real-time insights from session parameters...'}
            </p>

            {evaluationResult?.insight?.main_pattern && (
              <div style={{ padding: '0.85rem 1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>
                  Identified Focus & Distraction Pattern
                </div>
                <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>
                  {evaluationResult.insight.main_pattern}
                </div>
              </div>
            )}
          </div>

          {/* Actionable Study Recommendations */}
          <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 1rem 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={18} color="#059669" />
              Tailored Habit Recommendations
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {evaluationResult?.insight?.recommendations?.map((rec, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '0.85rem 1rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(2, 132, 199, 0.12)',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    flexShrink: 0,
                    marginTop: '0.1rem'
                  }}>
                    {idx + 1}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#0f172a', lineHeight: 1.5, fontWeight: 500 }}>
                    {rec}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Explainable Penalty Deductions Card */}
          {evaluationResult?.penalties && (
            <div className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <TrendingDown size={16} color="#dc2626" /> Explainable Penalty Deductions
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.7rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  <span style={{ color: '#334155', fontWeight: 600 }}>Distraction ({metrics.distraction_duration}m):</span>
                  <strong style={{ color: '#dc2626' }}>-{evaluationResult.penalties.distraction_penalty} pts</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.7rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  <span style={{ color: '#334155', fontWeight: 600 }}>No Face ({metrics.no_face_duration}m):</span>
                  <strong style={{ color: '#dc2626' }}>-{evaluationResult.penalties.no_face_penalty} pts</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
