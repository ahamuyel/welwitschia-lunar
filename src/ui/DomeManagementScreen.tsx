import React, { useState, useEffect } from 'react';
import type {
  ResourceState,
  DomeInteractions,
  BaseInteriorState,
  BaseEmergencyType
} from '../types/game';
import { soundManager } from '../audio/SoundManager';

interface DomeManagementScreenProps {
  resources: ResourceState;
  interactions: DomeInteractions;
  baseInterior: BaseInteriorState;
  isVRActive: boolean;
  onToggleVR: () => void;
  onRedirectEnergy: () => void;
  onRefillSuitOxygen: () => void;
  onViewBriefing: () => void;
  onOpenAirlock: () => void;
  onTriggerEmergency: (type: BaseEmergencyType) => void;
  onResolveEmergencyChoice: (choice: 'A' | 'B') => void;
  onCalibrateValve: (valveNumber: 1 | 2) => void;
  onCycleHologram: () => void;
}

export const DomeManagementScreen: React.FC<DomeManagementScreenProps> = ({
  resources,
  interactions,
  baseInterior,
  isVRActive,
  onToggleVR,
  onRedirectEnergy,
  onRefillSuitOxygen,
  onViewBriefing,
  onOpenAirlock,
  onTriggerEmergency,
  onResolveEmergencyChoice,
  onCalibrateValve,
  onCycleHologram
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const canOpenAirlock =
    interactions.energyRedirected &&
    interactions.suitRefilled &&
    interactions.briefingViewed;

  const activeEm = baseInterior.activeEmergency;
  const valveCal = baseInterior.valveCalibration;

  // Notificação flutuante educativa (Toast Pill) que desaparece sozinha após 4.5s
  useEffect(() => {
    const feedback = baseInterior.lastConsequenceFeedback;
    if (!feedback) return;
    setToastMessage(`${feedback.title}: ${feedback.scientificReason}`);
    const timer = window.setTimeout(() => {
      setToastMessage(null);
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [baseInterior.lastConsequenceFeedback]);

  // Notificação flutuante ao desbloquear descoberta científica
  useEffect(() => {
    if (!baseInterior.lastDiscoveryTitle || baseInterior.discoveriesUnlocked <= 1) return;
    setToastMessage(`🔬 Descoberta: ${baseInterior.lastDiscoveryTitle}`);
    const timer = window.setTimeout(() => {
      setToastMessage(null);
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [baseInterior.discoveriesUnlocked, baseInterior.lastDiscoveryTitle]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

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

  // Formata texto compacto para os cartões de decisão (Ícone + Título Curto + Efeito Direto)
  const formatDecisionCard = (choice: 'A' | 'B', rawLabel: string, costText: string) => {
    const cleaned = rawLabel.replace(/^\[[AB]\]\s*/, '');
    const match = cleaned.match(/^([^(]+)(\(.+\))?$/);
    const title = match ? match[1].trim() : cleaned;
    const effect = match && match[2] ? match[2].trim() : `(${costText})`;

    let icon = choice === 'A' ? '🛡️' : '🏠';
    if (activeEm?.type === 'LUNAR_NIGHT_COLD') icon = choice === 'A' ? '🔥' : '❄️';
    if (activeEm?.type === 'ELECTROSTATIC_DUST') icon = choice === 'A' ? '⚡' : '🧑‍🚀';
    if (activeEm?.type === 'OXYGEN_LEAK') icon = choice === 'A' ? '🔧' : '👁️';

    return { icon, title, effect };
  };

  return (
    <div className="fixed inset-0 z-20 pointer-events-none select-none overflow-hidden">
      {/* BARRA TOPO ULTRA-MÍNIMA: Pílula de Telemetria (< 6% altura) + 4 Botões Glassmorphism */}
      <div className="w-full px-3 pt-2 flex items-center justify-between gap-2 max-w-[96vw] mx-auto">
        {/* PÍLULA DISCRETA DE TELEMETRIA (⚡ Bateria, 💨 O2, 🌡️ Temp, 🔬 Ciência) */}
        <div
          className="pointer-events-auto flex items-center gap-2 sm:gap-3.5 px-3 py-1 rounded-full bg-slate-950/60 backdrop-blur-md border border-white/15 shadow-lg text-[11px] sm:text-xs font-medium tracking-tight text-slate-100"
          style={{ maxHeight: '5.5dvh' }}
        >
          <span className="flex items-center gap-1 whitespace-nowrap" title="Bateria da Base">
            <span>⚡</span>
            <strong className={resources.baseSolarEnergy < 30 ? 'text-red-400' : 'text-amber-300'}>
              {Math.round(resources.baseSolarEnergy)}%
            </strong>
          </span>
          <span className="text-white/20">•</span>
          <span className="flex items-center gap-1 whitespace-nowrap" title="Oxigénio O2">
            <span>💨</span>
            <strong className={resources.baseOxygen < 40 ? 'text-red-400' : 'text-cyan-300'}>
              {Math.round(resources.baseOxygen)}%
            </strong>
          </span>
          <span className="text-white/20">•</span>
          <span className="flex items-center gap-1 whitespace-nowrap" title="Temperatura da Cabine">
            <span>🌡️</span>
            <strong className={baseInterior.cabinTempC < 10 ? 'text-sky-300' : 'text-emerald-300'}>
              {baseInterior.cabinTempC}°C
            </strong>
          </span>
          <span className="text-white/20">•</span>
          <button
            onClick={onCycleHologram}
            className="flex items-center gap-1 whitespace-nowrap hover:text-cyan-300 transition-colors cursor-pointer"
            title="Descobertas Científicas (Toque para mudar Holograma 3D)"
          >
            <span>🔬</span>
            <strong className="text-purple-300">{baseInterior.discoveriesUnlocked}</strong>
          </button>
        </div>

        {/* BOTÕES COMPACTOS TRANSLÚCIDOS: [VR / 360°], [Tela Cheia], [Som], [Menu] */}
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
            title="Alternar Modo VR / Modo 360°"
          >
            {isVRActive ? '🥽 VR' : '🌐 360°'}
          </button>

          <button
            onClick={handleToggleFullscreen}
            className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-slate-950/60 hover:bg-slate-900/80 text-slate-200 border border-white/15 backdrop-blur-md transition-all cursor-pointer"
            title="Alternar Tela Cheia"
          >
            {isFullscreen ? '🗗' : '⛶'}
          </button>

          <button
            onClick={handleToggleSound}
            className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-slate-950/60 hover:bg-slate-900/80 text-slate-200 border border-white/15 backdrop-blur-md transition-all cursor-pointer"
            title="Ligar / Desligar Som"
          >
            {isMuted ? '🔇' : '🔊'}
          </button>

          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold backdrop-blur-md border transition-all cursor-pointer ${
              menuOpen
                ? 'bg-amber-500/30 border-amber-400/60 text-amber-200'
                : 'bg-slate-950/60 border-white/15 text-slate-200 hover:bg-slate-900/80'
            }`}
            title="Menu da Base & EVA"
          >
            ☰ Menu
          </button>
        </div>
      </div>

      {/* NOTIFICAÇÃO FLUTUANTE LEVE (TOAST PILL) — desaparece sozinha em 4.5s */}
      {toastMessage && !activeEm && !valveCal.active && (
        <div className="w-full px-4 mt-2 flex justify-center pointer-events-none">
          <div className="max-w-lg px-4 py-1.5 rounded-full bg-slate-950/75 backdrop-blur-md border border-cyan-400/35 text-[11px] sm:text-xs text-cyan-100 shadow-lg text-center line-clamp-2">
            ✨ {toastMessage}
          </div>
        </div>
      )}

      {/* GAVETA COMPACTA DE MENU (Abre apenas quando o utilizador toca em [Menu]) */}
      {menuOpen && (
        <div className="pointer-events-auto fixed top-11 right-3 z-30 w-64 rounded-2xl bg-slate-950/88 backdrop-blur-xl border border-white/15 p-3 shadow-2xl text-xs text-slate-100 space-y-2.5">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <span className="font-bold text-cyan-300 tracking-wide text-[11px]">
              ESTAÇÕES DA BASE (EVA)
            </span>
            <button
              onClick={() => setMenuOpen(false)}
              className="text-slate-400 hover:text-white px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={onRedirectEnergy}
              disabled={interactions.energyRedirected}
              className={`px-2 py-1.5 rounded-lg font-semibold text-[11px] border text-left transition-all cursor-pointer ${
                interactions.energyRedirected
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-900/80 border-white/10 text-amber-200 hover:border-amber-400/50'
              }`}
            >
              🛡️ 1. Energia {interactions.energyRedirected ? '✓' : ''}
            </button>

            <button
              onClick={onRefillSuitOxygen}
              disabled={interactions.suitRefilled}
              className={`px-2 py-1.5 rounded-lg font-semibold text-[11px] border text-left transition-all cursor-pointer ${
                interactions.suitRefilled
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-900/80 border-white/10 text-cyan-200 hover:border-cyan-400/50'
              }`}
            >
              💨 2. O₂ Traje {interactions.suitRefilled ? '✓' : ''}
            </button>

            <button
              onClick={onViewBriefing}
              disabled={interactions.briefingViewed}
              className={`px-2 py-1.5 rounded-lg font-semibold text-[11px] border text-left transition-all cursor-pointer ${
                interactions.briefingViewed
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-900/80 border-white/10 text-purple-200 hover:border-purple-400/50'
              }`}
            >
              🌱 3. Estufa {interactions.briefingViewed ? '✓' : ''}
            </button>

            <button
              onClick={onOpenAirlock}
              disabled={!canOpenAirlock || interactions.airlockOpened}
              className={`px-2 py-1.5 rounded-lg font-bold text-[11px] border text-left transition-all cursor-pointer ${
                canOpenAirlock
                  ? 'bg-emerald-600/80 border-emerald-400 text-white'
                  : 'bg-slate-900/40 border-white/5 text-slate-500 cursor-not-allowed'
              }`}
            >
              🚪 4. Sair EVA
            </button>
          </div>

          <div className="pt-1 border-t border-white/10">
            <span className="block text-[10px] text-slate-400 mb-1.5">
              SIMULAR EMERGÊNCIA TÁTICA:
            </span>
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => {
                  onTriggerEmergency('SOLAR_STORM');
                  setMenuOpen(false);
                }}
                className="px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/30 border border-amber-400/30 text-amber-200 text-[10px] cursor-pointer"
              >
                ☀️ Tempestade
              </button>
              <button
                onClick={() => {
                  onTriggerEmergency('LUNAR_NIGHT_COLD');
                  setMenuOpen(false);
                }}
                className="px-2 py-1 rounded bg-sky-500/15 hover:bg-sky-500/30 border border-sky-400/30 text-sky-200 text-[10px] cursor-pointer"
              >
                ❄️ Noite Lunar
              </button>
              <button
                onClick={() => {
                  onTriggerEmergency('ELECTROSTATIC_DUST');
                  setMenuOpen(false);
                }}
                className="px-2 py-1 rounded bg-yellow-500/15 hover:bg-yellow-500/30 border border-yellow-400/30 text-yellow-200 text-[10px] cursor-pointer"
              >
                🌫️ Poeira Solar
              </button>
              <button
                onClick={() => {
                  onTriggerEmergency('OXYGEN_LEAK');
                  setMenuOpen(false);
                }}
                className="px-2 py-1 rounded bg-red-500/15 hover:bg-red-500/30 border border-red-400/30 text-red-200 text-[10px] cursor-pointer"
              >
                💨 Fuga O₂
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CALIBRAÇÃO DE 2 VÁLVULAS O2 (Pílula flutuante compacta na parte inferior) */}
      {valveCal.active && (
        <div className="fixed bottom-3 inset-x-0 px-4 flex justify-center pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2.5 px-4 py-2 rounded-full bg-red-950/80 backdrop-blur-md border border-red-400/50 shadow-xl text-xs text-white">
            <span className="font-bold text-red-200 whitespace-nowrap">
              ⏱️ {valveCal.timeRemainingSec.toFixed(1)}s
            </span>
            <button
              onClick={() => onCalibrateValve(1)}
              disabled={valveCal.valve1Calibrated}
              className={`px-3 py-1 rounded-full font-bold text-[11px] transition-all cursor-pointer ${
                valveCal.valve1Calibrated
                  ? 'bg-emerald-600/80 text-white'
                  : 'bg-red-600 hover:bg-red-500 text-white'
              }`}
            >
              {valveCal.valve1Calibrated ? '✓ Válvula #1' : '🔧 Válvula #1'}
            </button>
            <button
              onClick={() => onCalibrateValve(2)}
              disabled={valveCal.valve2Calibrated}
              className={`px-3 py-1 rounded-full font-bold text-[11px] transition-all cursor-pointer ${
                valveCal.valve2Calibrated
                  ? 'bg-emerald-600/80 text-white'
                  : 'bg-red-600 hover:bg-red-500 text-white'
              }`}
            >
              {valveCal.valve2Calibrated ? '✓ Válvula #2' : '🔧 Válvula #2'}
            </button>
          </div>
        </div>
      )}

      {/* MOMENTOS DE DECISÃO: 2 CARTÕES HOLOGRÁFICOS LIMPOS (Ícone + Título Curto + Efeito Direto) */}
      {activeEm && !valveCal.active && (() => {
        const cardA = formatDecisionCard('A', activeEm.optionA.label, activeEm.optionA.costText);
        const cardB = formatDecisionCard('B', activeEm.optionB.label, activeEm.optionB.costText);
        return (
          <div className="fixed bottom-3 inset-x-0 px-3 flex flex-col items-center gap-1.5 pointer-events-none">
            <div className="px-3 py-0.5 rounded-full bg-red-950/75 backdrop-blur-md border border-red-400/40 text-[10px] sm:text-xs font-bold text-red-200 tracking-wide">
              ⚠️ {activeEm.title} — Olhe 0.8s em 3D ou Toque:
            </div>
            <div className="pointer-events-auto grid grid-cols-2 gap-2.5 w-full max-w-lg">
              <button
                onClick={() => onResolveEmergencyChoice('A')}
                className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-slate-950/75 hover:bg-cyan-950/70 backdrop-blur-md border border-cyan-400/50 shadow-lg transition-all cursor-pointer text-center"
              >
                <span className="text-sm sm:text-base font-extrabold text-cyan-200 leading-tight">
                  {cardA.icon} {cardA.title}
                </span>
                <span className="text-[11px] sm:text-xs font-semibold text-cyan-300/90 mt-0.5">
                  {cardA.effect}
                </span>
              </button>

              <button
                onClick={() => onResolveEmergencyChoice('B')}
                className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-slate-950/75 hover:bg-amber-950/70 backdrop-blur-md border border-amber-400/50 shadow-lg transition-all cursor-pointer text-center"
              >
                <span className="text-sm sm:text-base font-extrabold text-amber-200 leading-tight">
                  {cardB.icon} {cardB.title}
                </span>
                <span className="text-[11px] sm:text-xs font-semibold text-amber-300/90 mt-0.5">
                  {cardB.effect}
                </span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* BOTÃO FLUTUANTE DISCRETO DE SAÍDA EVA QUANDO AS 3 ESTAÇÕES ESTÃO PRONTAS */}
      {canOpenAirlock && !interactions.airlockOpened && !activeEm && !valveCal.active && (
        <div className="fixed bottom-3 inset-x-0 flex justify-center pointer-events-none">
          <button
            onClick={onOpenAirlock}
            className="pointer-events-auto px-5 py-1.5 rounded-full bg-emerald-600/80 hover:bg-emerald-500 backdrop-blur-md border border-emerald-300/60 text-white font-bold text-xs shadow-lg transition-all cursor-pointer"
          >
            🚪 Sair para Missão Lunar (EVA)
          </button>
        </div>
      )}
    </div>
  );
};
