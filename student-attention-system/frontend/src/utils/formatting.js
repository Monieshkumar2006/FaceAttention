/**
 * Formatting utility functions for dates, times, durations, and scores.
 */

export function formatDuration(seconds) {
  if (seconds == null || isNaN(seconds) || seconds < 0) return '00:00';
  const totalSec = Math.round(seconds);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatMinutes(minutes) {
  if (minutes == null || isNaN(minutes)) return '0m';
  if (minutes >= 60) {
    const hrs = Math.floor(minutes / 60);
    const remMins = Math.round(minutes % 60);
    return `${hrs}h ${remMins}m`;
  }
  return `${Math.round(minutes)}m`;
}

export function formatDateTime(isoString) {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatScore(score) {
  if (score == null || isNaN(score)) return '—';
  return Math.round(score).toString();
}

export function getScoreGrade(score) {
  if (score == null || isNaN(score)) return { grade: 'N/A', label: 'No Data', color: '#94a3b8' };
  if (score >= 90) return { grade: 'A+', label: 'Exceptional Focus', color: '#10b981' };
  if (score >= 80) return { grade: 'A', label: 'High Attention', color: '#34d399' };
  if (score >= 70) return { grade: 'B', label: 'Moderate Attention', color: '#38bdf8' };
  if (score >= 60) return { grade: 'C', label: 'Frequent Distractions', color: '#f59e0b' };
  return { grade: 'D', label: 'Needs Improvement', color: '#ef4444' };
}
