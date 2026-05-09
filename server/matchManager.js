const { v4: uuidv4 } = require('uuid');
const { GameRoom } = require('./gameLogic');
const db = require('./db');

class MatchManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
    this.playerRoom = new Map();
    this.tournaments = new Map();
    this.gameLoops = new Map();
  }

  createRoom(name, maxPlayers = 4) {
    const id = uuidv4();
    const room = new GameRoom(id, name, maxPlayers);
    room.matchId = uuidv4();
    this.rooms.set(id, room);
    db.createMatch(room.matchId, name);
    return room;
  }

  getRooms() {
    return [...this.rooms.values()].filter(r => r.status !== 'finished').map(r => ({
      id: r.id,
      name: r.name,
      playerCount: r.players.size,
      maxPlayers: r.maxPlayers,
      status: r.status,
    }));
  }

  joinRoom(socketId, roomId, playerId, playerName) {
    const room = this.rooms.get(roomId);
    if (!room || room.isFull() || room.status === 'finished') return false;

    const success = room.addPlayer(socketId, playerId, playerName);
    if (!success) return false;

    this.playerRoom.set(socketId, roomId);
    db.addMatchPlayer(room.matchId, playerId, playerName);

    if (room.canStart() && room.status === 'waiting') {
      setTimeout(() => this.startRoom(roomId), 3000);
    }

    return true;
  }

  leaveRoom(socketId) {
    const roomId = this.playerRoom.get(socketId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (room) {
      room.removePlayer(socketId);
      this.io.to(roomId).emit('playerLeft', { socketId });

      if (room.isEmpty()) {
        this.stopGameLoop(roomId);
        this.rooms.delete(roomId);
      }
    }

    this.playerRoom.delete(socketId);
  }

  startRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'waiting' || room.players.size < 2) return;

    room.startMatch();
    db.startMatch(room.matchId);
    this.io.to(roomId).emit('matchStart', { matchId: room.matchId });
    this.startGameLoop(roomId);
  }

  startGameLoop(roomId) {
    const interval = setInterval(() => {
      const room = this.rooms.get(roomId);
      if (!room) {
        this.stopGameLoop(roomId);
        return;
      }

      const result = room.tick();
      this.io.to(roomId).emit('gameState', room.getState());

      if (result) {
        this.stopGameLoop(roomId);
        this.handleMatchEnd(roomId, result);
      }
    }, 1000 / 30);

    this.gameLoops.set(roomId, interval);
  }

  stopGameLoop(roomId) {
    const interval = this.gameLoops.get(roomId);
    if (interval) {
      clearInterval(interval);
      this.gameLoops.delete(roomId);
    }
  }

  handleMatchEnd(roomId, result) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const { winner, playerStats } = result;

    if (winner) {
      db.endMatch(room.matchId, winner.playerId, winner.name);
    }

    db.updateLeaderboardAfterMatch(playerStats);
    for (const ps of playerStats) {
      db.updateMatchPlayerStats(room.matchId, ps.playerId, ps.kills, ps.deaths);
    }

    this.io.to(roomId).emit('matchEnd', {
      winner: winner ? { name: winner.name, kills: winner.kills } : null,
      playerStats,
    });

    if (room.tournamentId) {
      this.handleTournamentRoundEnd(room.tournamentId, roomId, winner);
    }

    setTimeout(() => {
      this.rooms.delete(roomId);
      for (const [sid, rid] of this.playerRoom) {
        if (rid === roomId) this.playerRoom.delete(sid);
      }
    }, 10000);
  }

  handleInput(socketId, input) {
    const roomId = this.playerRoom.get(socketId);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (room) room.handleInput(socketId, input);
  }

  createTournament(name, maxPlayers = 8) {
    const id = uuidv4();
    db.createTournament(id, name, maxPlayers);

    this.tournaments.set(id, {
      id,
      name,
      maxPlayers,
      status: 'waiting',
      players: [],
      bracket: [],
      currentRound: 0,
      pendingRoomIds: new Set(),
    });

    return id;
  }

  joinTournament(tournamentId, playerId, playerName) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament || tournament.status !== 'waiting') return false;
    if (tournament.players.find(p => p.playerId === playerId)) return false;
    if (tournament.players.length >= tournament.maxPlayers) return false;

    tournament.players.push({ playerId, playerName, wins: 0, eliminated: false });
    db.joinTournament(tournamentId, playerId, playerName);

    if (tournament.players.length >= tournament.maxPlayers) {
      setTimeout(() => this.startTournament(tournamentId), 3000);
    }

    return true;
  }

  startTournament(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament || tournament.players.length < 2) return;

    tournament.status = 'active';
    db.updateTournamentStatus(tournamentId, 'active');

    const shuffled = [...tournament.players].sort(() => Math.random() - 0.5);
    tournament.bracket = shuffled;

    this.io.emit('tournamentStarted', { tournamentId, bracket: shuffled });
    this.startNextTournamentRound(tournamentId);
  }

  startNextTournamentRound(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return;

    const activePlayers = tournament.bracket.filter(p => !p.eliminated);

    if (activePlayers.length <= 1) {
      tournament.status = 'finished';
      db.updateTournamentStatus(tournamentId, 'finished');
      this.io.emit('tournamentFinished', {
        tournamentId,
        winner: activePlayers[0] || null,
      });
      return;
    }

    tournament.currentRound += 1;
    tournament.pendingRoomIds = new Set();

    const matches = [];

    for (let i = 0; i + 1 < activePlayers.length; i += 2) {
      const p1 = activePlayers[i];
      const p2 = activePlayers[i + 1];
      const roomName = `Турнір R${tournament.currentRound} Матч ${Math.ceil((i + 1) / 2)}`;
      const room = this.createRoom(roomName, 2);
      room.tournamentId = tournamentId;
      tournament.pendingRoomIds.add(room.id);
      matches.push({ roomId: room.id, players: [p1, p2] });

      this._autoJoinTournamentPlayers(room, p1, p2);
    }

    if (activePlayers.length % 2 === 1) {
      const byePlayer = activePlayers[activePlayers.length - 1];
      this.io.emit('tournamentBye', {
        tournamentId,
        playerName: byePlayer.playerName,
      });

      if (tournament.pendingRoomIds.size === 0) {
        setTimeout(() => this.startNextTournamentRound(tournamentId), 3000);
      }
    }

    this.io.emit('tournamentRound', {
      tournamentId,
      round: tournament.currentRound,
      matches,
    });
  }

  _autoJoinTournamentPlayers(room, p1, p2) {
    for (const [socketId, socket] of this.io.sockets.sockets) {
      if (socket.playerId !== p1.playerId && socket.playerId !== p2.playerId) continue;

      const success = this.joinRoom(socketId, room.id, socket.playerId, socket.playerName);
      if (success) {
        socket.join(room.id);
        socket.currentRoom = room.id;
        socket.emit('tournamentMatchReady', { roomId: room.id, roomName: room.name });
      }
    }
  }

  handleTournamentRoundEnd(tournamentId, roomId, winner) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    for (const player of tournament.bracket) {
      const inRoom = [...room.players.values()].find(p => p.playerId === player.playerId);
      if (!inRoom) continue;

      if (winner && inRoom.playerId === winner.playerId) {
        player.wins += 1;
        db.recordTournamentWin(tournamentId, player.playerId);
      } else {
        player.eliminated = true;
        db.eliminateFromTournament(tournamentId, player.playerId);
      }
    }

    if (tournament.pendingRoomIds) {
      tournament.pendingRoomIds.delete(roomId);

      if (tournament.pendingRoomIds.size === 0) {
        setTimeout(() => this.startNextTournamentRound(tournamentId), 5000);
      }
    }
  }

  getTournaments() {
    return db.getTournaments();
  }
}

module.exports = MatchManager;
