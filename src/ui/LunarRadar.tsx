import React from 'react';
import type { TelemetryData, GameState } from '../types/game';

interface LunarRadarProps {
  visible: boolean;
  telemetry: TelemetryData;
  gameState: GameState;
}

export const LunarRadar: React.FC<LunarRadarProps> = ({
  visible,
  telemetry,
  gameState
}) => {
  if (!visible) return null;

  const isInsideBase = gameState === 'STATE_DOME_MANAGEMENT';
  const px = isInsideBase ? 0 : telemetry.coordinates.x;
  const pz = isInsideBase ? 0 : telemetry.coordinates.z;

  // Escala do radar (raio máximo de 700m mapeado em 40px)
  const scale = 38 / 700;
  const clampCoord = (val: number) => Math.max(-38, Math.min(38, val));

  // Posição relativa da Base Welwitschia (0, 0)
  const baseDx = clampCoord((0 - px) * scale);
  const baseDz = clampCoord((0 - pz) * scale);

  // Posição relativa do LRO-Scout / Gelo Lunar (460, 460)
  const targetDx = clampCoord((460 - px) * scale);
  const targetDz = clampCoord((460 - pz) * scale);

  // Depósitos de gelo / rochas de referência no radar
  const landmarks = [
    { x: 180, z: 160, type: 'ice' },
    { x: 320, z: 290, type: 'rock' },
    { x: -120, z: 210, type: 'ice' }
  ];

  return (
    <div
      className="fixed bottom-16 left-3 z-20 w-24 h-24 rounded-full bg-slate-950/75 backdrop-blur-md border border-cyan-400/45 shadow-xl pointer-events-none select-none overflow-hidden flex items-center justify-center"
      style={{
        marginBottom: 'env(safe-area-inset-bottom)',
        marginLeft: 'env(safe-area-inset-left)'
      }}
    >
      <svg viewBox="-48 -48 96 96" className="w-full h-full pointer-events-none">
        {/* Anéis concêntricos e eixos do radar */}
        <circle cx="0" cy="0" r="38" fill="none" stroke="rgba(56, 189, 248, 0.22)" strokeWidth="1" />
        <circle cx="0" cy="0" r="22" fill="none" stroke="rgba(56, 189, 248, 0.16)" strokeWidth="1" strokeDasharray="2 2" />
        <line x1="-44" y1="0" x2="44" y2="0" stroke="rgba(56, 189, 248, 0.14)" strokeWidth="1" />
        <line x1="0" y1="-44" x2="0" y2="44" stroke="rgba(56, 189, 248, 0.14)" strokeWidth="1" />

        {/* Depósitos de gelo (azul) e rochas (âmbar) */}
        {landmarks.map((lm, idx) => {
          const lx = clampCoord((lm.x - px) * scale);
          const lz = clampCoord((lm.z - pz) * scale);
          return (
            <circle
              key={idx}
              cx={lx}
              cy={-lz}
              r={lm.type === 'ice' ? 2.2 : 1.8}
              fill={lm.type === 'ice' ? '#38bdf8' : '#f59e0b'}
              opacity={0.75}
            />
          );
        })}

        {/* Base Welwitschia (Ciano/Verde) */}
        <circle cx={baseDx} cy={-baseDz} r="3.5" fill="#00f0ff" stroke="#ffffff" strokeWidth="1" />

        {/* Alvo LRO-Scout / Gelo Polar (Verde Esmeralda) */}
        <circle cx={targetDx} cy={-targetDz} r="3.5" fill="#10b981" stroke="#a7f3d0" strokeWidth="1" />

        {/* Seta central indicando posição e direção (heading) do jogador */}
        <g transform={`rotate(${telemetry.headingDeg || 0})`}>
          <polygon points="0,-6 4.5,5 0,2.5 -4.5,5" fill="#facc15" />
        </g>
      </svg>

      <span className="absolute bottom-1 text-[8px] font-mono font-bold text-cyan-300/90 tracking-tighter pointer-events-none">
        {isInsideBase ? 'BASE 0m' : `${Math.round(telemetry.distanceToBaseM)}m BASE`}
      </span>
    </div>
  );
};
