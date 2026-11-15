import React, { useState, useEffect } from 'react';
import type {
  ResourceState,
  DomeInteractions,
  BaseInteriorState,
  BaseEmergencyType,
  ActiveUIPanel
} from '../types/game';
import { soundManager } from '../audio/SoundManager';

interface DomeManagementScreenProps {
  resources: ResourceState;
  interactions: DomeInteractions;
  baseInterior: BaseInteriorState;
  activePanel: ActiveUIPanel;
  onChangeActivePanel: (panel: ActiveUIPanel) => void;
  isVRActive: boolean;
  onToggleVR: () => void;
  isRadarVisible: boolean;
  onToggleRadar: () => void;
  isChatOpen: boolean;
  onToggleChat: () => void;
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
  activePanel,
  onChangeActivePanel,
  isVRActive,
  onToggleVR,
  isRadarVisible,
  onToggleRadar,
  isChatOpen,
  onToggleChat,
  onRedirectEnergy,
  onRefillSuitOxygen,
  onViewBriefing,
  onOpenAirlock,
  onTriggerEmergency,
  onResolveEmergencyChoice,
  onCalibrateValve,
  onCycleHologram
}) => {
  const [isMuted, setIsMuted] = useState(soundManager.isAudioMuted());
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [selectedStation, setSelectedStation] = useState<'OXYGEN' | 'SHIELD' | 'GREENHOUSE' | 'LAB'>('OXYGEN');

  const canOpenAirlock =
    interactions.energyRedirected &&
    interactions.suitRefilled &&
    interactions.briefingViewed;

  const activeEm = baseInterior.activeEmergency;
  const valveCal = baseInterior.valveCalibration;
  const scienceScore = Math.min(60, baseInterior.discoveriesUnlocked * 20);

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
    onChangeActivePanel('none');
  };

  const handleToggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
    onChangeActivePanel('none');
  };

  const formatDecisionCard = (choice: 'A' | 'B', rawLabel: string, costText: string) => {
    const cleaned = rawLabel.replace(/^\[[AB]\]\s*/, '');
    const match = cleaned.match(/^([^(]+)(\(.+\))?$/);
    const title = match ? match[1].trim() : cleaned;
    const effect = match && match[2] ? match[2].trim() : `(${costText})`;

    let icon = choice === 'A' ? '🛡️' : '🏠';
    if (activeEm?.type === 'LUNAR_NIGHT_COLD') icon = choice === 'A' ? '🔥' : '❄️';
    if (activeEm?.type === 'ELECTROSTATIC_DUST') icon = choice === 'A' ? '⚡' : '🧑‍🚀';
    if (activeEm?.type === 'OXYGEN_LEAK') icon = choice === 'A' ? '🔧' : '👁️';
    if (activeEm?.type === 'FUEL_CELL_OVERLOAD') icon = choice === 'A' ? '🌡️' : '🔬';
    if (activeEm?.type === 'GREENHOUSE_DEHYDRATION') icon = choice === 'A' ? '💧' : '🌱';

    return { icon, title, effect };
  };

  return (
    <div
      className="fixed inset-0 z-20 pointer-events-none select-none overflow-hidden"
      style={{
        paddingTop: 'max(8px, env(safe-area-inset-top))',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(12px, env(safe-area-inset-left))',
        paddingRight: 'max(12px, env(safe-area-inset-right))'
      }}
    >
      {/* 1. BARRA SUPERIOR ULTRA-FINA (height: 44px, padding: 0 12px, pointer-events-none no container) */}
      <div
        className="w-full flex items-center justify-between pointer-events-none"
        style={{ height: '44px', padding: '0 12px' }}
      >
        {/* À ESQUERDA: 1 pílula minúscula com apenas 3 ícones essenciais (⚡ 80% | 💨 90% | 🔬 0/60) */}
        <div className="pointer-events-auto inline-flex items-center gap-2 px-3 min-h-[38px] rounded-full bg-slate-950/70 backdrop-blur-md border border-white/15 shadow-md text-xs font-semibold text-slate-100 whitespace-nowrap">
          <span className={resources.baseSolarEnergy < 30 ? 'text-red-400' : 'text-amber-300'}>
            ⚡ {Math.round(resources.baseSolarEnergy)}%
          </span>
          <span className="text-white/25">|</span>
          <span className={resources.baseOxygen < 40 ? 'text-red-400' : 'text-cyan-300'}>
            💨 {Math.round(resources.baseOxygen)}%
          </span>
          <span className="text-white/25">|</span>
          <button
            type="button"
            onClick={() => {
              onCycleHologram();
              setSelectedStation('LAB');
              onChangeActivePanel('station-detail');
            }}
            className="text-purple-300 hover:text-cyan-200 transition-colors cursor-pointer"
            title="Ciência & Holograma 3D"
          >
            🔬 {scienceScore}/60
          </button>
          <span className="text-white/25">|</span>
          <span className="text-[11px] font-bold text-emerald-300">
            <span className="sm:hidden">
              {baseInterior.narrativeAct === 1 ? 'Ato I' : baseInterior.narrativeAct === 2 ? 'Ato II' : 'Ato III'}
            </span>
            <span className="hidden sm:inline">
              {baseInterior.narrativeAct === 1
                ? 'Ato I: Shackleton'
                : baseInterior.narrativeAct === 2
                ? 'Ato II: Noite Lunar'
                : 'Ato III: Amanhecer'}
            </span>
          </span>
        </div>

        {/* À DIREITA: botões compactos (VR / 360°, 🧭 Radar e ☰) com área de toque mínima 44x44px e gap-2 */}
        <div className="pointer-events-none flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleVR}
            className={`pointer-events-auto min-h-[44px] min-w-[44px] px-3 rounded-full text-xs font-bold backdrop-blur-md border transition-all flex items-center justify-center cursor-pointer ${
              isVRActive
                ? 'bg-cyan-500/25 border-cyan-400/70 text-cyan-200'
                : 'bg-slate-950/70 border-white/15 text-slate-100'
            }`}
            title="Alternar VR / 360°"
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
            title="Abrir Menu"
          >
            ☰
          </button>
        </div>
      </div>

      {/* 2. GAVETA ☰ MENU (Só renderiza quando activePanel === 'menu'; fecha ao clicar fora ou escolher uma ação) */}
      {activePanel === 'menu' && (
        <div
          className="fixed inset-0 z-30 pointer-events-auto bg-black/40 backdrop-blur-[2px] flex justify-end items-start pt-14 pr-3"
          onClick={() => onChangeActivePanel('none')}
        >
          <div
            className="w-72 max-w-[90vw] max-h-[80dvh] overflow-y-auto rounded-2xl bg-slate-950/95 border border-white/15 p-3.5 shadow-2xl text-xs text-slate-100 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div>
                <span className="block font-bold text-cyan-300 tracking-wide">MENU DA ESTAÇÃO</span>
                <span className="block text-[10px] font-semibold text-emerald-300">
                  {baseInterior.narrativeActTitle} ({baseInterior.missionProgressPct}%)
                </span>
              </div>
              <button
                type="button"
                onClick={() => onChangeActivePanel('none')}
                className="min-h-[36px] min-w-[36px] rounded-lg bg-slate-900 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Controlos Rápidos: Som e Tela Cheia */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleToggleSound}
                className="min-h-[44px] px-3 rounded-xl bg-slate-900 border border-white/10 text-slate-100 font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{isMuted ? '🔇' : '🔊'}</span>
                <span>{isMuted ? 'Sem Som' : 'Som Ativo'}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="min-h-[44px] px-3 rounded-xl bg-slate-900 border border-white/10 text-slate-100 font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{isFullscreen ? '🗗' : '⛶'}</span>
                <span>Tela Cheia</span>
              </button>
            </div>

            {/* Estações da Base & Saída EVA */}
            <div className="space-y-1.5 pt-1 border-t border-white/10">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">
                Preparação de EVA & Estações 3D
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onRedirectEnergy();
                    onChangeActivePanel('none');
                  }}
                  className={`min-h-[44px] px-2.5 rounded-xl font-semibold text-left border transition-all cursor-pointer ${
                    interactions.energyRedirected
                      ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-900 border-white/10 text-amber-200'
                  }`}
                >
                  🛡️ 1. Energia {interactions.energyRedirected ? '✓' : ''}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onRefillSuitOxygen();
                    onChangeActivePanel('none');
                  }}
                  className={`min-h-[44px] px-2.5 rounded-xl font-semibold text-left border transition-all cursor-pointer ${
                    interactions.suitRefilled
                      ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-900 border-white/10 text-cyan-200'
                  }`}
                >
                  💨 2. O₂ Traje {interactions.suitRefilled ? '✓' : ''}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onViewBriefing();
                    onChangeActivePanel('none');
                  }}
                  className={`min-h-[44px] px-2.5 rounded-xl font-semibold text-left border transition-all cursor-pointer ${
                    interactions.briefingViewed
                      ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-900 border-white/10 text-purple-200'
                  }`}
                >
                  🌱 3. Ciência {interactions.briefingViewed ? '✓' : ''}
                </button>

                <button
                  type="button"
                  disabled={!canOpenAirlock || interactions.airlockOpened}
                  onClick={() => {
                    onOpenAirlock();
                    onChangeActivePanel('none');
                  }}
                  className={`min-h-[44px] px-2.5 rounded-xl font-bold text-left border transition-all ${
                    canOpenAirlock
                      ? 'bg-emerald-600 border-emerald-300 text-white cursor-pointer'
                      : 'bg-slate-900/40 border-white/5 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  🚪 4. Sair EVA
                </button>
              </div>
            </div>

            {/* Simulador de Emergências Táticas (Motor Autónomo NASA ativo a cada 22s-45s) */}
            <div className="space-y-1.5 pt-1 border-t border-white/10">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">
                Catálogo NASA (6 Eventos Autónomos + Teste)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onTriggerEmergency('SOLAR_STORM');
                  }}
                  className="min-h-[40px] px-2 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-200 font-semibold cursor-pointer"
                >
                  ☀️ Partículas SPE
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onTriggerEmergency('LUNAR_NIGHT_COLD');
                  }}
                  className="min-h-[40px] px-2 rounded-xl bg-sky-500/15 border border-sky-400/40 text-sky-200 font-semibold cursor-pointer"
                >
                  ❄️ Noite -173°C
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onTriggerEmergency('ELECTROSTATIC_DUST');
                  }}
                  className="min-h-[40px] px-2 rounded-xl bg-yellow-500/15 border border-yellow-400/40 text-yellow-200 font-semibold cursor-pointer"
                >
                  🌫️ Poeira EDS
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onTriggerEmergency('OXYGEN_LEAK');
                  }}
                  className="min-h-[40px] px-2 rounded-xl bg-red-500/15 border border-red-400/40 text-red-200 font-semibold cursor-pointer"
                >
                  💨 Fuga 10⁻¹² torr
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onTriggerEmergency('FUEL_CELL_OVERLOAD');
                  }}
                  className="min-h-[40px] px-2 rounded-xl bg-orange-500/15 border border-orange-400/40 text-orange-200 font-semibold cursor-pointer"
                >
                  🌡️ Pico +127°C
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onTriggerEmergency('GREENHOUSE_DEHYDRATION');
                  }}
                  className="min-h-[40px] px-2 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 font-semibold cursor-pointer"
                >
                  💧 Seca ISRU
                </button>
              </div>
            </div>

            {/* Inspecionar Detalhes das Estações */}
            <div className="space-y-1.5 pt-1 border-t border-white/10">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">
                Detalhes da Estação
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'OXYGEN', label: '💨 Suporte O₂' },
                    { id: 'SHIELD', label: '🛡️ Blindagem' },
                    { id: 'GREENHOUSE', label: '🌱 Estufa' },
                    { id: 'LAB', label: '🔬 Lab 3D' }
                  ] as const
                ).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      setSelectedStation(st.id);
                      onChangeActivePanel('station-detail');
                    }}
                    className="min-h-[44px] px-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-200 font-medium cursor-pointer"
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. DETALHE DE ESTAÇÃO (Só renderiza quando activePanel === 'station-detail') */}
      {activePanel === 'station-detail' && (
        <div
          className="fixed inset-0 z-30 pointer-events-auto bg-black/35 flex items-end justify-center pb-4 px-3"
          onClick={() => onChangeActivePanel('none')}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-slate-950/92 backdrop-blur-xl border border-cyan-400/40 p-3.5 shadow-2xl text-xs text-slate-100 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-300">
                {selectedStation === 'OXYGEN' && '💨 ESTAÇÃO DE SUPORTE DE VIDA (O₂)'}
                {selectedStation === 'SHIELD' && '🛡️ BLINDAGEM SOLAR KAPTON'}
                {selectedStation === 'GREENHOUSE' && '🌱 ESTUFA INTERIOR WELWITSCHIA'}
                {selectedStation === 'LAB' && '🔬 LABORATÓRIO HOLOGRÁFICO 3D'}
              </span>
              <button
                type="button"
                onClick={() => onChangeActivePanel('none')}
                className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-900 text-slate-200 font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-slate-300 leading-relaxed">
              {selectedStation === 'OXYGEN' &&
                `Pressão de O₂: ${Math.round(resources.baseOxygen)}% • Traje EVA: ${Math.round(resources.suitOxygen)}%. Eletrólise de gelo polar ativa.`}
              {selectedStation === 'SHIELD' &&
                `Energia Solar: ${Math.round(resources.baseSolarEnergy)}% • Bateria Rover: ${Math.round(resources.roverBattery)}%. Bobinas Kapton operacionais.`}
              {selectedStation === 'GREENHOUSE' &&
                `Temperatura da Cabine: ${baseInterior.cabinTempC}°C • Estado da Welwitschia mirabilis: ${
                  baseInterior.greenhouseHealthy ? 'Verde vibrante' : 'Em modo economia'
                }.`}
              {selectedStation === 'LAB' &&
                `Holograma ativo: ${baseInterior.activeHologram} • Pontos de Ciência: ${scienceScore}/60.`}
            </p>
          </div>
        </div>
      )}

      {/* 4. CARTÕES DE DECISÃO TÁTICA COM TIMER DE URGÊNCIA (16s -> 0s) E GANHO vs SACRIFÍCIO */}
      {activePanel === 'decision' && activeEm && !valveCal.active && (() => {
        const cardA = formatDecisionCard('A', activeEm.optionA.label, activeEm.optionA.costText);
        const cardB = formatDecisionCard('B', activeEm.optionB.label, activeEm.optionB.costText);
        const timeLeft = Math.max(0, baseInterior.decisionTimeRemaining);
        const maxTime = Math.max(1, baseInterior.decisionMaxTime || 16);
        const pct = Math.min(100, Math.max(0, (timeLeft / maxTime) * 100));
        const isCritical = timeLeft <= 5.0;
        const isWarning = timeLeft > 5.0 && timeLeft <= 8.0;

        const timerTextColor = isCritical
          ? 'text-red-200 animate-pulse'
          : isWarning
          ? 'text-amber-200'
          : 'text-cyan-200';
        const timerBarColor = isCritical
          ? 'bg-red-500 animate-pulse'
          : isWarning
          ? 'bg-amber-400'
          : 'bg-cyan-400';
        const headerBorderColor = isCritical
          ? 'border-red-500/80 bg-red-950/90'
          : isWarning
          ? 'border-amber-400/70 bg-amber-950/90'
          : 'border-cyan-400/60 bg-slate-950/90';

        return (
          <div className="fixed bottom-3 inset-x-0 px-3 flex flex-col items-center gap-2 pointer-events-none z-30">
            {/* Topo do Cartão: Título da Emergência + Contador Numérico Grande + Barra de Progresso Decrescente */}
            <div
              className={`w-full max-w-lg rounded-2xl backdrop-blur-md border px-3.5 py-2 shadow-2xl ${headerBorderColor}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-white truncate">
                  ⚠️ {activeEm.title}
                </span>
                <span className={`text-sm sm:text-base font-black tabular-nums shrink-0 ${timerTextColor}`}>
                  ⏱️ {Math.ceil(timeLeft)}s
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-900/90 overflow-hidden mt-1.5 border border-white/10">
                <div
                  className={`h-full transition-all duration-100 ${timerBarColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* 2 Cartões de Escolha com GANHO (Verde) e SACRIFÍCIO (Âmbar/Vermelho) */}
            <div className="pointer-events-none grid grid-cols-2 gap-2.5 w-full max-w-lg">
              <button
                type="button"
                onClick={() => {
                  onResolveEmergencyChoice('A');
                  onChangeActivePanel('none');
                }}
                className="pointer-events-auto min-h-[78px] p-2.5 rounded-2xl bg-slate-950/92 hover:bg-cyan-950/85 backdrop-blur-md border border-cyan-400/65 shadow-xl flex flex-col items-center justify-center text-center cursor-pointer gap-0.5"
              >
                <span className="text-xs font-extrabold text-cyan-100 leading-tight">
                  {cardA.icon} {cardA.title}
                </span>
                <span className="text-[11px] font-bold text-emerald-300 leading-tight">
                  {activeEm.optionA.gainText}
                </span>
                <span className="text-[11px] font-bold text-amber-300 leading-tight">
                  {activeEm.optionA.sacrificeText}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onResolveEmergencyChoice('B');
                  onChangeActivePanel('none');
                }}
                className="pointer-events-auto min-h-[78px] p-2.5 rounded-2xl bg-slate-950/92 hover:bg-amber-950/85 backdrop-blur-md border border-amber-400/65 shadow-xl flex flex-col items-center justify-center text-center cursor-pointer gap-0.5"
              >
                <span className="text-xs font-extrabold text-amber-100 leading-tight">
                  {cardB.icon} {cardB.title}
                </span>
                <span className="text-[11px] font-bold text-emerald-300 leading-tight">
                  {activeEm.optionB.gainText}
                </span>
                <span className="text-[11px] font-bold text-rose-300 leading-tight">
                  {activeEm.optionB.sacrificeText}
                </span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* CALIBRAÇÃO DE 2 VÁLVULAS O2 (Só renderiza durante calibração ativa de 12s) */}
      {valveCal.active && (
        <div className="fixed bottom-3 inset-x-0 px-3 flex justify-center pointer-events-none z-30">
          <div className="pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-950/88 backdrop-blur-md border border-red-400/50 shadow-xl text-xs text-white">
            <span className="font-bold text-red-200 whitespace-nowrap px-1">
              ⏱️ {valveCal.timeRemainingSec.toFixed(1)}s
            </span>
            <button
              type="button"
              onClick={() => onCalibrateValve(1)}
              disabled={valveCal.valve1Calibrated}
              className={`pointer-events-auto min-h-[44px] px-3 rounded-full font-bold text-xs transition-all cursor-pointer ${
                valveCal.valve1Calibrated ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
              }`}
            >
              {valveCal.valve1Calibrated ? '✓ Válvula #1' : '🔧 Válvula #1'}
            </button>
            <button
              type="button"
              onClick={() => onCalibrateValve(2)}
              disabled={valveCal.valve2Calibrated}
              className={`pointer-events-auto min-h-[44px] px-3 rounded-full font-bold text-xs transition-all cursor-pointer ${
                valveCal.valve2Calibrated ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
              }`}
            >
              {valveCal.valve2Calibrated ? '✓ Válvula #2' : '🔧 Válvula #2'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
