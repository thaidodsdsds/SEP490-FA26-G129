import { useEffect, useRef } from 'react';
import { createWebSocketClient } from '../services/websocket-client.js';

export const useWebSocket = ({ url, onMessage, onOpen, onClose, onError } = {}) => {
  const socketRef = useRef(null);

  useEffect(() => {
    const client = createWebSocketClient({
      url,
      onOpen,
      onMessage,
      onClose,
      onError,
    });

    socketRef.current = client;

    return () => {
      client.close();
    };
  }, [url, onMessage, onOpen, onClose, onError]);

  return socketRef.current;
};
