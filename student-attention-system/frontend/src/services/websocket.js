const getWsBaseUrl = () => {
  const envWsUrl = import.meta.env?.VITE_WS_URL || import.meta.env?.VITE_WS_BASE_URL;
  if (envWsUrl) {
    return envWsUrl.replace(/\/+$/, '');
  }

  const envApiUrl = import.meta.env?.VITE_API_URL || import.meta.env?.VITE_API_BASE_URL;
  if (envApiUrl) {
    const cleanUrl = envApiUrl.replace(/\/+$/, '');
    if (cleanUrl.startsWith('https://')) {
      return cleanUrl.replace(/^https:\/\//, 'wss://');
    }
    if (cleanUrl.startsWith('http://')) {
      return cleanUrl.replace(/^http:\/\//, 'ws://');
    }
    return cleanUrl;
  }

  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname || 'localhost';
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${hostname}:8000`;
    }
  }
  return 'ws://localhost:8000';
};

const WS_BASE_URL = getWsBaseUrl();

export class MonitoringWebSocketClient {
  constructor(sessionId, onMessage, onStatusChange) {
    this.sessionId = sessionId;
    this.onMessage = onMessage;
    this.onStatusChange = onStatusChange;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.isExplicitlyClosed = false;
    this.pingInterval = null;
  }

  connect() {
    this.isExplicitlyClosed = false;
    const url = `${WS_BASE_URL}/ws/monitor/${this.sessionId}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        if (this.onStatusChange) this.onStatusChange('CONNECTED');

        // Start ping heartbeat
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 10000);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (this.onMessage) this.onMessage(data);
        } catch (err) {
          console.error('Failed to parse WS message:', err);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket encountered an error:', err);
        if (this.onStatusChange) this.onStatusChange('ERROR');
      };

      this.ws.onclose = () => {
        if (this.pingInterval) clearInterval(this.pingInterval);
        if (this.isExplicitlyClosed) {
          if (this.onStatusChange) this.onStatusChange('CLOSED');
          return;
        }

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts += 1;
          if (this.onStatusChange) this.onStatusChange('RECONNECTING');
          setTimeout(() => this.connect(), 2000);
        } else {
          if (this.onStatusChange) this.onStatusChange('DISCONNECTED');
        }
      };
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      if (this.onStatusChange) this.onStatusChange('ERROR');
    }
  }

  sendFrame(base64Image) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'frame',
        timestamp: new Date().toISOString(),
        image: base64Image
      }));
    }
  }

  disconnect() {
    this.isExplicitlyClosed = true;
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
