/**
 * Welwitschia Lunar - Gerenciador de Áudio Procedural (Web Audio API)
 * 100% Offline-First: Síntese de áudio em tempo real sem dependências externas.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  // Motor do Rover
  private motorOsc: OscillatorNode | null = null;
  private motorSubOsc: OscillatorNode | null = null;
  private motorGain: GainNode | null = null;
  private motorFilter: BiquadFilterNode | null = null;
  private isMotorRunning: boolean = false;

  // Sonar
  private sonarTimer: number | null = null;
  private currentSonarInterval: number = 2.0;
  private isSonarActive: boolean = false;

  // Drone ambiente
  private ambientOsc: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;

  constructor() {
    // AudioContext é iniciado por interação do usuário (evita bloqueio de autoplay do navegador)
  }

  public init(): void {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.startAmbientHum();
    } catch (e) {
      console.warn('Web Audio API não pôde ser iniciada:', e);
    }
  }

  private ensureContext(): boolean {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return !!this.ctx;
  }

  // --- AMBIENTE SUB-GRAVE ESPACIAL ---
  private startAmbientHum(): void {
    if (!this.ctx || this.ambientOsc) return;

    try {
      this.ambientOsc = this.ctx.createOscillator();
      this.ambientGain = this.ctx.createGain();

      this.ambientOsc.type = 'sine';
      this.ambientOsc.frequency.setValueAtTime(55, this.ctx.currentTime); // Lá 55Hz (A1)

      this.ambientGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

      this.ambientOsc.connect(this.ambientGain);
      this.ambientGain.connect(this.ctx.destination);
      this.ambientOsc.start();
    } catch {
      // Ignora erro se áudio suspenso
    }
  }

  // --- MOTOR ELÉTRICO DO ROVER ---
  public startMotor(): void {
    if (!this.ensureContext() || !this.ctx || this.isMotorRunning) return;

    try {
      this.motorOsc = this.ctx.createOscillator();
      this.motorSubOsc = this.ctx.createOscillator();
      this.motorFilter = this.ctx.createBiquadFilter();
      this.motorGain = this.ctx.createGain();

      this.motorOsc.type = 'sawtooth';
      this.motorOsc.frequency.setValueAtTime(40, this.ctx.currentTime);

      this.motorSubOsc.type = 'triangle';
      this.motorSubOsc.frequency.setValueAtTime(80, this.ctx.currentTime);

      this.motorFilter.type = 'lowpass';
      this.motorFilter.frequency.setValueAtTime(220, this.ctx.currentTime);
      this.motorFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

      this.motorGain.gain.setValueAtTime(0.01, this.ctx.currentTime);

      this.motorOsc.connect(this.motorFilter);
      this.motorSubOsc.connect(this.motorFilter);
      this.motorFilter.connect(this.motorGain);
      this.motorGain.connect(this.ctx.destination);

      this.motorOsc.start();
      this.motorSubOsc.start();
      this.isMotorRunning = true;
    } catch {
      // Falha silenciosa
    }
  }

  public updateMotorSpeed(speedKmh: number, isAccelerating: boolean): void {
    if (!this.ctx || !this.isMotorRunning || !this.motorGain || !this.motorOsc || !this.motorFilter || !this.motorSubOsc) return;

    const t = this.ctx.currentTime;
    const normalizedSpeed = Math.min(Math.max(speedKmh / 28.0, 0), 1.0);

    // Frequência do motor elétrico escala com velocidade de rotação das rodas
    const baseFreq = 45 + normalizedSpeed * 110 + (isAccelerating ? 20 : 0);
    this.motorOsc.frequency.setTargetAtTime(baseFreq, t, 0.1);
    this.motorSubOsc.frequency.setTargetAtTime(baseFreq * 1.5, t, 0.1);

    // Filtro abre com aceleração
    const cutoff = 200 + normalizedSpeed * 750 + (isAccelerating ? 300 : 0);
    this.motorFilter.frequency.setTargetAtTime(cutoff, t, 0.1);

    // Volume do motor
    const targetGain = this.isMuted ? 0 : 0.02 + normalizedSpeed * 0.08 + (isAccelerating ? 0.04 : 0);
    this.motorGain.gain.setTargetAtTime(targetGain, t, 0.08);
  }

  public stopMotor(): void {
    if (!this.isMotorRunning || !this.ctx) return;
    try {
      if (this.motorGain) {
        this.motorGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      }
      setTimeout(() => {
        try {
          this.motorOsc?.stop();
          this.motorSubOsc?.stop();
          this.motorOsc?.disconnect();
          this.motorSubOsc?.disconnect();
        } catch {
          // Já parado
        }
        this.motorOsc = null;
        this.motorSubOsc = null;
        this.isMotorRunning = false;
      }, 150);
    } catch {
      this.isMotorRunning = false;
    }
  }

  // --- SONAR PROCEDURAL (DILEMA DA TEMPESTADE / NAVEGAÇÃO ÀS CEGAS) ---
  public startSonar(distanceToTarget: number): void {
    if (!this.ensureContext() || !this.ctx) return;
    this.isSonarActive = true;
    this.updateSonarDistance(distanceToTarget);
    if (!this.sonarTimer) {
      this.scheduleNextSonarPing();
    }
  }

  public updateSonarDistance(distanceToTarget: number): void {
    // interval = clamp(distancia / 250, 0.2s, 2.0s) conforme especificação do GDD
    this.currentSonarInterval = Math.max(0.2, Math.min(2.0, distanceToTarget / 250.0));
  }

  private scheduleNextSonarPing(): void {
    if (!this.isSonarActive) return;

    this.playSonarPing();
    this.sonarTimer = window.setTimeout(() => {
      this.scheduleNextSonarPing();
    }, this.currentSonarInterval * 1000);
  }

  private playSonarPing(): void {
    if (!this.ctx || this.isMuted) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Pitch escala inversamente ao intervalo (mais próximo = mais agudo)
      const baseFreq = 880 + (2.0 - this.currentSonarInterval) * 440; // 880Hz a 1760Hz
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.15, t + 0.1);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.2);
    } catch {
      // Ignora erro
    }
  }

  public stopSonar(): void {
    this.isSonarActive = false;
    if (this.sonarTimer) {
      clearTimeout(this.sonarTimer);
      this.sonarTimer = null;
    }
  }

  // --- DESPRESSURIZAÇÃO DA ESCOTILHA (AIRLOCK) ---
  public playAirlockDepressurization(): void {
    if (!this.ensureContext() || !this.ctx || this.isMuted) return;

    try {
      const bufferSize = this.ctx.sampleRate * 2.5; // 2.5 segundos de ruído
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 2.3);
      filter.Q.setValueAtTime(2.0, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.4);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start();
    } catch (e) {
      console.warn('Erro ao tocar despressurização:', e);
    }
  }

  // --- IMPACTO / COLISÃO COM ROCHA EM ALTA VELOCIDADE ---
  public playRockImpact(): void {
    if (!this.ensureContext() || !this.ctx || this.isMuted) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.25);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.26);
    } catch {
      // Ignora erro
    }
  }

  // --- SINAIS DE UI & ALERTAS ---
  public playUiBeep(freq: number = 600, duration: number = 0.08): void {
    if (!this.ensureContext() || !this.ctx || this.isMuted) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + duration);
    } catch {
      // Ignora erro
    }
  }

  public playAlertSiren(): void {
    if (!this.ensureContext() || !this.ctx || this.isMuted) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.setValueAtTime(740, t + 0.15);
      osc.frequency.setValueAtTime(440, t + 0.3);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.46);
    } catch {
      // Ignora erro
    }
  }

  public playSuccessChime(): void {
    if (!this.ensureContext() || !this.ctx || this.isMuted) return;

    try {
      const t = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // Dó, Mi, Sol, Dó (Acorde Maior)
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const noteOsc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();

        noteOsc.type = 'sine';
        noteOsc.frequency.setValueAtTime(freq, t + idx * 0.09);

        noteGain.gain.setValueAtTime(0.15, t + idx * 0.09);
        noteGain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.09 + 0.4);

        noteOsc.connect(noteGain);
        noteGain.connect(this.ctx.destination);

        noteOsc.start(t + idx * 0.09);
        noteOsc.stop(t + idx * 0.09 + 0.42);
      });
    } catch {
      // Ignora erro
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime(this.isMuted ? 0 : 0.04, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  // --- SONS SENSORIAIS DAS EMERGÊNCIAS DA BASE ---

  public playSolarStormAlert(): void {
    if (!this.ensureContext() || !this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const sub = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.linearRampToValueAtTime(640, t + 0.25);
      osc.frequency.linearRampToValueAtTime(280, t + 0.55);

      sub.type = 'sine';
      sub.frequency.setValueAtTime(85, t);

      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

      osc.connect(gain);
      sub.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      sub.start(t);
      osc.stop(t + 0.62);
      sub.stop(t + 0.62);
    } catch {
      // Ignora erro
    }
  }

  public playColdFrostSound(): void {
    if (!this.ensureContext() || !this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const freqs = [1480, 1960, 2480];
      freqs.forEach((f, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t + idx * 0.08);
        osc.frequency.exponentialRampToValueAtTime(f * 0.75, t + idx * 0.08 + 0.35);

        gain.gain.setValueAtTime(0.08, t + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.08 + 0.38);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + idx * 0.08);
        osc.stop(t + idx * 0.08 + 0.4);
      });
    } catch {
      // Ignora erro
    }
  }

  public playOxygenHissSound(): void {
    if (!this.ensureContext() || !this.ctx || this.isMuted) return;
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.9);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2400, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.14, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.88);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
    } catch {
      // Ignora erro
    }
  }

  public playElectrostaticPulseSound(): void {
    if (!this.ensureContext() || !this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(1600, t + 0.32);

      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.36);
    } catch {
      // Ignora erro
    }
  }

  public playValveCalibratedBeep(step: number = 1): void {
    if (!this.ensureContext() || !this.ctx || this.isMuted) return;
    const freq = step === 1 ? 784 : 1046.5;
    this.playUiBeep(freq, 0.16);
  }

  /**
   * Pulso sonoro de telemetria de urgência nos últimos 5 segundos do timer de decisão.
   */
  public playUrgencyTelemetryPulse(secondsLeft: number): void {
    if (!this.ensureContext() || !this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Aumenta o pitch conforme o tempo se aproxima de 0 (5s -> 1s)
      const urgencyFactor = Math.max(0, 6 - secondsLeft);
      const freq = 720 + urgencyFactor * 140;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.18, t + 0.09);

      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.13);
    } catch {
      // Ignora erro
    }
  }

  /**
   * Alarme severo de Falha por Indecisão quando o timer chega a 0s.
   */
  public playIndecisionFailureAlarm(): void {
    if (!this.ensureContext() || !this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(290, t);
      osc1.frequency.setValueAtTime(195, t + 0.22);
      osc1.frequency.setValueAtTime(290, t + 0.44);

      osc2.type = 'square';
      osc2.frequency.setValueAtTime(145, t);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.76);
      osc2.stop(t + 0.76);
    } catch {
      // Ignora erro
    }
  }

  public isAudioMuted(): boolean {
    return this.isMuted;
  }
}

export const soundManager = new SoundManager();
