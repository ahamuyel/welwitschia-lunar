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
    title: 'TEMPESTADE DE PARTÍCULAS SOLARES (SPE)',
    stationId: 'SHIELD',
    stationName: 'Estação de Blindagem Solar & Térmica',
    description:
      'Sem campo magnético global nem atmosfera densa na Lua, uma ejeção solar de protões (SPE) atinge o Polo Sul! Como proteger a tripulação?',
    ledState: 'EMERGENCY',
    optionA: {
      label: '[A] Ativar Escudo Eletromagnético (-25% Bateria, 0 Dano)',
      costText: 'Bobinas Kapton no máximo: -25% Bateria, 0% Dano',
      gainText: '✅ Protege o Casco (0% Dano)',
      sacrificeText: '⚠️ -25% Bateria + Penumbra 15s'
    },
    optionB: {
      label: '[B] Modo Abrigo no Núcleo (Pausa Lab/Estufa 15s, poupa bateria)',
      costText: 'Pausa Lab e Estufa por 15s, poupa bateria (-5%)',
      gainText: '✅ Poupa Bateria (-5% apenas)',
      sacrificeText: '⚠️ Pausa Lab/Estufa + Murcha 15s'
    }
  },
  LUNAR_NIGHT_COLD: {
    type: 'LUNAR_NIGHT_COLD',
    title: 'NOITE LUNAR // CRATERA SOMBREADA (-173°C)',
    stationId: 'GREENHOUSE',
    stationName: 'Estufa Interior Welwitschia',
    description:
      'A sombra da cratera Shackleton fez a temperatura externa cair para -173°C (dados NASA LRO)! O frio extremo ameaça congelar a hidroponia.',
    ledState: 'HYPOTHERMIA',
    optionA: {
      label: '[A] Aquecimento Total da Cabine (-20% Bateria, mantém +21°C)',
      costText: 'Consome -20% Bateria, mantém +21°C e plantas vibrantes',
      gainText: '✅ Mantém +21°C & Welwitschia Viva',
      sacrificeText: '⚠️ -20% Bateria + Penumbra 15s'
    },
    optionB: {
      label: '[B] Isolar Setores Secundários (Mantém Estufa/O₂, pausa ciência)',
      costText: 'Mantém calor na Estufa e O₂, pausa Lab por 15s (-5% Bateria)',
      gainText: '✅ Poupa Energia (-5% Bateria)',
      sacrificeText: '⚠️ Frio +12°C + Pausa Ciência 15s'
    }
  },
  ELECTROSTATIC_DUST: {
    type: 'ELECTROSTATIC_DUST',
    title: 'TEMPESTADE ELETROSTÁTICA DE REGOLITO',
    stationId: 'ENERGY',
    stationName: 'Estação de Blindagem & Energia',
    description:
      'Poeira lunar abrasiva carregada eletricamente pelos raios UV solares aderiu aos painéis fotovoltaicos, reduzindo a energia!',
    ledState: 'ALERT',
    optionA: {
      label: '[A] Pulso Eletrostático EDS (-15% Bateria, limpa na hora)',
      costText: 'Escudo Eletrodinâmico NASA (EDS): -15% Bateria, limpa já',
      gainText: '✅ Limpa Painéis na Hora (100%)',
      sacrificeText: '⚠️ -15% Bateria + Penumbra 12s'
    },
    optionB: {
      label: '[B] Sair em EVA para Limpeza Manual (0 Bateria, consome O₂)',
      costText: '0% Bateria, consome -15% Oxigénio do fato em EVA',
      gainText: '✅ 0% Custo de Bateria',
      sacrificeText: '⚠️ -15% O₂ + Dreno 2x O₂ em EVA'
    }
  },
  OXYGEN_LEAK: {
    type: 'OXYGEN_LEAK',
    title: 'MICRO-METEORITO // FUGA DE PRESSÃO (10⁻¹² torr)',
    stationId: 'OXYGEN',
    stationName: 'Estação de Suporte de Vida (O₂)',
    description:
      'Um micrometeorito atingiu uma conduta primária perante o vácuo lunar (exosfera de 10⁻¹² torr)! Estanca a fuga de pressão imediatamente.',
    ledState: 'EMERGENCY',
    optionA: {
      label: '[A] Espuma Selante Polimérica (-10% Integridade Estrutural)',
      costText: 'Veda na hora com polímero, reduz -10% Integridade',
      gainText: '✅ Estanca Fuga Imediatamente',
      sacrificeText: '⚠️ -10% Casco + Faíscas/Tremor 12s'
    },
    optionB: {
      label: '[B] Redirecionar Válvulas de Reserva (Ativar 2 válvulas em 12s)',
      costText: 'Olha/toca nas 2 válvulas em 12s: 0 custo e +10% O₂',
      gainText: '✅ +10% O₂ & 0% Dano no Casco',
      sacrificeText: '⚠️ Calibrar 2 Válvulas em 12s'
    }
  },
  FUEL_CELL_OVERLOAD: {
    type: 'FUEL_CELL_OVERLOAD',
    title: 'SOBRECARGA NAS CÉLULAS DE COMBUSTÍVEL (+127°C)',
    stationId: 'ENERGY',
    stationName: 'Estação de Blindagem Solar & Térmica',
    description:
      'Durante o pico solar lunar (+127°C), as células regenerativas sofreram uma sobrecarga térmica! Precisamos de dissipar ou desviar o excesso.',
    ledState: 'ALERT',
    optionA: {
      label: '[A] Dissipar Calor nos Radiadores (Pausa Estufa por 10s)',
      costText: 'Abre radiadores externos: pausa Estufa 10s, 0% dano',
      gainText: '✅ Arrefece Células (0% Dano)',
      sacrificeText: '⚠️ Pausa Estufa + Murcha 12s'
    },
    optionB: {
      label: '[B] Armazenar Excesso no Laboratório (+12 Ciência, -10% Integridade)',
      costText: 'Gera +12 Ciência, mas o calor reduz -10% Integridade',
      gainText: '✅ +20 Ciência no Laboratório',
      sacrificeText: '⚠️ -10% Casco + Faíscas/Tremor 12s'
    }
  },
  GREENHOUSE_DEHYDRATION: {
    type: 'GREENHOUSE_DEHYDRATION',
    title: 'DESIDRATAÇÃO NA ESTUFA WELWITSCHIA (ISRU)',
    stationId: 'GREENHOUSE',
    stationName: 'Estufa Interior Welwitschia',
    description:
      'A reserva de água reciclada (ISRU) baixou na bancada hidropónica! Mesmo resistente como no Deserto do Namibe, a Welwitschia precisa de humidade.',
    ledState: 'ALERT',
    optionA: {
      label: '[A] Transferir Água do Suporte de Vida (-12% O₂, salva colheita)',
      costText: 'Desvia H₂O da eletrólise (-12% O₂), mantém plantas 100%',
      gainText: '✅ Salva Colheita Welwitschia',
      sacrificeText: '⚠️ -12% Oxigénio da Base'
    },
    optionB: {
      label: '[B] Modo Dormência da Welwitschia (Pausa por 15s, 0 custo)',
      costText: 'Ativa adaptação do Namibe: pausa Estufa 15s, 0 custo',
      gainText: '✅ 0% Gasto de Água/O₂',
      sacrificeText: '⚠️ Folhas Murcham por 15s'
    }
  }
};

export class GameStateManager {
  public currentState: GameState = 'STATE_PROLOGUE';

  public resources: ResourceState = {
    baseSolarEnergy: 80,
    baseOxygen: 90,
    roverBattery: 80,
    suitOxygen: 90,
    roverIntegrity: 100,
    marsFuelTank: 0
  };

  public domeInteractions: DomeInteractions = {
    energyRedirected: false,
    suitRefilled: false,
    briefingViewed: false,
    airlockOpened: false
  };

  public baseInterior: BaseInteriorState = {
    ledState: 'NORMAL',
    cabinTempC: 21,
    baseIntegrity: 100,
    shieldActive: false,
    frostLevel: 0,
    greenhouseHealthy: true,
    labPaused: false,
    activeHologram: 'MOON',
    discoveriesUnlocked: 0,
    lastDiscoveryTitle: '',
    activeEmergency: null,
    decisionTimeRemaining: 16,
    decisionMaxTime: 16,
    activeSideEffect: 'NONE',
    sideEffectTimerSec: 0,
    evaExtraO2DrainActive: false,
    narrativeAct: 1,
    narrativeActTitle: 'Ato I: Pouso na Cratera Shackleton',
    missionProgressPct: 12,
    valveCalibration: {
      active: false,
      timeRemainingSec: 12,
      valve1Calibrated: false,
      valve2Calibrated: false
    },
    sectorPauseTimerSec: 0,
    nextAutonomousEventSec: 26,
    lastConsequenceFeedback: null
  };

  private lastEmergencyType: BaseEmergencyType | null = null;
  private lastUrgencyBeepSecond: number = 6;
  private decisionsResolvedCount: number = 0;

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
    this.lastEmergencyType = type;
    this.baseInterior.activeEmergency = emergency;
    this.baseInterior.ledState = emergency.ledState;
    this.baseInterior.decisionMaxTime = 16;
    this.baseInterior.decisionTimeRemaining = 16;
    this.lastUrgencyBeepSecond = 6;
    this.baseInterior.nextAutonomousEventSec = 22 + Math.random() * 23;
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
    } else if (type === 'FUEL_CELL_OVERLOAD') {
      this.baseInterior.cabinTempC = 32;
      soundManager.playAlertSiren();
    } else if (type === 'GREENHOUSE_DEHYDRATION') {
      this.baseInterior.greenhouseHealthy = false;
      soundManager.playAlertSiren();
    }

    this.notifyBaseInterior();
  }

  public resolveBaseEmergencyChoice(choice: 'A' | 'B'): void {
    const active = this.baseInterior.activeEmergency;
    if (!active) return;

    const type = active.type;
    this.decisionsResolvedCount += 1;

    if (type === 'SOLAR_STORM') {
      if (choice === 'A') {
        // [A] Escudo Máximo (-25% Bateria + Penumbra 15s, 0 Dano)
        this.resources.baseSolarEnergy = Math.max(15, this.resources.baseSolarEnergy - 25);
        this.baseInterior.shieldActive = true;
        this.baseInterior.activeSideEffect = 'POWER_DIMMING';
        this.baseInterior.sideEffectTimerSec = 15;
        this.baseInterior.ledState = 'NORMAL';
        this.baseInterior.activeEmergency = null;
        this.unlockDiscovery('EARTH', 'Magnetosfera Terrestre vs Escudo Kapton Lunar');
        this.baseInterior.lastConsequenceFeedback = {
          title: 'Escudo Eletromagnético Ativado (-25% Bateria + Penumbra 15s)',
          choiceLabel: active.optionA.label,
          scientificReason:
            'Boa escolha! Sem atmosfera na Lua, a radiação solar exige blindagem magnética ativa nas bobinas Kapton.',
          wellyNarrativeQuote:
            'Sacrificámos 25% da bateria e a luz da cabine ficou em penumbra para alimentar o escudo Kapton — decisão difícil, Comandante, mas salvaste a tripulação da radiação!',
          isPositive: true
        };
        soundManager.playElectrostaticPulseSound();
        soundManager.playSuccessChime();
      } else {
        // [B] Modo Abrigo no Núcleo (Pausa Lab/Estufa 15s + Murcha, poupa bateria)
        this.resources.baseSolarEnergy = Math.max(10, this.resources.baseSolarEnergy - 5);
        this.baseInterior.labPaused = true;
        this.baseInterior.greenhouseHealthy = false;
        this.baseInterior.sectorPauseTimerSec = 15;
        this.baseInterior.activeSideEffect = 'GREENHOUSE_WILT';
        this.baseInterior.sideEffectTimerSec = 15;
        this.baseInterior.shieldActive = true;
        this.baseInterior.ledState = 'NORMAL';
        this.baseInterior.activeEmergency = null;
        this.baseInterior.lastConsequenceFeedback = {
          title: 'Modo Abrigo no Núcleo (Estufa em Pausa 15s)',
          choiceLabel: active.optionB.label,
          scientificReason:
            'Como a Lua não tem magnetosfera global como a Terra, abrigar no núcleo e pausar a Estufa por 15s poupou a bateria da base!',
          wellyNarrativeQuote:
            'Poupámos a nossa bateria para a noite lunar, mesmo vendo as folhas da Welwitschia inclinarem-se sem luz por 15 segundos. Ela é forte como Angola e já vai recuperar!',
          isPositive: true
        };
        soundManager.playUiBeep(720, 0.18);
      }
    } else if (type === 'LUNAR_NIGHT_COLD') {
      if (choice === 'A') {
        // [A] Aquecimento Total (-20% Bateria + Penumbra 15s, mantém +21°C)
        this.resources.baseSolarEnergy = Math.max(15, this.resources.baseSolarEnergy - 20);
        this.baseInterior.cabinTempC = 21;
        this.baseInterior.frostLevel = 0;
        this.baseInterior.greenhouseHealthy = true;
        this.baseInterior.labPaused = false;
        this.baseInterior.activeSideEffect = 'POWER_DIMMING';
        this.baseInterior.sideEffectTimerSec = 15;
        this.baseInterior.ledState = 'NORMAL';
        this.baseInterior.activeEmergency = null;
        this.unlockDiscovery('ICE_CRYSTAL', 'Gelo Polar em Crateras de Sombra Permanente');
        this.baseInterior.lastConsequenceFeedback = {
          title: 'Aquecimento Total (+21°C | Penumbra de Economia 15s)',
          choiceLabel: active.optionA.label,
          scientificReason:
            'Kandandu pela rapidez! Segundo a sonda LRO da NASA, as crateras sombreadas atingem -173°C. Manter +21°C protegeu a Welwitschia mirabilis!',
          wellyNarrativeQuote:
            'As luzes da cúpula baixaram para 35% porque desviámos a energia toda para os aquecedores, mas olha só: a nossa Welwitschia continua verdinha a +21°C!',
          isPositive: true
        };
        soundManager.playSuccessChime();
      } else {
        // [B] Isolar Setores Secundários (Poupa energia, pausa ciência por 15s)
        this.resources.baseSolarEnergy = Math.max(10, this.resources.baseSolarEnergy - 5);
        this.baseInterior.cabinTempC = 12;
        this.baseInterior.frostLevel = 0.28;
        this.baseInterior.labPaused = true;
        this.baseInterior.sectorPauseTimerSec = 15;
        this.baseInterior.activeSideEffect = 'POWER_DIMMING';
        this.baseInterior.sideEffectTimerSec = 12;
        this.baseInterior.greenhouseHealthy = true;
        this.baseInterior.ledState = 'NORMAL';
        this.baseInterior.activeEmergency = null;
        this.baseInterior.lastConsequenceFeedback = {
          title: 'Setores Isolados (+12°C | Lab Pausado 15s)',
          choiceLabel: active.optionB.label,
          scientificReason:
            'Decisão inteligente! No vácuo lunar sem ar, o calor escapa por radiação infravermelha. Concentrar calor na Estufa e O₂ poupou energia!',
          wellyNarrativeQuote:
            'Faz frio na cabine (+12°C) e pausámos o Laboratório, mas guardámos bateria preciosa para atravessar a Longa Noite de -173°C!',
          isPositive: true
        };
        soundManager.playUiBeep(680, 0.18);
      }
    } else if (type === 'ELECTROSTATIC_DUST') {
      if (choice === 'A') {
        // [A] Pulso Eletrostático (-15% Bateria + Penumbra 12s, limpa já)
        this.resources.baseSolarEnergy = Math.max(25, this.resources.baseSolarEnergy - 15);
        this.resources.roverBattery = 100;
        this.domeInteractions.energyRedirected = true;
        this.baseInterior.activeSideEffect = 'POWER_DIMMING';
        this.baseInterior.sideEffectTimerSec = 12;
        this.baseInterior.ledState = 'NORMAL';
        this.baseInterior.activeEmergency = null;
        this.unlockDiscovery('MOON', 'Repulsão Eletrostática de Regolito Lunar');
        this.baseInterior.lastConsequenceFeedback = {
          title: 'Pulso Dielétrico EDS (-15% Bateria + Penumbra 12s)',
          choiceLabel: active.optionA.label,
          scientificReason:
            'Excelente! A poeira lunar acumula carga elétrica devido aos raios UV solares. O pulso EDS repeliu os grãos sem gastar oxigénio!',
          wellyNarrativeQuote:
            'O pulso eletrostático drenou 15% da bateria e deixou a cabine em meia-luz por 12s, mas os painéis solares já estão limpos e a carregar!',
          isPositive: true
        };
        soundManager.playElectrostaticPulseSound();
        soundManager.playSuccessChime();
      } else {
        // [B] Limpeza Manual no Exterior (0 Bateria, -15% O2 + dreno acelerado no traje)
        this.resources.baseSolarEnergy = 100;
        this.resources.roverBattery = 100;
        this.resources.baseOxygen = Math.max(25, this.resources.baseOxygen - 15);
        this.resources.suitOxygen = Math.max(30, this.resources.suitOxygen - 15);
        this.domeInteractions.energyRedirected = true;
        this.baseInterior.activeSideEffect = 'EVA_O2_DRAIN';
        this.baseInterior.sideEffectTimerSec = 15;
        this.baseInterior.evaExtraO2DrainActive = true;
        this.baseInterior.ledState = 'NORMAL';
        this.baseInterior.activeEmergency = null;
        this.baseInterior.lastConsequenceFeedback = {
          title: 'Limpeza EVA Concluída (-15% O₂ + Consumo EVA Acelerado)',
          choiceLabel: active.optionB.label,
          scientificReason:
            'Poupaste 100% da bateria! Porém, o esforço na poeira abrasiva aumentou o consumo de O₂ do teu fato espacial.',
          wellyNarrativeQuote:
            'Limpaste os painéis à mão como um verdadeiro pioneiro angolano! Mas atenção ao fato espacial: o filtro ficou sobrecarregado e vai gastar mais O₂ lá fora!',
          isPositive: true
        };
        soundManager.playUiBeep(820, 0.18);
      }
    } else if (type === 'OXYGEN_LEAK') {
      if (choice === 'A') {
        // [A] Selagem Rápida (-10% Integridade + Faíscas e Trepidação 12s)
        this.baseInterior.baseIntegrity = Math.max(40, this.baseInterior.baseIntegrity - 10);
        this.resources.roverIntegrity = this.baseInterior.baseIntegrity;
        this.resources.suitOxygen = 100;
        this.domeInteractions.suitRefilled = true;
        this.baseInterior.activeSideEffect = 'HULL_SPARKS_SHAKE';
        this.baseInterior.sideEffectTimerSec = 12;
        this.baseInterior.ledState = 'NORMAL';
        this.baseInterior.activeEmergency = null;
        this.baseInterior.lastConsequenceFeedback = {
          title: 'Vedação Polimérica (-10% Casco + Faíscas/Tremor 12s)',
          choiceLabel: active.optionA.label,
          scientificReason:
            'A pressão interna de 101,3 kPa foi salva rapidamente! Porém a expansão brusca da espuma gerou tensão mecânica e faíscas na junta.',
          wellyNarrativeQuote:
            'Sentiste a estrutura tremer?! Sacrificámos 10% da integridade do casco com a espuma rápida, mas evitámos que o nosso oxigénio escapasse para o vácuo!',
          isPositive: true
        };
        soundManager.playRockImpact();
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
    } else if (type === 'FUEL_CELL_OVERLOAD') {
      if (choice === 'A') {
        // [A] Dissipar Calor nos Radiadores Externos (Pausa Estufa + Murcha 12s)
        this.baseInterior.cabinTempC = 21;
        this.baseInterior.greenhouseHealthy = false;
        this.baseInterior.sectorPauseTimerSec = 12;
        this.baseInterior.activeSideEffect = 'GREENHOUSE_WILT';
        this.baseInterior.sideEffectTimerSec = 12;
        this.baseInterior.ledState = 'NORMAL';
        this.baseInterior.activeEmergency = null;
        this.baseInterior.lastConsequenceFeedback = {
          title: 'Calor Dissipado nos Radiadores (Estufa Murcha 12s)',
          choiceLabel: active.optionA.label,
          scientificReason:
            'Ao meio-dia lunar a superfície chega a +127°C. Os radiadores infravermelhos dissiparam a sobrecarga sem danificar o casco!',
          wellyNarrativeQuote:
            'Desligámos a irrigação térmica da estufa por 12s para arrefecer as células de combustível. As folhas da Welwitschia sentiram o choque, mas o casco ficou intacto!',
          isPositive: true
        };
        soundManager.playSuccessChime();
      } else {
        // [B] Armazenar Excesso no Laboratório (+Ciência, -10% Integridade + Faíscas/Tremor 12s)
        this.baseInterior.cabinTempC = 24;
        this.baseInterior.baseIntegrity = Math.max(40, this.baseInterior.baseIntegrity - 10);
        this.resources.roverIntegrity = this.baseInterior.baseIntegrity;
        this.baseInterior.activeSideEffect = 'HULL_SPARKS_SHAKE';
        this.baseInterior.sideEffectTimerSec = 12;
        this.unlockDiscovery('MOON', 'Termodinâmica Lunar (+127°C Dia / -173°C Noite)');
        this.baseInterior.ledState = 'NORMAL';
        this.baseInterior.activeEmergency = null;
        this.baseInterior.lastConsequenceFeedback = {
          title: 'Excesso Canalizado (+20 Ciência | -10% Casco & Faíscas)',
          choiceLabel: active.optionB.label,
          scientificReason:
            'Aproveitaste o pico térmico de +127°C para acelerar a espectrografia lunar, mas a sobrecarga causou faíscas e -10% de integridade!',
          wellyNarrativeQuote:
            'Que coragem, Comandante! Conseguimos dados preciosos para enviar a Luanda, mas as condutas soltaram faíscas com a sobrecarga!',
          isPositive: true
        };
        soundManager.playRockImpact();
      }
    } else if (type === 'GREENHOUSE_DEHYDRATION') {
      if (choice === 'A') {
        // [A] Transferir Água do Suporte de Vida (-12% O2, salva colheita)
        this.resources.baseOxygen = Math.max(25, this.resources.baseOxygen - 12);
        this.baseInterior.greenhouseHealthy = true;
        this.baseInterior.activeSideEffect = 'POWER_DIMMING';
        this.baseInterior.sideEffectTimerSec = 12;
        this.baseInterior.ledState = 'NORMAL';
        this.baseInterior.activeEmergency = null;
        this.unlockDiscovery('ICE_CRYSTAL', 'Reciclagem Hidropónica Fechada NASA & Welwitschia');
        this.baseInterior.lastConsequenceFeedback = {
          title: 'Hidratação ISRU Concluída (-12% O₂, Colheita Salva)',
          choiceLabel: active.optionA.label,
          scientificReason:
            'Na Lua, a água extraída do gelo polar serve tanto para produzir O₂ por eletrólise como para regar a nossa Welwitschia mirabilis!',
          wellyNarrativeQuote:
            'Partilhámos a água do nosso próprio suporte de vida (-12% O₂) para salvar a Welwitschia mirabilis! Angola inteira orgulha-se de ti!',
          isPositive: true
        };
        soundManager.playSuccessChime();
      } else {
        // [B] Modo Dormência da Welwitschia (Murcha por 15s, 0 custo)
        this.baseInterior.greenhouseHealthy = false;
        this.baseInterior.sectorPauseTimerSec = 15;
        this.baseInterior.activeSideEffect = 'GREENHOUSE_WILT';
        this.baseInterior.sideEffectTimerSec = 15;
        this.baseInterior.ledState = 'NORMAL';
        this.baseInterior.activeEmergency = null;
        this.baseInterior.lastConsequenceFeedback = {
          title: 'Modo Dormência do Namibe (Folhas Inclinadas 15s, 0 Custo)',
          choiceLabel: active.optionB.label,
          scientificReason:
            'A Welwitschia mirabilis vive mais de 1.000 anos no Deserto do Namibe fechando os estomas durante a seca extrema!',
          wellyNarrativeQuote:
            'Custa ver as folhas da nossa planta perderem o brilho verde por 15 segundos, mas poupámos cada gota de oxigénio para a tripulação!',
          isPositive: true
        };
        soundManager.playUiBeep(690, 0.18);
      }
    }

    this.updateNarrativeActProgress();

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
        wellyNarrativeQuote:
          'Mãos rápidas de astronauta! Calibraste as duas válvulas a tempo e salvaste o oxigénio e o casco da nossa estação!',
        isPositive: true
      };
      soundManager.playSuccessChime();
      this.updateNarrativeActProgress();
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

  public updateNarrativeActProgress(distanceToTargetM?: number): void {
    let pct = 10;
    if (this.domeInteractions.energyRedirected) pct += 10;
    if (this.domeInteractions.suitRefilled) pct += 10;
    if (this.domeInteractions.briefingViewed) pct += 10;
    pct += Math.min(24, this.decisionsResolvedCount * 8);
    pct += Math.min(16, this.baseInterior.discoveriesUnlocked * 5);

    if (typeof distanceToTargetM === 'number' && distanceToTargetM < 650) {
      const evaProgress = Math.max(0, Math.min(1, (650 - distanceToTargetM) / 650));
      pct = Math.max(pct, Math.round(35 + evaProgress * 60));
    }
    if (this.dataModuleExtracted || this.currentState === 'STATE_RESCUE_AND_ISRU') {
      pct = 100;
    }

    pct = Math.min(100, Math.max(5, pct));
    this.baseInterior.missionProgressPct = pct;

    if (pct <= 33) {
      this.baseInterior.narrativeAct = 1;
      this.baseInterior.narrativeActTitle = 'Ato I: Pouso na Cratera Shackleton';
    } else if (pct <= 75) {
      this.baseInterior.narrativeAct = 2;
      this.baseInterior.narrativeActTitle = 'Ato II: A Longa Noite de -173°C';
    } else {
      this.baseInterior.narrativeAct = 3;
      this.baseInterior.narrativeActTitle = 'Ato III: O Amanhecer de Artemis';
    }
  }

  public updateBaseInterior(delta: number): void {
    if (this.currentState !== 'STATE_DOME_MANAGEMENT') return;

    let changed = false;

    // 1. Temporizador de pausa temporária de setores (Estufa / Laboratório) após escolhas táticas
    if (this.baseInterior.sectorPauseTimerSec > 0) {
      this.baseInterior.sectorPauseTimerSec = Math.max(0, this.baseInterior.sectorPauseTimerSec - delta);
      if (this.baseInterior.sectorPauseTimerSec <= 0) {
        this.baseInterior.labPaused = false;
        this.baseInterior.greenhouseHealthy = true;
        this.baseInterior.cabinTempC = 21;
        this.baseInterior.frostLevel = 0;
        changed = true;
      }
    }

    // 1b. Temporizador de efeitos colaterais sensoriais (Penumbra, Faíscas/Tremor, Murcha, Alarme de Indecisão)
    if (this.baseInterior.sideEffectTimerSec > 0) {
      this.baseInterior.sideEffectTimerSec = Math.max(0, this.baseInterior.sideEffectTimerSec - delta);
      if (this.baseInterior.sideEffectTimerSec <= 0) {
        if (this.baseInterior.activeSideEffect === 'INDECISION_ALARM' && !this.baseInterior.activeEmergency) {
          this.baseInterior.ledState = 'NORMAL';
        }
        this.baseInterior.activeSideEffect = 'NONE';
        changed = true;
      }
    }

    // 2. Calibração de 2 válvulas de O2 em 12s
    if (this.baseInterior.valveCalibration.active) {
      this.baseInterior.valveCalibration.timeRemainingSec = Math.max(
        0,
        this.baseInterior.valveCalibration.timeRemainingSec - delta
      );
      if (this.baseInterior.valveCalibration.timeRemainingSec <= 0) {
        // Tempo esgotado: aplica selagem automática de segurança (-10% integridade)
        this.baseInterior.valveCalibration.active = false;
        this.baseInterior.baseIntegrity = Math.max(40, this.baseInterior.baseIntegrity - 10);
        this.resources.roverIntegrity = this.baseInterior.baseIntegrity;
        this.resources.suitOxygen = 100;
        this.domeInteractions.suitRefilled = true;
        this.baseInterior.activeSideEffect = 'HULL_SPARKS_SHAKE';
        this.baseInterior.sideEffectTimerSec = 10;
        this.baseInterior.ledState = 'NORMAL';
        this.baseInterior.activeEmergency = null;
        this.baseInterior.lastConsequenceFeedback = {
          title: 'Tempo Esgotado — Selagem Automática (-10% Casco)',
          choiceLabel: 'Protocolo de Segurança Automático',
          scientificReason:
            'No vácuo lunar (10⁻¹² torr) não podemos perder todo o ar! Como os 12 segundos terminaram, o computador selou a conduta automaticamente.',
          wellyNarrativeQuote:
            'Quase ficámos sem ar, Comandante! O computador injetou espuma de emergência às pressas e o casco perdeu 10% de integridade!',
          isPositive: false
        };
        soundManager.playAlertSiren();
        this.notifyResources();
      }
      this.notifyBaseInterior();
      return;
    }

    // 2b. Timer de Urgência da Decisão Ativa (16s -> 0s) + Pulso Sonoro nos últimos 5s + FALHA POR INDECISÃO
    if (this.baseInterior.activeEmergency) {
      this.baseInterior.decisionTimeRemaining = Math.max(
        0,
        this.baseInterior.decisionTimeRemaining - delta
      );

      // Pulso de telemetria a cada segundo nos últimos 5 segundos
      if (this.baseInterior.decisionTimeRemaining > 0 && this.baseInterior.decisionTimeRemaining <= 5.0) {
        const ceilSec = Math.ceil(this.baseInterior.decisionTimeRemaining);
        if (ceilSec < this.lastUrgencyBeepSecond) {
          this.lastUrgencyBeepSecond = ceilSec;
          soundManager.playUrgencyTelemetryPulse(ceilSec);
        }
      }

      // Consequência de Tempo Esgotado: FALHA POR INDECISÃO
      if (this.baseInterior.decisionTimeRemaining <= 0) {
        this.baseInterior.activeEmergency = null;
        this.baseInterior.baseIntegrity = Math.max(20, this.baseInterior.baseIntegrity - 25);
        this.resources.roverIntegrity = this.baseInterior.baseIntegrity;
        this.resources.baseOxygen = Math.max(15, this.resources.baseOxygen - 15);
        this.resources.suitOxygen = Math.max(15, this.resources.suitOxygen - 15);
        this.resources.baseSolarEnergy = Math.max(10, this.resources.baseSolarEnergy - 15);
        this.resources.roverBattery = Math.max(10, this.resources.roverBattery - 15);

        this.baseInterior.ledState = 'EMERGENCY';
        this.baseInterior.activeSideEffect = 'INDECISION_ALARM';
        this.baseInterior.sideEffectTimerSec = 4.0;
        this.baseInterior.lastConsequenceFeedback = {
          title: '🚨 FALHA POR INDECISÃO (-25% Casco, -15% O₂, -15% Bateria)',
          choiceLabel: 'Tempo Esgotado (0s)',
          scientificReason:
            'No ambiente extremo do Polo Sul Lunar, a hesitação permite que a falha se propague pela rede pressurizada!',
          wellyNarrativeQuote:
            'Eish, Comandante! O tempo acabou sem escolhermos e a Estação Welwitschia sofreu danos críticos (-25% Casco, -15% O₂, -15% Bateria)! Na próxima temos de decidir rápido!',
          isPositive: false
        };
        soundManager.playIndecisionFailureAlarm();
        this.notifyResources();
      }

      this.notifyBaseInterior();
      return;
    }

    // 3. Motor Autónomo de Eventos Aleatórios da NASA (entre 22s e 45s, nunca simultâneos)
    if (!this.baseInterior.activeEmergency && !this.domeInteractions.airlockOpened) {
      this.baseInterior.nextAutonomousEventSec -= delta;
      if (this.baseInterior.nextAutonomousEventSec <= 0) {
        const allTypes: BaseEmergencyType[] = [
          'SOLAR_STORM',
          'LUNAR_NIGHT_COLD',
          'ELECTROSTATIC_DUST',
          'OXYGEN_LEAK',
          'FUEL_CELL_OVERLOAD',
          'GREENHOUSE_DEHYDRATION'
        ];
        const candidates = allTypes.filter((t) => t !== this.lastEmergencyType);
        const randomType = candidates[Math.floor(Math.random() * candidates.length)];
        this.triggerBaseEmergency(randomType);
        return;
      }
    }

    if (changed) {
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
    if (!this.domeInteractions.briefingViewed) {
      this.domeInteractions.briefingViewed = true;
      this.unlockDiscovery('MOON', 'Topografia Polar de Shackleton (Lua)');
    } else {
      this.cycleHologramDiscovery();
    }
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

  public enterBaseFromExterior(): void {
    soundManager.stopMotor();
    soundManager.stopSonar();
    soundManager.playAirlockDepressurization();
    soundManager.playSuccessChime();
    this.domeInteractions.airlockOpened = false;
    this.setState('STATE_DOME_MANAGEMENT');
    this.notifyResources();
    this.notifyBaseInterior();
  }

  // --- LOOP DE CONSUMO DE RECURSOS EM TEMPO REAL ---

  public updateResources(delta: number, speedKmh: number, isHeadlightsOn: boolean): {
    emergencyRescue: boolean;
    reason?: 'OXYGEN' | 'BATTERY';
  } {
    if (this.currentState !== 'STATE_ROVER_EXPLORATION' && this.currentState !== 'STATE_STORM_DILEMMA') {
      return { emergencyRescue: false };
    }

    // 1. Oxigênio do traje: -0.04% / s fora da base (ou 2.2x mais rápido se houve limpeza EVA na poeira solar)
    const drainMultiplier = this.baseInterior.evaExtraO2DrainActive ? 2.2 : 1.0;
    const suitOxygenDrain = 0.04 * drainMultiplier * delta;
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
    const prevAct = this.baseInterior.narrativeAct;
    this.updateNarrativeActProgress(distance);
    if (this.baseInterior.narrativeAct !== prevAct) {
      this.notifyBaseInterior();
    }

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
      baseSolarEnergy: 80,
      baseOxygen: 90,
      roverBattery: 80,
      suitOxygen: 90,
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
      ledState: 'NORMAL',
      cabinTempC: 21,
      baseIntegrity: 100,
      shieldActive: false,
      frostLevel: 0,
      greenhouseHealthy: true,
      labPaused: false,
      activeHologram: 'MOON',
      discoveriesUnlocked: 0,
      lastDiscoveryTitle: '',
      activeEmergency: null,
      decisionTimeRemaining: 16,
      decisionMaxTime: 16,
      activeSideEffect: 'NONE',
      sideEffectTimerSec: 0,
      evaExtraO2DrainActive: false,
      narrativeAct: 1,
      narrativeActTitle: 'Ato I: Pouso na Cratera Shackleton',
      missionProgressPct: 12,
      valveCalibration: {
        active: false,
        timeRemainingSec: 12,
        valve1Calibrated: false,
        valve2Calibrated: false
      },
      sectorPauseTimerSec: 0,
      nextAutonomousEventSec: 26,
      lastConsequenceFeedback: null
    };
    this.decisionsResolvedCount = 0;
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
