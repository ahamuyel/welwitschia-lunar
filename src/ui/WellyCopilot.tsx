import React, { useState, useEffect, useRef } from 'react';
import type {
  GameState,
  ResourceState,
  TelemetryData,
  WellyMood,
  BaseInteriorState,
  ChatMessage
} from '../types/game';
import { soundManager } from '../audio/SoundManager';

interface WellyCopilotProps {
  currentTrigger: string;
  telemetry: TelemetryData;
  resources: ResourceState;
  gameState: GameState;
  baseInterior?: BaseInteriorState;
  isChatOpen: boolean;
  onCloseChat: () => void;
}

const WELLY_TOAST_MESSAGES: Record<string, { text: string; mood: WellyMood }> = {
  ON_START: {
    text: 'Bem-vindo à Estação Welwitschia (Polo Sul Lunar, 2032)!',
    mood: 'HAPPY'
  },
  ON_DOME_ENTER: {
    text: 'Cabine pressurizada (101.3 kPa)! Olha 0.8s ou toca nas 4 estações 3D.',
    mood: 'NEUTRAL'
  },
  ON_STORM_START: {
    text: 'Alerta Solar! Usa o sonar e segue para o LRO-Scout.',
    mood: 'ALERT'
  },
  ON_HIGH_SPEED: {
    text: 'Velocidade elevada na gravidade 1/6g! Cuidado com as rochas.',
    mood: 'ALERT'
  },
  ON_COLLISION: {
    text: 'Impacto detetado no chassis! Desvia das rochas basálticas.',
    mood: 'ALERT'
  },
  ON_ROVER_FOUND: {
    text: 'Sonda LRO-Scout localizada! Extrai os dados de gelo polar.',
    mood: 'HAPPY'
  },
  ON_ISRU_COMPLETE: {
    text: 'Missão cumprida! Água e Oxigénio produzidos na refinaria ISRU.',
    mood: 'HAPPY'
  }
};

const QUICK_SUGGESTIONS: string[] = [
  'Porque faz -173°C na Lua?',
  'O que é a Welwitschia?',
  'Como sobreviver à tempestade solar?'
];

/**
 * Síntese de voz 100% offline via Web Speech API (ativa apenas se o som não estiver em mute).
 */
function speakWellyText(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (soundManager.isAudioMuted()) return;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-PT';
    utterance.rate = 1.04;
    utterance.pitch = 1.08;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignora caso o navegador bloqueie síntese de voz automática
  }
}

/**
 * Motor local 100% offline de respostas científicas da Copiloto IA Welly (Português de Angola).
 */
function generateOfflineWellyAnswer(
  question: string,
  resources: ResourceState,
  telemetry: TelemetryData,
  baseInterior?: BaseInteriorState
): string {
  const q = question.toLowerCase();

  if (q.includes('-173') || q.includes('frio') || q.includes('noite') || q.includes('temperatura') || q.includes('calor')) {
    return `Kandandu pela pergunta! Como a Lua quase não tem atmosfera (exosfera de 10⁻¹² torr), não há ar para guardar o calor. Ao sol faz +127°C e nas crateras escuras do Polo Sul chega a -173°C! Neste momento a nossa cabine está a ${baseInterior?.cabinTempC ?? 21}°C.`;
  }

  if (q.includes('welwitschia') || q.includes('planta') || q.includes('estufa') || q.includes('namibe') || q.includes('angola')) {
    return `A Welwitschia mirabilis é o símbolo do Deserto do Namibe, em Angola! Ela vive mais de 1.000 anos com pouquíssima água. Na nossa Estufa Lunar usamos hidroponia e luz magenta para ela produzir oxigénio e ajudar os astronautas!`;
  }

  if (q.includes('tempestade') || q.includes('solar') || q.includes('radia') || q.includes('escudo') || q.includes('kapton')) {
    return `A Lua não tem campo magnético global como a Terra. Quando o Sol lança partículas (SPE), ativamos as bobinas revestidas a folha dourada Kapton (-25% Bateria) ou entramos em Modo Abrigo no núcleo para proteger a tripulação!`;
  }

  if (q.includes('poeira') || q.includes('regolito') || q.includes('painel') || q.includes('eletrost')) {
    return `O regolito lunar é uma poeira fina de vidro vulcânico e rocha partida por meteoritos. Os raios UV do Sol deixam essa poeira com carga elétrica e ela cola-se aos painéis solares! Usamos o Pulso Eletrostático (EDS da NASA) para a repelir.`;
  }

  if (q.includes('oxig') || q.includes('o2') || q.includes('água') || q.includes('gelo') || q.includes('isru') || q.includes('vácuo')) {
    return `No Polo Sul Lunar extraímos gelo de água (H₂O) da cratera Shackleton. Com eletrólise (2H₂O → 2H₂ + O₂), fazemos oxigénio para respirar e combustível! Agora temos ${Math.round(resources.baseOxygen)}% de O₂ na base e ${Math.round(resources.suitOxygen)}% no fato.`;
  }

  if (q.includes('estado') || q.includes('bateria') || q.includes('energia') || q.includes('missão') || q.includes('rover')) {
    const emText = baseInterior?.activeEmergency
      ? `Atenção: há um alerta ativo (${baseInterior.activeEmergency.title})!`
      : 'Todos os sistemas estão nominais!';
    return `Relatório da Estação Welwitschia: Energia Solar a ${Math.round(resources.baseSolarEnergy)}%, Bateria do Rover a ${Math.round(resources.roverBattery)}%, O₂ a ${Math.round(resources.baseOxygen)}% e distância ao LRO-Scout de ${Math.round(telemetry.distanceToTargetM)}m. ${emText}`;
  }

  return `Aqui é a Welly, a tua Copiloto IA de Angola na missão Artemis! Estamos com ⚡ ${Math.round(resources.baseSolarEnergy)}% de energia e 💨 ${Math.round(resources.baseOxygen)}% de O₂. Podes perguntar-me sobre o frio de -173°C na Lua, a planta Welwitschia do Namibe, o gelo polar ISRU ou as tempestades solares!`;
}

export const WellyCopilot: React.FC<WellyCopilotProps> = ({
  currentTrigger,
  telemetry,
  resources,
  gameState,
  baseInterior,
  isChatOpen,
  onCloseChat
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [toast, setToast] = useState<{ text: string; mood: WellyMood } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welly-welcome',
      sender: 'WELLY',
      text: 'Olá, Comandante! Sou a Welly, a tua IA cientista da Estação Welwitschia no Polo Sul Lunar. Toca numa pergunta rápida abaixo ou escreve a tua dúvida!',
      mood: 'HAPPY',
      timestamp: Date.now()
    }
  ]);
  const [inputValue, setInputValue] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Dispara toast de eventos do jogo e desmonta após 4.5 segundos
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
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [currentTrigger, gameState]);

  // Dispara toast quando ocorre uma emergência autónoma da NASA (4.5s)
  useEffect(() => {
    const em = baseInterior?.activeEmergency;
    if (!em) return;

    setToast({
      text: `${em.title}: ${em.description}`,
      mood: 'ALERT'
    });
    setIsVisible(true);

    const timer = window.setTimeout(() => {
      setIsVisible(false);
      setToast(null);
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [baseInterior?.activeEmergency]);

  // Dispara toast educativo após decisão tática e desmonta após 4.5 segundos
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
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [baseInterior?.lastConsequenceFeedback]);

  // Auto-scroll suave quando abre o chat ou chega mensagem
  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen]);

  const handleAskQuestion = (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed) return;

    soundManager.playUiBeep(880, 0.05);
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'PLAYER',
      text: trimmed,
      timestamp: Date.now()
    };

    const replyText = generateOfflineWellyAnswer(trimmed, resources, telemetry, baseInterior);
    const wellyMsg: ChatMessage = {
      id: `welly-${Date.now() + 1}`,
      sender: 'WELLY',
      text: replyText,
      mood: 'HAPPY',
      timestamp: Date.now() + 1
    };

    setMessages((prev) => [...prev.slice(-8), userMsg, wellyMsg]);
    setInputValue('');
    speakWellyText(replyText);
  };

  if (gameState === 'STATE_PROLOGUE' || gameState === 'STATE_RESCUE_AND_ISRU') {
    return null;
  }

  return (
    <>
      {/* 1. PAINEL DE CHAT COMPACTO E TRANSLÚCIDO SOB DEMANDA (Máx 38% da altura da tela) */}
      {isChatOpen && (
        <div
          className="fixed inset-x-0 bottom-2 sm:inset-x-auto sm:right-3 sm:bottom-3 z-35 px-3 sm:px-0 flex justify-center sm:justify-end pointer-events-none select-none"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div
            className="pointer-events-auto w-full max-w-md sm:w-96 max-h-[38dvh] flex flex-col rounded-2xl bg-slate-950/90 backdrop-blur-xl border border-cyan-400/45 shadow-2xl overflow-hidden text-xs text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do Chat Welly */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🤖</span>
                <span className="font-bold text-cyan-300 tracking-wide">
                  COPILOTO IA WELLY (OFFLINE NASA)
                </span>
              </div>
              <button
                type="button"
                onClick={onCloseChat}
                className="min-h-[32px] min-w-[32px] rounded-lg bg-slate-800/90 text-slate-300 hover:text-white flex items-center justify-center font-bold cursor-pointer"
                title="Fechar Chat Welly"
              >
                ✕
              </button>
            </div>

            {/* Histórico de Mensagens (Scroll compacto) */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`px-2.5 py-1.5 rounded-xl leading-snug ${
                    m.sender === 'PLAYER'
                      ? 'bg-cyan-500/20 border border-cyan-400/35 text-cyan-100 ml-6 text-right'
                      : 'bg-slate-900/85 border border-white/10 text-slate-100 mr-4'
                  }`}
                >
                  {m.text}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* 3 Perguntas Rápidas Sugeridas */}
            <div className="px-2.5 py-1 bg-slate-900/60 border-t border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {QUICK_SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleAskQuestion(q)}
                  className="shrink-0 px-2.5 py-1 rounded-full bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/40 text-[11px] font-semibold text-cyan-200 whitespace-nowrap cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Campo de Pergunta Livre */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskQuestion(inputValue);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-950 border-t border-white/10 shrink-0"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Pergunta à Welly sobre a Lua ou a base..."
                className="flex-1 min-w-0 px-2.5 py-1 rounded-xl bg-slate-900 border border-white/15 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 select-text"
              />
              <button
                type="submit"
                className="px-3 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer shrink-0"
              >
                Enviar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. NOTIFICAÇÃO CURTA AUTO-DESCARTÁVEL (4.5s) QUANDO O CHAT ESTÁ FECHADO */}
      {!isChatOpen &&
        isVisible &&
        toast &&
        !baseInterior?.activeEmergency &&
        !baseInterior?.valveCalibration.active && (
          <div
            className="fixed bottom-3 inset-x-0 z-25 px-3 flex justify-center pointer-events-none select-none"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div
              className={`max-w-[92vw] sm:max-w-lg px-3.5 py-1.5 rounded-full backdrop-blur-md border shadow-lg flex items-center gap-2 text-xs font-medium pointer-events-none ${
                toast.mood === 'ALERT'
                  ? 'bg-red-950/85 border-red-400/50 text-red-100'
                  : toast.mood === 'HAPPY'
                  ? 'bg-emerald-950/85 border-emerald-400/50 text-emerald-100'
                  : 'bg-slate-950/80 border-white/15 text-slate-100'
              }`}
            >
              <span className="shrink-0">
                {toast.mood === 'ALERT' ? '⚠️' : toast.mood === 'HAPPY' ? '🌱' : '🛰️'}
              </span>
              <span className="truncate">{toast.text}</span>
            </div>
          </div>
        )}
    </>
  );
};
