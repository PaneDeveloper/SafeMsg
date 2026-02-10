const WebSocket = require('ws');

const PORT = 8080;
const MAX_ROOM_ID_LENGTH = 20;
const MAX_USER_LENGTH = 40;
const MAX_SIGNAL_SIZE = 200_000;

const wss = new WebSocket.Server({ port: PORT });
const rooms = new Map();

function safeString(value, maxLength) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().slice(0, maxLength);
}

function normalizeRoomId(value) {
  return safeString(value, MAX_ROOM_ID_LENGTH).toUpperCase().replace(/[^A-Z0-9_-]/g, '');
}

function send(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function getRoom(roomId) {
  return rooms.get(roomId) || new Set();
}

function removeFromRoom(ws) {
  const roomId = ws.roomId;
  if (!roomId || !rooms.has(roomId)) {
    return;
  }

  const participants = rooms.get(roomId);
  participants.delete(ws);

  participants.forEach((client) => {
    send(client, {
      type: 'SYSTEM',
      message: `${ws.user || 'Usuário'} saiu da sala.`,
      roomId,
    });
  });

  if (participants.size === 0) {
    rooms.delete(roomId);
  }

  ws.roomId = null;
}

wss.on('connection', (ws) => {
  ws.roomId = null;
  ws.user = 'Usuário';

  ws.on('message', (rawMessage) => {
    let data;

    if (typeof rawMessage === 'string' && rawMessage.length > MAX_SIGNAL_SIZE) {
      send(ws, { type: 'ERROR', message: 'Payload excede o limite permitido.' });
      return;
    }

    try {
      data = JSON.parse(rawMessage);
    } catch {
      send(ws, { type: 'ERROR', message: 'JSON inválido.' });
      return;
    }

    if (!data || typeof data.type !== 'string') {
      send(ws, { type: 'ERROR', message: 'Tipo de mensagem inválido.' });
      return;
    }

    switch (data.type) {
      case 'CREATE_ROOM': {
        const roomId = normalizeRoomId(data.roomId);
        if (!roomId) {
          send(ws, { type: 'ERROR', message: 'ID de sala inválido.' });
          break;
        }

        if (rooms.has(roomId)) {
          send(ws, { type: 'ERROR', message: 'Sala já existe.' });
          break;
        }

        removeFromRoom(ws);

        const participants = new Set([ws]);
        rooms.set(roomId, participants);

        ws.roomId = roomId;
        ws.user = safeString(data.user, MAX_USER_LENGTH) || 'Host';

        send(ws, { type: 'ROOM_CREATED', roomId });
        break;
      }

      case 'JOIN_ROOM': {
        const roomId = normalizeRoomId(data.roomId);
        if (!roomId || !rooms.has(roomId)) {
          send(ws, { type: 'ERROR', message: 'Sala não encontrada.' });
          break;
        }

        removeFromRoom(ws);

        const participants = getRoom(roomId);
        participants.add(ws);

        ws.roomId = roomId;
        ws.user = safeString(data.user, MAX_USER_LENGTH) || 'Usuário';

        send(ws, { type: 'ROOM_JOINED', roomId });

        participants.forEach((client) => {
          if (client !== ws) {
            send(client, {
              type: 'SYSTEM',
              message: `${ws.user} entrou na sala.`,
              roomId,
            });
          }
        });

        break;
      }

      case 'SIGNAL': {
        const roomId = ws.roomId;
        if (!roomId || !rooms.has(roomId)) {
          send(ws, { type: 'ERROR', message: 'Você não está em uma sala.' });
          break;
        }

        const signalString = JSON.stringify(data.signal ?? null);
        if (signalString.length > MAX_SIGNAL_SIZE) {
          send(ws, { type: 'ERROR', message: 'Sinal excede o limite permitido.' });
          break;
        }

        const participants = getRoom(roomId);
        participants.forEach((client) => {
          if (client !== ws) {
            send(client, {
              type: 'SIGNAL',
              roomId,
              user: ws.user,
              signal: data.signal,
            });
          }
        });
        break;
      }

      case 'LEAVE_ROOM': {
        removeFromRoom(ws);
        send(ws, { type: 'ROOM_LEFT' });
        break;
      }

      default:
        send(ws, { type: 'ERROR', message: 'Tipo de mensagem não suportado.' });
    }
  });

  ws.on('close', () => {
    removeFromRoom(ws);
  });
});

console.log(`Servidor de sinalização WebSocket rodando na porta ${PORT}`);
