import { WS_URL, WS_RECONNECT_INTERVAL, MAX_RECONNECT_ATTEMPTS } from './constants';
import type { WsClientMessage, WsServerMessage } from '@/types/ws';

const isDev = process.env.NODE_ENV === 'development';
const log = (...args: unknown[]) => { if (isDev) console.log(...args); };

export type WsConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

type MessageHandler = (msg: WsServerMessage) => void;
type StateHandler = (state: WsConnectionState) => void;

export class WsClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private messageHandlers = new Set<MessageHandler>();
  private stateHandlers = new Set<StateHandler>();
  private subscribedStudyId: string | null = null;
  private state: WsConnectionState = 'disconnected';

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }
    const url = `${WS_URL}/api/v1/ws`;
    log('[WS] Connecting to', url);
    this.setState('connecting');
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      log('[WS] Connected');
      this.reconnectAttempts = 0;
      this.setState('connected');
      if (this.subscribedStudyId) {
        log('[WS] Subscribing to', this.subscribedStudyId);
        this.send({ type: 'subscribe', study_id: this.subscribedStudyId });
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WsServerMessage;
        if (msg.type === 'study:session_snapshot') {
          log(
            '[WS] Message:',
            msg.type,
            'sessions=',
            Object.keys(msg.sessions ?? {}).length,
          );
        } else {
          log('[WS] Message:', msg.type);
        }
        this.messageHandlers.forEach((h) => h(msg));
      } catch {
        log('[WS] Failed to parse message:', event.data);
      }
    };

    this.ws.onclose = (event) => {
      log('[WS] Closed, code:', event.code, 'reason:', event.reason, 'attempts:', this.reconnectAttempts);
      this.ws = null;
      if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        this.setState('reconnecting');
        this.scheduleReconnect();
      } else {
        this.setState('disconnected');
      }
    };

    this.ws.onerror = (event) => {
      log('[WS] Error:', event);
      this.ws?.close();
    };
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = MAX_RECONNECT_ATTEMPTS;
    this.ws?.close();
    this.ws = null;
    this.setState('disconnected');
  }

  subscribe(studyId: string) {
    this.subscribedStudyId = studyId;
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'subscribe', study_id: studyId });
    }
  }

  unsubscribe(studyId: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'unsubscribe', study_id: studyId });
    }
    if (this.subscribedStudyId === studyId) {
      this.subscribedStudyId = null;
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onStateChange(handler: StateHandler): () => void {
    this.stateHandlers.add(handler);
    return () => this.stateHandlers.delete(handler);
  }

  getState(): WsConnectionState {
    return this.state;
  }

  private send(msg: WsClientMessage) {
    this.ws?.send(JSON.stringify(msg));
  }

  private setState(state: WsConnectionState) {
    this.state = state;
    this.stateHandlers.forEach((h) => h(state));
  }

  private scheduleReconnect() {
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, WS_RECONNECT_INTERVAL);
  }
}

let wsClient: WsClient | null = null;

export function getWsClient(): WsClient {
  if (!wsClient) {
    wsClient = new WsClient();
  }
  return wsClient;
}
