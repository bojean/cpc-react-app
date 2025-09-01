import { BACKEND_URL } from './config';

let socket = null;

export const initSocket = (onQueueUpdate) => {
  socket = new WebSocket(`ws://${BACKEND_URL.replace('http://', '')}/ws`);

  socket.onopen = () => {
    console.log('WebSocket connected');
    socket.send(JSON.stringify({ type: 'subscribe_queue' }));
  };

  socket.onmessage = (event) => {
    const { type, data } = JSON.parse(event.data);
    if (type === 'queue_update') {
      onQueueUpdate(data);
    }
  };

  socket.onclose = () => {
    console.log('WebSocket disconnected');
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
};

export const closeSocket = () => {
  if (socket) {
    socket.close();
    socket = null;
  }
};