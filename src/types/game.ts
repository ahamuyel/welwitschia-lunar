/**
 * Welwitschia Lunar - Tipos e Interfaces do Jogo
 * Mochileiros da Galáxia (2032 - Programa Artemis / Polo Sul Lunar)
 */

export type GameState =
  | 'STATE_PROLOGUE'
  | 'STATE_DOME_MANAGEMENT'
  | 'STATE_ROVER_EXPLORATION'
  | 'STATE_STORM_DILEMMA'
  | 'STATE_RESCUE_AND_ISRU';

export type WellyMood = 'NEUTRAL' | 'ALERT' | 'HAPPY';

export type CameraViewMode = 'THIRD_PERSON' | 'COCKPIT';

export type BaseLedState = 'NORMAL' | 'ALERT' | 'EMERGENCY' | 'HYPOTHERMIA';

export type BaseEmergencyType =
  | 'SOLAR_STORM'
  | 'LUNAR_NIGHT_COLD'
  | 'ELECTROSTATIC_DUST'
  | 'OXYGEN_LEAK';

export type HologramModelType = 'MOON' | 'EARTH' | 'ICE_CRYSTAL';

export interface BaseEmergencyEvent {
  type: BaseEmergencyType;
  title: string;
  stationId: 'SHIELD' | 'GREENHOUSE' | 'ENERGY' | 'OXYGEN';
  stationName: string;
  description: string;
  ledState: BaseLedState;
  optionA: {
    label: string;
    costText: string;
  };
  optionB: {
    label: string;
    costText: string;
  };
}

export interface ValveCalibrationState {
  active: boolean;
  timeRemainingSec: number;
  valve1Calibrated: boolean;
  valve2Calibrated: boolean;
}

export interface BaseInteriorState {
  ledState: BaseLedState;
  cabinTempC: number;
  baseIntegrity: number;
  shieldActive: boolean;
  frostLevel: number; // 0 a 1 (geada nas janelas no frio extremo)
  greenhouseHealthy: boolean;
  labPaused: boolean;
  activeHologram: HologramModelType;
  discoveriesUnlocked: number;
  lastDiscoveryTitle: string;
  activeEmergency: BaseEmergencyEvent | null;
  valveCalibration: ValveCalibrationState;
  lastConsequenceFeedback: {
    title: string;
    scientificReason: string;
    choiceLabel: string;
    isPositive: boolean;
  } | null;
}

export interface TelemetryData {
  speedKmh: number;
  headingDeg: number;
  distanceToTargetM: number;
  azimuthToTargetDeg: number;
  distanceToBaseM: number;
  azimuthToBaseDeg: number;
  altitudeM: number;
  coordinates: { x: number; y: number; z: number };
  isGpsActive: boolean;
  isHeadlightsOn: boolean;
  isInStorm: boolean;
  stormChoiceMade: boolean;
  isNearLostRover: boolean;
  highSpeedTimer: number;
  cameraMode: CameraViewMode;
}

export interface ResourceState {
  baseSolarEnergy: number; // 0 - 100%
  baseOxygen: number;      // 0 - 100%
  roverBattery: number;    // 0 - 100%
  suitOxygen: number;      // 0 - 100%
  roverIntegrity: number;  // 0 - 100%
  marsFuelTank: number;    // 0 - 100%
}

export interface DomeInteractions {
  energyRedirected: boolean;
  suitRefilled: boolean;
  briefingViewed: boolean;
  airlockOpened: boolean;
}

export interface WellyQueueItem {
  id: string;
  text: string;
  mood: WellyMood;
  priority?: 'NORMAL' | 'URGENT';
}

export interface ChatMessage {
  id: string;
  sender: 'PLAYER' | 'WELLY';
  text: string;
  mood?: WellyMood;
  timestamp: number;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface MissionReport {
  oxygenEfficiency: number;
  batteryEfficiency: number;
  roverIntegrity: number;
  badges: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    unlocked: boolean;
  }>;
}

export interface ObstacleCollider {
  position: { x: number; y: number; z: number };
  radius: number;
  type: 'ROCK' | 'STATION' | 'SCOUT';
}
