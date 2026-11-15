/**
 * Welwitschia Lunar - Motor de Voz Sintetizada da Welly (Web Speech API)
 * Síntese de voz em português (pt-BR / pt-PT) nativa, sem dependência de rede,
 * com sincronização de fala com o avatar, controle de volume/mudo e pitch natural de IA.
 */

class WellyVoice {
  private synth: SpeechSynthesis | null = null;
  private selectedVoice: SpeechSynthesisVoice | null = null;
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

    // Prioriza vozes em português brasileiras e femininas/naturais
    const ptVoices = voices.filter(v => v.lang.startsWith('pt'));

    const preferredVoice =
      ptVoices.find(v => v.name.includes('Google') || v.name.includes('Luciana') || v.name.includes('Maria') || v.name.includes('Natural')) ||
      ptVoices.find(v => v.lang === 'pt-BR') ||
      ptVoices[0] ||
      voices[0];

    this.selectedVoice = preferredVoice || null;
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
   * Fala a frase fornecida cancelando qualquer fala anterior para evitar sobreposição
   */
  public speak(text: string): void {
    if (!this.synth || this.isMuted) return;

    // Remove tags markdown/emojis para síntese limpa
    const cleanText = text
      .replace(/[#*_~`]/g, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .trim();

    if (!cleanText) return;

    try {
      this.synth.cancel(); // Interrompe fala anterior

      const utterance = new SpeechSynthesisUtterance(cleanText);

      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }
      utterance.lang = this.selectedVoice?.lang || 'pt-BR';
      utterance.pitch = 1.08; // Tom ligeiramente agudo e amigável de IA
      utterance.rate = 1.05;  // Velocidade dinâmica e fluida
      utterance.volume = 1.0;

      utterance.onstart = () => {
        this.setSpeakingState(true);
      };

      utterance.onend = () => {
        this.setSpeakingState(false);
      };

      utterance.onerror = (e) => {
        // Ignora erro de interrupção intencional (cancel)
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
}

export const wellyVoice = new WellyVoice();
