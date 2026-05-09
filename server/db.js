const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'game.db');

let db = null;

function saveDb() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function initDb() {
  if (db) return;
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
    CREATE TABLE IF NOT EXISTS leaderboard (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL UNIQUE,
      player_name TEXT NOT NULL,
      total_kills INTEGER DEFAULT 0,
      total_deaths INTEGER DEFAULT 0,
      total_wins INTEGER DEFAULT 0,
      total_matches INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      room_name TEXT NOT NULL,
      status TEXT DEFAULT 'waiting',
      winner_id TEXT,
      winner_name TEXT,
      started_at INTEGER,
      ended_at INTEGER,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
    CREATE TABLE IF NOT EXISTS match_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      player_name TEXT NOT NULL,
      kills INTEGER DEFAULT 0,
      deaths INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS tournaments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'waiting',
      max_players INTEGER DEFAULT 8,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
    CREATE TABLE IF NOT EXISTS tournament_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      player_name TEXT NOT NULL,
      wins INTEGER DEFAULT 0,
      eliminated INTEGER DEFAULT 0
    );
  `);

  saveDb();
  setInterval(saveDb, 30000);
}

function runQuery(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

function getOne(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function getAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

const getOrCreatePlayer = (id, name) => {
  const existing = getOne('SELECT * FROM players WHERE id = ?', [id]);
  if (existing) return existing;
  runQuery('INSERT OR IGNORE INTO players (id, name) VALUES (?, ?)', [id, name]);
  runQuery('INSERT OR IGNORE INTO leaderboard (player_id, player_name) VALUES (?, ?)', [id, name]);
  return getOne('SELECT * FROM players WHERE id = ?', [id]);
};

const getLeaderboard = (limit = 10) => {
  return getAll(`
    SELECT player_name, total_kills, total_deaths, total_wins, total_matches,
      CASE WHEN total_matches > 0 THEN ROUND(CAST(total_wins AS FLOAT) / total_matches * 100) ELSE 0 END as win_rate
    FROM leaderboard
    ORDER BY total_kills DESC, total_wins DESC
    LIMIT ?
  `, [limit]);
};

const updateLeaderboardAfterMatch = (playerStats) => {
  for (const s of playerStats) {
    runQuery(`
      UPDATE leaderboard SET
        total_kills = total_kills + ?,
        total_deaths = total_deaths + ?,
        total_wins = total_wins + ?,
        total_matches = total_matches + 1
      WHERE player_id = ?
    `, [s.kills, s.deaths, s.won ? 1 : 0, s.playerId]);
  }
};

const createMatch = (id, roomName) => {
  runQuery('INSERT INTO matches (id, room_name, status) VALUES (?, ?, ?)', [id, roomName, 'waiting']);
};

const startMatch = (id) => {
  runQuery("UPDATE matches SET status = 'active', started_at = strftime('%s','now') WHERE id = ?", [id]);
};

const endMatch = (id, winnerId, winnerName) => {
  runQuery("UPDATE matches SET status = 'finished', winner_id = ?, winner_name = ?, ended_at = strftime('%s','now') WHERE id = ?",
    [winnerId, winnerName, id]);
};

const addMatchPlayer = (matchId, playerId, playerName) => {
  const exists = getOne('SELECT id FROM match_players WHERE match_id = ? AND player_id = ?', [matchId, playerId]);
  if (!exists) {
    runQuery('INSERT INTO match_players (match_id, player_id, player_name) VALUES (?, ?, ?)', [matchId, playerId, playerName]);
  }
};

const updateMatchPlayerStats = (matchId, playerId, kills, deaths) => {
  runQuery('UPDATE match_players SET kills = ?, deaths = ? WHERE match_id = ? AND player_id = ?', [kills, deaths, matchId, playerId]);
};

const getMatchHistory = (limit = 20) => {
  return getAll(`
    SELECT m.id, m.room_name, m.status, m.winner_name,
      m.started_at, m.ended_at,
      COUNT(mp.id) as player_count
    FROM matches m
    LEFT JOIN match_players mp ON m.id = mp.match_id
    WHERE m.status = 'finished'
    GROUP BY m.id
    ORDER BY m.ended_at DESC
    LIMIT ?
  `, [limit]);
};

const getMatchDetails = (matchId) => {
  const match = getOne('SELECT * FROM matches WHERE id = ?', [matchId]);
  const players = getAll('SELECT * FROM match_players WHERE match_id = ?', [matchId]);
  return { match, players };
};

const createTournament = (id, name, maxPlayers) => {
  runQuery('INSERT INTO tournaments (id, name, max_players) VALUES (?, ?, ?)', [id, name, maxPlayers]);
};

const getTournaments = () => {
  return getAll(`
    SELECT t.id, t.name, t.status, t.max_players, t.created_at, COUNT(tp.id) as current_players
    FROM tournaments t
    LEFT JOIN tournament_players tp ON t.id = tp.tournament_id
    GROUP BY t.id
    ORDER BY t.created_at DESC
    LIMIT 20
  `);
};

const joinTournament = (tournamentId, playerId, playerName) => {
  const exists = getOne('SELECT id FROM tournament_players WHERE tournament_id = ? AND player_id = ?', [tournamentId, playerId]);
  if (!exists) {
    runQuery('INSERT INTO tournament_players (tournament_id, player_id, player_name) VALUES (?, ?, ?)', [tournamentId, playerId, playerName]);
  }
};

const getTournamentPlayers = (tournamentId) => {
  return getAll('SELECT * FROM tournament_players WHERE tournament_id = ?', [tournamentId]);
};

const updateTournamentStatus = (tournamentId, status) => {
  runQuery('UPDATE tournaments SET status = ? WHERE id = ?', [status, tournamentId]);
};

const recordTournamentWin = (tournamentId, playerId) => {
  runQuery('UPDATE tournament_players SET wins = wins + 1 WHERE tournament_id = ? AND player_id = ?', [tournamentId, playerId]);
};

const eliminateFromTournament = (tournamentId, playerId) => {
  runQuery('UPDATE tournament_players SET eliminated = 1 WHERE tournament_id = ? AND player_id = ?', [tournamentId, playerId]);
};

module.exports = {
  initDb,
  getOrCreatePlayer,
  getLeaderboard,
  updateLeaderboardAfterMatch,
  createMatch,
  startMatch,
  endMatch,
  addMatchPlayer,
  updateMatchPlayerStats,
  getMatchHistory,
  getMatchDetails,
  createTournament,
  getTournaments,
  joinTournament,
  getTournamentPlayers,
  updateTournamentStatus,
  recordTournamentWin,
  eliminateFromTournament,
};
