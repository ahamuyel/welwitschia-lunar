import React, { useState, useEffect } from 'react';
import type {
  GameState,
  ResourceState,
  TelemetryData,
  WellyMood,
  BaseInteriorState
} from '../types/game';
import { soundManager } from '../audio/SoundManager';

interface WellyCopilotProps {
  currentTrigger: string;
  telemetry: TelemetryData;
  resources: ResourceState;
  gameState: GameState;
  baseInterior?: BaseInteriorState;
}

const WELLY_TOAST_MESSAGES: Record<string, { text: string; mood: WellyMood }> = {
  ON_START: {
    text: 'Bem-vindo à Estação Welwitschia (Polo Sul Lunar, 2032)!',
    mood: 'HAPPY'
  },
  ON_DOME_ENTER: {
    text: 'Cabine pressurizada! Olhe 0.8s ou toque nas 4 estações 3D.',
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
  gameState,
  baseInterior
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [toast, setToast] = useState<{ text: string; mood: WellyMood } | null>(null);

  // Dispara toast de eventos do jogo e desmonta após 4 segundos
  useEffect(() => {
    if (!currentTrigger || gameState === 'STATE_PROLOGUE' || gameState === 'STATE_RESCUE_AND_ISRU') {
      setIsVisible(false);
      return;
    }
    const msg = WELLY_TOAST_MESSAGES[currentTrigger];
    if (!msg) return;

    setToast(msg);
    setIsVisible(true);
    if (msg.mood === 'ALERT') {
      soundManager.playAlertSiren();
    } else {
      soundManager.playUiBeep(820, 0.04);
    }

    const timer = window.setTimeout(() => {
      setIsVisible(false);
      setToast(null);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [currentTrigger, gameState]);

  // Dispara toast educativo após decisão tática e desmonta após 4 segundos
  useEffect(() => {
    const fb = baseInterior?.lastConsequenceFeedback;
    if (!fb) return;

    setToast({
      text: `${fb.title}: ${fb.scientificReason}`,
      mood: fb.isPositive ? 'HAPPY' : 'ALERT'
    });
    setIsVisible(true);

    const timer = window.setTimeout(() => {
      setIsVisible(false);
      setToast(null);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [baseInterior?.lastConsequenceFeedback]);

  if (
    !isVisible ||
    !toast ||
    gameState === 'STATE_PROLOGUE' ||
    gameState === 'STATE_RESCUE_AND_ISRU' ||
    baseInterior?.activeEmergency ||
    baseInterior?.valveCalibration.active
  ) {
    return null;
  }

  const isUrgent = toast.mood === 'ALERT';
  const isHappy = toast.mood === 'HAPPY';

  return (
    <div
      className="fixed bottom-3 inset-x-0 z-25 px-3 flex justify-center pointer-events-none select-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div
        className={`max-w-[92vw] sm:max-w-lg px-3.5 py-1.5 rounded-full backdrop-blur-md border shadow-lg flex items-center gap-2 text-xs font-medium pointer-events-none ${
          isUrgent
            ? 'bg-red-950/85 border-red-400/50 text-red-100'
            : isHappy
            ? 'bg-emerald-950/85 border-emerald-400/50 text-emerald-100'
            : 'bg-slate-950/80 border-white/15 text-slate-100'
        }`}
      >
        <span className="shrink-0">{isUrgent ? '⚠️' : isHappy ? '🌱' : '🛰️'}</span>
        <span className="truncate">{toast.text}</span>
      </div>
    </div>
  );
};
