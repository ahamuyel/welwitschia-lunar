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
