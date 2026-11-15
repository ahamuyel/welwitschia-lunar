import React, { useState, useEffect, useRef } from 'react';
import type {
  GameState,
  ResourceState,
  TelemetryData,
  WellyMood,
  BaseInteriorState,
  ChatMessage,
  NarrativeActNumber
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

const NARRATIVE_ACT_INTROS: Record<NarrativeActNumber, { title: string; text: string; mood: WellyMood }> = {
  1: {
    title: 'ATO I: POUSO NA CRATERA SHACKLETON (0%–33%)',
    text: 'Ato I — Pouso em Shackleton: Bem-vindo à Estação Welwitschia! Trouxemos a planta milenar do Deserto do Namibe, em Angola, para o Polo Sul da Lua. Prepara as 4 estações antes do pôr-do-sol lunar!',
    mood: 'HAPPY'
  },
  2: {
    title: 'ATO II: A LONGA NOITE DE -173°C (33%–75%)',
    text: 'Ato II — A Longa Noite de -173°C: A sombra cobriu a cratera! A energia solar escasseia e cada decisão exige coragem e sacrifício do nosso Comandante Júnior!',
    mood: 'ALERT'
  },
  3: {
    title: 'ATO III: O AMANHECER DE ARTEMIS (75%–100%)',
    text: 'Ato III — O Amanhecer de Artemis: Os primeiros raios de sol tocam os picos polares! Mantém a Welwitschia viva e transmite os dados de gelo lunar para Luanda!',
    mood: 'HAPPY'
  }
};

const WELLY_TOAST_MESSAGES: Record<string, { text: string; mood: WellyMood }> = {
  ON_START: {
    text: 'Ato I: Bem-vindo à Estação Welwitschia (Polo Sul Lunar, 2032)!',
    mood: 'HAPPY'
  },
  ON_DOME_ENTER: {
    text: 'Ato I — Shackleton: Trouxemos a força do Namibe para a Lua! Olha 0.8s ou toca nas estações.',
    mood: 'NEUTRAL'
  },
  ON_STORM_START: {
    text: 'Ato II — Escuridão e Poeira Solar! Usa o sonar e os faróis rumo ao LRO-Scout!',
    mood: 'ALERT'
  },
  ON_HIGH_SPEED: {
    text: 'Velocidade elevada na gravidade 1/6g! Cuidado com as rochas basálticas.',
    mood: 'ALERT'
  },
  ON_COLLISION: {
    text: 'Impacto detetado no chassis! Desvia das crateras e rochas.',
    mood: 'ALERT'
  },
  ON_ROVER_FOUND: {
    text: 'Ato III — Sonda LRO-Scout localizada! Extrai os dados para enviar a Luanda!',
    mood: 'HAPPY'
  },
  ON_ISRU_COMPLETE: {
    text: 'Ato III Concluído! Água, Oxigénio e dados transmitidos para Angola! Kandandu!',
    mood: 'HAPPY'
  }
};

const QUICK_SUGGESTIONS: string[] = [
  'Como transformar Gelo em Água?',
  'Quais são as missões paralelas?',
  'Porque faz -173°C na Lua?'
];

let speechDebounceTimer: number | null = null;

/**
 * Síntese de voz 100% offline via Web Speech API (pt-PT / pt-AO) com fila suave sem atropelar falas.
 */
function speakWellyText(text: string, interrupt: boolean = false): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (soundManager.isAudioMuted()) return;

  if (speechDebounceTimer) {
    window.clearTimeout(speechDebounceTimer);
  }

  speechDebounceTimer = window.setTimeout(() => {
    try {
      const synth = window.speechSynthesis;
      if (synth.speaking && !interrupt) {
        return;
      }
      if (interrupt) {
        synth.cancel();
      }
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = synth.getVoices();
      const ptVoice =
        voices.find((v) => v.lang.toLowerCase().includes('pt-ao')) ||
        voices.find((v) => v.lang.toLowerCase().includes('pt-pt')) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('pt'));
      if (ptVoice) {
        utterance.voice = ptVoice;
      }
      utterance.lang = 'pt-PT';
      utterance.rate = 1.03;
      utterance.pitch = 1.06;
      synth.speak(utterance);
    } catch {
      // Ignora caso o navegador bloqueie síntese de voz automática
    }
  }, 160);
}

/**
 * Motor local 100% offline de respostas científicas e narrativas da Copiloto IA Welly (Português de Angola).
 */
function generateOfflineWellyAnswer(
  question: string,
  resources: ResourceState,
  telemetry: TelemetryData,
  baseInterior?: BaseInteriorState
): string {
  const q = question.toLowerCase();
  const actLabel = baseInterior?.narrativeActTitle ?? 'Ato I: Pouso na Cratera Shackleton';

  if (q.includes('gelo') || q.includes('água') || q.includes('agua') || q.includes('isru') || q.includes('purificar') || q.includes('minerar')) {
    return `[${actLabel}] Na cadeia científica ISRU da NASA, o Gelo Bruto (🧊 ${Math.round(resources.rawIce ?? 0)}/100 kg) que mineramos nas crateras sombreadas vem misturado com poeira lunar! Tens de voltar à base pela porta Airlock e ativar o Processador Térmico ISRU para o derreter e filtrar em Água Purificada (💧 ${Math.round(resources.water ?? 72)}%), que alimenta a Estufa Welwitschia e o gerador de O₂!`;
  }

  if (q.includes('paralela') || q.includes('objetivo') || q.includes('sismógrafo') || q.includes('sismografo') || q.includes('scout') || q.includes('perdido')) {
    return `[${actLabel}] Além do Ciclo Vital ISRU (minerar gelo e purificar em água), temos 2 Missões Paralelas lá fora: A) Localizar e reativar a célula solar do rover perdido LRO-Scout a ~45m da base (+25 Ciência), e B) Instalar o Sismógrafo Lunar Artemis na baliza ciano na borda da cratera para medir "moonquakes" (+25 Ciência)!`;
  }

  if (q.includes('-173') || q.includes('frio') || q.includes('noite') || q.includes('temperatura') || q.includes('calor')) {
    return `[${actLabel}] Kandandu pela pergunta! Como a Lua quase não tem atmosfera (exosfera de 10⁻¹² torr), não há ar para guardar o calor. Ao sol faz +127°C e nas crateras escuras do Polo Sul chega a -173°C! Neste momento a nossa cabine está a ${baseInterior?.cabinTempC ?? 21}°C.`;
  }

  if (q.includes('welwitschia') || q.includes('planta') || q.includes('estufa') || q.includes('namibe') || q.includes('angola')) {
    return `[${actLabel}] A Welwitschia mirabilis é o tesouro do Deserto do Namibe, em Angola! Ela vive mais de 1.000 anos resistindo à seca extrema. Trouxemo-la para a Lua porque as suas folhas absorvem humidade e produzem oxigénio valioso para a tripulação!`;
  }

  if (q.includes('tempestade') || q.includes('solar') || q.includes('radia') || q.includes('escudo') || q.includes('kapton')) {
    return `[${actLabel}] A Lua não tem campo magnético global como a Terra. Quando o Sol lança protões (SPE), temos 16 segundos para decidir: ativar o Escudo Kapton (-25% Bateria + penumbra na cabine) ou entrar em Modo Abrigo pausando a Estufa!`;
  }

  if (q.includes('poeira') || q.includes('regolito') || q.includes('painel') || q.includes('eletrost')) {
    return `[${actLabel}] O regolito lunar é uma poeira cortante carregada eletricamente pelos raios UV do Sol. Podemos limpá-la com o Pulso Eletrostático EDS (-15% Bateria) ou saindo em EVA manual (poupa bateria, mas acelera o gasto de O₂ do fato)!`;
  }

  if (q.includes('ato') || q.includes('história') || q.includes('missão') || q.includes('luanda') || q.includes('rover')) {
    return `Estamos no ${actLabel} (${baseInterior?.missionProgressPct ?? 12}% da missão, a ${Math.round(telemetry.distanceToTargetM)}m do LRO-Scout). A nossa jornada tem 3 Atos: I. Pouso em Shackleton, II. A Longa Noite de -173°C e III. O Amanhecer de Artemis para transmitir os dados de gelo lunar até Luanda!`;
  }

  return `[${actLabel}] Aqui é a Welly! Estamos com ⚡ ${Math.round(resources.baseSolarEnergy)}% de energia, 💨 ${Math.round(resources.baseOxygen)}% de O₂ e 🛠️ ${Math.round(baseInterior?.baseIntegrity ?? 100)}% de casco. Pergunta-me sobre o frio de -173°C, a Welwitschia de Angola ou como sobreviver às crises lunares!`;
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
      text: NARRATIVE_ACT_INTROS[1].text,
      mood: 'HAPPY',
      timestamp: Date.now()
    }
  ]);
  const [inputValue, setInputValue] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const lastAnnouncedActRef = useRef<NarrativeActNumber>(1);

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
    speakWellyText(msg.text, false);

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

  // Transição automática entre os 3 Atos Narrativos (Ato I -> Ato II -> Ato III)
  useEffect(() => {
    const currentAct = baseInterior?.narrativeAct ?? 1;
    if (currentAct !== lastAnnouncedActRef.current) {
      lastAnnouncedActRef.current = currentAct;
      const actInfo = NARRATIVE_ACT_INTROS[currentAct];
      setToast({ text: actInfo.text, mood: actInfo.mood });
      setIsVisible(true);
      setMessages((prev) => [
        ...prev.slice(-8),
        {
          id: `act-${currentAct}-${Date.now()}`,
          sender: 'WELLY',
          text: actInfo.text,
          mood: actInfo.mood,
          timestamp: Date.now()
        }
      ]);
      speakWellyText(actInfo.text, true);

      const timer = window.setTimeout(() => {
        setIsVisible(false);
        setToast(null);
      }, 5000);
      return () => window.clearTimeout(timer);
    }
  }, [baseInterior?.narrativeAct]);

  // Dispara aviso urgente quando ocorre uma emergência autónoma da NASA com timer de 16s
  useEffect(() => {
    const em = baseInterior?.activeEmergency;
    if (!em) return;

    const alertLine = `⚠️ ${em.title} (16s para decidir!): ${em.description}`;
    setToast({
      text: alertLine,
      mood: 'ALERT'
    });
    setIsVisible(true);
    speakWellyText(`Alerta na estação! ${em.title}. Tens dezasseis segundos para decidir, Comandante!`, true);

    const timer = window.setTimeout(() => {
      setIsVisible(false);
      setToast(null);
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [baseInterior?.activeEmergency]);

  // Reage narrativamente às escolhas difíceis do jogador (reconhecendo o sacrifício feito ou a falha por indecisão)
  useEffect(() => {
    const fb = baseInterior?.lastConsequenceFeedback;
    if (!fb) return;

    const narrativeLine = fb.wellyNarrativeQuote || `${fb.title}: ${fb.scientificReason}`;
    setToast({
      text: narrativeLine,
      mood: fb.isPositive ? 'HAPPY' : 'ALERT'
    });
    setIsVisible(true);
    setMessages((prev) => [
      ...prev.slice(-8),
      {
        id: `conseq-${Date.now()}`,
        sender: 'WELLY',
        text: `${narrativeLine} (${fb.scientificReason})`,
        mood: fb.isPositive ? 'HAPPY' : 'ALERT',
        timestamp: Date.now()
      }
    ]);
    speakWellyText(narrativeLine, true);

    const timer = window.setTimeout(() => {
      setIsVisible(false);
      setToast(null);
    }, 5000);

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
    speakWellyText(replyText, true);
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
            {/* Cabeçalho do Chat Welly com Indicador do Ato Narrativo */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-sm">🤖</span>
                <span className="font-bold text-cyan-300 tracking-wide truncate">
                  WELLY • {baseInterior?.narrativeActTitle ?? 'Ato I: Shackleton'}
                </span>
              </div>
              <button
                type="button"
                onClick={onCloseChat}
                className="min-h-[32px] min-w-[32px] rounded-lg bg-slate-800/90 text-slate-300 hover:text-white flex items-center justify-center font-bold cursor-pointer shrink-0"
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
                placeholder="Pergunta à Welly sobre a Lua ou a missão..."
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

      {/* 2. NOTIFICAÇÃO NARRATIVA AUTO-DESCARTÁVEL (4.5s–5s) QUANDO O CHAT ESTÁ FECHADO */}
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
              className={`max-w-[94vw] sm:max-w-xl px-3.5 py-2 rounded-2xl backdrop-blur-md border shadow-lg flex items-center gap-2 text-xs font-medium pointer-events-none ${
                toast.mood === 'ALERT'
                  ? 'bg-red-950/90 border-red-400/60 text-red-100'
                  : toast.mood === 'HAPPY'
                  ? 'bg-emerald-950/90 border-emerald-400/55 text-emerald-100'
                  : 'bg-slate-950/85 border-white/15 text-slate-100'
              }`}
            >
              <span className="shrink-0">
                {toast.mood === 'ALERT' ? '⚠️' : toast.mood === 'HAPPY' ? '🌱' : '🛰️'}
              </span>
              <span className="line-clamp-2 leading-snug">{toast.text}</span>
            </div>
          </div>
        )}
    </>
  );
};
