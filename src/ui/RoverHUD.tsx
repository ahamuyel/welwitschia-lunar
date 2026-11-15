/**
 * Welwitschia Lunar - HUD de Telemetria do Rover com Radar Circular (Minimapa)
 * Velocímetro em tempo real (Zona Segura vs Zona de Alerta), Bússola 0-360°,
 * Radar Circular com anéis de 500m/1000m/2000m, marcador contínuo da BASE (0,0)
 * e marcador do LRO-Scout (com estática na tempestade).
 */

import React from 'react';
import type { TelemetryData, ResourceState } from '../types/game';

interface RoverHUDProps {
  telemetry: TelemetryData;
  resources: ResourceState;
  onToggleHeadlights: () => void;
  onToggleCamera: () => void;
  onExtractData?: () => void;
}

export const RoverHUD: React.FC<RoverHUDProps> = ({
  telemetry,
  resources,
  onToggleHeadlights,
  onToggleCamera,
  onExtractData
}) => {
  const isHighSpeed = telemetry.speedKmh > 20;
  const isSafeSpeed = telemetry.speedKmh <= 15;

  // Cálculos de posição para o Radar Circular (Minimapa)
  // Raio do radar no SVG = 64px (centro em 75, 75)
  const radarRadius = 64;
  const radarCenter = 75;
  const maxRangeM = 2200; // Escala máxima do radar: 2200 metros

  // Rotação do radar em relação ao heading do rover (o rover sempre aponta para CIMA no radar)
  // Ângulo relativo da Base (0, 0)
  const relAngleBaseRad = ((telemetry.azimuthToBaseDeg - telemetry.headingDeg) * Math.PI) / 180;
  const normDistBase = Math.min(1.0, Math.max(0.08, telemetry.distanceToBaseM / maxRangeM));
  const baseBlipX = radarCenter + Math.sin(relAngleBaseRad) * (normDistBase * radarRadius);
  const baseBlipY = radarCenter - Math.cos(relAngleBaseRad) * (normDistBase * radarRadius);

  // Ângulo relativo do Alvo LRO-Scout (1414.2, 1414.2)
  const relAngleTargetRad = ((telemetry.azimuthToTargetDeg - telemetry.headingDeg) * Math.PI) / 180;
  const normDistTarget = Math.min(1.0, Math.max(0.08, telemetry.distanceToTargetM / maxRangeM));
  const targetBlipX = radarCenter + Math.sin(relAngleTargetRad) * (normDistTarget * radarRadius);
  const targetBlipY = radarCenter - Math.cos(relAngleTargetRad) * (normDistTarget * radarRadius);

  return (
    <div className="fixed inset-0 z-30 pointer-events-none p-4 md:p-6 flex flex-col justify-between">
      {/* Barra Superior: Telemetria de Sistemas, Rumo e GPS */}
      <div className="flex items-start justify-between w-full">
        {/* Painel Esquerdo: Recursos de Sobrevivência (O2, Bateria e Integridade) */}
        <div className="pointer-events-auto bg-slate-950/88 border border-cyan-500/30 p-3.5 rounded-xl backdrop-blur-md shadow-xl w-64 space-y-2.5">
          <div className="text-[11px] font-mono font-bold text-cyan-400 tracking-wider border-b border-slate-800 pb-1.5 flex items-center justify-between">
            <span>SISTEMAS DO ROVER</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>

          {/* Oxigênio */}
          <div>
            <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
              <span>OXIGÊNIO TRAJE:</span>
              <span className={resources.suitOxygen < 25 ? 'text-rose-400 font-bold animate-pulse' : 'text-cyan-300 font-bold'}>
                {Math.round(resources.suitOxygen)}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-300 ${
                  resources.suitOxygen < 25 ? 'bg-rose-500' : 'bg-cyan-400'
                }`}
                style={{ width: `${Math.max(0, resources.suitOxygen)}%` }}
              />
            </div>
          </div>

          {/* Bateria */}
          <div>
            <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
              <span>BATERIA ROVER:</span>
              <span className={resources.roverBattery < 20 ? 'text-rose-400 font-bold animate-pulse' : 'text-amber-300 font-bold'}>
                {Math.round(resources.roverBattery)}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-300 ${
                  resources.roverBattery < 20 ? 'bg-rose-500' : 'bg-amber-400'
                }`}
                style={{ width: `${Math.max(0, resources.roverBattery)}%` }}
              />
            </div>
          </div>

          {/* Integridade Estrutural */}
          <div>
            <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
              <span>INTEGRIDADE CHASSI:</span>
              <span className={resources.roverIntegrity < 50 ? 'text-rose-400 font-bold animate-pulse' : 'text-emerald-400 font-bold'}>
                {Math.round(resources.roverIntegrity)}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-300 ${
                  resources.roverIntegrity < 50 ? 'bg-rose-500' : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.max(0, resources.roverIntegrity)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Centro Superior: Bússola Digital */}
        <div className="pointer-events-auto bg-slate-950/88 border border-cyan-500/30 px-6 py-2.5 rounded-xl backdrop-blur-md shadow-xl text-center">
          <div className="text-[10px] font-mono text-slate-400 tracking-widest uppercase">
            BÚSSOLA LUNAR // RUMO
          </div>
          <div className="flex items-center justify-center gap-3 mt-1">
            <span className="text-2xl font-black font-mono text-cyan-300">
              {telemetry.headingDeg.toString().padStart(3, '0')}°
            </span>
            <div className="w-px h-6 bg-slate-800" />
            <span className="text-xs font-mono font-bold text-amber-400">
              {telemetry.headingDeg >= 337 || telemetry.headingDeg < 23 ? 'Norte [N]' :
               telemetry.headingDeg >= 23 && telemetry.headingDeg < 68 ? 'Nordeste [NE]' :
               telemetry.headingDeg >= 68 && telemetry.headingDeg < 113 ? 'Leste [E]' :
               telemetry.headingDeg >= 113 && telemetry.headingDeg < 158 ? 'Sudeste [SE]' :
               telemetry.headingDeg >= 158 && telemetry.headingDeg < 203 ? 'Sul [S]' :
               telemetry.headingDeg >= 203 && telemetry.headingDeg < 248 ? 'Sudoeste [SW]' :
               telemetry.headingDeg >= 248 && telemetry.headingDeg < 293 ? 'Oeste [W]' : 'Noroeste [NW]'}
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
            ALVO LRO-SCOUT: <strong className="text-amber-300">045° NE</strong>
          </div>
        </div>

        {/* Painel Direito: Rastreamento LRO & Controles de Câmera/Faróis */}
        <div className="pointer-events-auto bg-slate-950/88 border border-cyan-500/30 p-3.5 rounded-xl backdrop-blur-md shadow-xl w-64 space-y-2">
          <div className="text-[11px] font-mono font-bold text-cyan-400 tracking-wider border-b border-slate-800 pb-1.5 flex items-center justify-between">
            <span>RASTREAMENTO LRO</span>
            <span className={`w-2 h-2 rounded-full ${telemetry.isGpsActive ? 'bg-cyan-400' : 'bg-rose-500 animate-ping'}`} />
          </div>

          {telemetry.isGpsActive ? (
            <div>
              <div className="text-[11px] font-mono text-slate-400">DISTÂNCIA AO ALVO:</div>
              <div className="text-2xl font-black font-mono text-emerald-300">
                {telemetry.distanceToTargetM.toLocaleString('pt-BR')} m
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-1">
                COORD: <span className="text-slate-300">({Math.round(telemetry.coordinates.x)}, {Math.round(telemetry.coordinates.z)})</span>
              </div>
            </div>
          ) : (
            <div className="p-2 rounded bg-rose-950/60 border border-rose-500/40 text-center">
              <div className="text-[11px] font-mono font-black text-rose-300 animate-pulse">
                SINAL GPS PERDIDO
              </div>
              <div className="text-[9px] font-mono text-rose-400 mt-0.5">
                INTERFERÊNCIA POR IMPACTOS
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1 border-t border-slate-800">
            <button
              onClick={onToggleHeadlights}
              className={`flex-1 py-1 px-2 rounded text-[11px] font-mono font-bold border transition-colors cursor-pointer ${
                telemetry.isHeadlightsOn
                  ? 'border-amber-400 bg-amber-950/40 text-amber-300'
                  : 'border-slate-800 bg-slate-900 text-slate-400'
              }`}
            >
              [L] FARÓIS: {telemetry.isHeadlightsOn ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={onToggleCamera}
              className="flex-1 py-1 px-2 rounded text-[11px] font-mono font-bold border border-slate-800 bg-slate-900 text-cyan-300 hover:border-cyan-400 transition-colors cursor-pointer"
            >
              [C] {telemetry.cameraMode === 'THIRD_PERSON' ? '3ª PESSOA' : 'COCKPIT'}
            </button>
          </div>
        </div>
      </div>

      {/* Alerta de Proximidade e Prompt de Interação para Resgate (<= 15m) */}
      {telemetry.isNearLostRover && onExtractData && (
        <div className="pointer-events-auto mx-auto max-w-md w-full bg-slate-950/95 border-2 border-emerald-400 rounded-2xl p-5 shadow-2xl backdrop-blur-xl animate-bounce text-center">
          <div className="text-xs font-mono font-bold text-emerald-400 mb-1">
            ALVO ENCONTRADO: ROVER LRO-SCOUT
          </div>
          <button
            onClick={onExtractData}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black font-mono text-sm tracking-wider rounded-xl shadow-lg cursor-pointer"
          >
            [ PRESSIONE 'E' PARA EXTRAIR MÓDULO DE DADOS ]
          </button>
        </div>
      )}

      {/* Barra Inferior: Velocímetro à Esquerda/Centro e Radar Circular à Direita */}
      <div className="flex items-end justify-between w-full">
        {/* Espaço vazio à esquerda para não sobrepor diálogos da Welly */}
        <div className="w-1 md:w-64" />

        {/* Centro Inferior: Velocímetro Digital & Inércia Lunar */}
        <div className="pointer-events-auto bg-slate-950/90 border border-cyan-500/30 p-4 rounded-2xl backdrop-blur-md shadow-2xl flex flex-col items-center min-w-[280px]">
          <div className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
            VELOCÍMETRO // INÉRCIA LUNAR
          </div>

          <div className="flex items-baseline gap-2 my-1">
            <span
              className={`text-4xl font-black font-mono transition-colors ${
                isHighSpeed
                  ? 'text-rose-500 animate-pulse'
                  : isSafeSpeed
                  ? 'text-cyan-300'
                  : 'text-amber-400'
              }`}
            >
              {telemetry.speedKmh.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-slate-400 font-bold">km/h</span>
          </div>

          <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 relative mt-1">
            <div className="absolute left-[53%] top-0 bottom-0 w-0.5 bg-amber-400/80 z-10" title="Limite da Zona Segura" />
            <div
              className={`h-full transition-all duration-150 ${
                isHighSpeed
                  ? 'bg-rose-500'
                  : isSafeSpeed
                  ? 'bg-cyan-400'
                  : 'bg-amber-400'
              }`}
              style={{ width: `${Math.min(100, (telemetry.speedKmh / 28) * 100)}%` }}
            />
          </div>

          <div className="flex justify-between w-full text-[9px] font-mono text-slate-400 mt-1.5">
            <span className="text-cyan-400">0 km/h</span>
            <span className="text-amber-400">15 km/h (Segura)</span>
            <span className="text-rose-400">28 km/h (Máx)</span>
          </div>

          {isHighSpeed && (
            <div className="text-[10px] font-mono text-rose-400 font-bold mt-1 text-center animate-pulse">
              ⚠ ZONA DE ALERTA: -40% ATRITO LATERAL (DERRAPANDO)
            </div>
          )}
        </div>

        {/* Canto Inferior Direito: RADAR CIRCULAR (MINIMAPA) */}
        <div className="pointer-events-auto bg-slate-950/92 border border-cyan-500/40 p-3 rounded-2xl backdrop-blur-md shadow-2xl flex flex-col items-center">
          <div className="flex items-center justify-between w-full border-b border-slate-800 pb-1 mb-1.5 px-1">
            <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-wider">
              RADAR // POLO SUL
            </span>
            <span className="text-[9px] font-mono text-emerald-400">
              BASE: {telemetry.distanceToBaseM}m
            </span>
          </div>

          {/* Escopo do Radar SVG */}
          <div className="relative w-[150px] h-[150px]">
            <svg viewBox="0 0 150 150" className="w-full h-full">
              {/* Fundo do Radar */}
              <circle cx="75" cy="75" r="68" fill="#040812" stroke="#1e293b" strokeWidth="2" />

              {/* Anéis de Distância Concêntricos */}
              {/* Anel 500m */}
              <circle
                cx="75"
                cy="75"
                r={(500 / maxRangeM) * radarRadius}
                fill="none"
                stroke="rgba(56, 189, 248, 0.2)"
                strokeDasharray="2 3"
              />
              {/* Anel 1000m */}
              <circle
                cx="75"
                cy="75"
                r={(1000 / maxRangeM) * radarRadius}
                fill="none"
                stroke="rgba(56, 189, 248, 0.3)"
                strokeDasharray="4 4"
              />
              {/* Anel 2000m (Alvo) */}
              <circle
                cx="75"
                cy="75"
                r={(2000 / maxRangeM) * radarRadius}
                fill="none"
                stroke="rgba(56, 189, 248, 0.45)"
              />

              {/* Linhas de Mira Cruzadas */}
              <line x1="75" y1="11" x2="75" y2="139" stroke="rgba(30, 41, 59, 0.8)" strokeWidth="1" />
              <line x1="11" y1="75" x2="139" y2="75" stroke="rgba(30, 41, 59, 0.8)" strokeWidth="1" />

              {/* Rótulos dos Anéis */}
              <text x="77" y="58" fill="#475569" fontSize="7" fontFamily="monospace">500m</text>
              <text x="77" y="44" fill="#475569" fontSize="7" fontFamily="monospace">1km</text>
              <text x="77" y="19" fill="#475569" fontSize="7" fontFamily="monospace">2km</text>

              {/* Marcador Ciano/Verde: ESTAÇÃO WELWITSCHIA (BASE 0,0) */}
              <g transform={`translate(${baseBlipX}, ${baseBlipY})`}>
                <circle cx="0" cy="0" r="4.5" fill="#10b981" />
                <circle cx="0" cy="0" r="7.5" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.6" className="animate-ping" />
                <text x="6" y="3" fill="#34d399" fontSize="8" fontWeight="bold" fontFamily="monospace">
                  BASE
                </text>
              </g>

              {/* Marcador Âmbar: ROVER PERDIDO LRO-SCOUT */}
              {telemetry.isGpsActive ? (
                <g transform={`translate(${targetBlipX}, ${targetBlipY})`}>
                  <circle cx="0" cy="0" r="4.5" fill="#f59e0b" />
                  <circle cx="0" cy="0" r="8" fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0.7" className="animate-pulse" />
                  <text x="6" y="3" fill="#fbbf24" fontSize="8" fontWeight="bold" fontFamily="monospace">
                    LRO
                  </text>
                </g>
              ) : (
                /* Durante a tempestade de regolito: estática/interferência de sinal */
                <g transform={`translate(${targetBlipX}, ${targetBlipY})`}>
                  <line x1="-5" y1="-5" x2="5" y2="5" stroke="#f43f5e" strokeWidth="1.5" className="animate-pulse" />
                  <line x1="5" y1="-5" x2="-5" y2="5" stroke="#f43f5e" strokeWidth="1.5" className="animate-pulse" />
                  <text x="6" y="3" fill="#f43f5e" fontSize="7" fontWeight="bold" fontFamily="monospace">
                    ???
                  </text>
                </g>
              )}

              {/* Centro: Rover do Jogador (Triângulo ciano apontando na direção frontal) */}
              <polygon
                points="75,67 79,79 75,76 71,79"
                fill="#00f0ff"
                stroke="#0891b2"
                strokeWidth="1"
              />
              <circle cx="75" cy="75" r="2" fill="#ffffff" />
            </svg>
          </div>

          <div className="flex justify-between w-full text-[9px] font-mono text-slate-400 mt-1 px-1">
            <span>Rumo: {telemetry.headingDeg}°</span>
            <span className={telemetry.isGpsActive ? 'text-cyan-400' : 'text-rose-400 font-bold'}>
              {telemetry.isGpsActive ? 'GPS OK' : 'SEM GPS'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
