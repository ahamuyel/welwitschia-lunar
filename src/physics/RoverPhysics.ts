/**
 * Welwitschia Lunar - Física, Dinâmica do Veículo e Sistema de Colisão Real
 * Gravidade lunar (g = -1.62 m/s²), inércia de massa, zonas de aderência
 * e detecção/resposta a colisões físicas com rochas basálticas e estruturas.
 */

import * as THREE from 'three';
import { LunarTerrain } from '../world/LunarTerrain';

export interface RoverInputs {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  brake: boolean;
}

export interface RoverUpdateResult {
  speedKmh: number;
  headingDeg: number;
  triggeredHighSpeedAlert: boolean;
  sufferedRockDamage: boolean;
  sufferedCollision: boolean;
  collisionSpeedKmh: number;
}

export class RoverPhysics {
  // Posição e orientação
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public heading: number = 0; // Yaw (radianos)
  public pitch: number = 0;
  public roll: number = 0;

  // Parâmetros de física lunar
  public readonly lunarGravity: number = -1.62; // m/s² (1/6 da Terra)
  public readonly maxSpeedKmh: number = 28.0;
  public readonly maxSpeedMs: number = 28.0 / 3.6; // ~7.78 m/s
  public readonly roverColliderRadius: number = 1.65; // Raio de colisão do chassi

  // Estado cinemático
  public currentSpeedKmh: number = 0;
  public isGrounded: boolean = true;
  public highSpeedDuration: number = 0;
  public isBraking: boolean = false;
  public isAccelerating: boolean = false;

  // Orientação da malha
  public orientationQuaternion: THREE.Quaternion = new THREE.Quaternion();

  private terrain: LunarTerrain;

  constructor(terrain: LunarTerrain, initialPosition: THREE.Vector3, initialHeading: number = 0) {
    this.terrain = terrain;
    this.position = initialPosition.clone();
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.heading = initialHeading;

    const groundY = this.terrain.getHeight(this.position.x, this.position.z);
    this.position.y = groundY + 0.52;
  }

  public update(delta: number, inputs: RoverInputs, isInStormDilemma: boolean = false): RoverUpdateResult {
    const dt = Math.min(delta, 0.05);

    let triggeredHighSpeedAlert = false;
    let sufferedRockDamage = false;
    let sufferedCollision = false;
    let collisionSpeedKmh = 0;

    // 1. Processamento de aceleração e frenagem longitudinal
    const forwardDir = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    const rightDir = new THREE.Vector3(Math.cos(this.heading), 0, -Math.sin(this.heading));

    const forwardSpeed = this.velocity.dot(forwardDir);
    const lateralSpeed = this.velocity.dot(rightDir);

    this.isBraking = inputs.brake;
    this.isAccelerating = inputs.forward;

    let accel = 0;
    if (this.isGrounded) {
      if (inputs.forward) {
        accel += 3.8;
      }
      if (inputs.backward) {
        accel -= 2.6;
      }
      if (inputs.brake) {
        const brakeDecel = 6.5;
        if (forwardSpeed > 0.1) {
          accel -= brakeDecel;
        } else if (forwardSpeed < -0.1) {
          accel += brakeDecel;
        }
      }
    }

    // 2. Zona de Velocidade e Atrito Lateral
    this.currentSpeedKmh = Math.abs(forwardSpeed) * 3.6;

    let lateralGrip = 1.0;
    if (this.currentSpeedKmh > 20.0) {
      lateralGrip = 0.60;
      this.highSpeedDuration += dt;
      if (this.highSpeedDuration >= 3.0) {
        triggeredHighSpeedAlert = true;
      }
    } else {
      this.highSpeedDuration = Math.max(0, this.highSpeedDuration - dt * 2.0);
    }

    // Na tempestade: se correr acima de 18 km/h, risco de micrometeoritos e choque de ejetos
    if (isInStormDilemma && this.currentSpeedKmh > 18.0) {
      if (Math.random() < 0.035) {
        sufferedRockDamage = true;
      }
    }

    // 3. Direção (Steering) e Inércia de Rotação
    let turnInput = 0;
    if (inputs.left) turnInput += 1;
    if (inputs.right) turnInput -= 1;

    if (this.isGrounded && Math.abs(forwardSpeed) > 0.2) {
      const speedFactor = Math.min(Math.abs(forwardSpeed) / 4.0, 1.0);
      const turnRate = 1.5 * turnInput * speedFactor;
      this.heading += turnRate * dt;
    }

    this.heading = (this.heading + Math.PI * 2) % (Math.PI * 2);

    // 4. Integração da Velocidade Longitudinal e Lateral
    let newForwardSpeed = forwardSpeed + accel * dt;
    newForwardSpeed = Math.max(-this.maxSpeedMs * 0.4, Math.min(this.maxSpeedMs, newForwardSpeed));

    if (!inputs.forward && !inputs.backward && this.isGrounded) {
      newForwardSpeed *= Math.pow(0.92, dt * 60);
    }

    const newLateralSpeed = lateralSpeed * Math.pow(1.0 - (0.85 * lateralGrip), dt * 60);

    this.velocity.x = forwardDir.x * newForwardSpeed + rightDir.x * newLateralSpeed;
    this.velocity.z = forwardDir.z * newForwardSpeed + rightDir.z * newLateralSpeed;

    // 5. Gravidade Lunar e Altura do Solo
    const groundHeight = this.terrain.getHeight(this.position.x, this.position.z);
    const suspensionRestHeight = groundHeight + 0.52;

    if (this.position.y > suspensionRestHeight + 0.05) {
      this.isGrounded = false;
      this.velocity.y += this.lunarGravity * dt;
    } else {
      this.isGrounded = true;
      this.position.y = suspensionRestHeight;
      this.velocity.y = 0;
    }

    // 6. Atualização Preliminar da Posição
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    if (this.position.y < suspensionRestHeight) {
      this.position.y = suspensionRestHeight;
      this.isGrounded = true;
      this.velocity.y = 0;
    }

    // 7. SISTEMA DE COLISÃO FÍSICA REAL (Resposta de bloqueio e ricochete)
    const colliders = this.terrain.colliders;
    for (let i = 0; i < colliders.length; i++) {
      const col = colliders[i];
      const dx = this.position.x - col.position.x;
      const dz = this.position.z - col.position.z;
      const distSq = dx * dx + dz * dz;
      const minDist = this.roverColliderRadius + col.radius;

      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq) || 0.001;
        const overlap = minDist - dist;

        // Vetor normal de colisão
        const nx = dx / dist;
        const nz = dz / dist;

        // Bloqueia penetração empurrando o rover de volta
        this.position.x += nx * overlap;
        this.position.z += nz * overlap;

        // Velocidade pré-impacto
        collisionSpeedKmh = this.currentSpeedKmh;
        sufferedCollision = true;

        // Ricochete leve: inverte e amortece velocidade linear
        this.velocity.x = -this.velocity.x * 0.35;
        this.velocity.z = -this.velocity.z * 0.35;

        // Se velocidade era superior a 12 km/h, danifica integridade do chassi
        if (collisionSpeedKmh > 12.0) {
          sufferedRockDamage = true;
        }

        break;
      }
    }

    // 8. Alinhamento de Pitch e Roll com o Relevo Lunar
    const groundNormal = this.terrain.getNormal(this.position.x, this.position.z, 1.2);
    const targetQuat = new THREE.Quaternion();
    const up = this.isGrounded ? groundNormal : new THREE.Vector3(0, 1, 0);

    const forwardOnTerrain = forwardDir.clone().projectOnPlane(up).normalize();
    const rightOnTerrain = new THREE.Vector3().crossVectors(up, forwardOnTerrain).normalize();

    const rotMatrix = new THREE.Matrix4().makeBasis(rightOnTerrain, up, forwardOnTerrain);
    targetQuat.setFromRotationMatrix(rotMatrix);

    this.orientationQuaternion.slerp(targetQuat, Math.min(1.0, dt * 10.0));

    const headingDeg = Math.round((this.heading * (180 / Math.PI)) % 360);

    return {
      speedKmh: Math.round(this.currentSpeedKmh * 10) / 10,
      headingDeg,
      triggeredHighSpeedAlert,
      sufferedRockDamage,
      sufferedCollision,
      collisionSpeedKmh
    };
  }

  public resetPosition(pos: THREE.Vector3, heading: number = 0): void {
    this.position.copy(pos);
    this.velocity.set(0, 0, 0);
    this.heading = heading;
    this.currentSpeedKmh = 0;
    this.highSpeedDuration = 0;

    const groundY = this.terrain.getHeight(this.position.x, this.position.z);
    this.position.y = groundY + 0.52;
  }
}
