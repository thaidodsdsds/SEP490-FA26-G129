export const createWebSocketClient = ({
  url = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws',
  onOpen,
  onMessage,
  onClose,
  onError,
} = {}) => {
  const socket = new WebSocket(url);

  socket.addEventListener('open', (event) => {
    if (onOpen) onOpen(event, socket);
  });

  socket.addEventListener('message', (event) => {
    if (onMessage) onMessage(event, socket);
  });

  socket.addEventListener('close', (event) => {
    if (onClose) onClose(event, socket);
  });

  socket.addEventListener('error', (event) => {
    if (onError) onError(event, socket);
  });

  return {
    socket,
    send(message) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(typeof message === 'string' ? message : JSON.stringify(message));
        return true;
      }
      return false;
    },
    close() {
      socket.close();
    },
  };
};

export default createWebSocketClient;
