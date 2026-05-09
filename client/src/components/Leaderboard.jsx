import React, { useState, useEffect } from 'react';

const Leaderboard = () => {
  const [leaders, setLeaders] = useState([]);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('leaders');

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(d => d.success && setLeaders(d.data));

    fetch('/api/leaderboard/history')
      .then(r => r.json())
      .then(d => d.success && setHistory(d.data));
  }, []);

  const formatTime = (ts) => {
    if (!ts) return '—';
    return new Date(ts * 1000).toLocaleString('uk-UA', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🏆 ТАБЛИЦЯ РЕКОРДІВ</h2>

      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(tab === 'leaders' ? styles.tabActive : {}) }}
          onClick={() => setTab('leaders')}
        >
          ЛІДЕРИ
        </button>
        <button
          style={{ ...styles.tab, ...(tab === 'history' ? styles.tabActive : {}) }}
          onClick={() => setTab('history')}
        >
          МАТЧІ
        </button>
      </div>

      {tab === 'leaders' && (
        <div style={styles.table}>
          <div style={styles.tableHeader}>
            <span style={styles.colRank}>#</span>
            <span style={styles.colName}>Гравець</span>
            <span style={styles.colNum}>Вбивства</span>
            <span style={styles.colNum}>Смерті</span>
            <span style={styles.colNum}>Перемоги</span>
            <span style={styles.colNum}>Матчі</span>
            <span style={styles.colNum}>Винрейт</span>
          </div>
          {leaders.length === 0 ? (
            <div style={styles.empty}>Ще немає даних. Зіграйте перший матч!</div>
          ) : (
            leaders.map((p, i) => (
              <div key={i} style={{
                ...styles.tableRow,
                background: i === 0 ? 'rgba(250,204,21,0.05)' : i === 1 ? 'rgba(209,213,219,0.05)' : i === 2 ? 'rgba(180,120,60,0.05)' : 'transparent',
              }}>
                <span style={{
                  ...styles.colRank,
                  color: i === 0 ? '#facc15' : i === 1 ? '#d1d5db' : i === 2 ? '#b47c3c' : '#6b7280',
                  fontWeight: i < 3 ? 'bold' : 'normal',
                }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
                <span style={{ ...styles.colName, color: '#f9fafb' }}>{p.player_name}</span>
                <span style={{ ...styles.colNum, color: '#4ade80' }}>{p.total_kills}</span>
                <span style={{ ...styles.colNum, color: '#f87171' }}>{p.total_deaths}</span>
                <span style={{ ...styles.colNum, color: '#60a5fa' }}>{p.total_wins}</span>
                <span style={{ ...styles.colNum, color: '#9ca3af' }}>{p.total_matches}</span>
                <span style={{ ...styles.colNum, color: '#c084fc' }}>{p.win_rate}%</span>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'history' && (
        <div style={styles.table}>
          <div style={styles.tableHeader}>
            <span style={{ flex: 2 }}>Кімната</span>
            <span style={styles.colNum}>Гравців</span>
            <span style={{ flex: 1.5, textAlign: 'center' }}>Переможець</span>
            <span style={{ flex: 1.5, textAlign: 'center' }}>Дата</span>
          </div>
          {history.length === 0 ? (
            <div style={styles.empty}>Ще немає завершених матчів.</div>
          ) : (
            history.map((m, i) => (
              <div key={i} style={styles.tableRow}>
                <span style={{ flex: 2, color: '#f9fafb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.room_name}</span>
                <span style={{ ...styles.colNum, color: '#9ca3af' }}>👥 {m.player_count}</span>
                <span style={{ flex: 1.5, textAlign: 'center', color: '#facc15' }}>
                  {m.winner_name ? `🏆 ${m.winner_name}` : '—'}
                </span>
                <span style={{ flex: 1.5, textAlign: 'center', color: '#6b7280', fontSize: '11px' }}>
                  {formatTime(m.ended_at)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '700px',
    width: '100%',
    fontFamily: '"Courier New", monospace',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  title: {
    color: '#facc15',
    fontSize: '22px',
    fontWeight: 'bold',
    letterSpacing: '4px',
    margin: 0,
  },
  tabs: { display: 'flex', gap: '8px' },
  tab: {
    background: 'transparent',
    border: '1px solid #374151',
    color: '#9ca3af',
    borderRadius: '6px',
    padding: '8px 20px',
    cursor: 'pointer',
    fontFamily: '"Courier New", monospace',
    fontSize: '12px',
    letterSpacing: '2px',
    transition: 'all 0.2s',
  },
  tabActive: {
    background: 'rgba(250,204,21,0.1)',
    borderColor: '#facc15',
    color: '#facc15',
  },
  table: {
    background: 'rgba(17,24,39,0.8)',
    border: '1px solid #374151',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 16px',
    background: 'rgba(55,65,81,0.4)',
    fontSize: '10px',
    letterSpacing: '2px',
    color: '#6b7280',
    borderBottom: '1px solid #374151',
  },
  tableRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(55,65,81,0.3)',
    fontSize: '13px',
    transition: 'background 0.15s',
  },
  colRank: { width: '40px', textAlign: 'center' },
  colName: { flex: 1, paddingLeft: '8px' },
  colNum: { width: '70px', textAlign: 'center' },
  empty: {
    color: '#6b7280',
    textAlign: 'center',
    padding: '32px',
    fontSize: '13px',
  },
};

export default Leaderboard;
