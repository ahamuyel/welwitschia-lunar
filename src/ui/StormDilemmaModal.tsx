/**
 * Welwitschia Lunar - Modal de Escolha Crítica do Dilema da Tempestade (Estado 4)
 * Disparado a 500m do alvo após impacto de micrometeoritos e perda de GPS.
 * Permite ao jogador escolher entre recuar à base ou avançar por instrumentos guiando-se pelo sonar.
 */

import React from 'react';

interface StormDilemmaModalProps {
  isOpen: boolean;
  onChooseRetreat: () => void;
  onChooseAdvance: () => void;
}

export const StormDilemmaModal: React.FC<StormDilemmaModalProps> = ({
  isOpen,
  onChooseRetreat,
  onChooseAdvance
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fadeIn pointer-events-auto">
      <div className="max-w-xl w-full bg-slate-950 border-2 border-rose-500 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6 text-center">
        {/* Ícone de Alerta Piscante */}
        <div className="w-16 h-16 rounded-full bg-rose-950/80 border-2 border-rose-500 mx-auto flex items-center justify-center text-3xl animate-pulse">
          🌪️
        </div>

        <div className="space-y-2">
          <div className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold tracking-widest bg-rose-950 text-rose-300 border border-rose-500/50">
            DILEMA CRÍTICO // 500 METROS DO ALVO
          </div>

          <h2 className="text-2xl md:text-3xl font-black text-white font-mono">
            TEMPESTADE DE REGOLITO ELEVEVADA!
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed font-sans text-left bg-slate-900/80 p-4 rounded-xl border border-slate-800">
            Um enxame de <strong>micrometeoritos</strong> colidiu com a borda da cratera, levantando uma 
            nuvem eletrostática de poeira lunar que reduziu a visibilidade para <strong>40 metros</strong> 
            e bloqueou a triangulação dos satélites GPS. O sintetizador de rádio ativou o 
            <strong> sonar acústico de proximidade</strong>.
          </p>
        </div>

        {/* Comparativo das Duas Decisões */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
          {/* Opção A: Recuar para a Base */}
          <div className="bg-slate-900/80 border border-slate-700 hover:border-slate-500 p-4 rounded-xl flex flex-col justify-between space-y-3 transition-colors">
            <div>
              <div className="font-mono font-bold text-sm text-slate-200 flex items-center gap-2">
                <span>🛡️</span>
                <span>OPÇÃO A: RECUAR</span>
              </div>
              <p className="text-xs text-slate-400 mt-2 font-mono leading-relaxed">
                Retorna o rover com segurança para a Estação Welwitschia. Aguarda o regolito assentar e recarrega os tanques de oxigênio.
              </p>
            </div>
            <button
              onClick={onChooseRetreat}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              [ RECUAR PARA A BASE ]
            </button>
          </div>

          {/* Opção B: Avançar por Instrumentos */}
          <div className="bg-slate-900/80 border border-cyan-500/60 hover:border-cyan-400 p-4 rounded-xl flex flex-col justify-between space-y-3 transition-colors">
            <div>
              <div className="font-mono font-bold text-sm text-cyan-300 flex items-center gap-2">
                <span>🧭</span>
                <span>OPÇÃO B: POR INSTRUMENTOS</span>
              </div>
              <p className="text-xs text-slate-400 mt-2 font-mono leading-relaxed">
                Mantenha rumo <strong className="text-amber-300">045° NE</strong> na bússola e velocidade <strong className="text-cyan-300">&lt; 15 km/h</strong>. Siga os bipes do sonar até 100m!
                <br />
                <span className="text-rose-400 font-bold">Aviso: Correr acima de 18 km/h causa dano no chassi!</span>
              </p>
            </div>
            <button
              onClick={onChooseAdvance}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-mono font-bold text-xs rounded-lg shadow-md transition-colors cursor-pointer"
            >
              [ AVANÇAR POR INSTRUMENTOS ]
            </button>
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-500">
          Decisão de comando sob responsabilidade do Comandante de Missão.
        </div>
      </div>
    </div>
  );
};
