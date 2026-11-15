/**
 * Welwitschia Lunar - Painel de Comando da Cúpula (Estado 2: STATE_DOME_MANAGEMENT)
 * Gerenciamento de recursos da base e preparativos obrigatórios para Atividade Extraveicular (EVA).
 */

import React, { useState } from 'react';
import type { ResourceState, DomeInteractions } from '../types/game';

interface DomeManagementScreenProps {
  resources: ResourceState;
  interactions: DomeInteractions;
  onRedirectEnergy: () => void;
  onRefillSuitOxygen: () => void;
  onViewBriefing: () => void;
  onOpenAirlock: () => void;
}

export const DomeManagementScreen: React.FC<DomeManagementScreenProps> = ({
  resources,
  interactions,
  onRedirectEnergy,
  onRefillSuitOxygen,
  onViewBriefing,
  onOpenAirlock
}) => {
  const [briefingModalOpen, setBriefingModalOpen] = useState<boolean>(false);
  const [isOpeningAirlock, setIsOpeningAirlock] = useState<boolean>(false);

  const canOpen = interactions.energyRedirected && interactions.suitRefilled && interactions.briefingViewed;

  const handleOpenAirlock = () => {
    if (!canOpen || isOpeningAirlock) return;
    setIsOpeningAirlock(true);
    onOpenAirlock();
  };

  const handleOpenBriefing = () => {
    setBriefingModalOpen(true);
    onViewBriefing();
  };

  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-4 md:p-8">
      {/* Top Bar: Telemetria da Base */}
      <div className="pointer-events-auto flex items-center justify-between bg-slate-950/80 border border-slate-800 p-4 rounded-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-xs md:text-sm font-bold tracking-widest text-slate-200">
            ESTAÇÃO WELWITSCHIA // MÓDULO DE COMANDO CENTRAL
          </span>
        </div>
        <div className="text-xs font-mono text-cyan-400">
          PRESSÃO INTERNA: 101.3 kPa • O₂ BASE: {resources.baseOxygen}%
        </div>
      </div>

      {/* Painel Central: Status de Recursos & Ações Preparatórias Obrigatórias */}
      <div className="pointer-events-auto max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-4 my-auto">
        {/* Coluna 1: Diagnóstico dos Sistemas e Alertas */}
        <div className="bg-slate-950/90 border border-cyan-500/40 rounded-xl p-5 backdrop-blur-lg shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-black text-cyan-300 font-mono tracking-wider flex items-center gap-2">
              <span>⚡</span>
              <span>DIAGNÓSTICO DE ENERGIA & AR</span>
            </h2>
            <span className="text-xs font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded">
              ALERTA DE REGOLITO
            </span>
          </div>

          {/* Energia Solar com Alerta de Regolito */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1 text-slate-300">
              <span>CAPTAÇÃO SOLAR DOS PAINÉIS:</span>
              <span className="text-amber-400 font-bold">{resources.baseSolarEnergy}%</span>
            </div>
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-amber-500 transition-all duration-500"
                style={{ width: `${resources.baseSolarEnergy}%` }}
              />
            </div>
            <p className="text-[11px] text-amber-300/80 mt-1 font-mono italic">
              ⚠ Regolito eletrostático cobrindo os painéis fotovoltaicos reduziu a geração em 40%.
            </p>
          </div>

          {/* Bateria do Rover */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1 text-slate-300">
              <span>BATERIA DO ROVER TRIPULADO:</span>
              <span className={resources.roverBattery === 100 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {Math.round(resources.roverBattery)}%
              </span>
            </div>
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full transition-all duration-500 ${
                  resources.roverBattery === 100 ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ width: `${resources.roverBattery}%` }}
              />
            </div>
          </div>

          {/* Oxigênio do Traje */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1 text-slate-300">
              <span>OXIGÊNIO DO TRAJE DE EVA:</span>
              <span className={resources.suitOxygen === 100 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {Math.round(resources.suitOxygen)}%
              </span>
            </div>
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full transition-all duration-500 ${
                  resources.suitOxygen === 100 ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ width: `${resources.suitOxygen}%` }}
              />
            </div>
          </div>
        </div>

        {/* Coluna 2: Protocolos Obrigatórios Pré-Saída */}
        <div className="bg-slate-950/90 border border-cyan-500/40 rounded-xl p-5 backdrop-blur-lg shadow-xl space-y-3 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-black text-cyan-300 font-mono tracking-wider border-b border-slate-800 pb-3 mb-4 flex items-center gap-2">
              <span>🛠️</span>
              <span>LISTA DE PREPARAÇÃO DE EVA</span>
            </h2>

            <div className="space-y-2.5">
              {/* Botão 1: Redirecionar Energia */}
              <button
                onClick={onRedirectEnergy}
                disabled={interactions.energyRedirected}
                className={`w-full text-left p-3 rounded-lg border font-mono text-xs md:text-sm font-bold flex items-center justify-between transition-all ${
                  interactions.energyRedirected
                    ? 'border-emerald-500/60 bg-emerald-950/30 text-emerald-300 cursor-default'
                    : 'border-cyan-500/50 bg-cyan-950/30 text-cyan-200 hover:bg-cyan-900/50 hover:border-cyan-400 cursor-pointer'
                }`}
              >
                <span>1. REDIRECIONAR ENERGIA PARA O ROVER</span>
                <span>{interactions.energyRedirected ? '✔ PRONTO (100%)' : '[ CLIQUE PARA CARREGAR ]'}</span>
              </button>

              {/* Botão 2: Reabastecer Oxigênio */}
              <button
                onClick={onRefillSuitOxygen}
                disabled={interactions.suitRefilled}
                className={`w-full text-left p-3 rounded-lg border font-mono text-xs md:text-sm font-bold flex items-center justify-between transition-all ${
                  interactions.suitRefilled
                    ? 'border-emerald-500/60 bg-emerald-950/30 text-emerald-300 cursor-default'
                    : 'border-cyan-500/50 bg-cyan-950/30 text-cyan-200 hover:bg-cyan-900/50 hover:border-cyan-400 cursor-pointer'
                }`}
              >
                <span>2. REABASTECER OXIGÊNIO DO TRAJE</span>
                <span>{interactions.suitRefilled ? '✔ PRONTO (100%)' : '[ CLIQUE PARA ENCHER ]'}</span>
              </button>

              {/* Botão 3: Visualizar Briefing EVA */}
              <button
                onClick={handleOpenBriefing}
                className={`w-full text-left p-3 rounded-lg border font-mono text-xs md:text-sm font-bold flex items-center justify-between transition-all ${
                  interactions.briefingViewed
                    ? 'border-emerald-500/60 bg-emerald-950/30 text-emerald-300'
                    : 'border-amber-500/50 bg-amber-950/30 text-amber-200 hover:bg-amber-900/50 hover:border-amber-400 cursor-pointer animate-pulse'
                }`}
              >
                <span>3. VISUALIZAR CARD EVA BRIEFING</span>
                <span>{interactions.briefingViewed ? '✔ LIDO' : '[ ABRIR CARD ]'}</span>
              </button>
            </div>
          </div>

          {/* Botão 4: Abrir Escotilha (Airlock) */}
          <div className="pt-2">
            <button
              onClick={handleOpenAirlock}
              disabled={!canOpen || isOpeningAirlock}
              className={`w-full py-4 rounded-xl font-mono font-black text-sm md:text-base tracking-wider flex items-center justify-center gap-3 transition-all ${
                canOpen && !isOpeningAirlock
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-lg shadow-amber-500/40 cursor-pointer animate-pulse'
                  : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
              }`}
            >
              <span>🚪</span>
              <span>
                {isOpeningAirlock
                  ? 'DESPRESSURIZANDO ESCOTILHA...'
                  : canOpen
                  ? '[ ABRIR ESCOTILHA (AIRLOCK) ]'
                  : 'COMPLETE OS 3 ITENS ANTES DE SAIR'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal do EVA Briefing */}
      {briefingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn pointer-events-auto">
          <div className="max-w-md w-full bg-slate-950 border-2 border-amber-500 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black font-mono text-amber-400 flex items-center gap-2">
                <span>📋</span>
                <span>EVA BRIEFING // POLO SUL</span>
              </h3>
              <button
                onClick={() => setBriefingModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1 border border-slate-800 rounded"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-sm text-slate-200">
              <div className="flex justify-between p-2.5 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400">TEMPERATURA EXTERNA:</span>
                <span className="text-cyan-400 font-bold">-130 °C</span>
              </div>
              <div className="flex justify-between p-2.5 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400">GRAVIDADE LOCAL:</span>
                <span className="text-amber-400 font-bold">1,62 m/s² (1/6 da Terra)</span>
              </div>
              <div className="flex justify-between p-2.5 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400">ALVO (LRO-SCOUT):</span>
                <span className="text-emerald-400 font-bold">2.000m NE (Azimute 045°)</span>
              </div>
              <div className="p-3 rounded bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs leading-relaxed">
                <strong>⚠ ALERTA DE RISCO:</strong> Micrometeoritos e nuvens balísticas de regolito eletrostático foram detectados a 500m do alvo. Evite exceder 15 km/h em áreas de baixa visibilidade!
              </div>
            </div>

            <button
              onClick={() => setBriefingModalOpen(false)}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black font-mono rounded-xl transition-all cursor-pointer"
            >
              CONFIRMAR LEITURA DO BRIEFING
            </button>
          </div>
        </div>
      )}

      {/* Rodapé */}
      <div className="pointer-events-auto text-center font-mono text-xs text-slate-500">
        Estação Welwitschia 2032 • Controle Ambiental e Suporte de Vida (ECLSS)
      </div>
    </div>
  );
};
