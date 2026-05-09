import React, { useState, useEffect } from 'react';
import socket from '../socket';

const Lobby = ({ onJoinRoom }) => {
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);

  useEffect(() => {
    socket.emit('getRooms');

    socket.on('roomsList', setRooms);
    socket.on('roomsUpdated', setRooms);
    socket.on('roomCreated', ({ roomId }) => {
      socket.emit('joinRoom', { roomId });
    });
    socket.on('joinedRoom', ({ roomId, roomName }) => {
      onJoinRoom(roomId, roomName);
    });

    return () => {
      socket.off('roomsList');
      socket.off('roomsUpdated');
      socket.off('roomCreated');
      socket.off('joinedRoom');
    };
  }, [onJoinRoom]);

  const handleCreate = () => {
    const name = newRoomName.trim() || 'Нова кімната';
    socket.emit('createRoom', { roomName: name, maxPlayers });
    setNewRoomName('');
  };

  const handleJoin = (roomId) => {
    socket.emit('joinRoom', { roomId });
  };

  const statusLabel = (status) => {
    if (status === 'waiting') return { text: 'Очікування', color: '#facc15' };
    if (status === 'active') return { text: 'В грі', color: '#4ade80' };
    return { text: 'Завершено', color: '#6b7280' };
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🎮 ЛОБІ</h2>

      <div style={styles.createBox}>
        <h3 style={styles.sectionTitle}>Створити кімнату</h3>
        <div style={styles.row}>
          <input
            style={styles.input}
            placeholder="Назва кімнати..."
            value={newRoomName}
            onChange={e => setNewRoomName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <select
            style={styles.select}
            value={maxPlayers}
            onChange={e => setMaxPlayers(Number(e.target.value))}
          >
            <option value={2}>2 гравці</option>
            <option value={4}>4 гравці</option>
            <option value={6}>6 гравців</option>
          </select>
          <button style={styles.btnCreate} onClick={handleCreate}>
            + Створити
          </button>
        </div>
      </div>

      <div style={styles.roomsBox}>
        <h3 style={styles.sectionTitle}>Доступні кімнати ({rooms.length})</h3>
        {rooms.length === 0 ? (
          <div style={styles.empty}>Немає активних кімнат. Створіть першу!</div>
        ) : (
          rooms.map(room => {
            const st = statusLabel(room.status);
            const canJoin = room.status === 'waiting' && room.playerCount < room.maxPlayers;
            return (
              <div key={room.id} style={styles.roomCard}>
                <div style={styles.roomInfo}>
                  <span style={styles.roomName}>{room.name}</span>
                  <span style={{ ...styles.roomStatus, color: st.color }}>{st.text}</span>
                </div>
                <div style={styles.roomMeta}>
                  <span style={styles.roomPlayers}>
                    👥 {room.playerCount} / {room.maxPlayers}
                  </span>
                  <button
                    style={{ ...styles.btnJoin, opacity: canJoin ? 1 : 0.4 }}
                    onClick={() => canJoin && handleJoin(room.id)}
                    disabled={!canJoin}
                  >
                    {room.status === 'waiting' ? 'Приєднатись' : 'Заповнено'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={styles.hints}>
        <div style={styles.hint}>⬆⬇ або W/S — рух</div>
        <div style={styles.hint}>⬅➡ або A/D — поворот</div>
        <div style={styles.hint}>Пробіл — вогонь</div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '600px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    fontFamily: '"Courier New", monospace',
  },
  title: {
    color: '#4ade80',
    fontSize: '24px',
    fontWeight: 'bold',
    letterSpacing: '4px',
    margin: 0,
  },
  sectionTitle: {
    color: '#9ca3af',
    fontSize: '11px',
    letterSpacing: '2px',
    margin: '0 0 12px 0',
    textTransform: 'uppercase',
  },
  createBox: {
    background: 'rgba(17,24,39,0.8)',
    border: '1px solid #374151',
    borderRadius: '12px',
    padding: '20px',
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
    background: '#4ade80',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: '"Courier New", monospace',
    fontSize: '14px',
    letterSpacing: '1px',
  },
  roomsBox: {
    background: 'rgba(17,24,39,0.8)',
    border: '1px solid #374151',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  empty: { color: '#6b7280', textAlign: 'center', padding: '20px', fontSize: '14px' },
  roomCard: {
    background: '#111827',
    border: '1px solid #1f2937',
    borderRadius: '8px',
    padding: '14px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    transition: 'border-color 0.2s',
  },
  roomInfo: { display: 'flex', flexDirection: 'column', gap: '4px' },
  roomName: { color: '#f9fafb', fontSize: '15px', fontWeight: 'bold' },
  roomStatus: { fontSize: '11px', letterSpacing: '1px' },
  roomMeta: { display: 'flex', alignItems: 'center', gap: '12px' },
  roomPlayers: { color: '#9ca3af', fontSize: '13px' },
  btnJoin: {
    background: 'transparent',
    border: '1px solid #4ade80',
    color: '#4ade80',
    borderRadius: '6px',
    padding: '7px 14px',
    cursor: 'pointer',
    fontFamily: '"Courier New", monospace',
    fontSize: '13px',
    transition: 'all 0.2s',
  },
  hints: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  hint: {
    color: '#6b7280',
    fontSize: '11px',
    letterSpacing: '1px',
    background: 'rgba(17,24,39,0.5)',
    padding: '6px 12px',
    borderRadius: '20px',
    border: '1px solid #1f2937',
  },
};

export default Lobby;
