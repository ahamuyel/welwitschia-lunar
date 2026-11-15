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
    <div
      className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center p-4"
      style={{
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(16px, env(safe-area-inset-left))',
        paddingRight: 'max(16px, env(safe-area-inset-right))'
      }}
    >
      <div className="pointer-events-auto w-full max-w-md max-h-[90dvh] overflow-y-auto text-center space-y-3.5 bg-slate-950/88 p-5 sm:p-6 rounded-2xl border border-cyan-500/35 backdrop-blur-md shadow-2xl">
        <div className="inline-block px-3 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-widest bg-cyan-950 text-cyan-300 border border-cyan-500/40">
          ARTEMIS 2032 • POLO SUL LUNAR
        </div>

        <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
          WELWITSCHIA <span className="text-cyan-400">LUNAR</span>
        </h1>

        <p className="text-xs sm:text-sm italic font-medium text-amber-300">
          "Das raízes de Angola às fronteiras da Lua"
        </p>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          Comande a Estação Welwitschia em VR ou 360°, mantenha as 4 estações vitais e resgate os dados de gelo polar da sonda <strong className="text-cyan-300">LRO-Scout</strong>.
        </p>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleStart}
            className="w-full min-h-[48px] px-6 py-3 rounded-xl font-black text-sm tracking-wider bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>🚀</span>
            <span>INICIAR MISSÃO</span>
          </button>
        </div>
      </div>
    </div>
  );
};
