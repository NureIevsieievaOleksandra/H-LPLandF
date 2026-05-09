const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const TANK_SIZE = 30;
const BULLET_SIZE = 6;
const TANK_SPEED = 3;
const BULLET_SPEED = 7;
const TANK_HP = 3;
const RESPAWN_TIME = 3000;
const MATCH_DURATION = 180000; // 3 хвилини
const WIN_KILLS = 10; // перший хто набрав 10 вбивств — переможець

const TANK_COLORS = ['#4ade80', '#f87171', '#60a5fa', '#facc15', '#c084fc', '#fb923c'];

const generateMap = () => {
  const walls = [];

  const wallDefs = [
    { x: 150, y: 100, w: 20, h: 120 },
    { x: 350, y: 80,  w: 120, h: 20 },
    { x: 600, y: 100, w: 20, h: 120 },
    { x: 100, y: 280, w: 120, h: 20 },
    { x: 580, y: 280, w: 120, h: 20 },
    { x: 300, y: 220, w: 20, h: 100 },
    { x: 500, y: 220, w: 20, h: 100 },
    { x: 150, y: 400, w: 20, h: 120 },
    { x: 350, y: 450, w: 120, h: 20 },
    { x: 600, y: 400, w: 20, h: 120 },
    { x: 350, y: 300, w: 20, h: 80 },
  ];

  wallDefs.forEach((w, i) => {
    walls.push({ id: `wall_${i}`, ...w });
  });

  return walls;
};

const WALLS = generateMap();

const SPAWN_POINTS = [
  { x: 50,  y: 50  },
  { x: 720, y: 50  },
  { x: 50,  y: 520 },
  { x: 720, y: 520 },
  { x: 380, y: 50  },
  { x: 380, y: 520 },
];

const getSpawnPoint = (index) => {
  const sp = SPAWN_POINTS[index % SPAWN_POINTS.length];
  return {
    x: sp.x + Math.random() * 20 - 10,
    y: sp.y + Math.random() * 20 - 10,
  };
};

const rectsCollide = (ax, ay, aw, ah, bx, by, bw, bh) => {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
};

const collidesWithWalls = (x, y, size) => {
  for (const wall of WALLS) {
    if (rectsCollide(x - size / 2, y - size / 2, size, size, wall.x, wall.y, wall.w, wall.h)) {
      return true;
    }
  }
  return false;
};

const outOfBounds = (x, y, size) => {
  return x - size / 2 < 0 || x + size / 2 > GAME_WIDTH || y - size / 2 < 0 || y + size / 2 > GAME_HEIGHT;
};

class GameRoom {
  constructor(id, name, maxPlayers = 4) {
    this.id = id;
    this.name = name;
    this.maxPlayers = maxPlayers;
    this.players = new Map(); // socketId -> player
    this.bullets = new Map(); // bulletId -> bullet
    this.status = 'waiting'; // waiting | active | finished
    this.startTime = null;
    this.endTime = null;
    this.bulletIdCounter = 0;
    this.walls = WALLS;
    this.gameLoop = null;
    this.matchId = null;
    this.tournamentId = null;
  }

  addPlayer(socketId, playerId, playerName) {
    if (this.players.size >= this.maxPlayers) return false;

    const spawnIndex = this.players.size;
    const spawn = getSpawnPoint(spawnIndex);
    const colorIndex = this.players.size % TANK_COLORS.length;

    this.players.set(socketId, {
      socketId,
      playerId,
      name: playerName,
      x: spawn.x,
      y: spawn.y,
      angle: 0,
      hp: TANK_HP,
      maxHp: TANK_HP,
      kills: 0,
      deaths: 0,
      alive: true,
      respawnTimer: null,
      color: TANK_COLORS[colorIndex],
      input: { up: false, down: false, left: false, right: false, shoot: false },
      lastShot: 0,
    });

    return true;
  }

  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (player && player.respawnTimer) clearTimeout(player.respawnTimer);
    this.players.delete(socketId);
  }

  handleInput(socketId, input) {
    const player = this.players.get(socketId);
    if (player && player.alive) {
      player.input = { ...player.input, ...input };
    }
  }

  spawnPlayer(socketId) {
    const player = this.players.get(socketId);
    if (!player) return;

    const spawnIndex = [...this.players.keys()].indexOf(socketId);
    const spawn = getSpawnPoint(spawnIndex);
    player.x = spawn.x;
    player.y = spawn.y;
    player.hp = TANK_HP;
    player.alive = true;
    player.angle = 0;
  }

  tick() {
    if (this.status !== 'active') return null;

    const now = Date.now();

    if (now - this.startTime > MATCH_DURATION) {
      return this.endMatch();
    }

    for (const [socketId, player] of this.players) {
      if (!player.alive) continue;

      const { input } = player;
      let newX = player.x;
      let newY = player.y;

      if (input.up) {
        newX += Math.cos(player.angle) * TANK_SPEED;
        newY += Math.sin(player.angle) * TANK_SPEED;
      }
      if (input.down) {
        newX -= Math.cos(player.angle) * TANK_SPEED;
        newY -= Math.sin(player.angle) * TANK_SPEED;
      }
      if (input.left) player.angle -= 0.05;
      if (input.right) player.angle += 0.05;

      if (!collidesWithWalls(newX, newY, TANK_SIZE) && !outOfBounds(newX, newY, TANK_SIZE)) {
        player.x = newX;
        player.y = newY;
      }

      if (input.shoot && now - player.lastShot > 400) {
        player.lastShot = now;
        const bulletId = `b_${this.bulletIdCounter++}`;
        this.bullets.set(bulletId, {
          id: bulletId,
          ownerId: socketId,
          ownerName: player.name,
          x: player.x + Math.cos(player.angle) * (TANK_SIZE / 2 + 5),
          y: player.y + Math.sin(player.angle) * (TANK_SIZE / 2 + 5),
          angle: player.angle,
          createdAt: now,
        });
      }
    }

    const bulletsToRemove = [];
    for (const [bulletId, bullet] of this.bullets) {
      bullet.x += Math.cos(bullet.angle) * BULLET_SPEED;
      bullet.y += Math.sin(bullet.angle) * BULLET_SPEED;

      if (outOfBounds(bullet.x, bullet.y, BULLET_SIZE) || collidesWithWalls(bullet.x, bullet.y, BULLET_SIZE)) {
        bulletsToRemove.push(bulletId);
        continue;
      }

      if (now - bullet.createdAt > 3000) {
        bulletsToRemove.push(bulletId);
        continue;
      }

      for (const [socketId, player] of this.players) {
        if (!player.alive) continue;
        if (socketId === bullet.ownerId) continue;

        if (rectsCollide(
          bullet.x - BULLET_SIZE / 2, bullet.y - BULLET_SIZE / 2, BULLET_SIZE, BULLET_SIZE,
          player.x - TANK_SIZE / 2, player.y - TANK_SIZE / 2, TANK_SIZE, TANK_SIZE
        )) {
          player.hp -= 1;
          bulletsToRemove.push(bulletId);

          if (player.hp <= 0) {
            player.alive = false;
            player.deaths += 1;

            const shooter = this.players.get(bullet.ownerId);
            if (shooter) {
              shooter.kills += 1;

              if (shooter.kills >= WIN_KILLS) {
                return this.endMatch(bullet.ownerId);
              }
            }

            player.respawnTimer = setTimeout(() => {
              this.spawnPlayer(socketId);
            }, RESPAWN_TIME);
          }
          break;
        }
      }
    }

    bulletsToRemove.forEach(id => this.bullets.delete(id));

    return null;
  }

  endMatch(winnerId = null) {
    this.status = 'finished';
    this.endTime = Date.now();

    let winner = null;
    if (winnerId) {
      winner = this.players.get(winnerId);
    } else {
      let maxKills = -1;
      for (const player of this.players.values()) {
        if (player.kills > maxKills) {
          maxKills = player.kills;
          winner = player;
        }
      }
    }

    const playerStats = [...this.players.values()].map(p => ({
      playerId: p.playerId,
      socketId: p.socketId,
      name: p.name,
      kills: p.kills,
      deaths: p.deaths,
      won: winner && p.socketId === winner.socketId,
    }));

    return {
      winner,
      playerStats,
      duration: this.endTime - this.startTime,
    };
  }

  startMatch() {
    this.status = 'active';
    this.startTime = Date.now();
  }

  getState() {
    const playersArr = [...this.players.values()].map(p => ({
      socketId: p.socketId,
      playerId: p.playerId,
      name: p.name,
      x: p.x,
      y: p.y,
      angle: p.angle,
      hp: p.hp,
      maxHp: p.maxHp,
      kills: p.kills,
      deaths: p.deaths,
      alive: p.alive,
      color: p.color,
    }));

    const bulletsArr = [...this.bullets.values()].map(b => ({
      id: b.id,
      x: b.x,
      y: b.y,
      angle: b.angle,
    }));

    return {
      players: playersArr,
      bullets: bulletsArr,
      status: this.status,
      timeLeft: this.startTime ? Math.max(0, MATCH_DURATION - (Date.now() - this.startTime)) : MATCH_DURATION,
      walls: this.walls,
    };
  }

  isEmpty() {
    return this.players.size === 0;
  }

  isFull() {
    return this.players.size >= this.maxPlayers;
  }

  canStart() {
    return this.players.size >= 2 && this.status === 'waiting';
  }
}

module.exports = {
  GameRoom,
  GAME_WIDTH,
  GAME_HEIGHT,
  TANK_SIZE,
  WIN_KILLS,
  MATCH_DURATION,
};
