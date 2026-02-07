const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

const rooms = {}; // Armazena as salas e os clientes conectados

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case 'CREATE_ROOM': {
        const roomId = data.roomId;
        if (!rooms[roomId]) {
          rooms[roomId] = [];
        }
        rooms[roomId].push(ws);
        ws.roomId = roomId;
        ws.isHost = true;
        break;
      }

      case 'JOIN_ROOM': {
        const roomId = data.roomId;
        if (rooms[roomId]) {
          rooms[roomId].forEach((client) => {
            if (client.isHost) {
              client.send(
                JSON.stringify({
                  type: 'JOIN_REQUEST',
                  user: data.user,
                })
              );
            }
          });
          ws.roomId = roomId;
          rooms[roomId].push(ws);
        } else {
          ws.send(
            JSON.stringify({
              type: 'ERROR',
              message: 'Sala não encontrada.',
            })
          );
        }
        break;
      }

      case 'SIGNAL': {
        const roomId = data.roomId;
        const targetUser = data.targetUser;
        if (rooms[roomId]) {
          rooms[roomId].forEach((client) => {
            if (client !== ws) {
              client.send(
                JSON.stringify({
                  type: 'SIGNAL',
                  signal: data.signal,
                  user: data.user,
                })
              );
            }
          });
        }
        break;
      }

      case 'LEAVE_ROOM': {
        const roomId = ws.roomId;
        if (rooms[roomId]) {
          rooms[roomId] = rooms[roomId].filter((client) => client !== ws);
          if (rooms[roomId].length === 0) {
            delete rooms[roomId];
          }
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    const roomId = ws.roomId;
    if (roomId && rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter((client) => client !== ws);
      if (rooms[roomId].length === 0) {
        delete rooms[roomId];
      }
    }
  });
});

console.log('Servidor de sinalização WebSocket rodando na porta 8080');