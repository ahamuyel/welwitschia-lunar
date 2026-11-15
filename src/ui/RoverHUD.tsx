import React, { useState, useEffect } from 'react';
import type { ResourceState, TelemetryData, ActiveUIPanel } from '../types/game';
import type { TouchDriveInputs } from '../components/LunarGameCanvas';
import { soundManager } from '../audio/SoundManager';

interface RoverHUDProps {
  telemetry: TelemetryData;
  resources: ResourceState;
  activePanel: ActiveUIPanel;
  onChangeActivePanel: (panel: ActiveUIPanel) => void;
  onToggleHeadlights: () => void;
  onToggleCamera: () => void;
  onExtractData?: () => void;
  isNearBaseAirlock?: boolean;
  onEnterBase?: () => void;
  isVRActive: boolean;
  onToggleVR: () => void;
  isRadarVisible: boolean;
  onToggleRadar: () => void;
  isChatOpen: boolean;
  onToggleChat: () => void;
  onTouchDriveInputs?: (inputs: TouchDriveInputs) => void;
}

export const RoverHUD: React.FC<RoverHUDProps> = ({
  telemetry,
  resources,
  activePanel,
  onChangeActivePanel,
  onToggleHeadlights,
  onToggleCamera,
  onExtractData,
  isNearBaseAirlock,
  onEnterBase,
  isVRActive,
  onToggleVR,
  isRadarVisible,
  onToggleRadar,
  isChatOpen,
  onToggleChat,
  onTouchDriveInputs
}) => {
  const [isMuted, setIsMuted] = useState(soundManager.isAudioMuted());
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
    onChangeActivePanel('none');
  };

  const handleToggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
    onChangeActivePanel('none');
  };

  return (
    <div
      className="fixed inset-0 pointer-events-none z-20 select-none overflow-hidden"
      style={{
        paddingTop: 'max(8px, env(safe-area-inset-top))',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(12px, env(safe-area-inset-left))',
        paddingRight: 'max(12px, env(safe-area-inset-right))'
      }}
    >
      {/* 1. BARRA SUPERIOR ULTRA-FINA (height: 44px, padding: 0 12px) */}
      <div
        className="w-full flex items-center justify-between pointer-events-none"
        style={{ height: '44px', padding: '0 12px' }}
      >
        {/* À ESQUERDA: Pílula com 3 ícones essenciais */}
        <div className="pointer-events-none inline-flex items-center gap-2 px-3 min-h-[38px] rounded-full bg-slate-950/70 backdrop-blur-md border border-white/15 shadow-md text-xs font-semibold text-slate-100 whitespace-nowrap">
          <span className={resources.roverBattery < 25 ? 'text-red-400' : 'text-amber-300'}>
            ⚡ {Math.round(resources.roverBattery)}%
          </span>
          <span className="text-white/25">|</span>
          <span className={resources.suitOxygen < 30 ? 'text-red-400' : 'text-cyan-300'}>
            💨 {Math.round(resources.suitOxygen)}%
          </span>
          <span className="text-white/25">|</span>
          <span className="text-emerald-300">
            📍 {Math.round(telemetry.distanceToTargetM)}m
          </span>
        </div>

        {/* À DIREITA: Botões compactos (VR / 360°, 🧭 Radar e ☰) com min 44x44px e gap-2 */}
        <div className="pointer-events-none flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleVR}
            className={`pointer-events-auto min-h-[44px] min-w-[44px] px-3 rounded-full text-xs font-bold backdrop-blur-md border transition-all flex items-center justify-center cursor-pointer ${
              isVRActive
                ? 'bg-cyan-500/25 border-cyan-400/70 text-cyan-200'
                : 'bg-slate-950/70 border-white/15 text-slate-100'
            }`}
          >
            {isVRActive ? 'VR' : '360°'}
          </button>

          <button
            type="button"
            onClick={onToggleRadar}
            className={`pointer-events-auto min-h-[44px] min-w-[44px] px-2.5 rounded-full text-xs font-bold backdrop-blur-md border transition-all flex items-center justify-center cursor-pointer ${
              isRadarVisible
                ? 'bg-emerald-500/25 border-emerald-400/70 text-emerald-200'
                : 'bg-slate-950/70 border-white/15 text-slate-100'
            }`}
            title="Mostrar / Ocultar Radar Lunar"
          >
            🧭 Radar
          </button>

          <button
            type="button"
            onClick={onToggleChat}
            className={`pointer-events-auto min-h-[44px] min-w-[44px] px-2.5 rounded-full text-xs font-bold backdrop-blur-md border transition-all flex items-center justify-center cursor-pointer ${
              isChatOpen
                ? 'bg-cyan-500/25 border-cyan-400/70 text-cyan-200'
                : 'bg-slate-950/70 border-white/15 text-slate-100'
            }`}
            title="Abrir / Fechar Chat com IA Welly"
          >
            🤖 Welly
          </button>

          <button
            type="button"
            onClick={() => onChangeActivePanel(activePanel === 'menu' ? 'none' : 'menu')}
            className={`pointer-events-auto min-h-[44px] min-w-[44px] px-3 rounded-full text-sm font-bold backdrop-blur-md border transition-all flex items-center justify-center cursor-pointer ${
              activePanel === 'menu'
                ? 'bg-amber-500/30 border-amber-400/70 text-amber-200'
                : 'bg-slate-950/70 border-white/15 text-slate-100'
            }`}
          >
            ☰
          </button>
        </div>
      </div>

      {/* 2. GAVETA ☰ MENU DO ROVER (Só abre quando activePanel === 'menu') */}
      {activePanel === 'menu' && (
        <div
          className="fixed inset-0 z-30 pointer-events-auto bg-black/40 backdrop-blur-[2px] flex justify-end items-start pt-14 pr-3"
          onClick={() => onChangeActivePanel('none')}
        >
          <div
            className="w-64 max-w-[90vw] rounded-2xl bg-slate-950/95 border border-white/15 p-3.5 shadow-2xl text-xs text-slate-100 space-y-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-bold text-cyan-300">SISTEMAS DO ROVER</span>
              <button
                type="button"
                onClick={() => onChangeActivePanel('none')}
                className="min-h-[36px] min-w-[36px] rounded-lg bg-slate-900 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onToggleCamera();
                  onChangeActivePanel('none');
                }}
                className="min-h-[44px] px-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-100 font-semibold cursor-pointer"
              >
                🎥 Câmera ({telemetry.cameraMode === 'COCKPIT' ? '1ªP' : '3ªP'})
              </button>

              <button
                type="button"
                onClick={() => {
                  onToggleHeadlights();
                  onChangeActivePanel('none');
                }}
                className="min-h-[44px] px-2.5 rounded-xl bg-slate-900 border border-white/10 text-amber-200 font-semibold cursor-pointer"
              >
                🔦 Faróis {telemetry.isHeadlightsOn ? 'ON' : 'OFF'}
              </button>

              <button
                type="button"
                onClick={handleToggleSound}
                className="min-h-[44px] px-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-100 font-semibold cursor-pointer"
              >
                {isMuted ? '🔇 Sem Som' : '🔊 Som Ativo'}
              </button>

              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="min-h-[44px] px-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-100 font-semibold cursor-pointer"
              >
                {isFullscreen ? '🗗 Sair' : '⛶ Tela Cheia'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTÃO FLUTUANTE LIMPO "🚪 Entrar na Base" (Aparece automaticamente a < 4.0m da porta Airlock) */}
      {isNearBaseAirlock && onEnterBase && (
        <div className="fixed bottom-16 inset-x-0 flex justify-center pointer-events-none px-4 z-25">
          <button
            type="button"
            onClick={onEnterBase}
            className="pointer-events-auto min-h-[46px] px-6 py-2.5 rounded-full bg-cyan-500/90 hover:bg-cyan-400 text-slate-950 font-black text-xs sm:text-sm border border-cyan-200 shadow-xl backdrop-blur-md cursor-pointer"
          >
            🚪 Entrar na Base
          </button>
        </div>
      )}

      {/* BOTÃO DE EXTRAÇÃO DO MÓDULO LRO-SCOUT */}
      {onExtractData && (
        <div className="fixed bottom-16 inset-x-0 flex justify-center pointer-events-none px-4 z-25">
          <button
            type="button"
            onClick={onExtractData}
            className="pointer-events-auto min-h-[44px] px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm border border-emerald-300 shadow-xl backdrop-blur-md cursor-pointer"
          >
            📡 Extrair Dados de Gelo Lunar (Olhar 0.8s ou Toque)
          </button>
        </div>
      )}

      {/* CONTROLOS TÁTEIS DE CONDUÇÃO (44x44px mínimo, gap-2, apenas os botões têm pointer-events-auto) */}
      <div className="fixed bottom-3 left-3 z-25 flex items-center gap-2 pointer-events-none">
        <button
          type="button"
          onPointerDown={() => updateTouch({ left: true })}
          onPointerUp={() => updateTouch({ left: false })}
          onPointerCancel={() => updateTouch({ left: false })}
          onPointerLeave={() => updateTouch({ left: false })}
          className={`pointer-events-auto min-w-[48px] min-h-[48px] rounded-xl border font-bold text-base flex items-center justify-center backdrop-blur-md select-none ${
            touchState.left
              ? 'bg-cyan-500/45 border-cyan-300 text-white'
              : 'bg-slate-950/65 border-white/15 text-cyan-200'
          }`}
        >
          ◀
        </button>
        <button
          type="button"
          onPointerDown={() => updateTouch({ right: true })}
          onPointerUp={() => updateTouch({ right: false })}
          onPointerCancel={() => updateTouch({ right: false })}
          onPointerLeave={() => updateTouch({ right: false })}
          className={`pointer-events-auto min-w-[48px] min-h-[48px] rounded-xl border font-bold text-base flex items-center justify-center backdrop-blur-md select-none ${
            touchState.right
              ? 'bg-cyan-500/45 border-cyan-300 text-white'
              : 'bg-slate-950/65 border-white/15 text-cyan-200'
          }`}
        >
          ▶
        </button>
      </div>

      <div className="fixed bottom-3 right-3 z-25 flex items-center gap-2 pointer-events-none">
        <button
          type="button"
          onPointerDown={() => updateTouch({ backward: true })}
          onPointerUp={() => updateTouch({ backward: false })}
          onPointerCancel={() => updateTouch({ backward: false })}
          onPointerLeave={() => updateTouch({ backward: false })}
          className={`pointer-events-auto min-w-[48px] min-h-[48px] rounded-xl border font-bold text-xs flex items-center justify-center backdrop-blur-md select-none ${
            touchState.backward
              ? 'bg-amber-500/45 border-amber-300 text-white'
              : 'bg-slate-950/65 border-white/15 text-amber-200'
          }`}
        >
          ▼
        </button>
        <button
          type="button"
          onPointerDown={() => updateTouch({ forward: true })}
          onPointerUp={() => updateTouch({ forward: false })}
          onPointerCancel={() => updateTouch({ forward: false })}
          onPointerLeave={() => updateTouch({ forward: false })}
          className={`pointer-events-auto min-w-[52px] min-h-[52px] rounded-xl border font-bold text-sm flex items-center justify-center backdrop-blur-md select-none ${
            touchState.forward
              ? 'bg-emerald-500/50 border-emerald-300 text-white'
              : 'bg-slate-950/65 border-white/15 text-emerald-300'
          }`}
        >
          ▲
        </button>
      </div>
    </div>
  );
};
