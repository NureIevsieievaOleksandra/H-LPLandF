import React, { useState, useEffect } from 'react';
import socket from '../socket';

const Tournament = () => {
  const [tournaments, setTournaments] = useState([]);
  const [newName, setNewName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    socket.emit('getTournaments');

    socket.on('tournamentsList', setTournaments);
    socket.on('tournamentsUpdated', setTournaments);
    socket.on('tournamentCreated', () => socket.emit('getTournaments'));
    socket.on('tournamentJoined', ({ success }) => {
      setNotification(success ? { text: 'Ви приєдналися до турніру!', type: 'success' } : { text: 'Не вдалось приєднатись', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    });
    socket.on('tournamentStarted', ({ tournamentId }) => {
      setNotification({ text: 'Турнір розпочато!', type: 'success' });
      setTimeout(() => setNotification(null), 4000);
    });
    socket.on('tournamentFinished', ({ winner }) => {
      setNotification({ text: `Переможець: ${winner?.playerName || 'Невідомо'}!`, type: 'success' });
      setTimeout(() => setNotification(null), 6000);
    });

    return () => {
      socket.off('tournamentsList');
      socket.off('tournamentsUpdated');
      socket.off('tournamentCreated');
      socket.off('tournamentJoined');
      socket.off('tournamentStarted');
      socket.off('tournamentFinished');
    };
  }, []);

  const handleCreate = () => {
    const name = newName.trim() || 'Турнір';
    socket.emit('createTournament', { name, maxPlayers });
    setNewName('');
  };

  const handleJoin = (id) => {
    socket.emit('joinTournament', { tournamentId: id });
  };

  const statusLabel = (status) => {
    if (status === 'waiting') return { text: 'Очікування', color: '#facc15' };
    if (status === 'active') return { text: 'Активний', color: '#4ade80' };
    return { text: 'Завершено', color: '#6b7280' };
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>ТУРНІРИ</h2>

      {notification && (
        <div style={{
          ...styles.notification,
          background: notification.type === 'success' ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
          borderColor: notification.type === 'success' ? '#4ade80' : '#f87171',
          color: notification.type === 'success' ? '#4ade80' : '#f87171',
        }}>
          {notification.text}
        </div>
      )}

      {/* Створити турнір */}
      <div style={styles.box}>
        <h3 style={styles.sectionTitle}>Створити турнір</h3>
        <div style={styles.row}>
          <input
            style={styles.input}
            placeholder="Назва турніру..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <select
            style={styles.select}
            value={maxPlayers}
            onChange={e => setMaxPlayers(Number(e.target.value))}
          >
            <option value={2}>2 гравці</option>
            <option value={4}>4 гравці</option>
            <option value={8}>8 гравців</option>
          </select>
          <button style={styles.btnCreate} onClick={handleCreate}>
            + Створити
          </button>
        </div>
        <p style={styles.note}>Турнір починається автоматично коли всі місця зайняті</p>
      </div>

      {/* Список турнірів */}
      <div style={styles.box}>
        <h3 style={styles.sectionTitle}>Активні турніри ({tournaments.length})</h3>
        {tournaments.length === 0 ? (
          <div style={styles.empty}>Немає турнірів. Будьте першим!</div>
        ) : (
          tournaments.map(t => {
            const st = statusLabel(t.status);
            const canJoin = t.status === 'waiting' && t.current_players < t.max_players;
            return (
              <div key={t.id} style={styles.card}>
                <div style={styles.cardLeft}>
                  <span style={styles.cardName}>{t.name}</span>
                  <span style={{ ...styles.cardStatus, color: st.color }}>{st.text}</span>
                </div>
                <div style={styles.cardRight}>
                  <div style={styles.progress}>
                    <div style={styles.progressTrack}>
                      <div style={{
                        ...styles.progressFill,
                        width: `${(t.current_players / t.max_players) * 100}%`,
                      }} />
                    </div>
                    <span style={styles.progressText}>
                      {t.current_players}/{t.max_players}
                    </span>
                  </div>
                  <button
                    style={{ ...styles.btnJoin, opacity: canJoin ? 1 : 0.4 }}
                    onClick={() => canJoin && handleJoin(t.id)}
                    disabled={!canJoin}
                  >
                    {canJoin ? 'Приєднатись' : t.status === 'waiting' ? 'Заповнено' : 'Розпочато'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Правила */}
      <div style={styles.rules}>
        <div style={styles.rulesTitle}>ПРАВИЛА ТУРНІРУ</div>
        <div style={styles.rulesList}>
          <div style={styles.rule}>• Гравці розбиваються на пари</div>
          <div style={styles.rule}>• Кожна пара грає 1 матч (до 10 вбивств)</div>
          <div style={styles.rule}>• Переможець йде далі по сітці</div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '600px',
    width: '100%',
    fontFamily: '"Courier New", monospace',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  title: {
    color: '#c084fc',
    fontSize: '22px',
    fontWeight: 'bold',
    letterSpacing: '4px',
    margin: 0,
  },
  notification: {
    border: '1px solid',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '14px',
    textAlign: 'center',
    animation: 'fadeIn 0.3s ease',
  },
  box: {
    background: 'rgba(17,24,39,0.8)',
    border: '1px solid #374151',
    borderRadius: '12px',
    padding: '20px',
  },
  sectionTitle: {
    color: '#9ca3af',
    fontSize: '11px',
    letterSpacing: '2px',
    margin: '0 0 14px 0',
    textTransform: 'uppercase',
  },
  row: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  input: {
    flex: 1,
    minWidth: '140px',
    background: '#111827',
    border: '1px solid #374151',
    borderRadius: '8px',
    color: '#f9fafb',
    padding: '10px 14px',
    fontFamily: '"Courier New", monospace',
    fontSize: '14px',
    outline: 'none',
  },
  select: {
    background: '#111827',
    border: '1px solid #374151',
    borderRadius: '8px',
    color: '#f9fafb',
    padding: '10px 14px',
    fontFamily: '"Courier New", monospace',
    fontSize: '14px',
    cursor: 'pointer',
  },
  btnCreate: {
    background: '#c084fc',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: '"Courier New", monospace',
    fontSize: '14px',
  },
  note: {
    color: '#6b7280',
    fontSize: '11px',
    margin: '10px 0 0 0',
  },
  empty: {
    color: '#6b7280',
    textAlign: 'center',
    padding: '20px',
    fontSize: '13px',
  },
  card: {
    background: '#111827',
    border: '1px solid #1f2937',
    borderRadius: '8px',
    padding: '14px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  cardLeft: { display: 'flex', flexDirection: 'column', gap: '4px' },
  cardName: { color: '#f9fafb', fontSize: '15px', fontWeight: 'bold' },
  cardStatus: { fontSize: '11px', letterSpacing: '1px' },
  cardRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' },
  progress: { display: 'flex', alignItems: 'center', gap: '8px' },
  progressTrack: {
    width: '80px',
    height: '6px',
    background: '#1f2937',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: '#c084fc',
    borderRadius: '3px',
    transition: 'width 0.3s',
  },
  progressText: { color: '#9ca3af', fontSize: '11px' },
  btnJoin: {
    background: 'transparent',
    border: '1px solid #c084fc',
    color: '#c084fc',
    borderRadius: '6px',
    padding: '6px 14px',
    cursor: 'pointer',
    fontFamily: '"Courier New", monospace',
    fontSize: '12px',
  },
  rules: {
    background: 'rgba(17,24,39,0.4)',
    border: '1px solid #1f2937',
    borderRadius: '12px',
    padding: '16px',
  },
  rulesTitle: {
    color: '#6b7280',
    fontSize: '11px',
    letterSpacing: '2px',
    marginBottom: '10px',
  },
  rulesList: { display: 'flex', flexDirection: 'column', gap: '4px' },
  rule: { color: '#4b5563', fontSize: '12px' },
};

export default Tournament;
