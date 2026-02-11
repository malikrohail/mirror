'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getWsClient, type WsConnectionState } from '@/lib/ws-client';
import { useStudyStore } from '@/stores/study-store';
import type { WsServerMessage } from '@/types/ws';

export function useWebSocket(studyId: string | null) {
  const [connectionState, setConnectionState] = useState<WsConnectionState>('disconnected');
  const handleWsMessage = useStudyStore((s) => s.handleWsMessage);
  const clientRef = useRef(getWsClient());

  useEffect(() => {
    const client = clientRef.current;
    client.connect();

    const unsubState = client.onStateChange(setConnectionState);
    const unsubMsg = client.onMessage((msg: WsServerMessage) => {
      handleWsMessage(msg);
    });

    if (studyId) {
      client.subscribe(studyId);
    }

    return () => {
      if (studyId) {
        client.unsubscribe(studyId);
      }
      unsubState();
      unsubMsg();
    };
  }, [studyId, handleWsMessage]);

  const subscribe = useCallback(
    (id: string) => clientRef.current.subscribe(id),
    [],
  );

  const unsubscribe = useCallback(
    (id: string) => clientRef.current.unsubscribe(id),
    [],
  );

  return { connectionState, subscribe, unsubscribe };
}
