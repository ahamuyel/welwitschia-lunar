/**
 * Welwitschia Lunar - HUD Minimalista de Telemetria e Controlos de Condução Mobile/VR
 * Agrupado em módulos discretos:
 * 1. Top-Left: Barras compactas de BATERIA e OXIGÊNIO.
 * 2. Top-Right: Alternador de Modo VR / Normal 360°.
 * 3. Bottom-Left: Cluster de condução (Velocímetro km/h + Faróis + Câmara).
 * 4. Bottom-Center: D-Pad tátil de condução para Mobile/VR.
 * 5. Bottom-Right: Radar Circular compacto (140px) com BASE e ALVO.
 */

import React, { useState } from 'react';
import type { TelemetryData, ResourceState } from '../types/game';

interface RoverHUDProps {
  telemetry: TelemetryData;
  resources: ResourceState;
  onToggleHeadlights: () => void;
  onToggleCamera: () => void;
  onExtractData?: () => void;
  isVRActive?: boolean;
  onToggleVR?: () => void;
  onTouchDriveInputs?: (inputs: { forward: boolean; backward: boolean; left: boolean; right: boolean; brake: boolean }) => void;
}

export const RoverHUD: React.FC<RoverHUDProps> = ({
  telemetry,
  resources,
  onToggleHeadlights,
  onToggleCamera,
  onExtractData,
  isVRActive = true,
  onToggleVR,
  onTouchDriveInputs
}) => {
  const isHighSpeed = telemetry.speedKmh > 26.0;

  // Estado dos controlos táteis virtuais
  const [touchState, setTouchState] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
    brake: false
  });

  const updateTouch = (key: keyof typeof touchState, value: boolean) => {
    setTouchState((prev) => {
      const next = { ...prev, [key]: value };
      if (onTouchDriveInputs) onTouchDriveInputs(next);
      return next;
    });
  };

  // Radar Circular Compacto (140px, raio = 58px, centro = 70, 70)
  const radarRadius = 58;
  const radarCenter = 70;
  const maxRangeM = 750;

  // Ângulo relativo da Base (0, 0)
  const relAngleBaseRad = ((telemetry.azimuthToBaseDeg - telemetry.headingDeg) * Math.PI) / 180;
  const normDistBase = Math.min(1.0, Math.max(0.06, telemetry.distanceToBaseM / maxRangeM));
  const baseBlipX = radarCenter + Math.sin(relAngleBaseRad) * (normDistBase * radarRadius);
  const baseBlipY = radarCenter - Math.cos(relAngleBaseRad) * (normDistBase * radarRadius);

  // Ângulo relativo do Alvo LRO-Scout (460, 460)
  const relAngleTargetRad = ((telemetry.azimuthToTargetDeg - telemetry.headingDeg) * Math.PI) / 180;
  const normDistTarget = Math.min(1.0, Math.max(0.06, telemetry.distanceToTargetM / maxRangeM));
  const targetBlipX = radarCenter + Math.sin(relAngleTargetRad) * (normDistTarget * radarRadius);
  const targetBlipY = radarCenter - Math.cos(relAngleTargetRad) * (normDistTarget * radarRadius);

  return (
    <div className="fixed inset-0 z-20 pointer-events-none p-3 md:p-6 flex flex-col justify-between select-none">
      {/* 1. TOPO: BARRAS DE RECURSOS À ESQUERDA & BOTÃO VR À DIREITA */}
      <div className="flex items-start justify-between w-full">
        <div className="pointer-events-auto bg-slate-950/80 border border-cyan-500/30 px-3 py-2 rounded-xl backdrop-blur-md shadow-lg flex flex-col gap-1.5 w-44 font-mono ml-12">
          {/* Bateria */}
          <div className="space-y-0.5">
            <div className="flex justify-between text-[10px] font-bold">
              <span className="flex items-center gap-1 text-slate-300">
                <span className="text-amber-400">⚡</span> BAT
              </span>
              <span className={resources.roverBattery < 20 ? 'text-rose-400 animate-pulse' : 'text-amber-300'}>
                {Math.round(resources.roverBattery)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-300 ${
                  resources.roverBattery < 20 ? 'bg-rose-500' : 'bg-amber-400'
                }`}
                style={{ width: `${Math.max(0, resources.roverBattery)}%` }}
              />
            </div>
          </div>

          {/* Oxigênio */}
          <div className="space-y-0.5">
            <div className="flex justify-between text-[10px] font-bold">
              <span className="flex items-center gap-1 text-slate-300">
                <span className="text-cyan-400">🫁</span> O₂
              </span>
              <span className={resources.suitOxygen < 25 ? 'text-rose-400 animate-pulse' : 'text-cyan-300'}>
                {Math.round(resources.suitOxygen)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-300 ${
                  resources.suitOxygen < 25 ? 'bg-rose-500' : 'bg-cyan-400'
                }`}
                style={{ width: `${Math.max(0, resources.suitOxygen)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Botão de Modo VR / 360 no topo direito */}
        {onToggleVR && (
          <button
            onClick={onToggleVR}
            className="pointer-events-auto px-3 py-1.5 rounded-xl border text-xs font-mono font-bold backdrop-blur-md shadow-lg transition-all cursor-pointer mr-12"
            style={{
              borderColor: isVRActive ? '#00e5ff' : '#ffd27a',
              color: isVRActive ? '#00e5ff' : '#ffd27a',
              backgroundColor: 'rgba(5, 14, 36, 0.88)'
            }}
            title="Alternar entre Modo VR (Imersivo com Giroscópio) e Modo Normal 360°"
          >
            {isVRActive ? '🥽 Modo: VR [Ativo]' : '📱 Modo: Normal 360°'}
          </button>
        )}
      </div>

      {/* ALERTA DE PROXIMIDADE E PROMPT DE RESGATE (<= 15m) */}
      {telemetry.isNearLostRover && onExtractData && (
        <div className="pointer-events-auto mx-auto max-w-sm w-full bg-slate-950/95 border-2 border-emerald-400 rounded-2xl p-4 shadow-2xl backdrop-blur-xl animate-bounce text-center">
          <div className="text-xs font-mono font-bold text-emerald-400 mb-2">
            ALVO ENCONTRADO: ROVER LRO-SCOUT
          </div>
          <button
            onClick={onExtractData}
            className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black font-mono text-xs tracking-wider rounded-xl shadow-lg cursor-pointer"
          >
            [ OLHE FIXO OU PRESSIONE 'E' PARA EXTRAIR DADOS ]
          </button>
        </div>
      )}

      {/* 2. BASE DA TELA: CLUSTER DE CONDUÇÃO, D-PAD MOBILE E RADAR */}
      <div className="flex items-end justify-between w-full gap-2">
        {/* CANTO INFERIOR ESQUERDO: CLUSTER DE CONDUÇÃO MINIMALISTA */}
        <div className="pointer-events-auto bg-slate-950/75 border border-cyan-500/25 p-2.5 rounded-2xl backdrop-blur-md shadow-lg flex flex-col items-start gap-1.5 font-mono">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl md:text-3xl font-black ${
                isHighSpeed ? 'text-rose-400 animate-pulse' : 'text-cyan-300'
              }`}
            >
              {telemetry.speedKmh.toFixed(1)}
            </span>
            <span className="text-[10px] text-slate-400 font-bold">KM/H</span>
            {isHighSpeed && (
              <span className="text-[9px] text-rose-400 font-bold ml-1 animate-pulse">
                ⚠ ALERTA
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleHeadlights}
              className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                telemetry.isHeadlightsOn
                  ? 'border-amber-400 bg-amber-950/40 text-amber-300'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400'
              }`}
              title="Ligar/Desligar Faróis [ L ]"
            >
              💡 {telemetry.isHeadlightsOn ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={onToggleCamera}
              className="px-2 py-1 rounded text-[10px] font-bold border border-slate-800 bg-slate-900/60 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 transition-colors cursor-pointer"
              title="Alternar Câmera [ C ]"
            >
              📷 {telemetry.cameraMode === 'THIRD_PERSON' ? '3ª PES' : 'COCKPIT'}
            </button>
          </div>
        </div>

        {/* CENTRO INFERIOR: CONTROLOS TÁTEIS VIRTUAIS MOBILE DE CONDUÇÃO */}
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-950/80 border border-slate-800/80 p-2 rounded-2xl backdrop-blur-md shadow-xl">
          {/* Direção Esquerda/Direita */}
          <div className="flex gap-1.5">
            <button
              onPointerDown={() => updateTouch('left', true)}
              onPointerUp={() => updateTouch('left', false)}
              onPointerLeave={() => updateTouch('left', false)}
              className={`w-11 h-11 rounded-xl border text-sm font-black flex items-center justify-center transition-all ${
                touchState.left ? 'bg-cyan-500/40 border-cyan-400 text-white scale-95' : 'bg-slate-900/70 border-slate-700 text-slate-300'
              }`}
            >
              ◀
            </button>
            <button
              onPointerDown={() => updateTouch('right', true)}
              onPointerUp={() => updateTouch('right', false)}
              onPointerLeave={() => updateTouch('right', false)}
              className={`w-11 h-11 rounded-xl border text-sm font-black flex items-center justify-center transition-all ${
                touchState.right ? 'bg-cyan-500/40 border-cyan-400 text-white scale-95' : 'bg-slate-900/70 border-slate-700 text-slate-300'
              }`}
            >
              ▶
            </button>
          </div>

          {/* Acelerar e Ré */}
          <div className="flex flex-col gap-1.5">
            <button
              onPointerDown={() => updateTouch('forward', true)}
              onPointerUp={() => updateTouch('forward', false)}
              onPointerLeave={() => updateTouch('forward', false)}
              className={`w-12 h-10 rounded-xl border text-sm font-black flex items-center justify-center transition-all ${
                touchState.forward ? 'bg-emerald-500/40 border-emerald-400 text-white scale-95' : 'bg-slate-900/70 border-slate-700 text-emerald-400'
              }`}
              title="Acelerar"
            >
              ▲
            </button>
            <button
              onPointerDown={() => updateTouch('backward', true)}
              onPointerUp={() => updateTouch('backward', false)}
              onPointerLeave={() => updateTouch('backward', false)}
              className={`w-12 h-10 rounded-xl border text-sm font-black flex items-center justify-center transition-all ${
                touchState.backward ? 'bg-amber-500/40 border-amber-400 text-white scale-95' : 'bg-slate-900/70 border-slate-700 text-amber-400'
              }`}
              title="Ré"
            >
              ▼
            </button>
          </div>

          {/* Freio */}
          <button
            onPointerDown={() => updateTouch('brake', true)}
            onPointerUp={() => updateTouch('brake', false)}
            onPointerLeave={() => updateTouch('brake', false)}
            className={`w-10 h-21 rounded-xl border text-xs font-black flex items-center justify-center transition-all ${
              touchState.brake ? 'bg-rose-500/50 border-rose-400 text-white scale-95' : 'bg-rose-950/40 border-rose-900/60 text-rose-300'
            }`}
            title="Freio de Mão"
          >
            ⏹
          </button>
        </div>

        {/* CANTO INFERIOR DIREITO: APENAS O RADAR CIRCULAR COMPACTO (140px) */}
        <div className="pointer-events-auto bg-slate-950/80 border border-cyan-500/30 p-2.5 rounded-2xl backdrop-blur-md shadow-xl flex flex-col items-center font-mono">
          <div className="relative w-[130px] h-[130px] md:w-[140px] md:h-[140px]">
            <svg viewBox="0 0 140 140" className="w-full h-full">
              <circle cx="70" cy="70" r="64" fill="#040812" stroke="#1e293b" strokeWidth="1.5" />
              <circle
                cx="70"
                cy="70"
                r={(200 / maxRangeM) * radarRadius}
                fill="none"
                stroke="rgba(56, 189, 248, 0.2)"
                strokeDasharray="2 3"
              />
              <circle
                cx="70"
                cy="70"
                r={(400 / maxRangeM) * radarRadius}
                fill="none"
                stroke="rgba(56, 189, 248, 0.3)"
                strokeDasharray="3 3"
              />
              <circle
                cx="70"
                cy="70"
                r={(700 / maxRangeM) * radarRadius}
                fill="none"
                stroke="rgba(56, 189, 248, 0.45)"
              />
              <line x1="70" y1="12" x2="70" y2="128" stroke="rgba(30, 41, 59, 0.7)" strokeWidth="0.8" />
              <line x1="12" y1="70" x2="128" y2="70" stroke="rgba(30, 41, 59, 0.7)" strokeWidth="0.8" />
              <text x="72" y="55" fill="#475569" fontSize="6">200m</text>
              <text x="72" y="39" fill="#475569" fontSize="6">400m</text>
              <text x="72" y="18" fill="#475569" fontSize="6">700m</text>

              {/* Marcador BASE */}
              <g transform={`translate(${baseBlipX}, ${baseBlipY})`}>
                <circle cx="0" cy="0" r="3.8" fill="#10b981" />
                <circle cx="0" cy="0" r="6.5" fill="none" stroke="#10b981" strokeWidth="0.8" opacity="0.6" className="animate-ping" />
                <text x="5" y="2.5" fill="#34d399" fontSize="7" fontWeight="bold">
                  BASE
                </text>
              </g>

              {/* Marcador ALVO */}
              {telemetry.isGpsActive ? (
                <g transform={`translate(${targetBlipX}, ${targetBlipY})`}>
                  <circle cx="0" cy="0" r="3.8" fill="#f59e0b" />
                  <circle cx="0" cy="0" r="6.8" fill="none" stroke="#f59e0b" strokeWidth="0.8" opacity="0.7" className="animate-pulse" />
                  <text x="5" y="2.5" fill="#fbbf24" fontSize="7" fontWeight="bold">
                    ALVO
                  </text>
                </g>
              ) : (
                <g transform={`translate(${targetBlipX}, ${targetBlipY})`}>
                  <line x1="-4" y1="-4" x2="4" y2="4" stroke="#f43f5e" strokeWidth="1.2" className="animate-pulse" />
                  <line x1="4" y1="-4" x2="-4" y2="4" stroke="#f43f5e" strokeWidth="1.2" className="animate-pulse" />
                  <text x="5" y="2.5" fill="#f43f5e" fontSize="6" fontWeight="bold">
                    ???
                  </text>
                </g>
              )}

              {/* Centro: Rover */}
              <polygon
                points="70,63 74,74 70,71 66,74"
                fill="#00f0ff"
                stroke="#0891b2"
                strokeWidth="1"
              />
              <circle cx="70" cy="70" r="1.5" fill="#ffffff" />
            </svg>
          </div>

          <div className="flex justify-between w-full text-[9px] text-slate-400 mt-1 px-1">
            <span className="text-emerald-400 font-bold">B: {telemetry.distanceToBaseM}m</span>
            <span className={telemetry.isGpsActive ? 'text-amber-400 font-bold' : 'text-rose-400 font-bold'}>
              {telemetry.isGpsActive ? `A: ${telemetry.distanceToTargetM}m` : 'SEM GPS'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
