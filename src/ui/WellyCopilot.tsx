/**
 * Welwitschia Lunar - Copiloto IA Welly
 * Avatar animado reativo (NEUTRAL, ALERT, HAPPY), fila sequencial de mensagens
 * ("Um passo por vez" - frases curtas e objetivas), gatilhos automáticos prioritários
 * e painel lateral permanente de perguntas frequentes (FAQ) 100% offline.
 */

import React, { useState, useEffect, useRef } from 'react';
import type { WellyMood, FAQItem, WellyQueueItem } from '../types/game';
import { soundManager } from '../audio/SoundManager';

export const WELLY_FAQS: FAQItem[] = [
  {
    id: 'faq-wind',
    question: 'Por que não tem vento na Lua?',
    answer: 'Porque a Lua não tem atmosfera! Sem ar ou gases envolvendo o satélite, não existem ventos ou nuvens, e as pegadas dos astronautas duram milhões de anos.'
  },
  {
    id: 'faq-fuel',
    question: 'Como o gelo vira combustível de foguete?',
    answer: 'Usamos eletricidade dos painéis solares para quebrar a água (H₂O) em oxigênio e hidrogênio. Resfriados até virarem líquido, formam um combustível de foguete superpotente!'
  },
  {
    id: 'faq-cold',
    question: 'Por que está tão frio dentro da cratera?',
    answer: 'No Polo Sul lunar, o Sol bate bem baixinho no horizonte. O fundo de crateras profundas nunca recebe luz solar, fazendo a temperatura cair abaixo de -200 °C!'
  },
  {
    id: 'faq-name',
    question: 'Por que a Estação se chama Welwitschia?',
    answer: 'Em homenagem à Welwitschia mirabilis, uma planta extraordinária do deserto do Namibe, em Angola, que sobrevive por mais de mil anos em condições extremas!'
  }
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
    { text: 'ALERTA DE IMPACTO! Choque contra obstáculo detectado!', mood: 'ALERT', priority: 'URGENT' },
    { text: 'Evite colisões acima de 12 km/h para não comprometer a blindagem do chassi!', mood: 'ALERT' }
  ],
  ON_STORM_START: [
    { text: 'ALERTA MÁXIMO! Micrometeoritos levantaram poeira e o sinal GPS foi perdido!', mood: 'ALERT', priority: 'URGENT' },
    { text: 'Mantenha o rumo 045° Nordeste na bússola e reduza a velocidade para menos de 15 km/h.', mood: 'ALERT' },
    { text: 'Guie-se pelo ritmo do sonar acústico até que a visibilidade seja restabelecida!', mood: 'ALERT' }
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
}

export const WellyCopilot: React.FC<WellyCopilotProps> = ({
  currentTrigger,
  externalMessage,
  onClearMessage
}) => {
  const [queue, setQueue] = useState<WellyQueueItem[]>([]);
  const [currentItem, setCurrentItem] = useState<WellyQueueItem | null>(null);
  const [displayedText, setDisplayedText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isFaqOpen, setIsFaqOpen] = useState<boolean>(false);
  const [selectedFaq, setSelectedFaq] = useState<FAQItem | null>(null);

  const autoAdvanceTimerRef = useRef<number | null>(null);

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
          // Interrompe imediatamente com alerta prioritário na frente da fila
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

        // Agenda avanço automático após 4.2 segundos caso o jogador não clique
        if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = window.setTimeout(() => {
          advanceToNext();
        }, 4200);
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
      // Se ainda estiver digitando, completa a frase imediatamente
      setDisplayedText(currentItem.text);
      setIsTyping(false);
      return;
    }

    // Avança para o próximo item
    setCurrentItem(null);
    setDisplayedText('');
    if (queue.length === 0 && onClearMessage) {
      onClearMessage();
    }
  };

  const handleSelectFaq = (faq: FAQItem) => {
    setSelectedFaq(faq);
    // Enfileira a resposta da FAQ para leitura passo a passo
    const faqItem: WellyQueueItem = {
      id: `faq-${faq.id}-${Date.now()}`,
      text: faq.answer,
      mood: 'HAPPY',
      priority: 'URGENT'
    };
    setCurrentItem(faqItem);
    soundManager.playUiBeep(750, 0.06);
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
      {/* Botão flutuante permanente: Perguntar à Welly */}
      <button
        onClick={() => {
          setIsFaqOpen(!isFaqOpen);
          soundManager.playUiBeep(800, 0.06);
        }}
        className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm tracking-wide transition-all shadow-xl backdrop-blur-md cursor-pointer"
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.88)',
          border: `1.5px solid ${colors.border}`,
          color: '#ffffff',
          boxShadow: `0 0 16px ${colors.glow}`
        }}
        title="Consultar base científica da IA Welly"
      >
        <span className="w-2.5 h-2.5 rounded-full animate-ping" style={{ backgroundColor: colors.border }} />
        <span>? PERGUNTAR À WELLY</span>
      </button>

      {/* Caixa de diálogo da Welly: 1 frase curta por vez com controle de avanço */}
      {currentItem && (
        <div
          className="fixed bottom-4 left-4 max-w-[360px] sm:max-w-md z-30 p-4 rounded-xl backdrop-blur-lg transition-all animate-fadeIn"
          style={{
            backgroundColor: 'rgba(10, 15, 30, 0.94)',
            border: `1.5px solid ${colors.border}`,
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.85), 0 0 20px ${colors.glow}`
          }}
        >
          <div className="flex items-start gap-3.5">
            {/* Avatar SVG expressivo da Welly */}
            <div
              className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center p-2 relative overflow-hidden"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: `2px solid ${colors.border}`,
                boxShadow: `inset 0 0 12px ${colors.glow}`
              }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full">
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
                    <circle cx="38" cy="61" r="5" className="animate-pulse" />
                    <circle cx="62" cy="61" r="5" className="animate-pulse" />
                    <line x1="28" y1="72" x2="72" y2="72" stroke={colors.eyeColor} strokeWidth="2" strokeDasharray="4 2" />
                  </g>
                )}
              </svg>
            </div>

            {/* Texto da instrução (Frase curta, max 2 linhas) */}
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

              {/* Botão de avanço rápido para o próximo passo */}
              <div className="mt-2.5 flex items-center justify-between border-t border-slate-800/80 pt-2">
                <span className="text-[10px] text-slate-500 font-mono">
                  {queue.length > 0 ? `Passo seguinte em espera` : 'Fim da transmissão'}
                </span>
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

      {/* Gaveta Lateral de FAQ Científica Offline */}
      {isFaqOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div
            className="w-full max-w-md h-full bg-slate-950 p-6 flex flex-col justify-between overflow-y-auto border-l border-cyan-500/40 shadow-2xl"
            style={{ boxShadow: '-8px 0 32px rgba(0, 240, 255, 0.2)' }}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
                  <h2 className="text-lg font-black text-cyan-300 tracking-wider">BANCO DE DADOS WELLY</h2>
                </div>
                <button
                  onClick={() => setIsFaqOpen(false)}
                  className="text-slate-400 hover:text-white px-2 py-1 rounded-md text-sm border border-slate-800 cursor-pointer"
                >
                  ✕ FECHAR
                </button>
              </div>

              <p className="text-xs text-slate-400 my-4 leading-relaxed font-mono">
                Base de conhecimento científico local da copiloto Welly (Programa Artemis & Estação Welwitschia 2032).
              </p>

              <div className="space-y-3">
                {WELLY_FAQS.map((faq) => (
                  <button
                    key={faq.id}
                    onClick={() => handleSelectFaq(faq)}
                    className={`w-full text-left p-3.5 rounded-lg border transition-all text-sm font-medium cursor-pointer ${
                      selectedFaq?.id === faq.id
                        ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200'
                        : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-600 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-bold">›</span>
                      <span>{faq.question}</span>
                    </div>
                  </button>
                ))}
              </div>

              {selectedFaq && (
                <div className="mt-6 p-4 rounded-xl border border-cyan-500/30 bg-slate-900/90 shadow-inner">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2">
                    Resposta da Welly:
                  </h3>
                  <p className="text-sm text-slate-200 leading-relaxed font-mono">
                    {selectedFaq.answer}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-slate-800 text-center">
              <span className="text-[11px] text-slate-500 font-mono">
                Estação Welwitschia • Equipe Mochileiros da Galáxia • 2032
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
