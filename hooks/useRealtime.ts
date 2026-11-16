'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { api } from '@/lib/api/client';

/**
 * Realtime signal from the API (Socket.IO through the same origin relay).
 * Each connection, and each reconnection, asks the BFF for a fresh 60 s
 * ticket: the session token itself stays in its httpOnly cookie.
 *
 * `channel` identifies the session and salon (null: not connected); a new
 * value reconnects, so switching salon joins the right salon room.
 * `onNotification` runs when a notification is created for the salon; the
 * payload carries no content, the caller refetches what it needs.
 */
export function useRealtime(
  channel: string | null,
  onNotification: (type?: string) => void,
  onChange?: (topic: string) => void,
): { connected: boolean } {
  const [connected, setConnected] = useState(false);
  const handler = useRef(onNotification);
  const changeHandler = useRef(onChange);

  useEffect(() => {
    handler.current = onNotification;
    changeHandler.current = onChange;
  }, [onNotification, onChange]);

  useEffect(() => {
    if (!channel) return;
    let socket: Socket | null = io({
      path: '/realtime/socket.io',
      addTrailingSlash: false,
      // Long polling only: it passes through the Next relay (no WebSocket upgrade).
      transports: ['polling'],
      auth: (cb) => {
        api
          .get<{ ticket: string }>('backend/auth/socket-ticket')
          .then(({ ticket }) => cb({ token: ticket }))
          .catch(() => cb({ token: '' }));
      },
      reconnectionDelay: 2_000,
      reconnectionDelayMax: 30_000,
    });
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));
    socket.on('notification:tenant', (payload?: { type?: string }) => handler.current(payload?.type));
    // Data changed by the team itself (no notification): open screens refresh.
    socket.on('change:tenant', (payload?: { topic?: string }) => payload?.topic && changeHandler.current?.(payload.topic));
    return () => {
      socket?.disconnect();
      socket = null;
      setConnected(false);
    };
  }, [channel]);

  return { connected };
}
