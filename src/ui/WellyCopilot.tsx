import React, { useState, useEffect } from 'react';
import type { GameState, ResourceState, TelemetryData, WellyMood } from '../types/game';
import { soundManager } from '../audio/SoundManager';

interface WellyCopilotProps {
  currentTrigger: string;
  telemetry: TelemetryData;
  resources: ResourceState;
  gameState: GameState;
}

const WELLY_TOAST_MESSAGES: Record<string, { text: string; mood: WellyMood }> = {
  ON_START: {
    text: 'Bem-vindo à Estação Welwitschia (Polo Sul Lunar, 2032)!',
    mood: 'HAPPY'
  },
  ON_DOME_ENTER: {
    text: 'Cabine pressurizada! Olhe 0.8s para as estações 3D ou toque nelas.',
    mood: 'NEUTRAL'
  },
  ON_STORM_START: {
    text: 'Alerta Solar! Use o sonar e siga para o LRO-Scout.',
    mood: 'ALERT'
  },
  ON_HIGH_SPEED: {
    text: 'Velocidade elevada na gravidade 1/6g! Cuidado com as rochas.',
    mood: 'ALERT'
  },
  ON_COLLISION: {
    text: 'Impacto detetado no chassis! Desvie das rochas basálticas.',
    mood: 'ALERT'
  },
  ON_ROVER_FOUND: {
    text: 'Sonda LRO-Scout localizada! Extraia os dados de gelo polar.',
    mood: 'HAPPY'
  },
  ON_ISRU_COMPLETE: {
    text: 'Missão cumprida! Água e Oxigénio produzidos na refinaria ISRU.',
    mood: 'HAPPY'
  }
};

export const WellyCopilot: React.FC<WellyCopilotProps> = ({
  currentTrigger,
  gameState
}) => {
  const [visibleToast, setVisibleToast] = useState<{ text: string; mood: WellyMood } | null>(null);

  // Transforma as mensagens da Welly em notificações flutuantes leves (toast pills) que desaparecem após 4.5s
  useEffect(() => {
    if (!currentTrigger || gameState === 'STATE_PROLOGUE') return;
    const msg = WELLY_TOAST_MESSAGES[currentTrigger];
    if (!msg) return;

    setVisibleToast(msg);
    if (msg.mood === 'ALERT') {
      soundManager.playAlertSiren();
    } else {
      soundManager.playUiBeep(820, 0.04);
    }

    const timer = window.setTimeout(() => {
      setVisibleToast(null);
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [currentTrigger, gameState]);

  if (!visibleToast || gameState === 'STATE_PROLOGUE' || gameState === 'STATE_RESCUE_AND_ISRU') {
    return null;
  }

  const isUrgent = visibleToast.mood === 'ALERT';
  const isHappy = visibleToast.mood === 'HAPPY';

  return (
    <div className="fixed top-12 inset-x-0 z-25 px-4 flex justify-center pointer-events-none select-none">
      <div
        className={`max-w-md px-3.5 py-1 rounded-full backdrop-blur-md border shadow-lg flex items-center gap-2 text-[11px] sm:text-xs font-medium transition-all ${
          isUrgent
            ? 'bg-red-950/75 border-red-400/50 text-red-100'
            : isHappy
            ? 'bg-emerald-950/75 border-emerald-400/50 text-emerald-100'
            : 'bg-slate-950/65 border-white/15 text-slate-100'
        }`}
      >
        <span className="shrink-0">{isUrgent ? '⚠️' : isHappy ? '🌱' : '🛰️'}</span>
        <span className="truncate">{visibleToast.text}</span>
      </div>
    </div>
  );
};
