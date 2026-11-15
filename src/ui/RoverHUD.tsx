import React, { useState, useEffect } from 'react';
import type { ResourceState, TelemetryData } from '../types/game';
import type { TouchDriveInputs } from '../components/LunarGameCanvas';
import { soundManager } from '../audio/SoundManager';

interface RoverHUDProps {
  telemetry: TelemetryData;
  resources: ResourceState;
  onToggleHeadlights: () => void;
  onToggleCamera: () => void;
  onExtractData?: () => void;
  isVRActive: boolean;
  onToggleVR: () => void;
  onTouchDriveInputs?: (inputs: TouchDriveInputs) => void;
}

export const RoverHUD: React.FC<RoverHUDProps> = ({
  telemetry,
  resources,
  onToggleHeadlights,
  onToggleCamera,
  onExtractData,
  isVRActive,
  onToggleVR,
  onTouchDriveInputs
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [touchState, setTouchState] = useState<TouchDriveInputs>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    brake: false
  });

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const updateTouch = (patch: Partial<TouchDriveInputs>) => {
    setTouchState((prev) => {
      const next = { ...prev, ...patch };
      onTouchDriveInputs?.(next);
      return next;
    });
  };

  const handleToggleFullscreen = () => {
    soundManager.playUiBeep(780, 0.05);
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const handleToggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const speedKmh = Math.abs(Math.round(telemetry.speedKmh));

  return (
    <div className="fixed inset-0 pointer-events-none z-20 select-none overflow-hidden">
      {/* BARRA TOPO MÍNIMA: Pílula de Telemetria (< 6% altura) + Botões Compactos Glassmorphism */}
      <div className="w-full px-3 pt-2 flex items-center justify-between gap-2 max-w-[96vw] mx-auto">
        <div
          className="pointer-events-auto flex items-center gap-2 sm:gap-3.5 px-3 py-1 rounded-full bg-slate-950/60 backdrop-blur-md border border-white/15 shadow-lg text-[11px] sm:text-xs font-medium tracking-tight text-slate-100"
          style={{ maxHeight: '5.5dvh' }}
        >
          <span className="flex items-center gap-1 whitespace-nowrap" title="Bateria do Rover">
            <span>⚡</span>
            <strong className={resources.roverBattery < 25 ? 'text-red-400' : 'text-amber-300'}>
              {Math.round(resources.roverBattery)}%
            </strong>
          </span>
          <span className="text-white/20">•</span>
          <span className="flex items-center gap-1 whitespace-nowrap" title="Oxigénio do Traje">
            <span>💨</span>
            <strong className={resources.suitOxygen < 30 ? 'text-red-400' : 'text-cyan-300'}>
              {Math.round(resources.suitOxygen)}%
            </strong>
          </span>
          <span className="text-white/20">•</span>
          <span className="flex items-center gap-1 whitespace-nowrap" title="Distância ao LRO-Scout">
            <span>📍</span>
            <strong className="text-emerald-300">{Math.round(telemetry.distanceToTargetM)}m</strong>
          </span>
          <span className="hidden sm:inline text-white/20">•</span>
          <span className="hidden sm:flex items-center gap-1 whitespace-nowrap text-slate-300">
            🚀 {speedKmh} km/h
          </span>
        </div>

        {/* BOTÕES COMPACTOS TRANSLÚCIDOS */}
        <div
          className="pointer-events-auto flex items-center gap-1.5"
          style={{ maxHeight: '5.5dvh' }}
        >
          <button
            onClick={onToggleVR}
            className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold backdrop-blur-md border transition-all cursor-pointer ${
              isVRActive
                ? 'bg-cyan-500/25 border-cyan-400/60 text-cyan-200'
                : 'bg-slate-950/60 border-white/15 text-slate-200 hover:bg-slate-900/80'
            }`}
          >
            {isVRActive ? '🥽 VR' : '🌐 360°'}
          </button>

          <button
            onClick={onToggleCamera}
            className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-slate-950/60 hover:bg-slate-900/80 text-slate-200 border border-white/15 backdrop-blur-md transition-all cursor-pointer"
            title="Alternar Câmera"
          >
            🎥 {telemetry.cameraMode === 'COCKPIT' ? '1ªP' : '3ªP'}
          </button>

          <button
            onClick={onToggleHeadlights}
            className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-medium backdrop-blur-md border transition-all cursor-pointer ${
              telemetry.isHeadlightsOn
                ? 'bg-amber-500/25 border-amber-400/50 text-amber-200'
                : 'bg-slate-950/60 border-white/15 text-slate-400'
            }`}
            title="Faróis LED"
          >
            🔦
          </button>

          <button
            onClick={handleToggleFullscreen}
            className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-slate-950/60 hover:bg-slate-900/80 text-slate-200 border border-white/15 backdrop-blur-md transition-all cursor-pointer"
            title="Tela Cheia"
          >
            {isFullscreen ? '🗗' : '⛶'}
          </button>

          <button
            onClick={handleToggleSound}
            className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-slate-950/60 hover:bg-slate-900/80 text-slate-200 border border-white/15 backdrop-blur-md transition-all cursor-pointer"
            title="Som"
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      {/* ALERTA DE TEMPESTADE COMPACTO (Toast Pill) */}
      {telemetry.isInStorm && (
        <div className="w-full px-4 mt-2 flex justify-center pointer-events-none">
          <div className="px-3.5 py-1 rounded-full bg-amber-950/75 border border-amber-400/50 text-amber-200 text-[11px] font-semibold backdrop-blur-md">
            ⚠️ Tempestade Solar — Siga o sinal verde até ao LRO-Scout ({Math.round(telemetry.distanceToTargetM)}m)
          </div>
        </div>
      )}

      {/* BOTÃO DE EXTRAÇÃO DO MÓDULO LRO-SCOUT */}
      {onExtractData && (
        <div className="fixed bottom-16 inset-x-0 flex justify-center pointer-events-none px-4">
          <button
            onClick={onExtractData}
            className="pointer-events-auto px-5 py-2.5 rounded-full bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm border border-emerald-300 shadow-xl backdrop-blur-md cursor-pointer"
          >
            📡 Extrair Dados de Gelo Lunar (Olhar 0.8s ou Toque)
          </button>
        </div>
      )}

      {/* CONTROLOS TÁTEIS DISCRETOS PARA CONDUÇÃO EM MODO 360° MOBILE */}
      {!isVRActive && (
        <>
          <div className="fixed bottom-3 left-3 z-30 flex items-center gap-1.5 pointer-events-auto">
            <button
              onPointerDown={() => updateTouch({ left: true })}
              onPointerUp={() => updateTouch({ left: false })}
              onPointerCancel={() => updateTouch({ left: false })}
              onPointerLeave={() => updateTouch({ left: false })}
              className={`w-11 h-11 rounded-xl border font-bold text-base flex items-center justify-center backdrop-blur-md select-none ${
                touchState.left
                  ? 'bg-cyan-500/40 border-cyan-300 text-white'
                  : 'bg-slate-950/55 border-white/15 text-cyan-200'
              }`}
            >
              ◀
            </button>
            <button
              onPointerDown={() => updateTouch({ right: true })}
              onPointerUp={() => updateTouch({ right: false })}
              onPointerCancel={() => updateTouch({ right: false })}
              onPointerLeave={() => updateTouch({ right: false })}
              className={`w-11 h-11 rounded-xl border font-bold text-base flex items-center justify-center backdrop-blur-md select-none ${
                touchState.right
                  ? 'bg-cyan-500/40 border-cyan-300 text-white'
                  : 'bg-slate-950/55 border-white/15 text-cyan-200'
              }`}
            >
              ▶
            </button>
          </div>

          <div className="fixed bottom-3 right-3 z-30 flex items-center gap-1.5 pointer-events-auto">
            <button
              onPointerDown={() => updateTouch({ backward: true })}
              onPointerUp={() => updateTouch({ backward: false })}
              onPointerCancel={() => updateTouch({ backward: false })}
              onPointerLeave={() => updateTouch({ backward: false })}
              className={`w-11 h-11 rounded-xl border font-bold text-xs flex items-center justify-center backdrop-blur-md select-none ${
                touchState.backward
                  ? 'bg-amber-500/40 border-amber-300 text-white'
                  : 'bg-slate-950/55 border-white/15 text-amber-200'
              }`}
            >
              ▼
            </button>
            <button
              onPointerDown={() => updateTouch({ forward: true })}
              onPointerUp={() => updateTouch({ forward: false })}
              onPointerCancel={() => updateTouch({ forward: false })}
              onPointerLeave={() => updateTouch({ forward: false })}
              className={`w-12 h-12 rounded-xl border font-bold text-sm flex items-center justify-center backdrop-blur-md select-none ${
                touchState.forward
                  ? 'bg-emerald-500/45 border-emerald-300 text-white'
                  : 'bg-slate-950/55 border-white/15 text-emerald-300'
              }`}
            >
              ▲
            </button>
          </div>
        </>
      )}
    </div>
  );
};
