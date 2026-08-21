export const EVENT_TYPES = {
  ATTENTIVE: 'ATTENTIVE',
  LOOKING_LEFT: 'LOOKING_LEFT',
  LOOKING_RIGHT: 'LOOKING_RIGHT',
  LOOKING_UP: 'LOOKING_UP',
  LOOKING_DOWN: 'LOOKING_DOWN',
  POTENTIAL_DISTRACTION: 'POTENTIAL_DISTRACTION',
  DISTRACTED: 'DISTRACTED',
  POSSIBLE_DROWSINESS: 'POSSIBLE_DROWSINESS',
  NO_FACE: 'NO_FACE',
  MULTIPLE_FACES: 'MULTIPLE_FACES',
  // Phone related events
  PHONE_DETECTED: 'PHONE_DETECTED',
  PHONE_PERSISTENT: 'PHONE_PERSISTENT',
  POTENTIAL_PHONE_DISTRACTION: 'POTENTIAL_PHONE_DISTRACTION',
  // Additional person/event types
  ADDITIONAL_PERSON: 'ADDITIONAL_PERSON',
  POTENTIAL_OBJECT_DISTRACTION: 'POTENTIAL_OBJECT_DISTRACTION'
};

export const SEVERITIES = {
  INFO: 'INFO',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH'
};

export const EVENT_LABELS = {
  ATTENTIVE: 'Attentive & Focused',
  LOOKING_LEFT: 'Looking Left',
  LOOKING_RIGHT: 'Looking Right',
  LOOKING_UP: 'Looking Up',
  LOOKING_DOWN: 'Looking Down / Reading',
  POTENTIAL_DISTRACTION: 'Potential Distraction',
  DISTRACTED: 'Distracted (Look Away)',
  POSSIBLE_DROWSINESS: 'Possible Drowsiness',
  NO_FACE: 'No Face Detected',
  MULTIPLE_FACES: 'Multiple Faces Detected',
  // Phone related labels
  PHONE_DETECTED: 'Phone Detected',
  PHONE_PERSISTENT: 'Phone Persistent',
  POTENTIAL_PHONE_DISTRACTION: 'Potential Phone Distraction',
  // Additional person & object labels
  ADDITIONAL_PERSON: 'Additional Person Detected',
  POTENTIAL_OBJECT_DISTRACTION: 'Potential Object Distraction'
};

export const EVENT_COLORS = {
  LOOKING_UP: '#818cf8', // indigo
  LOOKING_DOWN: '#a78bfa', // violet
  POTENTIAL_DISTRACTION: '#f59e0b', // amber
  DISTRACTED: '#ef4444', // rose
  POSSIBLE_DROWSINESS: '#f97316', // orange
  NO_FACE: '#dc2626', // dark red
  MULTIPLE_FACES: '#ec4899', // pink
  // Phone related colors – choose high‑contrast teal & amber tones
  PHONE_DETECTED: '#34d399', // teal (info)
  PHONE_PERSISTENT: '#22c55e', // green (success)
  POTENTIAL_PHONE_DISTRACTION: '#fbbf24', // amber (warning)
  // Additional person & object colors
  ADDITIONAL_PERSON: '#8b5cf6', // violet
  POTENTIAL_OBJECT_DISTRACTION: '#eab308' // yellow
};

export const SEVERITY_COLORS = {
  INFO: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: '#059669' },
  LOW: { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: '#0284c7' },
  MEDIUM: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: '#d97706' },
  HIGH: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: '#dc2626' }
};

export const SESSION_STATUS = {
  CREATED: 'CREATED',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED'
};
