/**
 * Welwitschia Lunar - Funções de Apoio de Telemetria Espacial
 */

import * as THREE from 'three';

export interface TelemetryNavInfo {
  distanceToTargetM: number;
  azimuthToTargetDeg: number;
  distanceToBaseM: number;
  azimuthToBaseDeg: number;
}

export function calculateNavTelemetry(
  roverPos: THREE.Vector3,
  targetPos: THREE.Vector3,
  basePos: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
): TelemetryNavInfo {
  // 1. Relação com o Alvo (LRO-Scout)
  const dxTarget = targetPos.x - roverPos.x;
  const dzTarget = targetPos.z - roverPos.z;
  const distanceToTargetM = Math.round(Math.sqrt(dxTarget * dxTarget + dzTarget * dzTarget));
  const azimuthTargetRad = Math.atan2(dxTarget, dzTarget);
  const azimuthToTargetDeg = Math.round((azimuthTargetRad * (180 / Math.PI) + 360) % 360);

  // 2. Relação com a Estação Welwitschia (Base)
  const dxBase = basePos.x - roverPos.x;
  const dzBase = basePos.z - roverPos.z;
  const distanceToBaseM = Math.round(Math.sqrt(dxBase * dxBase + dzBase * dzBase));
  const azimuthBaseRad = Math.atan2(dxBase, dzBase);
  const azimuthToBaseDeg = Math.round((azimuthBaseRad * (180 / Math.PI) + 360) % 360);

  return {
    distanceToTargetM,
    azimuthToTargetDeg,
    distanceToBaseM,
    azimuthToBaseDeg
  };
}
