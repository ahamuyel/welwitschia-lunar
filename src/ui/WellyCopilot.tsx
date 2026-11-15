/**
 * Welwitschia Lunar - Copiloto IA Welly (Assistente Conversacional Híbrida & Síntese de Voz)
 * - Chat Interativo com histórico, campo de texto, sugestões em chips rápidos e indicador Online/Offline.
 * - Motor Híbrido: Gemini API (online) + Motor Offline Inteligente com telemetria injetada.
 * - Voz Sintetizada Nativa (Web Speech API) com sincronização labial/ondas sonoras no avatar.
 * - Sistema sequencial de instruções passo-a-passo ("Um passo por vez") com avanço manual ou temporizado.
 */

import React, { useState, useEffect, useRef } from 'react';
import type { WellyMood, WellyQueueItem, ChatMessage, TelemetryData, ResourceState, GameState } from '../types/game';
import { soundManager } from '../audio/SoundManager';
import { wellyVoice } from '../audio/WellyVoice';
import { wellyChatEngine } from '../ai/WellyChatEngine';

export const WELLY_SUGGESTION_CHIPS = [
  { label: '🔋 Como está a bateria?', query: 'Como está a bateria do rover e da base?' },
  { label: '📡 Onde está o LRO?', query: 'Onde está o rover perdido LRO-Scout e qual o rumo?' },
  { label: '🌱 O que é a Welwitschia?', query: 'Por que a estação se chama Welwitschia?' },
  { label: '🧊 Como funciona o gelo?', query: 'Como o gelo lunar vira combustível e oxigênio?' },
  { label: '🌑 Por que não tem vento?', query: 'Por que não tem vento na Lua?' },
  { label: '🏎️ Como dirigir no vácuo?', query: 'Como funciona a gravidade e inércia do rover na Lua?' }
];

export const WELLY_SEQUENCES: Record<string, Array<{ text: string; mood: WellyMood; priority?: 'NORMAL' | 'URGENT' }>> = {
  ON_START: [
    { text: 'Saudações, Comandante! Eu sou a Welly, sua copiloto IA.', mood: 'HAPPY' },
    { text: 'Nossa estação transforma o gelo escuro da Lua em água, oxigênio e combustível de foguete.', mood: 'NEUTRAL' },
    { text: 'O rover LRO-Scout parou de transmitir dados a 2 km daqui. Precisamos resgatá-lo!', mood: 'HAPPY' }
  ],
  ON_DOME_ENTER: [
    { text: 'A energia solar caiu para 60% porque a poeira lunar gruda nos painéis por eletricidade estática.', mood: 'NEUTRAL' },
    { text: 'Transfira energia para o rover e encha seu oxigênio antes de abrir a escotilha!', mood: 'ALERT' }
  ],
  ON_HIGH_SPEED: [
    { text: 'Cuidado com o acelerador! Na Lua o rover pesa 6x menos, mas mantém toda a sua inércia.', mood: 'ALERT', priority: 'URGENT' },
    { text: 'Reduza para menos de 15 km/h para não perder aderência nas curvas e crateras!', mood: 'ALERT' }
  ],
  ON_COLLISION: [
    { text: 'ALERTA DE IMPACTO! Choque contra obstáculo de basalto detectado!', mood: 'ALERT', priority: 'URGENT' },
    { text: 'Evite colisões acima de 12 km/h para não comprometer a blindagem do chassi!', mood: 'ALERT' }
  ],
  ON_STORM_START: [
    { text: 'ALERTA MÁXIMO! Micrometeoritos levantaram poeira e o sinal GPS foi perdido!', mood: 'ALERT', priority: 'URGENT' },
    { text: 'Mantenha o rumo 045° Nordeste na bússola e reduza a velocidade para menos de 15 km/h.', mood: 'ALERT' },
    { text: 'Guie-se pelo radar da Base e pelo ritmo do sonar até que o contato seja restabelecido!', mood: 'ALERT' }
  ],
  ON_ROVER_FOUND: [
    { text: 'Excelente! Localizamos o LRO-Scout na borda da cratera!', mood: 'HAPPY', priority: 'URGENT' },
    { text: 'Os painéis apenas acumularam regolito. Aproxime-se e pressione [E] para extrair os dados.', mood: 'HAPPY' }
  ],
  ON_ISRU_COMPLETE: [
    { text: 'Eletrólise concluída! Separamos a água lunar em oxigênio e hidrogênio líquido.', mood: 'HAPPY' },
    { text: 'O foguete para Marte está 100% abastecido. Missão cumprida com sucesso, Comandante!', mood: 'HAPPY' }
  ]
};

interface WellyCopilotProps {
  currentTrigger?: string;
  externalMessage?: { text: string; mood: WellyMood; priority?: 'NORMAL' | 'URGENT' } | null;
  onClearMessage?: () => void;
  telemetry?: TelemetryData;
  resources?: ResourceState;
  gameState?: GameState;
}

export const WellyCopilot: React.FC<WellyCopilotProps> = ({
  currentTrigger,
  externalMessage,
  onClearMessage,
  telemetry,
  resources,
  gameState
}) => {
  // Fila sequencial de mensagens automáticas (HUD inferior esquerdo)
  const [queue, setQueue] = useState<WellyQueueItem[]>([]);
  const [currentItem, setCurrentItem] = useState<WellyQueueItem | null>(null);
  const [displayedText, setDisplayedText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);

  // Estado do Chat Drawer interativo
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'WELLY',
      text: 'Olá, Comandante! Estou pronta para responder suas dúvidas sobre a missão, telemetria em tempo real ou a ciência do Polo Sul Lunar.',
      mood: 'HAPPY',
      timestamp: Date.now()
    }
  ]);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [isWaitingChatResponse, setIsWaitingChatResponse] = useState<boolean>(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState<boolean>(wellyVoice.getIsMuted());
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isOnlineMode, setIsOnlineMode] = useState<boolean>(wellyChatEngine.getIsOnlineConfigured());
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>('');

  const autoAdvanceTimerRef = useRef<number | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Monitora estado de fala do motor de voz para animar avatar
  useEffect(() => {
    const unsub = wellyVoice.subscribeSpeaking((speaking) => {
      setIsSpeaking(speaking);
    });
    return () => unsub();
  }, []);

  // 1. Processa gatilhos e enfileira frases sequenciais
  useEffect(() => {
    if (externalMessage) {
      const newItem: WellyQueueItem = {
        id: `ext-${Date.now()}`,
        text: externalMessage.text,
        mood: externalMessage.mood,
        priority: externalMessage.priority || 'NORMAL'
      };

      setQueue((prev) => {
        if (newItem.priority === 'URGENT') {
          return [newItem, ...prev];
        }
        return [...prev, newItem];
      });
    } else if (currentTrigger && WELLY_SEQUENCES[currentTrigger]) {
      const sequence = WELLY_SEQUENCES[currentTrigger];
      const items: WellyQueueItem[] = sequence.map((s, idx) => ({
        id: `${currentTrigger}-${idx}-${Date.now()}`,
        text: s.text,
        mood: s.mood,
        priority: s.priority || 'NORMAL'
      }));

      setQueue((prev) => {
        const isUrgent = items.some((it) => it.priority === 'URGENT');
        if (isUrgent) {
          return [...items, ...prev];
        }
        return [...prev, ...items];
      });

      if (items.some((i) => i.mood === 'ALERT')) {
        soundManager.playAlertSiren();
      } else {
        soundManager.playUiBeep(880, 0.08);
      }
    }
  }, [currentTrigger, externalMessage]);

  // 2. Quando não há item sendo exibido, puxa o próximo da fila
  useEffect(() => {
    if (!currentItem && queue.length > 0) {
      const [next, ...remaining] = queue;
      setCurrentItem(next);
      setQueue(remaining);
      setDisplayedText('');
      setIsTyping(true);

      // Vocaliza a mensagem via síntese Web Speech API
      wellyVoice.speak(next.text);
    }
  }, [currentItem, queue]);

  // 3. Efeito máquina de escrever (typewriter) frase a frase
  useEffect(() => {
    if (!currentItem) return;

    let index = 0;
    setDisplayedText('');
    setIsTyping(true);

    const fullText = currentItem.text;
    const interval = setInterval(() => {
      index++;
      setDisplayedText(fullText.slice(0, index));

      if (index >= fullText.length) {
        clearInterval(interval);
        setIsTyping(false);

        if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = window.setTimeout(() => {
          advanceToNext();
        }, 4400);
      }
    }, 20);

    return () => {
      clearInterval(interval);
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    };
  }, [currentItem]);

  const advanceToNext = () => {
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);

    if (isTyping && currentItem) {
      setDisplayedText(currentItem.text);
      setIsTyping(false);
      return;
    }

    setCurrentItem(null);
    setDisplayedText('');
    if (queue.length === 0 && onClearMessage) {
      onClearMessage();
    }
  };

  // Alterna o mudo da voz da Welly
  const handleToggleVoice = () => {
    const muted = wellyVoice.toggleMute();
    setIsVoiceMuted(muted);
    soundManager.playUiBeep(muted ? 440 : 880, 0.08);
  };

  // Envia mensagem no chat conversacional
  const handleSendMessage = async (queryText?: string) => {
    const query = (queryText || inputQuery).trim();
    if (!query) return;

    soundManager.playUiBeep(700, 0.05);

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'PLAYER',
      text: query,
      timestamp: Date.now()
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    setIsWaitingChatResponse(true);

    // Scroll automático para a última mensagem
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    // Contexto de fallback padrão caso props não sejam providas
    const defaultTelemetry: TelemetryData = telemetry || {
      speedKmh: 0,
      headingDeg: 45,
      distanceToTargetM: 2000,
      azimuthToTargetDeg: 45,
      distanceToBaseM: 0,
      azimuthToBaseDeg: 180,
      altitudeM: 0,
      coordinates: { x: 0, y: 0, z: 22 },
      isGpsActive: true,
      isHeadlightsOn: true,
      isInStorm: false,
      stormChoiceMade: false,
      isNearLostRover: false,
      highSpeedTimer: 0,
      cameraMode: 'THIRD_PERSON'
    };

    const defaultResources: ResourceState = resources || {
      baseSolarEnergy: 60,
      baseOxygen: 85,
      roverBattery: 100,
      suitOxygen: 100,
      roverIntegrity: 100,
      marsFuelTank: 0
    };

    const defaultState: GameState = gameState || 'STATE_ROVER_EXPLORATION';

    try {
      const response = await wellyChatEngine.askWelly(
        query,
        defaultTelemetry,
        defaultResources,
        defaultState
      );

      const wellyMessage: ChatMessage = {
        id: `welly-${Date.now()}`,
        sender: 'WELLY',
        text: response.text,
        mood: response.mood,
        timestamp: Date.now()
      };

      setChatMessages((prev) => [...prev, wellyMessage]);
      setIsWaitingChatResponse(false);

      // Fala a resposta sintetizada
      wellyVoice.speak(response.text);

      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } catch {
      setIsWaitingChatResponse(false);
    }
  };

  const handleSaveApiKey = () => {
    wellyChatEngine.setApiKey(apiKeyInput);
    setIsOnlineMode(wellyChatEngine.getIsOnlineConfigured());
    setShowApiKeyModal(false);
  };

  const getMoodColors = (mood: WellyMood) => {
    switch (mood) {
      case 'ALERT':
        return {
          glow: 'rgba(239, 68, 68, 0.65)',
          border: '#ef4444',
          badge: '#fee2e2',
          badgeText: '#991b1b',
          eyeColor: '#ef4444'
        };
      case 'HAPPY':
        return {
          glow: 'rgba(16, 185, 129, 0.65)',
          border: '#10b981',
          badge: '#d1fae5',
          badgeText: '#065f46',
          eyeColor: '#10b981'
        };
      case 'NEUTRAL':
      default:
        return {
          glow: 'rgba(0, 240, 255, 0.55)',
          border: '#00f0ff',
          badge: '#cffafe',
          badgeText: '#155e75',
          eyeColor: '#00f0ff'
        };
    }
  };

  const currentMood = currentItem?.mood || 'NEUTRAL';
  const colors = getMoodColors(currentMood);

  return (
    <>
      {/* Botões Flutuantes Permanentes no Topo Direito */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
        {/* Botão de Controle de Voz da Welly */}
        <button
          onClick={handleToggleVoice}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full font-mono text-xs font-bold transition-all shadow-lg backdrop-blur-md cursor-pointer border border-cyan-500/40 bg-slate-950/85 hover:bg-slate-900 text-cyan-300"
          title={isVoiceMuted ? 'Ativar Voz Sintetizada da Welly' : 'Silenciar Voz da Welly'}
        >
          <span>{isVoiceMuted ? '🔇' : '🔊'}</span>
          <span className="hidden sm:inline">{isVoiceMuted ? 'VOZ: MUDO' : 'VOZ: ON'}</span>
        </button>

        {/* Botão Principal de Chat com Welly */}
        <button
          onClick={() => {
            setIsChatOpen(!isChatOpen);
            soundManager.playUiBeep(840, 0.06);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm tracking-wide transition-all shadow-xl backdrop-blur-md cursor-pointer border"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            borderColor: colors.border,
            color: '#ffffff',
            boxShadow: `0 0 16px ${colors.glow}`
          }}
          title="Abrir Chat Interativo com a IA Welly"
        >
          <span className={`w-2.5 h-2.5 rounded-full ${isSpeaking ? 'animate-bounce bg-emerald-400' : 'animate-ping bg-cyan-400'}`} />
          <span>CONVERSAR COM WELLY</span>
        </button>
      </div>

      {/* Caixa de diálogo da Welly: Instruções sequenciais no canto inferior esquerdo */}
      {currentItem && (
        <div
          className="fixed bottom-4 left-4 max-w-[360px] sm:max-w-md z-30 p-4 rounded-xl backdrop-blur-lg transition-all animate-fadeIn"
          style={{
            backgroundColor: 'rgba(10, 15, 30, 0.95)',
            border: `1.5px solid ${colors.border}`,
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.85), 0 0 20px ${colors.glow}`
          }}
        >
          <div className="flex items-start gap-3.5">
            {/* Avatar SVG expressivo da Welly com animação de fala */}
            <div
              className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center p-2 relative overflow-hidden"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: `2px solid ${colors.border}`,
                boxShadow: `inset 0 0 12px ${colors.glow}`
              }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Antenas estilizadas da folha de Welwitschia */}
                <path
                  d="M50 20 C35 5 15 25 30 45 C40 35 48 30 50 35 C52 30 60 35 70 45 C85 25 65 5 50 20 Z"
                  fill="none"
                  stroke={colors.border}
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <rect x="22" y="42" width="56" height="38" rx="10" fill="#0f172a" stroke={colors.border} strokeWidth="3" />
                {currentMood === 'ALERT' ? (
                  <g fill={colors.eyeColor}>
                    <polygon points="32,54 44,54 38,68" />
                    <polygon points="56,54 68,54 62,68" />
                  </g>
                ) : currentMood === 'HAPPY' ? (
                  <g stroke={colors.eyeColor} strokeWidth="4" fill="none" strokeLinecap="round">
                    <path d="M30 62 Q38 52 46 62" />
                    <path d="M54 62 Q62 52 70 62" />
                  </g>
                ) : (
                  <g fill={colors.eyeColor}>
                    <circle cx="38" cy="61" r="5" className={isSpeaking ? 'animate-bounce' : 'animate-pulse'} />
                    <circle cx="62" cy="61" r="5" className={isSpeaking ? 'animate-bounce' : 'animate-pulse'} />
                    {/* Linha de ondas sonoras no lugar da boca quando falando */}
                    {isSpeaking ? (
                      <path
                        d="M32 72 Q42 66 50 72 T68 72"
                        stroke={colors.eyeColor}
                        strokeWidth="3"
                        fill="none"
                        className="animate-pulse"
                      />
                    ) : (
                      <line x1="28" y1="72" x2="72" y2="72" stroke={colors.eyeColor} strokeWidth="2" strokeDasharray="4 2" />
                    )}
                  </g>
                )}
              </svg>
            </div>

            {/* Texto da instrução (Frase curta e objetiva) */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xs tracking-wider text-cyan-400">
                    WELLY // COPILOTO IA
                  </span>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.2 rounded-full uppercase"
                    style={{ backgroundColor: colors.badge, color: colors.badgeText }}
                  >
                    {currentMood}
                  </span>
                </div>
                {queue.length > 0 && (
                  <span className="text-[10px] font-mono text-slate-400">
                    +{queue.length}
                  </span>
                )}
              </div>

              <p className="text-gray-100 text-sm leading-snug font-mono min-h-[2.4rem]">
                {displayedText}
                {isTyping && <span className="animate-pulse inline-block w-1.5 h-3.5 ml-1 bg-cyan-400 align-middle" />}
              </p>

              {/* Barra de controle inferior */}
              <div className="mt-2.5 flex items-center justify-between border-t border-slate-800/80 pt-2">
                <button
                  onClick={handleToggleVoice}
                  className="text-[10px] text-slate-400 hover:text-cyan-300 font-mono flex items-center gap-1 cursor-pointer"
                >
                  <span>{isVoiceMuted ? '🔇 Desmutar voz' : '🔊 Voz ativa'}</span>
                </button>
                <button
                  onClick={advanceToNext}
                  className="px-2.5 py-1 rounded bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/50 text-[11px] font-mono font-bold text-cyan-300 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>{queue.length > 0 ? 'Continuar ▸' : 'Fechar ✕'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER LATERAL: CHAT INTERATIVO COMPLETO COM WELLY */}
      {isChatOpen && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div
            className="w-full max-w-lg h-full bg-slate-950 flex flex-col justify-between border-l border-cyan-500/40 shadow-2xl overflow-hidden"
            style={{ boxShadow: '-8px 0 32px rgba(0, 240, 255, 0.25)' }}
          >
            {/* Topo do Chat: Título, Badge de Conectividade e Ações */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg border border-cyan-400/60 bg-slate-950 flex items-center justify-center p-1">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#00f0ff" strokeWidth="4" />
                    <circle cx="36" cy="45" r="5" fill="#00f0ff" className={isSpeaking ? 'animate-bounce' : ''} />
                    <circle cx="64" cy="45" r="5" fill="#00f0ff" className={isSpeaking ? 'animate-bounce' : ''} />
                    <line x1="32" y1="65" x2="68" y2="65" stroke="#00f0ff" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-black text-cyan-300 tracking-wider">COPILOTO WELLY</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                        isOnlineMode
                          ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                          : 'bg-cyan-950 border border-cyan-500 text-cyan-300'
                      }`}
                    >
                      {isOnlineMode ? '● ONLINE (Gemini Flash)' : '● OFFLINE (IA Local)'}
                    </span>
                    <button
                      onClick={() => setShowApiKeyModal(true)}
                      className="text-[10px] text-slate-400 hover:text-cyan-300 underline font-mono cursor-pointer"
                    >
                      Configurar Chave
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleVoice}
                  className="p-2 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-600 text-sm cursor-pointer"
                  title={isVoiceMuted ? 'Desmutar Voz' : 'Silenciar Voz'}
                >
                  {isVoiceMuted ? '🔇' : '🔊'}
                </button>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-slate-600 text-slate-400 hover:text-white text-xs font-mono cursor-pointer"
                >
                  ✕ FECHAR
                </button>
              </div>
            </div>

            {/* Corpo do Chat: Histórico de Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-950/90 font-mono">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'PLAYER' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-lg ${
                      msg.sender === 'PLAYER'
                        ? 'bg-cyan-600/25 border border-cyan-400/50 text-cyan-100 rounded-br-none'
                        : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-bl-none'
                    }`}
                  >
                    <div className="text-[10px] font-bold mb-1 opacity-70 flex items-center justify-between gap-4">
                      <span>{msg.sender === 'PLAYER' ? 'COMANDANTE' : 'WELLY // COPILOTO'}</span>
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}

              {isWaitingChatResponse && (
                <div className="flex justify-start">
                  <div className="bg-slate-900/80 border border-cyan-500/30 p-3 rounded-2xl rounded-bl-none text-xs text-cyan-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span>Welly está processando telemetria e dados científicos...</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chips de Sugestão Rápida */}
            <div className="p-2.5 bg-slate-900/70 border-t border-slate-800/80 overflow-x-auto">
              <div className="flex gap-1.5 min-w-max">
                {WELLY_SUGGESTION_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(chip.query)}
                    className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-500/60 text-[11px] font-mono text-slate-300 hover:text-cyan-200 transition-colors cursor-pointer"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Caixa de Entrada de Texto do Jogador */}
            <div className="p-3.5 bg-slate-900 border-t border-slate-800">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="Escreva sua pergunta para a copiloto Welly..."
                  className="flex-1 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 font-mono outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={!inputQuery.trim() || isWaitingChatResponse}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 disabled:opacity-40 text-slate-950 font-bold font-mono text-xs sm:text-sm tracking-wider shadow-lg cursor-pointer transition-all"
                >
                  ENVIAR ➤
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA CONFIGURAÇÃO DE CHAVE DE API GEMINI (ONLINE OPCIONAL) */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="max-w-md w-full bg-slate-900 border border-cyan-500/50 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-black text-cyan-300 mb-2 font-mono">
              CONFIGURAR GEMINI FLASH (ONLINE)
            </h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed font-mono">
              O jogo opera com 100% de inteligência offline local. Caso queira conversar com o modelo de linguagem natural avançado Gemini Flash, insira sua chave abaixo:
            </p>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Cole sua Gemini API Key aqui..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm font-mono text-cyan-300 mb-4 outline-none focus:border-cyan-400"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-xs font-mono cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs font-mono cursor-pointer"
              >
                Salvar Chave
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
