import React, { useEffect, useRef, useCallback } from 'react';

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const TANK_SIZE = 30;

const GameCanvas = ({ gameState, mySocketId }) => {
  const canvasRef = useRef(null);

  const draw = useCallback((ctx, state) => {
    if (!state) return;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < GAME_WIDTH; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, GAME_HEIGHT); ctx.stroke();
    }
    for (let y = 0; y < GAME_HEIGHT; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(GAME_WIDTH, y); ctx.stroke();
    }

    if (state.walls) {
      for (const wall of state.walls) {
        ctx.fillStyle = '#374151';
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 1;
        ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);

        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(wall.x + 2, wall.y + 2, wall.w - 4, 4);
      }
    }

    if (state.bullets) {
      for (const bullet of state.bullets) {
        ctx.save();
        ctx.translate(bullet.x, bullet.y);

        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 8);
        grad.addColorStop(0, 'rgba(255, 220, 50, 0.8)');
        grad.addColorStop(1, 'rgba(255, 100, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    if (state.players) {
      for (const player of state.players) {
        if (!player.alive) continue;

        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.angle);

        const isMe = player.socketId === mySocketId;
        const color = player.color || '#4ade80';

        ctx.shadowColor = color;
        ctx.shadowBlur = isMe ? 15 : 8;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(-TANK_SIZE / 2, -TANK_SIZE / 2, TANK_SIZE, TANK_SIZE, 4);
        ctx.fill();

        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(-TANK_SIZE / 2 + 4, -TANK_SIZE / 2 + 4, TANK_SIZE - 8, TANK_SIZE - 8);

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-TANK_SIZE / 2, -TANK_SIZE / 2, 5, TANK_SIZE);
        ctx.fillRect(TANK_SIZE / 2 - 5, -TANK_SIZE / 2, 5, TANK_SIZE);

        ctx.shadowBlur = 0;
        ctx.fillStyle = isMe ? '#fff' : color;
        ctx.fillRect(0, -3, TANK_SIZE / 2 + 5, 6);

        if (isMe) {
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('★', 0, 4);
        }

        ctx.restore();

        const hpBarWidth = TANK_SIZE + 6;
        const hpBarHeight = 5;
        const hpBarX = player.x - hpBarWidth / 2;
        const hpBarY = player.y - TANK_SIZE / 2 - 12;

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

        const hpPercent = player.hp / player.maxHp;
        ctx.fillStyle = hpPercent > 0.5 ? '#4ade80' : hpPercent > 0.25 ? '#facc15' : '#f87171';
        ctx.fillRect(hpBarX, hpBarY, hpBarWidth * hpPercent, hpBarHeight);

        ctx.fillStyle = isMe ? '#fff' : 'rgba(255,255,255,0.7)';
        ctx.font = `${isMe ? 'bold ' : ''}11px "Courier New"`;
        ctx.textAlign = 'center';
        ctx.fillText(player.name, player.x, player.y - TANK_SIZE / 2 - 16);
      }
    }

    if (state.players) {
      for (const player of state.players) {
        if (player.alive) continue;
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.translate(player.x, player.y);
        ctx.fillStyle = player.color || '#666';
        ctx.beginPath();
        ctx.roundRect(-TANK_SIZE / 2, -TANK_SIZE / 2, TANK_SIZE, TANK_SIZE, 4);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '10px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('⟳', player.x, player.y);
      }
    }

  }, [mySocketId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameState) return;
    const ctx = canvas.getContext('2d');
    draw(ctx, gameState);
  }, [gameState, draw]);

  return (
    <canvas
      ref={canvasRef}
      width={GAME_WIDTH}
      height={GAME_HEIGHT}
      style={{
        display: 'block',
        border: '2px solid #374151',
        borderRadius: '8px',
        boxShadow: '0 0 30px rgba(74, 222, 128, 0.15)',
      }}
    />
  );
};

export default GameCanvas;
