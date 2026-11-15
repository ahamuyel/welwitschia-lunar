/**
 * Welwitschia Lunar - Máquina de Estados do Jogo (GameStateManager)
 * Gerenciador dos 5 estados de jogo, consumo de recursos em tempo real,
 * transições e regras de missão.
 */

import type { GameState, ResourceState, DomeInteractions, MissionReport, CameraViewMode } from '../types/game';
import { soundManager } from '../audio/SoundManager';

export type StateChangeCallback = (state: GameState) => void;
export type ResourceChangeCallback = (resources: ResourceState) => void;

export class GameStateManager {
  public currentState: GameState = 'STATE_PROLOGUE';

  public resources: ResourceState = {
    baseSolarEnergy: 60,  // Reduzido por poeira eletrostática nos painéis
    baseOxygen: 85,
    roverBattery: 20,     // Precisa de carga na cúpula
    suitOxygen: 30,       // Precisa de recarga no painel de suporte de vida
    roverIntegrity: 100,  // Integridade estrutural do chassi
    marsFuelTank: 0       // Tanque criogênico do foguete de retorno/Marte
  };

  public domeInteractions: DomeInteractions = {
    energyRedirected: false,
    suitRefilled: false,
    briefingViewed: false,
    airlockOpened: false
  };

  public cameraMode: CameraViewMode = 'THIRD_PERSON';

  // Alvo do Rover Perdido LRO-Scout (650m a 045° NE - 460m, 460m)
  public readonly targetCoordinates = { x: 460.0, y: 0, z: 460.0 };
  public readonly targetDistanceM: number = 650;

  // Estado da tempestade de micrometeoritos
  public stormDilemmaTriggered: boolean = false;
  public stormChoiceMade: boolean = false;
  public stormModeInstrumentAdvancing: boolean = false;
  public stormClearedAt60m: boolean = false;

  // Resgate concluído
  public dataModuleExtracted: boolean = false;

  // Callbacks para UI reativa
  private stateListeners: StateChangeCallback[] = [];
  private resourceListeners: ResourceChangeCallback[] = [];

  constructor() {
    // Inicialização de valores padrão
  }

  public subscribeState(cb: StateChangeCallback): () => void {
    this.stateListeners.push(cb);
    return () => {
      this.stateListeners = this.stateListeners.filter(l => l !== cb);
    };
  }

  public subscribeResources(cb: ResourceChangeCallback): () => void {
    this.resourceListeners.push(cb);
    return () => {
      this.resourceListeners = this.resourceListeners.filter(l => l !== cb);
    };
  }

  private notifyState(): void {
    this.stateListeners.forEach(cb => cb(this.currentState));
  }

  private notifyResources(): void {
    this.resourceListeners.forEach(cb => cb({ ...this.resources }));
  }

  public setState(newState: GameState): void {
    if (this.currentState === newState) return;
    this.currentState = newState;
    this.notifyState();
  }

  // --- TRANSIÇÕES DA CÚPULA (ESTADO 2) ---

  public redirectEnergyToRover(): void {
    if (this.domeInteractions.energyRedirected) return;
    this.resources.roverBattery = 100;
    this.domeInteractions.energyRedirected = true;
    soundManager.playUiBeep(880, 0.15);
    this.notifyResources();
  }

  public refillSuitOxygen(): void {
    if (this.domeInteractions.suitRefilled) return;
    this.resources.suitOxygen = 100;
    this.domeInteractions.suitRefilled = true;
    soundManager.playUiBeep(1040, 0.15);
    this.notifyResources();
  }

  public viewBriefing(): void {
    this.domeInteractions.briefingViewed = true;
    soundManager.playUiBeep(650, 0.08);
  }

  public canOpenAirlock(): boolean {
    return this.domeInteractions.energyRedirected &&
           this.domeInteractions.suitRefilled &&
           this.domeInteractions.briefingViewed;
  }

  public openAirlock(): boolean {
    if (!this.canOpenAirlock()) return false;

    this.domeInteractions.airlockOpened = true;
    soundManager.playAirlockDepressurization();

    // Transição de 2 segundos para completar a despressurização
    setTimeout(() => {
      this.setState('STATE_ROVER_EXPLORATION');
      soundManager.startMotor();
    }, 2200);

    return true;
  }

  // --- LOOP DE CONSUMO DE RECURSOS EM TEMPO REAL ---

  public updateResources(delta: number, speedKmh: number, isHeadlightsOn: boolean): {
    emergencyRescue: boolean;
    reason?: 'OXYGEN' | 'BATTERY';
  } {
    if (this.currentState !== 'STATE_ROVER_EXPLORATION' && this.currentState !== 'STATE_STORM_DILEMMA') {
      return { emergencyRescue: false };
    }

    // 1. Oxigênio do traje: -0.04% / s fora da base (autonomia generosa de ~41.6 minutos)
    const suitOxygenDrain = 0.04 * delta;
    this.resources.suitOxygen = Math.max(0, this.resources.suitOxygen - suitOxygenDrain);

    // 2. Bateria do rover: -(0.015% + speed * 0.003%) / s + (0.008% / s com faróis)
    let batteryDrain = (0.015 + (speedKmh * 0.003)) * delta;
    if (isHeadlightsOn) {
      batteryDrain += 0.008 * delta;
    }
    this.resources.roverBattery = Math.max(0, this.resources.roverBattery - batteryDrain);

    this.notifyResources();

    // Protocolo de resgate automático de emergência
    if (this.resources.suitOxygen <= 0) {
      this.triggerEmergencyRescue('OXYGEN');
      return { emergencyRescue: true, reason: 'OXYGEN' };
    }

    if (this.resources.roverBattery <= 0) {
      this.triggerEmergencyRescue('BATTERY');
      return { emergencyRescue: true, reason: 'BATTERY' };
    }

    return { emergencyRescue: false };
  }

  public applyRockDamage(amount: number = 5): void {
    this.resources.roverIntegrity = Math.max(0, this.resources.roverIntegrity - amount);
    soundManager.playRockImpact();
    soundManager.playAlertSiren();
    this.notifyResources();
  }

  public triggerEmergencyRescue(_reason: 'OXYGEN' | 'BATTERY'): void {
    soundManager.stopMotor();
    soundManager.stopSonar();
    soundManager.playAlertSiren();

    // Resgata o rover de volta à cúpula
    setTimeout(() => {
      this.resources.suitOxygen = 40;
      this.resources.roverBattery = 35;
      this.setState('STATE_DOME_MANAGEMENT');
    }, 2500);
  }

  // --- DILEMA DA TEMPESTADE (ESTADO 4) ---

  public checkStormDistance(distance: number): void {
    if (distance <= 220 && !this.stormDilemmaTriggered && this.currentState === 'STATE_ROVER_EXPLORATION') {
      this.stormDilemmaTriggered = true;
      this.setState('STATE_STORM_DILEMMA');
      soundManager.startSonar(distance);
    }

    if (this.currentState === 'STATE_STORM_DILEMMA' && this.stormModeInstrumentAdvancing) {
      soundManager.updateSonarDistance(distance);

      // Ao chegar a 60m do alvo, a poeira assenta e o GPS retorna
      if (distance <= 60 && !this.stormClearedAt60m) {
        this.stormClearedAt60m = true;
        soundManager.stopSonar();
        soundManager.playSuccessChime();
      }
    }
  }

  public chooseStormRetreat(): void {
    this.stormChoiceMade = true;
    soundManager.stopSonar();
    soundManager.stopMotor();
    // Retorna o rover à base para aguardar a tempestade passar e recarregar
    this.setState('STATE_DOME_MANAGEMENT');
    this.stormDilemmaTriggered = false;
  }

  public chooseStormAdvance(): void {
    this.stormChoiceMade = true;
    this.stormModeInstrumentAdvancing = true;
    soundManager.playUiBeep(700, 0.1);
  }

  // --- RESGATE E ELETRÓLISE ISRU (ESTADO 5) ---

  public extractDataModule(): void {
    this.dataModuleExtracted = true;
    soundManager.stopMotor();
    soundManager.stopSonar();
    soundManager.playSuccessChime();
    this.setState('STATE_RESCUE_AND_ISRU');
  }

  public generateMissionReport(): MissionReport {
    return {
      oxygenEfficiency: Math.round(this.resources.suitOxygen),
      batteryEfficiency: Math.round(this.resources.roverBattery),
      roverIntegrity: Math.round(this.resources.roverIntegrity),
      badges: [
        {
          id: 'badge-gravity',
          title: 'Mestre da Baixa Gravidade',
          description: 'Pilotou com segurança em 1/6 da gravidade terrestre mantendo o rover estável.',
          icon: '🌕',
          unlocked: this.resources.roverIntegrity >= 60
        },
        {
          id: 'badge-navigator',
          title: 'Navegador por Instrumentos',
          description: 'Cruzou a tempestade de micrometeoritos guiando-se estritamente pela bússola e sonar.',
          icon: '🧭',
          unlocked: this.stormModeInstrumentAdvancing
        },
        {
          id: 'badge-isru',
          title: 'Engenheiro ISRU',
          description: 'Transformou gelo lunar escuro em propelente líquido criogênico (H₂ e O₂) para o foguete.',
          icon: '⚡',
          unlocked: true
        }
      ]
    };
  }

  public toggleCameraMode(): CameraViewMode {
    this.cameraMode = this.cameraMode === 'THIRD_PERSON' ? 'COCKPIT' : 'THIRD_PERSON';
    soundManager.playUiBeep(800, 0.05);
    return this.cameraMode;
  }

  public resetMission(): void {
    this.resources = {
      baseSolarEnergy: 60,
      baseOxygen: 85,
      roverBattery: 20,
      suitOxygen: 30,
      roverIntegrity: 100,
      marsFuelTank: 0
    };
    this.domeInteractions = {
      energyRedirected: false,
      suitRefilled: false,
      briefingViewed: false,
      airlockOpened: false
    };
    this.stormDilemmaTriggered = false;
    this.stormChoiceMade = false;
    this.stormModeInstrumentAdvancing = false;
    this.stormClearedAt60m = false;
    this.dataModuleExtracted = false;
    soundManager.stopMotor();
    soundManager.stopSonar();
    this.setState('STATE_PROLOGUE');
    this.notifyResources();
  }
}

export const gameStateManager = new GameStateManager();
