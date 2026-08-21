import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getReportUrl, getSession } from '../services/api';
import { 
  FileText, 
  Download, 
  ArrowLeft, 
  Printer, 
  ExternalLink, 
  ShieldCheck, 
  BarChart3, 
  Sparkles,
  AlertCircle
} from 'lucide-react';

export default function Report() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reportUrl = getReportUrl(sessionId);

  useEffect(() => {
    async function loadSessionInfo() {
      try {
        setLoading(true);
        const res = await getSession(sessionId);
        setSession(res);
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to load session details');
      } finally {
        setLoading(false);
      }
    }
    loadSessionInfo();
  }, [sessionId]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = reportUrl;
    link.download = `StudySession_${sessionId}_Report.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: 'calc(100vh - 120px)' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to={`/analytics/${sessionId}`} style={{ color: '#334155', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 600 }}>
            <ArrowLeft size={16} /> Back to Analytics
          </Link>
          <div style={{ height: '16px', width: '1px', backgroundColor: '#cbd5e1' }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileText size={18} color="#059669" />
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Study Session Report #{sessionId}
              </h1>
            </div>
            <span style={{ fontSize: '0.85rem', color: '#475569' }}>
              {session?.subject} • Student: <strong style={{ color: '#0f172a' }}>{session?.student?.name || 'Student'}</strong>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <a
            href={reportUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1.1rem',
              backgroundColor: '#ffffff',
              color: '#0284c7',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 700
            }}
          >
            <ExternalLink size={15} /> Open in New Tab
          </a>

          <button
            onClick={handleDownload}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1.25rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
            }}
          >
            <Download size={16} /> Download PDF
          </button>
        </div>
      </div>

      {/* PDF Embedded Preview */}
      <div className="card" style={{ flex: 1, overflow: 'hidden', padding: 0, border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>
        <iframe
          src={reportUrl}
          title={`Session ${sessionId} PDF Report`}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            backgroundColor: '#ffffff'
          }}
        />
      </div>
    </div>
  );
}
