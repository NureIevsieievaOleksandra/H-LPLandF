import React, { useState, useEffect, useCallback, useRef } from 'react';
import socket from './socket';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import Lobby from './components/Lobby';
import Leaderboard from './components/Leaderboard';
import Tournament from './components/Tournament';

const SCREEN = {
  REGISTER: 'register',
  LOBBY: 'lobby',
  GAME: 'game',
  LEADERBOARD: 'leaderboard',
  TOURNAMENT: 'tournament',
};

function App() {
  const [screen, setScreen] = useState(SCREEN.REGISTER);
  const [playerName, setPlayerName] = useState('');
  const [playerId, setPlayerId] = useState(null);
  const [socketId, setSocketId] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [notification, setNotification] = useState(null);

  const keysRef = useRef({});

  useEffect(() => {
    socket.connect();

    socket.on('connect', () => setSocketId(socket.id));

    socket.on('registered', ({ playerId }) => {
      setPlayerId(playerId);
      setScreen(SCREEN.LOBBY);
    });

    socket.on('gameState', (state) => {
      setGameState(state);
    });

    socket.on('matchStart', () => {
      setMatchResult(null);
    });

    socket.on('matchEnd', (result) => {
      setMatchResult(result);
      setGameState(prev => prev ? { ...prev, status: 'finished' } : prev);
    });

    socket.on('tournamentMatchReady', ({ roomId, roomName }) => {
      setCurrentRoom({ id: roomId, name: roomName });
      setMatchResult(null);
      setGameState(null);
      setScreen(SCREEN.GAME);
      showNotification(`Турнірний матч розпочато!`);
    });

    socket.on('tournamentBye', ({ playerName }) => {
      showNotification(`${playerName} отримує bye — автоперехід у наступний раунд`);
    });

    socket.on('playerJoined', ({ name, playerCount, maxPlayers }) => {
      showNotification(`${name} приєднався (${playerCount}/${maxPlayers})`);
    });

    socket.on('playerLeft', () => {
      showNotification('Гравець покинув кімнату');
    });

    socket.on('error', ({ message }) => {
      showNotification(message, 'error');
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (screen !== SCREEN.GAME) return;

    const keyMap = {
      ArrowUp: 'up', KeyW: 'up',
      ArrowDown: 'down', KeyS: 'down',
      ArrowLeft: 'left', KeyA: 'left',
      ArrowRight: 'right', KeyD: 'right',
      Space: 'shoot',
    };

    const sendInput = () => {
      const input = {
        up: !!keysRef.current['up'],
        down: !!keysRef.current['down'],
        left: !!keysRef.current['left'],
        right: !!keysRef.current['right'],
        shoot: !!keysRef.current['shoot'],
      };
      socket.emit('playerInput', input);
    };

    const onKeyDown = (e) => {
      const action = keyMap[e.code];
      if (action) {
        e.preventDefault();
        if (!keysRef.current[action]) {
          keysRef.current[action] = true;
          sendInput();
        }
      }
    };

    const onKeyUp = (e) => {
      const action = keyMap[e.code];
      if (action) {
        keysRef.current[action] = false;
        sendInput();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [screen]);

  const showNotification = (text, type = 'info') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleRegister = () => {
    const name = playerName.trim();
    if (!name || name.length < 2) {
      showNotification('Введіть ім\'я (мін. 2 символи)', 'error');
      return;
    }
    socket.emit('register', { playerName: name });
  };

  const handleJoinRoom = useCallback((roomId, roomName) => {
    setCurrentRoom({ id: roomId, name: roomName });
    setMatchResult(null);
    setGameState(null);
    setScreen(SCREEN.GAME);
  }, []);

  const handleLeaveGame = () => {
    keysRef.current = {};
    setScreen(SCREEN.LOBBY);
    setCurrentRoom(null);
    setGameState(null);
    setMatchResult(null);
  };

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <div style={styles.logo}>TANKS</div>
        {screen !== SCREEN.REGISTER && (
          <div style={styles.nav}>
            <button style={{ ...styles.navBtn, ...(screen === SCREEN.LOBBY ? styles.navBtnActive : {}) }}
              onClick={() => setScreen(SCREEN.LOBBY)}>ЛОБІ</button>
            <button style={{ ...styles.navBtn, ...(screen === SCREEN.LEADERBOARD ? styles.navBtnActive : {}) }}
              onClick={() => setScreen(SCREEN.LEADERBOARD)}>РЕЙТИНГ</button>
            <button style={{ ...styles.navBtn, ...(screen === SCREEN.TOURNAMENT ? styles.navBtnActive : {}) }}
              onClick={() => setScreen(SCREEN.TOURNAMENT)}>ТУРНІРИ</button>
          </div>
        )}
        {playerId && (
          <div style={styles.playerInfo}>
            <span style={{ color: '#4ade80' }}>{playerName}</span>
          </div>
        )}
      </div>

      {notification && (
        <div style={{
          ...styles.notification,
          background: notification.type === 'error' ? 'rgba(248,113,113,0.15)' : 'rgba(74,222,128,0.1)',
          borderColor: notification.type === 'error' ? '#f87171' : '#4ade80',
          color: notification.type === 'error' ? '#f87171' : '#4ade80',
        }}>
          {notification.text}
        </div>
      )}

      <div style={styles.content}>

        {screen === SCREEN.REGISTER && (
          <div style={styles.registerBox}>
            <div style={styles.registerTitle}>TANKS</div>
            <div style={styles.registerForm}>
              <input
                style={styles.registerInput}
                placeholder="Ваш нікнейм..."
                value={playerName}
                maxLength={20}
                onChange={e => setPlayerName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRegister()}
                autoFocus
              />
              <button style={styles.registerBtn} onClick={handleRegister}>
                ВСТУПИТИ В БІЙ
              </button>
            </div>
            <div style={styles.registerHints}>
              <span>⬆⬇ Рух</span>
              <span>⬅➡ Поворот</span>
              <span>ПРОБІЛ Вогонь</span>
            </div>
          </div>
        )}

        {screen === SCREEN.LOBBY && (
          <Lobby onJoinRoom={handleJoinRoom} />
        )}

        {screen === SCREEN.GAME && (
          <div style={styles.gameScreen}>
            <div style={styles.gameHeader}>
              <div style={styles.roomTitle}>
                {currentRoom?.name}
                {gameState?.status === 'waiting' && (
                  <span style={styles.waitingBadge}>Очікування гравців...</span>
                )}
              </div>
              <button style={styles.leaveBtn} onClick={handleLeaveGame}>
                ← Вийти
              </button>
            </div>

            <div style={styles.gameLayout}>
              <GameCanvas gameState={gameState} mySocketId={socketId} />
              <HUD gameState={gameState} mySocketId={socketId} />
            </div>

            {/* Результат матчу */}
            {matchResult && (
              <div style={styles.resultOverlay}>
                <div style={styles.resultBox}>
                  <div style={styles.resultTitle}>
                    {matchResult.winner ? 'МАТЧ ЗАВЕРШЕНО' : 'ЧАС ВИЙШОВ'}
                  </div>
                  {matchResult.winner && (
                    <div style={styles.resultWinner}>
                      Переможець: <span style={{ color: '#4ade80' }}>{matchResult.winner.name}</span>
                      <span style={{ color: '#9ca3af', fontSize: '16px' }}> ({matchResult.winner.kills} вбивств)</span>
                    </div>
                  )}
                  <div style={styles.resultStats}>
                    {[...(matchResult.playerStats || [])].sort((a, b) => b.kills - a.kills).map((p, i) => (
                      <div key={i} style={{
                        ...styles.resultPlayer,
                        color: p.won ? '#4ade80' : '#9ca3af',
                      }}>
                        {p.won ? '🏆' : `#${i + 1}`} {p.name} — {p.kills}K / {p.deaths}D
                      </div>
                    ))}
                  </div>
                  <button style={styles.resultBtn} onClick={handleLeaveGame}>
                    ← До лобі
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {screen === SCREEN.LEADERBOARD && <Leaderboard />}

        {screen === SCREEN.TOURNAMENT && <Tournament />}
      </div>
    </div>
  );
}

const styles = {
  app: {
    minHeight: '100vh',
    background: '#0d1117',
    color: '#f9fafb',
    fontFamily: '"Courier New", monospace',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 24px',
    borderBottom: '1px solid #1f2937',
    background: 'rgba(17,24,39,0.9)',
    backdropFilter: 'blur(10px)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  logo: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#4ade80',
    letterSpacing: '3px',
  },
  nav: { display: 'flex', gap: '8px' },
  navBtn: {
    background: 'transparent',
    border: '1px solid #374151',
    color: '#9ca3af',
    borderRadius: '6px',
    padding: '7px 16px',
    cursor: 'pointer',
    fontFamily: '"Courier New", monospace',
    fontSize: '11px',
    letterSpacing: '2px',
    transition: 'all 0.2s',
  },
  navBtnActive: {
    borderColor: '#4ade80',
    color: '#4ade80',
    background: 'rgba(74,222,128,0.08)',
  },
  playerInfo: {
    fontSize: '13px',
    color: '#9ca3af',
  },
  notification: {
    position: 'fixed',
    top: '70px',
    left: '50%',
    transform: 'translateX(-50%)',
    border: '1px solid',
    borderRadius: '8px',
    padding: '10px 24px',
    fontSize: '13px',
    zIndex: 200,
    letterSpacing: '1px',
    backdropFilter: 'blur(10px)',
  },
  content: {
    flex: 1,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '40px 24px',
  },
  // Register
  registerBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
    marginTop: '60px',
  },
  registerTitle: {
    fontSize: '52px',
    fontWeight: 'bold',
    color: '#4ade80',
    letterSpacing: '8px',
  },
  registerSubtitle: {
    color: '#6b7280',
    letterSpacing: '4px',
    fontSize: '13px',
  },
  registerForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '300px',
  },
  registerInput: {
    background: '#111827',
    border: '2px solid #374151',
    borderRadius: '10px',
    color: '#f9fafb',
    padding: '14px 18px',
    fontSize: '16px',
    fontFamily: '"Courier New", monospace',
    textAlign: 'center',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  registerBtn: {
    background: '#4ade80',
    color: '#000',
    border: 'none',
    borderRadius: '10px',
    padding: '14px',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: '"Courier New", monospace',
    letterSpacing: '2px',
    transition: 'all 0.2s',
  },
  registerHints: {
    display: 'flex',
    gap: '20px',
    color: '#4b5563',
    fontSize: '12px',
    letterSpacing: '1px',
  },
  gameScreen: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    width: '100%',
    maxWidth: '1060px',
  },
  gameHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomTitle: {
    fontSize: '16px',
    color: '#9ca3af',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  waitingBadge: {
    background: 'rgba(250,204,21,0.1)',
    border: '1px solid #facc15',
    color: '#facc15',
    borderRadius: '20px',
    padding: '4px 12px',
    fontSize: '12px',
    animation: 'pulse 2s infinite',
  },
  leaveBtn: {
    background: 'transparent',
    border: '1px solid #374151',
    color: '#9ca3af',
    borderRadius: '6px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontFamily: '"Courier New", monospace',
    fontSize: '12px',
  },
  gameLayout: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
  },
  // Match result
  resultOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,
    backdropFilter: 'blur(4px)',
  },
  resultBox: {
    background: '#111827',
    border: '2px solid #374151',
    borderRadius: '16px',
    padding: '40px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    minWidth: '360px',
  },
  resultTitle: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#facc15',
    letterSpacing: '3px',
  },
  resultWinner: {
    fontSize: '20px',
    color: '#f9fafb',
  },
  resultStats: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '16px',
    background: 'rgba(17,24,39,0.5)',
    borderRadius: '8px',
  },
  resultPlayer: {
    fontSize: '14px',
    letterSpacing: '1px',
  },
  resultBtn: {
    background: '#4ade80',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: '"Courier New", monospace',
    letterSpacing: '2px',
    marginTop: '8px',
  },
};

export default App;
