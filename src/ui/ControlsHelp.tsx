/**
 * Welwitschia Lunar - Overlay de Ajuda dos Controles (Teclado)
 */

import React, { useState } from 'react';

export const ControlsHelp: React.FC = () => {
  const [minimized, setMinimized] = useState<boolean>(true);

  return (
    <div className="fixed bottom-4 right-[185px] z-30 pointer-events-auto">
      {minimized ? (
        <button
          onClick={() => setMinimized(false)}
          className="bg-slate-950/80 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white text-xs font-mono px-3 py-1.5 rounded-lg shadow-lg backdrop-blur-md transition-all cursor-pointer"
        >
          ⌨ CONTROLES
        </button>
      ) : (
        <div className="bg-slate-950/90 border border-slate-800 p-3.5 rounded-xl shadow-2xl backdrop-blur-md font-mono text-xs text-slate-300 space-y-2 max-w-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-cyan-400 font-bold">
            <span>COMANDOS DO ROVER</span>
            <button
              onClick={() => setMinimized(true)}
              className="text-slate-500 hover:text-white px-1"
            >
              _
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
            <div><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">W</kbd> / <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">▲</kbd> Acelerar</div>
            <div><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">S</kbd> / <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">▼</kbd> Ré</div>
            <div><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">A</kbd> / <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">D</kbd> Direção</div>
            <div><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">Espaço</kbd> Freio</div>
            <div><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-cyan-300">L</kbd> Faróis</div>
            <div><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-cyan-300">C</kbd> Câmera</div>
            <div className="col-span-2 text-emerald-400"><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-300">E</kbd> Extrair / Interagir</div>
          </div>
        </div>
      )}
    </div>
  );
};
