/**
 * Welwitschia Lunar - Tela de Prólogo / Inicial (Estado 1: STATE_PROLOGUE)
 * Câmera orbitando suavemente a Estação Welwitschia sob o sol polar rasante.
 * Título, subtítulo, botão [ INICIAR MISSÃO ] e contextualização histórica/científica.
 */

import React from 'react';
import { soundManager } from '../audio/SoundManager';

interface PrologueScreenProps {
  onStartMission: () => void;
}

export const PrologueScreen: React.FC<PrologueScreenProps> = ({ onStartMission }) => {
  const handleStart = () => {
    soundManager.init();
    soundManager.playSuccessChime();
    onStartMission();
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-between p-6 md:p-12">
      {/* Cabeçalho da Missão Artemis 2032 */}
      <div className="pointer-events-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-400 flex items-center justify-center font-black text-cyan-300 text-lg shadow-lg">
            WL
          </div>
          <div>
            <div className="text-xs font-mono tracking-widest text-cyan-400 font-bold">
              PROGRAMA ARTEMIS • ANO 2032
            </div>
            <div className="text-sm font-semibold text-slate-300">
              Borda da Cratera Shackleton • Polo Sul Lunar
            </div>
          </div>
        </div>

        <div className="hidden sm:block text-right font-mono text-xs text-slate-400 border border-slate-800 bg-slate-900/60 px-3 py-1.5 rounded-lg">
          <div>EQUIPE: <span className="text-amber-400 font-bold">MOCHILEIROS DA GALÁXIA</span></div>
          <div>STATUS: <span className="text-emerald-400 font-bold">CIRCUITO FECHADO EDUCATIVO</span></div>
        </div>
      </div>

      {/* Bloco Central de Título & Subtítulo */}
      <div className="pointer-events-auto relative z-40 max-w-2xl mx-auto text-center space-y-5 my-auto bg-slate-950/85 p-6 md:p-8 rounded-2xl border border-cyan-500/30 backdrop-blur-md shadow-2xl">
        <div className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold tracking-widest bg-cyan-950 text-cyan-300 border border-cyan-500/40">
          SIMULADOR ESPACIAL 3D
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white drop-shadow-md">
          WELWITSCHIA <span className="text-cyan-400">LUNAR</span>
        </h1>

        <p className="text-base md:text-lg italic font-medium text-amber-300">
          "Das raízes de Angola às fronteiras da Lua"
        </p>

        <p className="text-sm md:text-base text-slate-300 leading-relaxed font-sans max-w-xl mx-auto">
          Você é o Comandante da Estação Welwitschia no Polo Sul da Lua. 
          O rover robótico explorador <strong className="text-cyan-300">LRO-Scout</strong> parou de transmitir dados 
          a 2.000 metros de distância. Prepare a base, faça o briefing de saída veicular e conduza o rover tripulado 
          através do terreno lunar para recuperar os dados científicos essenciais para a refinaria de combustível!
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleStart}
            className="w-full sm:w-auto px-8 py-4 rounded-xl font-black text-base tracking-wider bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 transition-all transform hover:scale-105 shadow-xl hover:shadow-cyan-500/40 active:scale-95 flex items-center justify-center gap-3 cursor-pointer"
          >
            <span className="text-xl">🚀</span>
            <span>[ INICIAR MISSÃO ]</span>
          </button>
        </div>
      </div>

      {/* Rodapé informativo */}
      <div className="pointer-events-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-mono gap-2">
        <div>Controles: W/S (Acelerar/Ré) • A/D (Direção) • Espaço (Freio) • L (Faróis) • C (Câmera)</div>
        <div>100% Offline-First • 60 FPS • Web Audio & WebGL</div>
      </div>
    </div>
  );
};
