import React from 'react';

const formatTime = (ms) => {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const HUD = ({ gameState, mySocketId }) => {
  if (!gameState) return null;

  const me = gameState.players?.find(p => p.socketId === mySocketId);
  const sorted = [...(gameState.players || [])].sort((a, b) => b.kills - a.kills);

  return (
    <div style={styles.hud}>
      <div style={styles.timer}>
        <span style={styles.timerLabel}>ЧАС</span>
        <span style={{
          ...styles.timerValue,
          color: gameState.timeLeft < 30000 ? '#f87171' : '#4ade80',
        }}>
          {formatTime(gameState.timeLeft)}
        </span>
      </div>

      {me && (
        <div style={styles.myStats}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>ВБИВСТВА</span>
            <span style={styles.statValue}>{me.kills}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>СМЕРТІ</span>
            <span style={styles.statValue}>{me.deaths}</span>
          </div>
          <div style={styles.hpBar}>
            <span style={styles.statLabel}>HP</span>
            <div style={styles.hpTrack}>
              {[...Array(me.maxHp)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.hpSegment,
                    background: i < me.hp ? '#4ade80' : '#1f2937',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Таблиця рахунку */}
      <div style={styles.scoreboard}>
        <div style={styles.scoreTitle}>РАХУНОК</div>
        {sorted.map((p, i) => (
          <div
            key={p.socketId}
            style={{
              ...styles.scoreRow,
              background: p.socketId === mySocketId ? 'rgba(74,222,128,0.1)' : 'transparent',
              borderLeft: p.socketId === mySocketId ? '2px solid #4ade80' : '2px solid transparent',
            }}
          >
            <span style={styles.scoreRank}>#{i + 1}</span>
            <span style={{ ...styles.scoreName, color: p.color }}>{p.name}</span>
            <span style={styles.scoreKills}>{p.kills}K</span>
            <span style={styles.scoreDeaths}>{p.deaths}D</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  hud: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '200px',
    fontFamily: '"Courier New", monospace',
    color: '#e5e7eb',
  },
  timer: {
    background: 'rgba(17,24,39,0.9)',
    border: '1px solid #374151',
    borderRadius: '8px',
    padding: '12px',
    textAlign: 'center',
  },
  timerLabel: { display: 'block', fontSize: '10px', color: '#6b7280', letterSpacing: '2px' },
  timerValue: { display: 'block', fontSize: '28px', fontWeight: 'bold', marginTop: '4px' },
  myStats: {
    background: 'rgba(17,24,39,0.9)',
    border: '1px solid #374151',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  statItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { fontSize: '10px', color: '#6b7280', letterSpacing: '1px' },
  statValue: { fontSize: '18px', fontWeight: 'bold', color: '#f9fafb' },
  hpBar: { display: 'flex', flexDirection: 'column', gap: '4px' },
  hpTrack: { display: 'flex', gap: '4px' },
  hpSegment: { flex: 1, height: '12px', borderRadius: '2px', transition: 'all 0.2s' },
  scoreboard: {
    background: 'rgba(17,24,39,0.9)',
    border: '1px solid #374151',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  scoreTitle: { fontSize: '10px', color: '#6b7280', letterSpacing: '2px', marginBottom: '6px' },
  scoreRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 6px',
    borderRadius: '4px',
    fontSize: '12px',
  },
  scoreRank: { color: '#6b7280', width: '20px' },
  scoreName: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  scoreKills: { color: '#4ade80', width: '28px', textAlign: 'right' },
  scoreDeaths: { color: '#f87171', width: '28px', textAlign: 'right' },
};

export default HUD;
