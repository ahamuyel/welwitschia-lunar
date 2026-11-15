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

  // Escala do radar (raio de 75m mapeado em 38px para localizar Gelo, LRO-Scout a ~45m e Sismógrafo)
  const scale = 38 / 75;
  const clampCoord = (val: number) => Math.max(-38, Math.min(38, val));

  // Posição relativa da Porta Airlock da Base Welwitschia (0, 20)
  const baseDx = clampCoord((0 - px) * scale);
  const baseDz = clampCoord((20 - pz) * scale);

  // Posição relativa da Missão Paralela A: Rover Perdido LRO-Scout (30, 54) a ~45m da base
  const scoutDx = clampCoord((30 - px) * scale);
  const scoutDz = clampCoord((54 - pz) * scale);

  // Posição relativa da Atividade Principal: Depósito de Gelo Bruto (-28, 48)
  const iceDx = clampCoord((-28 - px) * scale);
  const iceDz = clampCoord((48 - pz) * scale);

  // Posição relativa da Missão Paralela B: Sismógrafo Lunar Artemis (0, 66)
  const seismoDx = clampCoord((0 - px) * scale);
  const seismoDz = clampCoord((66 - pz) * scale);

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

        {/* Depósito de Gelo Lunar Bruto (Azul Gelo #38bdf8) */}
        <circle cx={iceDx} cy={-iceDz} r="3.2" fill="#38bdf8" stroke="#e0f2fe" strokeWidth="0.9" />

        {/* Sismógrafo Lunar Artemis (Violeta/Ciano #a855f7) */}
        <circle cx={seismoDx} cy={-seismoDz} r="3.2" fill="#a855f7" stroke="#f3e8ff" strokeWidth="0.9" />

        {/* Rover Perdido LRO-Scout a ~45m (Âmbar SOS #f59e0b) */}
        <circle cx={scoutDx} cy={-scoutDz} r="3.4" fill="#f59e0b" stroke="#fef3c7" strokeWidth="1" />

        {/* Base Welwitschia (Ciano/Verde #10b981) */}
        <circle cx={baseDx} cy={-baseDz} r="3.6" fill="#10b981" stroke="#ffffff" strokeWidth="1" />

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
