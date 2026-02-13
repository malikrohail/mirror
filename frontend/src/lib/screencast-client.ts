/**
 * Binary WebSocket client for CDP screencast streaming.
 *
 * Opens a WebSocket to /api/v1/ws/screencast with binaryType 'arraybuffer'.
 * Incoming binary frames have format: [36-byte session_id ASCII] + [JPEG bytes].
 * Routes frames to registered per-session handlers.
 */

const WS_URL =
  typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/v1/ws/screencast`
    : '';

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 10000;
const SESSION_ID_BYTES = 36;

export type FrameHandler = (jpeg: Blob) => void;

export type ScreencastConnectionState = 'disconnected' | 'connecting' | 'connected';

type StateHandler = (state: ScreencastConnectionState) => void;

class ScreencastClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<FrameHandler>>();
  private stateHandlers = new Set<StateHandler>();
  private subscribedSessions = new Set<string>();
  private state: ScreencastConnectionState = 'disconnected';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private shouldReconnect = false;

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.shouldReconnect = true;
    this.setState('connecting');

    try {
      this.ws = new WebSocket(WS_URL);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setState('connected');

        // Re-subscribe to all sessions
        for (const sessionId of this.subscribedSessions) {
          this.sendSubscribe(sessionId);
        }
      };

      this.ws.onmessage = (event: MessageEvent) => {
        if (event.data instanceof ArrayBuffer) {
          this.handleBinaryFrame(event.data);
        }
        // Ignore text messages (error responses)
      };

      this.ws.onclose = () => {
        this.ws = null;
        this.setState('disconnected');
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        // onclose will fire after onerror
      };
    } catch {
      this.setState('disconnected');
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    }
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribedSessions.clear();
    this.handlers.clear();
    this.setState('disconnected');
  }

  subscribe(sessionId: string, handler: FrameHandler): () => void {
    // Register handler
    let handlerSet = this.handlers.get(sessionId);
    if (!handlerSet) {
      handlerSet = new Set();
      this.handlers.set(sessionId, handlerSet);
    }
    handlerSet.add(handler);

    // Subscribe on the WS if not already
    if (!this.subscribedSessions.has(sessionId)) {
      this.subscribedSessions.add(sessionId);
      this.sendSubscribe(sessionId);
    }

    // Return unsubscribe function
    return () => {
      const set = this.handlers.get(sessionId);
      if (set) {
        set.delete(handler);
        if (set.size === 0) {
          this.handlers.delete(sessionId);
          this.subscribedSessions.delete(sessionId);
          this.sendUnsubscribe(sessionId);
        }
      }
    };
  }

  onStateChange(handler: StateHandler): () => void {
    this.stateHandlers.add(handler);
    handler(this.state);
    return () => {
      this.stateHandlers.delete(handler);
    };
  }

  getState(): ScreencastConnectionState {
    return this.state;
  }

  private handleBinaryFrame(buffer: ArrayBuffer): void {
    if (buffer.byteLength <= SESSION_ID_BYTES) return;

    // Extract 36-byte session_id prefix (ASCII, possibly null-padded)
    const prefixBytes = new Uint8Array(buffer, 0, SESSION_ID_BYTES);
    let sessionId = '';
    for (let i = 0; i < SESSION_ID_BYTES; i++) {
      if (prefixBytes[i] === 0) break;
      sessionId += String.fromCharCode(prefixBytes[i]);
    }

    // Remaining bytes are JPEG
    const jpegBytes = buffer.slice(SESSION_ID_BYTES);
    const blob = new Blob([jpegBytes], { type: 'image/jpeg' });

    // Route to registered handlers
    const handlerSet = this.handlers.get(sessionId);
    if (handlerSet) {
      for (const handler of handlerSet) {
        handler(blob);
      }
    }
  }

  private sendSubscribe(sessionId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe', session_id: sessionId }));
    }
  }

  private sendUnsubscribe(sessionId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', session_id: sessionId }));
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    const delay = Math.min(
      RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempts),
      RECONNECT_MAX_MS,
    );
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private setState(newState: ScreencastConnectionState): void {
    if (this.state === newState) return;
    this.state = newState;
    for (const handler of this.stateHandlers) {
      handler(newState);
    }
  }
}

// Singleton
let instance: ScreencastClient | null = null;

export function getScreencastClient(): ScreencastClient {
  if (!instance) {
    instance = new ScreencastClient();
  }
  return instance;
}
