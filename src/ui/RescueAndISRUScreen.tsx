/**
 * Welwitschia Lunar - Tela de Resgate & Simulação Visual ISRU (Estado 5)
 * Diagrama animado de eletrólise de água lunar: Gelo (H2O) -> Eletrólise -> O2 + H2
 * Enchimento do tanque criogênico do foguete para Marte (0% a 100%),
 * Relatório de Missão com eficiência e selos educativos desbloqueados.
 */

import React, { useState, useEffect } from 'react';
import type { MissionReport } from '../types/game';
import { soundManager } from '../audio/SoundManager';

interface RescueAndISRUScreenProps {
  report: MissionReport;
  onRestart: () => void;
}

export const RescueAndISRUScreen: React.FC<RescueAndISRUScreenProps> = ({
  report,
  onRestart
}) => {
  const [tankProgress, setTankProgress] = useState<number>(0);
  const [isElectrolysisComplete, setIsElectrolysisComplete] = useState<boolean>(false);

  // Animação de eletrólise e abastecimento do tanque do foguete de 0% a 100%
  useEffect(() => {
    soundManager.playSuccessChime();

    const interval = setInterval(() => {
      setTankProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsElectrolysisComplete(true);
          soundManager.playUiBeep(1040, 0.2);
          return 100;
        }
        return prev + 1;
      });
    }, 45); // ~4.5 segundos para completar

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/95 overflow-y-auto p-4 md:p-8 flex flex-col justify-between animate-fadeIn text-slate-100">
      {/* Top Header */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between border-b border-cyan-500/30 pb-4">
        <div>
          <span className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase">
            ESTAÇÃO WELWITSCHIA // RELATÓRIO FINAL
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-white font-mono mt-0.5">
            RESGATE CONCLUÍDO & REFINARIA ISRU ATIVA
          </h1>
        </div>
        <div className="text-right font-mono text-xs text-emerald-400 bg-emerald-950/50 border border-emerald-500/40 px-3 py-1.5 rounded-lg">
          STATUS: MISSÃO BEM-SUCEDIDA
        </div>
      </div>

      {/* Conteúdo Central: Simulação Visual ISRU + Relatório de Missão */}
      <div className="max-w-4xl mx-auto w-full my-6 space-y-6">
        {/* Bloco 1: Diagrama Animado de Conversão ISRU (In-Situ Resource Utilization) */}
        <div className="bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono font-bold text-cyan-300 tracking-wider flex items-center gap-2">
              <span>🔬</span>
              <span>SIMULAÇÃO VISUAL DE ENGENHARIA ISRU (IN-SITU RESOURCE UTILIZATION)</span>
            </h2>
            <span className="text-xs font-mono text-amber-300">
              ALIMENTADO POR ENERGIA SOLAR VERTICAL
            </span>
          </div>

          {/* Diagrama de fluxo animado: Gelo Lunar -> Eletrólise -> O2 + H2 Líquido */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center text-center font-mono">
            {/* Etapa 1: Gelo Lunar */}
            <div className="p-4 rounded-xl bg-slate-950 border border-blue-400/50 shadow-inner">
              <div className="text-2xl mb-1">🧊</div>
              <div className="text-xs font-bold text-blue-300">Gelo Lunar (H₂O)</div>
              <div className="text-[10px] text-slate-400 mt-1">Extraído de crateras permanentemente sombreadas (-200 °C)</div>
            </div>

            {/* Seta 1 */}
            <div className="hidden md:flex justify-center text-cyan-400 font-bold text-xl animate-pulse">
              ➔
            </div>

            {/* Etapa 2: Eletrólise com Eletricidade Solar */}
            <div className="p-4 rounded-xl bg-slate-950 border border-amber-400/50 shadow-inner relative overflow-hidden">
              <div className="text-2xl mb-1 animate-spin">⚡</div>
              <div className="text-xs font-bold text-amber-300">[ ELETRÓLISE ]</div>
              <div className="text-[10px] text-slate-400 mt-1">Quebra catalítica da água: 2 H₂O + Energia ➔ 2 H₂ + O₂</div>
              <div
                className="absolute inset-0 bg-amber-500/10 pointer-events-none animate-pulse"
                style={{ animationDuration: '1.2s' }}
              />
            </div>

            {/* Seta 2 */}
            <div className="hidden md:flex justify-center text-cyan-400 font-bold text-xl animate-pulse">
              ➔
            </div>

            {/* Etapa 3: Propelente Criogênico Separado */}
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-400/50 shadow-inner">
              <div className="text-2xl mb-1">🚀</div>
              <div className="text-xs font-bold text-emerald-300">LOX (O₂) + LH₂ (H₂)</div>
              <div className="text-[10px] text-slate-400 mt-1">Oxigênio Líquido (-183°C) e Hidrogênio Líquido (-253°C)</div>
            </div>
          </div>

          {/* Barra de Abastecimento Criogênico do Foguete */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">TANQUE DE RETORNO / FOGUETE PARA MARTE:</span>
              <span className="text-cyan-300 font-bold">{tankProgress}% ABASTECIDO</span>
            </div>
            <div className="w-full h-5 bg-slate-950 rounded-full overflow-hidden border border-cyan-500/50 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 rounded-full transition-all duration-75 relative"
                style={{ width: `${tankProgress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>
            <div className="text-[11px] font-mono text-slate-400 italic">
              {isElectrolysisComplete
                ? '✔ Propelente criogênico 100% sintetizado! Veículo pronto para viagem interplanetária.'
                : 'Processando fluxo de água e condensando gases em reservatórios criogênicos isolados...'}
            </div>
          </div>
        </div>

        {/* Bloco 2: Relatório de Desempenho e Selos Educativos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Métricas de Eficiência */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3 font-mono">
            <h3 className="text-xs font-bold text-cyan-400 tracking-wider uppercase border-b border-slate-800 pb-2">
              EFICIÊNCIA DE OPERAÇÃO NO POLO SUL
            </h3>

            <div className="flex justify-between items-center text-sm p-2 rounded bg-slate-950 border border-slate-800/80">
              <span className="text-slate-300">Oxigênio Remanescente do Traje:</span>
              <span className="text-cyan-300 font-bold">{report.oxygenEfficiency}%</span>
            </div>

            <div className="flex justify-between items-center text-sm p-2 rounded bg-slate-950 border border-slate-800/80">
              <span className="text-slate-300">Bateria Remanescente do Rover:</span>
              <span className="text-amber-300 font-bold">{report.batteryEfficiency}%</span>
            </div>

            <div className="flex justify-between items-center text-sm p-2 rounded bg-slate-950 border border-slate-800/80">
              <span className="text-slate-300">Integridade Estrutural do Chassi:</span>
              <span className="text-emerald-300 font-bold">{report.roverIntegrity}%</span>
            </div>
          </div>

          {/* Selos Educativos Conquistados */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-2.5 font-mono">
            <h3 className="text-xs font-bold text-amber-400 tracking-wider uppercase border-b border-slate-800 pb-2">
              SELOS CIENTÍFICOS DESBLOQUEADOS
            </h3>

            {report.badges.map((badge) => (
              <div
                key={badge.id}
                className={`p-2.5 rounded-xl border flex items-center gap-3 transition-all ${
                  badge.unlocked
                    ? 'border-amber-500/50 bg-amber-950/20 text-slate-200'
                    : 'border-slate-800 bg-slate-950/40 text-slate-500 opacity-60'
                }`}
              >
                <span className="text-2xl">{badge.icon}</span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-amber-300">{badge.title}</div>
                  <div className="text-[10px] text-slate-400 truncate">{badge.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rodapé com Botão de Reiniciar Missão */}
      <div className="max-w-4xl mx-auto w-full pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-xs font-mono text-slate-500">
          Equipe Mochileiros da Galáxia • Jogo Educacional 3D • 100% Offline
        </span>
        <button
          onClick={onRestart}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black font-mono text-sm tracking-wider shadow-lg hover:shadow-cyan-500/40 transition-all cursor-pointer"
        >
          [ REINICIAR EXPLORAÇÃO LUNAR ]
        </button>
      </div>
    </div>
  );
};
