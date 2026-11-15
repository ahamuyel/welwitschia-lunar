/**
 * Welwitschia Lunar - Atalhos de Controles (Discreto / Tecla H ou [ ? ])
 * Oculto por padrão para limpeza do HUD, acionado apenas por clique ou tecla 'H'.
 */

import React, { useState, useEffect } from 'react';

export const ControlsHelp: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      if (e.code === 'KeyH') {
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="fixed top-4 right-36 z-40 pointer-events-auto">
      {/* Botão discreto [ ? ] no topo */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-full border border-slate-700 bg-slate-950/80 hover:bg-slate-900 text-slate-300 hover:text-cyan-300 font-mono text-xs font-bold flex items-center justify-center shadow-lg backdrop-blur-md transition-all cursor-pointer"
        title="Atalhos de Teclado [ Pressione 'H' ]"
      >
        ?
      </button>

      {/* Modal limpo de atalhos */}
      {isOpen && (
        <div className="absolute top-10 right-0 w-72 bg-slate-950/95 border border-cyan-500/40 p-4 rounded-2xl shadow-2xl backdrop-blur-xl font-mono text-xs text-slate-300 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-cyan-400 font-bold">
            <span className="flex items-center gap-1.5">
              <span>⌨</span>
              <span>CONTROLES [ H ]</span>
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded text-xs hover:bg-slate-800"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px]">
            <div><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">W / ▲</kbd> Acelerar</div>
            <div><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">S / ▼</kbd> Ré</div>
            <div><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">A / D</kbd> Direção</div>
            <div><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">Espaço</kbd> Freio</div>
            <div><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-cyan-300">L</kbd> Faróis</div>
            <div><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-cyan-300">C</kbd> Câmera</div>
            <div className="col-span-2 text-emerald-400 pt-1 border-t border-slate-800/80">
              <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-300">E</kbd> Extrair / Resgate
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
