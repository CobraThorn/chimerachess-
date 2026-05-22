import { useEffect, useRef } from "react";

const BOARD_SIZE = 8;
const PIECE_SYMBOLS = ["♔", "♕", "♖", "♗", "♘", "♙"];

interface GlowSquare {
  row: number;
  col: number;
  life: number;
  maxLife: number;
}

export default function ChessBoardBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowsRef = useRef<GlowSquare[]>([]);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let lastSpawn = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const spawnGlow = () => {
      if (glowsRef.current.length > 6) return;
      glowsRef.current.push({
        row: Math.floor(Math.random() * BOARD_SIZE),
        col: Math.floor(Math.random() * BOARD_SIZE),
        life: 0,
        maxLife: 120 + Math.random() * 180,
      });
    };

    const draw = (timestamp: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      timeRef.current = timestamp * 0.001;

      ctx.clearRect(0, 0, w, h);

      const cx = w * 0.5;
      const cy = h * 0.52;
      const boardPx = Math.min(w, h) * 0.95;
      const cell = boardPx / BOARD_SIZE;
      const originX = cx - boardPx / 2;
      const originY = cy - boardPx / 2 + Math.sin(timeRef.current * 0.4) * 8;

      const perspective = 0.82;
      const skewX = -0.08;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.transform(1, 0, skewX, perspective, -cx, -cy * perspective + cy * (1 - perspective));
      ctx.translate(-cx, -cy);

      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          const isLight = (row + col) % 2 === 0;
          const x = originX + col * cell;
          const y = originY + row * cell;

          const pulse =
            Math.sin(timeRef.current * 1.2 + row * 0.4 + col * 0.3) * 0.5 + 0.5;

          const baseLight = isLight ? 28 : 14;
          const baseDark = isLight ? 18 : 8;
          const brightness = baseLight + pulse * 6;

          ctx.fillStyle = isLight
            ? `rgba(${brightness + 8}, ${brightness + 6}, ${brightness + 4}, 0.35)`
            : `rgba(${baseDark}, ${baseDark - 2}, ${baseDark + 4}, 0.5)`;
          ctx.fillRect(x, y, cell + 0.5, cell + 0.5);

          const gridGlow = Math.sin(timeRef.current * 0.8 + col * 0.5) * 0.5 + 0.5;
          if (gridGlow > 0.92 && Math.random() > 0.998) {
            ctx.strokeStyle = `rgba(0, 229, 255, ${0.08 * gridGlow})`;
            ctx.lineWidth = 0.5;
            ctx.strokeRect(x, y, cell, cell);
          }
        }
      }

      glowsRef.current = glowsRef.current.filter((g) => {
        g.life++;
        const t = g.life / g.maxLife;
        const alpha = Math.sin(t * Math.PI) * 0.55;
        const x = originX + g.col * cell;
        const y = originY + g.row * cell;

        const grad = ctx.createRadialGradient(
          x + cell / 2,
          y + cell / 2,
          0,
          x + cell / 2,
          y + cell / 2,
          cell * 0.9
        );
        grad.addColorStop(0, `rgba(232, 197, 71, ${alpha})`);
        grad.addColorStop(0.5, `rgba(0, 229, 255, ${alpha * 0.25})`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, cell, cell);

        return g.life < g.maxLife;
      });

      if (timestamp - lastSpawn > 800) {
        spawnGlow();
        lastSpawn = timestamp;
      }

      const piecePositions = [
        { row: 0, col: 4, sym: 0 },
        { row: 7, col: 3, sym: 1 },
        { row: 3, col: 5, sym: 4 },
        { row: 4, col: 2, sym: 5 },
        { row: 6, col: 6, sym: 5 },
      ];

      piecePositions.forEach((p, i) => {
        const float = Math.sin(timeRef.current * 0.6 + i) * 3;
        const x = originX + p.col * cell + cell / 2;
        const y = originY + p.row * cell + cell / 2 + float;
        const alpha = 0.12 + Math.sin(timeRef.current + i) * 0.04;

        ctx.font = `${cell * 0.55}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(232, 197, 71, 0.6)";
        ctx.shadowBlur = 20;
        ctx.fillStyle = `rgba(232, 197, 71, ${alpha})`;
        ctx.fillText(PIECE_SYMBOLS[p.sym], x, y);
        ctx.shadowBlur = 0;
      });

      ctx.restore();

      const horizonGrad = ctx.createLinearGradient(0, 0, 0, h);
      horizonGrad.addColorStop(0, "rgba(5, 5, 8, 0.3)");
      horizonGrad.addColorStop(0.4, "transparent");
      horizonGrad.addColorStop(1, "rgba(5, 5, 8, 0.85)");
      ctx.fillStyle = horizonGrad;
      ctx.fillRect(0, 0, w, h);

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0 opacity-70"
      aria-hidden
    />
  );
}
