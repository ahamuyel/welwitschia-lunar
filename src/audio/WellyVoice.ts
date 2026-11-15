/**
 * Welwitschia Lunar - Motor de Voz Sintetizada da Welly (Web Speech API)
 * Síntese rigorosa em português (pt-BR / pt-PT) nativo, sem sotaque estrangeiro.
 * Fallback seguro: se o navegador/SO não possuir voz em português, NÃO fala em inglês;
 * emite efeito sonoro sutil de transmissão de rádio espacial.
 */

import { soundManager } from './SoundManager';

class WellyVoice {
  private synth: SpeechSynthesis | null = null;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private hasPtVoice: boolean = false;
  private isMuted: boolean = false; // Ativada por padrão conforme diretriz do GDD
  private isSpeaking: boolean = false;
  private listeners: Array<(isSpeaking: boolean) => void> = [];
  private isInitialized: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.initVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoices();
      }

      // Desbloqueio automático de áudio no primeiro clique/toque do usuário
      const unlockAudio = () => {
        if (this.synth) {
          if (this.synth.paused) {
            this.synth.resume();
          }
        }
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };
      window.addEventListener('click', unlockAudio);
      window.addEventListener('keydown', unlockAudio);
    }
  }

  private initVoices(): void {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    if (!voices || voices.length === 0) return;

    // 1. Filtro rigoroso: apenas vozes cujo idioma comece explicitamente com 'pt' (pt-PT ou pt-BR)
    const ptVoices = voices.filter(v => v.lang.toLowerCase().startsWith('pt'));

    if (ptVoices.length > 0) {
      this.hasPtVoice = true;

      // 2. Prioridade para vozes naturais/neurais e amigáveis em português
      const preferredKeywords = [
        'natural', 'neural', 'google português', 'maria', 'francisca',
        'joana', 'luciana', 'cristiano', 'inês', 'ines', 'raquel', 'letícia', 'helena'
      ];

      const bestVoice =
        ptVoices.find(v => preferredKeywords.some(kw => v.name.toLowerCase().includes(kw))) ||
        ptVoices.find(v => v.lang.toLowerCase() === 'pt-pt') ||
        ptVoices.find(v => v.lang.toLowerCase() === 'pt-br') ||
        ptVoices[0];

      this.selectedVoice = bestVoice || null;
    } else {
      // 3. NENHUMA voz em português disponível no sistema do usuário:
      // NUNCA utilizar voz em inglês ou outro idioma para ler texto em português!
      this.hasPtVoice = false;
      this.selectedVoice = null;
    }

    this.isInitialized = true;
  }

  public subscribeSpeaking(callback: (isSpeaking: boolean) => void): () => void {
    this.listeners.push(callback);
    callback(this.isSpeaking);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private setSpeakingState(speaking: boolean): void {
    this.isSpeaking = speaking;
    this.listeners.forEach(cb => cb(speaking));
  }

  /**
   * Fala a frase fornecida cancelando qualquer fala anterior.
   * Se não houver voz portuguesa instalada no sistema, executa fallback sonoro espacial.
   */
  public speak(text: string): void {
    if (this.isMuted) return;

    // Remove tags markdown/emojis para síntese limpa
    const cleanText = text
      .replace(/[#*_~`]/g, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .trim();

    if (!cleanText) return;

    // Fallback Seguro: sem voz portuguesa, desativa TTS e emite rádio bip espacial
    if (!this.synth || !this.hasPtVoice || !this.selectedVoice) {
      soundManager.playUiBeep(980, 0.08);
      // Anima brevemente o avatar para simular transmissão de rádio
      this.setSpeakingState(true);
      setTimeout(() => {
        this.setSpeakingState(false);
      }, 1200);
      return;
    }

    try {
      this.synth.cancel(); // Interrompe fala anterior

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.voice = this.selectedVoice;
      utterance.lang = this.selectedVoice.lang || 'pt-PT';
      utterance.pitch = 1.06; // Tom agradável e científico de copiloto espacial
      utterance.rate = 1.05;  // Ritmo dinâmico
      utterance.volume = 1.0;

      utterance.onstart = () => {
        this.setSpeakingState(true);
      };

      utterance.onend = () => {
        this.setSpeakingState(false);
      };

      utterance.onerror = (e) => {
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.warn('WellyVoice erro de síntese:', e.error);
        }
        this.setSpeakingState(false);
      };

      this.synth.speak(utterance);
    } catch (e) {
      console.warn('Erro ao disparar fala da Welly:', e);
      this.setSpeakingState(false);
    }
  }

  public stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.setSpeakingState(false);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stop();
    }
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.isMuted) {
      this.stop();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  public getIsInitialized(): boolean {
    return this.isInitialized;
  }

  public getHasPtVoice(): boolean {
    return this.hasPtVoice;
  }
}

export const wellyVoice = new WellyVoice();
