import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { getSettings, updateSettings, resetSettings } from '../services/api';
import {
  Sliders,
  Eye,
  AlertTriangle,
  Smartphone,
  Box,
  Bell,
  Clock,
  Shield,
  Monitor,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
} from 'lucide-react';

// ── Reusable Toggle Switch Component ──────────────────────────────────────────
function ToggleSwitch({ label, description, checked, onChange, disabled = false }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.85rem 1rem',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>{label}</span>
        {description && (
          <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500 }}>{description}</span>
        )}
      </div>
      <label
        style={{
          position: 'relative',
          display: 'inline-block',
          width: '44px',
          height: '24px',
          flexShrink: 0,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          style={{ opacity: 0, width: 0, height: 0 }}
        />
        <span
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: checked ? '#2563eb' : '#cbd5e1',
            borderRadius: '24px',
            transition: '0.2s ease',
          }}
        >
          <span
            style={{
              position: 'absolute',
              content: '""',
              height: '18px',
              width: '18px',
              left: checked ? '23px' : '3px',
              bottom: '3px',
              backgroundColor: '#ffffff',
              borderRadius: '50%',
              transition: '0.2s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
          />
        </span>
      </label>
    </div>
  );
}

// ── Reusable Slider Control Component ─────────────────────────────────────────
function SliderControl({
  label,
  description,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  disabled = false,
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        padding: '0.85rem 1rem',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>{label}</span>
          {description && (
            <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500 }}>{description}</div>
          )}
        </div>
        <span
          style={{
            fontSize: '0.8rem',
            fontWeight: 800,
            padding: '0.2rem 0.55rem',
            backgroundColor: '#e0f2fe',
            color: '#0369a1',
            borderRadius: '6px',
            border: '1px solid #bae6fd',
          }}
        >
          {value} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          accentColor: '#2563eb',
          cursor: disabled ? 'not-allowed' : 'pointer',
          marginTop: '0.25rem',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
        <span>
          {min} {unit}
        </span>
        <span>
          {max} {unit}
        </span>
      </div>
    </div>
  );
}

// ── Section Card Container ───────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, color = '#2563eb', children }) {
  return (
    <div
      className="card"
      style={{
        padding: '1.5rem',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color,
          }}
        >
          <Icon size={18} />
        </div>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>{title}</h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
        {children}
      </div>
    </div>
  );
}

export default function Settings() {
  const defaultSettingsState = {
    // 1. Detection
    face_confidence: 0.5,
    object_confidence: 0.35,
    eye_sensitivity: 0.21,
    head_pose_sensitivity: 22.0,

    // 2. Distraction
    distraction_persistence: 5.0,
    look_away_threshold: 2.0,
    no_face_threshold: 3.0,

    // 3. Mobile Phone
    phone_detection_enabled: true,
    max_phone_violations: 3,
    phone_persistence_threshold: 5.0,
    phone_alerts_enabled: true,

    // 4. Object Detection
    object_detection_enabled: true,
    object_confidence_threshold: 0.35,
    unknown_object_detection: true,
    object_tracking_enabled: true,

    // 5. Alerts
    alerts_enabled: true,
    distraction_alerts: true,
    phone_alerts: true,
    no_face_alerts: true,
    alert_cooldown: 10,

    // 6. Session
    auto_end_phone_violations: true,
    save_session_analytics: true,
    show_session_summary: true,

    // 7. Privacy
    store_webcam_frames: false,
    store_raw_video: false,
    store_detection_metadata: true,

    // 8. Display
    show_bounding_boxes: true,
    show_confidence: true,
    show_attention_score: true,
    show_event_timeline: true,
  };

  const [form, setForm] = useState(defaultSettingsState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const data = await getSettings();
        if (data) {
          setForm((prev) => ({ ...prev, ...data }));
        }
      } catch (err) {
        console.warn('Using local default settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    e?.preventDefault();
    try {
      setSaving(true);
      const updated = await updateSettings(form);
      if (updated) {
        setForm((prev) => ({ ...prev, ...updated }));
      }
      toast.success('Settings saved successfully!');
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast.error(err.message || 'Failed to save settings to backend');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all detection and system settings to defaults?')) return;
    try {
      setResetting(true);
      const res = await resetSettings();
      if (res) {
        setForm(res);
      } else {
        setForm(defaultSettingsState);
      }
      toast.success('Settings restored to defaults');
    } catch (err) {
      setForm(defaultSettingsState);
      toast.info('Local settings reset to default');
    } finally {
      setResetting(false);
    }
  };

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#475569', fontWeight: 600 }}>
        Loading system configuration…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#0f172a' }}>
            System Settings & Preferences
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#475569', margin: 0, fontWeight: 500 }}>
            Configure detection sensitivity, distraction rules, phone violation guards, and privacy options.
          </p>
        </div>

        {/* Action Buttons in Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting || saving}
            style={{
              padding: '0.65rem 1.1rem',
              backgroundColor: '#ffffff',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: resetting || saving ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease',
            }}
          >
            <RotateCcw size={16} />
            {resetting ? 'Resetting…' : 'Reset to Defaults'}
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || resetting}
            style={{
              padding: '0.65rem 1.35rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: saving || resetting ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <Save size={16} />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* ── Form Container ── */}
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* 1. Detection Settings */}
        <SectionCard title="1. Detection Settings" icon={Eye} color="#0284c7">
          <SliderControl
            label="Face Detection Confidence"
            description="Minimum threshold for valid facial detection"
            value={form.face_confidence}
            min={0.1}
            max={1.0}
            step={0.05}
            onChange={(v) => updateField('face_confidence', v)}
          />
          <SliderControl
            label="Object Detection Confidence"
            description="Threshold for YOLO object classification"
            value={form.object_confidence}
            min={0.1}
            max={1.0}
            step={0.05}
            onChange={(v) => updateField('object_confidence', v)}
          />
          <SliderControl
            label="Eye Sensitivity (EAR)"
            description="Eye Aspect Ratio threshold for closed eye detection"
            value={form.eye_sensitivity}
            min={0.1}
            max={0.35}
            step={0.01}
            onChange={(v) => updateField('eye_sensitivity', v)}
          />
          <SliderControl
            label="Head-Pose Sensitivity"
            description="Yaw/Pitch degree deviation for gaze distraction"
            value={form.head_pose_sensitivity}
            min={10.0}
            max={40.0}
            step={1.0}
            unit="°"
            onChange={(v) => updateField('head_pose_sensitivity', v)}
          />
        </SectionCard>

        {/* 2. Distraction Settings */}
        <SectionCard title="2. Distraction Settings" icon={AlertTriangle} color="#d97706">
          <SliderControl
            label="Distraction Persistence Duration"
            description="Consecutive looking-away duration before DISTRACTED state"
            value={form.distraction_persistence}
            min={2.0}
            max={15.0}
            step={0.5}
            unit="s"
            onChange={(v) => updateField('distraction_persistence', v)}
          />
          <SliderControl
            label="Looking-Away Threshold"
            description="Duration before temporary gaze deviation alert"
            value={form.look_away_threshold}
            min={0.5}
            max={8.0}
            step={0.5}
            unit="s"
            onChange={(v) => updateField('look_away_threshold', v)}
          />
          <SliderControl
            label="No-Face Threshold"
            description="Absence duration before NO_FACE event is triggered"
            value={form.no_face_threshold}
            min={1.0}
            max={10.0}
            step={0.5}
            unit="s"
            onChange={(v) => updateField('no_face_threshold', v)}
          />
        </SectionCard>

        {/* 3. Mobile Phone Detection */}
        <SectionCard title="3. Mobile Phone Detection" icon={Smartphone} color="#dc2626">
          <ToggleSwitch
            label="Enable Phone Detection"
            description="Detect mobile devices in the camera field of view"
            checked={form.phone_detection_enabled}
            onChange={(v) => updateField('phone_detection_enabled', v)}
          />
          <SliderControl
            label="Maximum Phone Violations"
            description="Auto-terminate session after N qualified phone events"
            value={form.max_phone_violations}
            min={1}
            max={10}
            step={1}
            unit="violations"
            onChange={(v) => updateField('max_phone_violations', v)}
          />
          <SliderControl
            label="Phone Persistence Threshold"
            description="Duration cell phone must remain visible for persistent event"
            value={form.phone_persistence_threshold}
            min={1.0}
            max={15.0}
            step={0.5}
            unit="s"
            onChange={(v) => updateField('phone_persistence_threshold', v)}
          />
          <ToggleSwitch
            label="Phone Alerts"
            description="Show high-priority toast alerts when a phone is identified"
            checked={form.phone_alerts_enabled}
            onChange={(v) => updateField('phone_alerts_enabled', v)}
          />
        </SectionCard>

        {/* 4. Object Detection */}
        <SectionCard title="4. Object Detection" icon={Box} color="#7c3aed">
          <ToggleSwitch
            label="Enable Object Detection"
            description="Run real-time YOLO object classifier on study frames"
            checked={form.object_detection_enabled}
            onChange={(v) => updateField('object_detection_enabled', v)}
          />
          <SliderControl
            label="Object Confidence Threshold"
            description="Filter out bounding boxes below this confidence"
            value={form.object_confidence_threshold}
            min={0.1}
            max={0.9}
            step={0.05}
            onChange={(v) => updateField('object_confidence_threshold', v)}
          />
          <ToggleSwitch
            label="Unknown Object Detection"
            description="Track and display peripheral items (mugs, remotes, etc.)"
            checked={form.unknown_object_detection}
            onChange={(v) => updateField('unknown_object_detection', v)}
          />
          <ToggleSwitch
            label="Object Tracking"
            description="Track object persistence across sequential video frames"
            checked={form.object_tracking_enabled}
            onChange={(v) => updateField('object_tracking_enabled', v)}
          />
        </SectionCard>

        {/* 5. Alert Settings */}
        <SectionCard title="5. Alert Settings" icon={Bell} color="#ea580c">
          <ToggleSwitch
            label="Master Alerts Toggle"
            description="Global enable or mute for real-time monitoring toasts"
            checked={form.alerts_enabled}
            onChange={(v) => updateField('alerts_enabled', v)}
          />
          <ToggleSwitch
            label="Distraction Alerts"
            description="Trigger alerts on prolonged looking-away or drowsiness"
            checked={form.distraction_alerts}
            disabled={!form.alerts_enabled}
            onChange={(v) => updateField('distraction_alerts', v)}
          />
          <ToggleSwitch
            label="Phone Alerts"
            description="Trigger alerts on mobile phone detection"
            checked={form.phone_alerts}
            disabled={!form.alerts_enabled}
            onChange={(v) => updateField('phone_alerts', v)}
          />
          <ToggleSwitch
            label="No-Face Alerts"
            description="Trigger alerts when the student leaves the frame"
            checked={form.no_face_alerts}
            disabled={!form.alerts_enabled}
            onChange={(v) => updateField('no_face_alerts', v)}
          />
          <SliderControl
            label="Alert Cooldown Period"
            description="Minimum delay between repeated notifications"
            value={form.alert_cooldown}
            min={2}
            max={60}
            step={1}
            unit="s"
            disabled={!form.alerts_enabled}
            onChange={(v) => updateField('alert_cooldown', v)}
          />
        </SectionCard>

        {/* 6. Session Settings */}
        <SectionCard title="6. Session Settings" icon={Clock} color="#059669">
          <ToggleSwitch
            label="Auto-End Session on Max Violations"
            description="Automatically complete session upon reaching phone violation limit"
            checked={form.auto_end_phone_violations}
            onChange={(v) => updateField('auto_end_phone_violations', v)}
          />
          <ToggleSwitch
            label="Save Session Analytics"
            description="Store events, score history, and summary into database"
            checked={form.save_session_analytics}
            onChange={(v) => updateField('save_session_analytics', v)}
          />
          <ToggleSwitch
            label="Show Session Summary"
            description="Directly navigate to detailed analytics after session completion"
            checked={form.show_session_summary}
            onChange={(v) => updateField('show_session_summary', v)}
          />
        </SectionCard>

        {/* 7. Privacy */}
        <SectionCard title="7. Privacy" icon={Shield} color="#059669">
          <ToggleSwitch
            label="Store Webcam Frames"
            description="Save JPEG frame snapshots to disk (OFF by default for privacy)"
            checked={form.store_webcam_frames}
            onChange={(v) => updateField('store_webcam_frames', v)}
          />
          <ToggleSwitch
            label="Store Raw Video"
            description="Save full video recording to disk (OFF by default for privacy)"
            checked={form.store_raw_video}
            onChange={(v) => updateField('store_raw_video', v)}
          />
          <ToggleSwitch
            label="Store Detection Metadata"
            description="Store anonymous metrics (attention score, event timestamps, durations)"
            checked={form.store_detection_metadata}
            onChange={(v) => updateField('store_detection_metadata', v)}
          />
        </SectionCard>

        {/* 8. Display Preferences */}
        <SectionCard title="8. Display Preferences" icon={Monitor} color="#2563eb">
          <ToggleSwitch
            label="Show Bounding Boxes"
            description="Render real-time bounding boxes around detected objects"
            checked={form.show_bounding_boxes}
            onChange={(v) => updateField('show_bounding_boxes', v)}
          />
          <ToggleSwitch
            label="Show Confidence Scores"
            description="Display prediction confidence percentage on bounding box tags"
            checked={form.show_confidence}
            onChange={(v) => updateField('show_confidence', v)}
          />
          <ToggleSwitch
            label="Show Attention Score Gauge"
            description="Display the real-time circular attention gauge during monitoring"
            checked={form.show_attention_score}
            onChange={(v) => updateField('show_attention_score', v)}
          />
          <ToggleSwitch
            label="Show Event Timeline"
            description="Display the chronological event log on the monitoring dashboard"
            checked={form.show_event_timeline}
            onChange={(v) => updateField('show_event_timeline', v)}
          />
        </SectionCard>

        {/* ── Bottom Floating Bar with Action Buttons ── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '1rem',
            padding: '1.25rem',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            position: 'sticky',
            bottom: '1rem',
            zIndex: 10,
          }}
        >
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting || saving}
            style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: resetting || saving ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <RotateCcw size={16} />
            Reset to Defaults
          </button>

          <button
            type="submit"
            disabled={saving || resetting}
            style={{
              padding: '0.75rem 1.75rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: saving || resetting ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
            }}
          >
            <Save size={18} />
            {saving ? 'Saving Changes…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
