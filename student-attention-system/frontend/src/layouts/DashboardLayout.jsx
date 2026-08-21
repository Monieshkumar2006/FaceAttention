import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlayCircle, 
  History, 
  BarChart3, 
  Sparkles, 
  FileText, 
  ShieldCheck, 
  Video, 
  BookOpen,
  Settings as SettingsIcon
} from 'lucide-react';

export default function DashboardLayout() {
  const location = useLocation();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/start-session', label: 'Start Session', icon: PlayCircle },
    { to: '/quick-eval', label: 'AI Simulator / Eval', icon: Sparkles },
    { to: '/history', label: 'Session History', icon: History },
    { to: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Sidebar */}
      <aside style={{
        width: '260px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        zIndex: 20
      }}>
        {/* Brand Header */}
        <div style={{
          padding: '1.5rem 1.25rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #2563eb, #38bdf8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
          }}>
            <BookOpen size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
              FocusVision AI
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#475569', margin: 0, fontWeight: 500 }}>Attention Analytics</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ padding: '1rem 0.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.5rem 0.75rem' }}>
            Main Menu
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.7rem 0.85rem',
                  borderRadius: '8px',
                  color: isActive ? '#0284c7' : '#1e293b',
                  backgroundColor: isActive ? 'rgba(2, 132, 199, 0.1)' : 'transparent',
                  border: isActive ? '1px solid rgba(2, 132, 199, 0.25)' : '1px solid transparent',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 700 : 600,
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={18} color={isActive ? '#0284c7' : '#334155'} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Privacy Notice Card */}
        <div style={{
          margin: '1rem',
          padding: '1rem',
          backgroundColor: '#f1f5f9',
          borderRadius: '10px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', color: '#059669', fontSize: '0.8rem', fontWeight: 700 }}>
            <ShieldCheck size={16} /> Privacy-Preserving
          </div>
          <p style={{ fontSize: '0.75rem', color: '#334155', margin: 0, lineHeight: 1.45, fontWeight: 500 }}>
            Local CV processing. Raw video frames are never stored or uploaded.
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <header style={{
          height: '64px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '0 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#334155', fontWeight: 600 }}>Session Mode:</span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.25rem 0.65rem',
              borderRadius: '9999px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: '#059669',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
              Ready
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <NavLink
              to="/start-session"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
              }}
            >
              <PlayCircle size={16} /> New Session
            </NavLink>
          </div>
        </header>

        {/* Page Outlet */}
        <main style={{ flex: 1, padding: '2rem', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
