const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const db = require('./db');
const MatchManager = require('./matchManager');
const leaderboardRoutes = require('./routes/leaderboard');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

app.use('/api/leaderboard', leaderboardRoutes);

app.get('/api/tournaments', (req, res) => {
  const data = matchManager.getTournaments();
  res.json({ success: true, data });
});

const matchManager = new MatchManager(io);

io.on('connection', (socket) => {
  console.log(`Підключено: ${socket.id}`);

  socket.on('register', ({ playerName }) => {
    const playerId = uuidv4();
    const player = db.getOrCreatePlayer(playerId, playerName);
    socket.playerId = playerId;
    socket.playerName = playerName;
    socket.emit('registered', { playerId, playerName });
    console.log(`Гравець: ${playerName} (${playerId})`);
  });

  socket.on('getRooms', () => {
    socket.emit('roomsList', matchManager.getRooms());
  });

  socket.on('createRoom', ({ roomName, maxPlayers }) => {
    const room = matchManager.createRoom(roomName || `Кімната гравця`, maxPlayers || 4);
    socket.emit('roomCreated', { roomId: room.id, roomName: room.name });
    io.emit('roomsUpdated', matchManager.getRooms());
  });

  socket.on('joinRoom', ({ roomId }) => {
    if (!socket.playerId) {
      socket.emit('error', { message: 'Спочатку зареєструйтесь' });
      return;
    }

    const success = matchManager.joinRoom(socket.id, roomId, socket.playerId, socket.playerName);
    if (!success) {
      socket.emit('error', { message: 'Не вдалось приєднатись до кімнати' });
      return;
    }

    socket.join(roomId);
    socket.currentRoom = roomId;

    const room = matchManager.rooms.get(roomId);
    socket.emit('joinedRoom', {
      roomId,
      roomName: room.name,
      playerId: socket.playerId,
      socketId: socket.id,
    });

    io.to(roomId).emit('playerJoined', {
      name: socket.playerName,
      playerCount: room.players.size,
      maxPlayers: room.maxPlayers,
    });

    io.emit('roomsUpdated', matchManager.getRooms());
  });

  socket.on('playerInput', (input) => {
    matchManager.handleInput(socket.id, input);
  });

  socket.on('getTournaments', () => {
    socket.emit('tournamentsList', matchManager.getTournaments());
  });

  socket.on('createTournament', ({ name, maxPlayers }) => {
    if (!socket.playerId) return;
    const id = matchManager.createTournament(name || 'Турнір', maxPlayers || 4);
    io.emit('tournamentsUpdated', matchManager.getTournaments());
    socket.emit('tournamentCreated', { tournamentId: id });
  });

  socket.on('joinTournament', ({ tournamentId }) => {
    if (!socket.playerId) return;
    const success = matchManager.joinTournament(tournamentId, socket.playerId, socket.playerName);
    socket.emit('tournamentJoined', { success, tournamentId });
    io.emit('tournamentsUpdated', matchManager.getTournaments());
  });

  socket.on('disconnect', () => {
    console.log(`Відключено: ${socket.id}`);
    if (socket.currentRoom) {
      matchManager.leaveRoom(socket.id);
      io.emit('roomsUpdated', matchManager.getRooms());
    }
  });
});

const PORT = process.env.PORT || 4000;

db.initDb().then(() => {
  server.listen(PORT, () => {
    console.log(`Сервер запущено на порту ${PORT}`);
    console.log(`WebSocket: ws://localhost:${PORT}`);
    console.log(`REST API:  http://localhost:${PORT}/api`);
  });
}).catch(err => { console.error('DB init failed:', err); process.exit(1); });
