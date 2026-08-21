import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import StartSession from './pages/StartSession';
import Monitoring from './pages/Monitoring';
import Analytics from './pages/Analytics';
import History from './pages/History';
import SessionDetails from './pages/SessionDetails';
import AIInsights from './pages/AIInsights';
import Report from './pages/Report';
import QuickEvaluation from './pages/QuickEvaluation';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Router>
      <Toaster 
        theme="dark" 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#161f33',
            border: '1px solid #23324d',
            color: '#f8fafc',
          },
        }} 
      />
      <Routes>
        <Route element={<DashboardLayout />}>
          {/* Main Dashboard */}
          <Route path="/" element={<Dashboard />} />

          {/* Start New Session */}
          <Route path="/start-session" element={<StartSession />} />

          {/* Quick AI Evaluation & Simulator */}
          <Route path="/quick-eval" element={<QuickEvaluation />} />

          {/* System Settings */}
          <Route path="/settings" element={<Settings />} />

          {/* Live Monitoring */}
          <Route path="/monitor/:sessionId" element={<Monitoring />} />

          {/* Post-Session Analytics */}
          <Route path="/analytics/:sessionId" element={<Analytics />} />

          {/* Session History Archive */}
          <Route path="/history" element={<History />} />

          {/* Session Details */}
          <Route path="/sessions/:sessionId" element={<SessionDetails />} />

          {/* AI Study Insights */}
          <Route path="/sessions/:sessionId/ai-insights" element={<AIInsights />} />

          {/* Downloadable / In-Browser PDF Report */}
          <Route path="/sessions/:sessionId/report" element={<Report />} />

          {/* Fallback to Dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
