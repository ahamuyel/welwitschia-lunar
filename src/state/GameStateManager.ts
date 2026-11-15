/**
 * Welwitschia Lunar - Máquina de Estados do Jogo (GameStateManager)
 * Gerenciador dos 5 estados de jogo, consumo de recursos em tempo real,
 * transições e regras de missão.
 */

import type {
  GameState,
  ResourceState,
  DomeInteractions,
  MissionReport,
  CameraViewMode,
  BaseInteriorState,
  BaseEmergencyType,
  BaseEmergencyEvent,
  HologramModelType
} from '../types/game';
import { soundManager } from '../audio/SoundManager';

export type StateChangeCallback = (state: GameState) => void;
export type ResourceChangeCallback = (resources: ResourceState) => void;
export type BaseInteriorChangeCallback = (interior: BaseInteriorState) => void;

export const BASE_EMERGENCY_CATALOG: Record<BaseEmergencyType, BaseEmergencyEvent> = {
  SOLAR_STORM: {
    type: 'SOLAR_STORM',
    title: 'TEMPESTADE SOLAR // EJEÇÃO CORONAL',
    stationId: 'SHIELD',
    stationName: 'Estação de Blindagem Solar',
    description:
      'Partículas solares de alta energia aproximam-se do Polo Sul Lunar! Sem atmosfera na Lua, precisamos de decidir como proteger a cabine.',
    ledState: 'EMERGENCY',
    optionA: {
      label: '[A] Escudo Máximo (-25% Bateria, 0 Dano)',
      costText: 'Ativa bobinas Kapton no máximo: -25% Energia, 0% Dano'
    },
    optionB: {
      label: '[B] Modo Abrigo (Desliga Lab/Estufa temp., poupa bateria)',
      costText: 'Pausa Estufa e Lab temporariamente, poupa bateria (-5%)'
    }
  },
  LUNAR_NIGHT_COLD: {
    type: 'LUNAR_NIGHT_COLD',
    title: 'NOITE LUNAR // QUEDA TÉRMICA (-180°C)',
    stationId: 'GREENHOUSE',
    stationName: 'Estufa Interior Welwitschia',
    description:
      'A sombra da cratera Shackleton fez a temperatura cair drasticamente! Geada começa a formar-se nas janelas e ameaça a Welwitschia mirabilis.',
    ledState: 'HYPOTHERMIA',
    optionA: {
      label: '[A] Aquecimento Total (Consome +Bateria, mantém +20°C)',
      costText: 'Consome -20% Energia Solar, mantém +21°C e plantas vibrantes'
    },
    optionB: {
      label: '[B] Isolar Laboratório (Poupa energia, pausa ciência)',
      costText: 'Poupa energia (-5%), reduz temp. p/ +11°C e pausa Lab'
    }
  },
  ELECTROSTATIC_DUST: {
    type: 'ELECTROSTATIC_DUST',
    title: 'POEIRA NOS PAINÉIS // REGOLITO ELETROSTÁTICO',
    stationId: 'ENERGY',
    stationName: 'Estação de Blindagem & Energia',
    description:
      'Poeira lunar carregada eletricamente pelo vento solar cobriu os painéis fotovoltaicos, reduzindo a captação de energia em 40%.',
    ledState: 'ALERT',
    optionA: {
      label: '[A] Pulso Eletrostático (-15% Bateria, limpa já)',
      costText: 'Dispara cortina dielétrica: -15% Bateria, Solar vai a 100%'
    },
    optionB: {
      label: '[B] Limpeza Manual no Exterior (0 Bateria, gasta mais O2)',
      costText: '0% custo de Bateria, consome -15% Oxigénio na limpeza EVA'
    }
  },
  OXYGEN_LEAK: {
    type: 'OXYGEN_LEAK',
    title: 'FUGA DE OXIGÉNIO // MICROFISSURA NA JUNTA',
    stationId: 'OXYGEN',
    stationName: 'Estação de Suporte de Vida (O₂)',
    description:
      'Um micrometeorito causou perda de pressão numa conduta primária de O₂! Escolhe entre vedação química rápida ou calibração manual das 2 válvulas.',
    ledState: 'EMERGENCY',
    optionA: {
      label: '[A] Selagem Rápida (-10% Integridade)',
      costText: 'Estanca já com espuma polimérica, mas reduz -10% Integridade'
    },
    optionB: {
      label: '[B] Calibrar Válvulas (Olhar para 2 válvulas em 12s, sem custo)',
      costText: 'Olha/toca nas 2 válvulas em 12s: 0 custo e +10% O₂'
    }
  }
};

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

  public baseInterior: BaseInteriorState = {
    ledState: 'ALERT',
    cabinTempC: 21,
    baseIntegrity: 100,
    shieldActive: false,
    frostLevel: 0,
    greenhouseHealthy: true,
    labPaused: false,
    activeHologram: 'MOON',
    discoveriesUnlocked: 1,
    lastDiscoveryTitle: 'Topografia Polar de Shackleton (Lua)',
    activeEmergency: BASE_EMERGENCY_CATALOG.ELECTROSTATIC_DUST,
    valveCalibration: {
      active: false,
      timeRemainingSec: 12,
      valve1Calibrated: false,
      valve2Calibrated: false
    },
    lastConsequenceFeedback: null
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
  private baseInteriorListeners: BaseInteriorChangeCallback[] = [];

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

  public subscribeBaseInterior(cb: BaseInteriorChangeCallback): () => void {
    this.baseInteriorListeners.push(cb);
    return () => {
      this.baseInteriorListeners = this.baseInteriorListeners.filter(l => l !== cb);
    };
  }

  private notifyState(): void {
    this.stateListeners.forEach(cb => cb(this.currentState));
  }

  private notifyResources(): void {
    this.resourceListeners.forEach(cb => cb({ ...this.resources }));
  }

  private notifyBaseInterior(): void {
    this.baseInteriorListeners.forEach(cb =>
      cb({
        ...this.baseInterior,
        valveCalibration: { ...this.baseInterior.valveCalibration },
        lastConsequenceFeedback: this.baseInterior.lastConsequenceFeedback
          ? { ...this.baseInterior.lastConsequenceFeedback }
          : null
      })
    );
  }

  public setState(newState: GameState): void {
    if (this.currentState === newState) return;
    this.currentState = newState;
    this.notifyState();
  }

  // --- SISTEMA DE PROBLEMAS, ESCOLHAS E CONSEQUÊNCIAS DA BASE ---

  public triggerBaseEmergency(type: BaseEmergencyType): void {
    const emergency = BASE_EMERGENCY_CATALOG[type];
    this.baseInterior.activeEmergency = emergency;
    this.baseInterior.ledState = emergency.ledState;
    this.baseInterior.valveCalibration = {
      active: false,
      timeRemainingSec: 12,
      valve1Calibrated: false,
      valve2Calibrated: false
    };

    if (type === 'SOLAR_STORM') {
      soundManager.playSolarStormAlert();
    } else if (type === 'LUNAR_NIGHT_COLD') {
      this.baseInterior.cabinTempC = -4;
      this.baseInterior.frostLevel = 0.85;
      this.baseInterior.greenhouseHealthy = false;
      soundManager.playColdFrostSound();
    } else if (type === 'ELECTROSTATIC_DUST') {
      this.resources.baseSolarEnergy = Math.min(this.resources.baseSolarEnergy, 60);
      soundManager.playAlertSiren();
      this.notifyResources();
    } else if (type === 'OXYGEN_LEAK') {
      soundManager.playOxygenHissSound();
    }

    this.notifyBaseInterior();
  }

  public resolveBaseEmergencyChoice(choice: 'A' | 'B'): void {
    const active = this.baseInterior.activeEmergency;
    if (!active) return;

    const type = active.type;

    if (type === 'SOLAR_STORM') {
      if (choice === 'A') {
        // [A] Escudo Máximo (-25% Bateria, 0 Dano)
        this.resources.baseSolarEnergy = Math.max(15, this.resources.baseSolarEnergy - 25);
        this.baseInterior.shieldActive = true;
        this.baseInterior.ledState = 'NORMAL';
        this.baseInterior.activeEmergency = null;
        this.unlockDiscovery('EARTH', 'Magnetosfera Terrestre vs Escudo Kapton Lunar');
        this.baseInterior.lastConsequenceFeedback = {
          title: 'Escudo Eletromagnético Ativado!',
          choiceLabel: active.optionA.label,
          scientificReason:
            'Boa escolha! Sem atmosfera na Lua, a radiação solar exige blindagem magnética ativa nas bobinas Kapton ou abrigo imediato.',
          isPositive: true
        };
        soundManager.playElectrostaticPulseSound();
        soundManager.playSuccessChime();
      } else {
        // [B] Modo Abrigo (Desliga Lab/Estufa temporariamente, poupa bateria)
        this.resources.baseSolarEnergy = Math.max(10, this.resources.baseSolarEnergy - 5);
        this.baseInterior.labPaused = true;
        this.baseInterior.greenhouseHealthy = false;
        this.baseInterior.shieldActive = true;
        this.baseInterior.ledState = 'NORMAL';
        this.baseInterior.activeEmergency = null;
        this.baseInterior.lastConsequenceFeedback = {
          title: 'Modo Abrigo Ativado (Energia Poupada)',
          choiceLabel: active.optionB.label,
          scientificReason:
            'Boa escolha! Desligar o Lab e a Estufa poupou as baterias durante o pico de radiação solar, embora as plantas Welwitschia tenham sentido a falta de luz.',
          isPositive: true
        };
        soundManager.playUiBeep(720, 0.18);
      }
    } else if (type === 'LUNAR_NIGHT_COLD') {
      if (choice === 'A') {
        // [A] Aquecimento Total (Consome +Bateria, mantém +20°C)
        this.resources.baseSolarEnergy = Math.max(15, this.resources.baseSolarEnergy - 20);
        this.baseInterior.cabinTempC = 21;
        this.baseInterior.frostLevel = 0;
        this.baseInterior.greenhouseHealthy = true;
        this.baseInterior.labPaused = false;
        this.baseInterior.ledState = 'NORMAL';
        this.baseInterior.activeEmergency = null;
        this.unlockDiscovery('ICE_CRYSTAL', 'Gelo Polar em Crateras de Sombra Permanente');
        this.baseInterior.lastConsequenceFeedback = {
          title: 'Aquecimento Total (+21°C Estável)',
          choiceLabel: active.optionA.label,
          scientificReason:
            'Kandandu pela decisão rápida! No Polo Sul da Lua a noite atinge -180°C. Manter +21°C preserva a fotossíntese da Welwitschia mirabilis!',
          isPositive: true
        };
        soundManager.playSuccessChime();
      } else {
        // [B] Isolar Laboratório (Poupa energia, pausa ciência)
        this.resources.baseSolarEnergy = Math.max(10, this.resources.baseSolarEnergy - 5);
        this.baseInterior.cabinTempC = 12;
        this.baseInterior.frostLevel = 0.25;
        this.baseInterior.labPaused = true;
        this.baseInterior.greenhouseHealthy = true;
        this.baseInterior.ledState = 'NORMAL';
        this.baseInterior.activeEmergency = null;
        this.baseInterior.lastConsequenceFeedback = {
          title: 'Laboratório Isolado Termicamente',
          choiceLabel: active.optionB.label,
          scientificReason:
            'Decisão inteligente! No vácuo lunar o calor perde-se por radiação infravermelha. Isolar compartimentos reduz a perda térmica e poupa bateria.',
          isPositive: true
        };
        soundManager.playUiBeep(680, 0.18);
      }
    } else if (type === 'ELECTROSTATIC_DUST') {
      if (choice === 'A') {
        // [A] Pulso Eletrostático (-15% Bateria, limpa já)
        this.resources.baseSolarEnergy = 100;
        this.resources.roverBattery = 100;
        this.domeInteractions.energyRedirected = true;
        this.baseInterior.ledState = 'NORMAL';
        this.baseInterior.activeEmergency = null;
        this.unlockDiscovery('MOON', 'Repulsão Eletrostática de Regolito Lunar');
        this.baseInterior.lastConsequenceFeedback = {
          title: 'Painéis Limpos por Pulso Dielétrico!',
          choiceLabel: active.optionA.label,
          scientificReason:
            'Excelente! A poeira lunar acumula carga elétrica devido aos raios UV solares. Um pulso eletrostático repele os grãos sem gastar oxigénio de EVA!',
          isPositive: true
        };
        soundManager.playElectrostaticPulseSound();
        soundManager.playSuccessChime();
      } else {
        // [B] Limpeza Manual no Exterior (0 Bateria, gasta mais O2)
        this.resources.baseSolarEnergy = 100;
        this.resources.roverBattery = 100;
        this.resources.baseOxygen = Math.max(30, this.resources.baseOxygen - 15);
        this.domeInteractions.energyRedirected = true;
        this.baseInterior.ledState = 'NORMAL';
        this.baseInterior.activeEmergency = null;
        this.baseInterior.lastConsequenceFeedback = {
          title: 'Limpeza Manual Concluída (Bateria Poupada)',
          choiceLabel: active.optionB.label,
          scientificReason:
            'Poupaste 100% da bateria! Porém, sair ao vácuo lunar consome oxigénio valioso da câmara de descompressão (Airlock).',
          isPositive: true
        };
        soundManager.playUiBeep(820, 0.18);
      }
    } else if (type === 'OXYGEN_LEAK') {
      if (choice === 'A') {
        // [A] Selagem Rápida (-10% Integridade)
        this.baseInterior.baseIntegrity = Math.max(50, this.baseInterior.baseIntegrity - 10);
        this.resources.roverIntegrity = this.baseInterior.baseIntegrity;
        this.resources.suitOxygen = 100;
        this.domeInteractions.suitRefilled = true;
        this.baseInterior.ledState = 'NORMAL';
        this.baseInterior.activeEmergency = null;
        this.baseInterior.lastConsequenceFeedback = {
          title: 'Fuga Vedada com Espuma Polimérica (-10% Integridade)',
          choiceLabel: active.optionA.label,
          scientificReason:
            'A pressão interna de 101,3 kPa foi salva rapidamente! A espuma sela microfissuras no vácuo, mas exige revisão estrutural posterior.',
          isPositive: true
        };
        soundManager.playUiBeep(640, 0.2);
      } else {
        // [B] Calibrar Válvulas (Olhar para 2 válvulas em 12s, sem custo)
        this.baseInterior.valveCalibration = {
          active: true,
          timeRemainingSec: 12,
          valve1Calibrated: false,
          valve2Calibrated: false
        };
        soundManager.playValveCalibratedBeep(1);
      }
    }

    this.notifyResources();
    this.notifyBaseInterior();
  }

  public calibrateOxygenValve(valveIndex: 1 | 2): void {
    const cal = this.baseInterior.valveCalibration;
    if (!cal.active) return;

    if (valveIndex === 1 && !cal.valve1Calibrated) {
      cal.valve1Calibrated = true;
      soundManager.playValveCalibratedBeep(1);
    } else if (valveIndex === 2 && !cal.valve2Calibrated) {
      cal.valve2Calibrated = true;
      soundManager.playValveCalibratedBeep(2);
    }

    if (cal.valve1Calibrated && cal.valve2Calibrated) {
      cal.active = false;
      this.resources.baseOxygen = Math.min(100, this.resources.baseOxygen + 10);
      this.resources.suitOxygen = 100;
      this.domeInteractions.suitRefilled = true;
      this.baseInterior.ledState = 'NORMAL';
      this.baseInterior.activeEmergency = null;
      this.unlockDiscovery('ICE_CRYSTAL', 'Eletrólise de Água Lunar (2H₂O → 2H₂ + O₂)');
      this.baseInterior.lastConsequenceFeedback = {
        title: 'Duas Válvulas Calibradas com Precisão (0 Custo!)',
        choiceLabel: '[B] Calibrar Válvulas (2/2 concluídas)',
        scientificReason:
          'Brilhante, Comandante! Ao equilibrar o caudal das 2 válvulas de O₂, estancaste a perda de pressão para o vácuo sem perder integridade estrutural!',
        isPositive: true
      };
      soundManager.playSuccessChime();
      this.notifyResources();
    }

    this.notifyBaseInterior();
  }

  public unlockDiscovery(model: HologramModelType, title: string): void {
    this.baseInterior.activeHologram = model;
    this.baseInterior.discoveriesUnlocked += 1;
    this.baseInterior.lastDiscoveryTitle = title;
    this.baseInterior.labPaused = false;
  }

  public cycleHologramDiscovery(): void {
    const order: Array<{ model: HologramModelType; title: string }> = [
      { model: 'MOON', title: 'Cratera Shackleton & Picos de Luz Eterna (Lua)' },
      { model: 'EARTH', title: 'Telemetria Óptica Terra-Lua (384.400 km)' },
      { model: 'ICE_CRYSTAL', title: 'Cristal de Gelo Lunar & Eletrólise ISRU (H₂O)' }
    ];
    const currentIdx = order.findIndex(o => o.model === this.baseInterior.activeHologram);
    const next = order[(currentIdx + 1) % order.length];
    this.unlockDiscovery(next.model, next.title);
    this.viewBriefing();
    soundManager.playSuccessChime();
    this.notifyBaseInterior();
  }

  public updateBaseInterior(delta: number): void {
    if (this.currentState !== 'STATE_DOME_MANAGEMENT') return;

    if (this.baseInterior.valveCalibration.active) {
      this.baseInterior.valveCalibration.timeRemainingSec = Math.max(
        0,
        this.baseInterior.valveCalibration.timeRemainingSec - delta
      );
      if (this.baseInterior.valveCalibration.timeRemainingSec <= 0) {
        // Tempo esgotado: aplica selagem automática de segurança (-10% integridade)
        this.baseInterior.valveCalibration.active = false;
        this.baseInterior.baseIntegrity = Math.max(50, this.baseInterior.baseIntegrity - 10);
        this.resources.roverIntegrity = this.baseInterior.baseIntegrity;
        this.resources.suitOxygen = 100;
        this.domeInteractions.suitRefilled = true;
        this.baseInterior.ledState = 'NORMAL';
        this.baseInterior.activeEmergency = null;
        this.baseInterior.lastConsequenceFeedback = {
          title: 'Tempo Esgotado — Selagem Automática Ativada (-10% Integridade)',
          choiceLabel: 'Protocolo de Segurança Automático',
          scientificReason:
            'No vácuo lunar não podemos perder todo o ar! Como os 12 segundos terminaram, o computador selou a conduta automaticamente.',
          isPositive: false
        };
        soundManager.playAlertSiren();
        this.notifyResources();
      }
      this.notifyBaseInterior();
    }
  }

  // --- TRANSIÇÕES DA CÚPULA (ESTADO 2) ---

  public redirectEnergyToRover(): void {
    this.resources.roverBattery = 100;
    this.resources.baseSolarEnergy = 100;
    this.domeInteractions.energyRedirected = true;
    this.baseInterior.shieldActive = true;
    if (this.baseInterior.activeEmergency?.type === 'ELECTROSTATIC_DUST') {
      this.resolveBaseEmergencyChoice('A');
      return;
    }
    soundManager.playUiBeep(880, 0.15);
    this.notifyResources();
    this.notifyBaseInterior();
  }

  public refillSuitOxygen(): void {
    this.resources.suitOxygen = 100;
    this.domeInteractions.suitRefilled = true;
    if (this.baseInterior.activeEmergency?.type === 'OXYGEN_LEAK') {
      this.resolveBaseEmergencyChoice('A');
      return;
    }
    soundManager.playUiBeep(1040, 0.15);
    this.notifyResources();
    this.notifyBaseInterior();
  }

  public viewBriefing(): void {
    this.domeInteractions.briefingViewed = true;
    soundManager.playUiBeep(650, 0.08);
    this.notifyBaseInterior();
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
    this.baseInterior = {
      ledState: 'ALERT',
      cabinTempC: 21,
      baseIntegrity: 100,
      shieldActive: false,
      frostLevel: 0,
      greenhouseHealthy: true,
      labPaused: false,
      activeHologram: 'MOON',
      discoveriesUnlocked: 1,
      lastDiscoveryTitle: 'Topografia Polar de Shackleton (Lua)',
      activeEmergency: BASE_EMERGENCY_CATALOG.ELECTROSTATIC_DUST,
      valveCalibration: {
        active: false,
        timeRemainingSec: 12,
        valve1Calibrated: false,
        valve2Calibrated: false
      },
      lastConsequenceFeedback: null
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
    this.notifyBaseInterior();
  }
}

export const gameStateManager = new GameStateManager();
