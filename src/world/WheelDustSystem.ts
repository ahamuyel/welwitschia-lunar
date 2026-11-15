/**
 * Welwitschia Lunar - Sistema de Partículas Balísticas das Rodas no Vácuo Lunar
 * Na ausência de atmosfera na Lua, o regolito ejetado pelas rodas não forma fumaça nem névoa;
 * ele é lançado em trajetórias puramente parabólicas (g = -1.62 m/s²) e decai rapidamente ao solo.
 */

import * as THREE from 'three';

interface DustParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  initialY: number;
}

export class WheelDustSystem {
  public group: THREE.Group;
  private particleCount: number = 300;
  private points: THREE.Points;
  private positions: Float32Array;
  private particles: DustParticle[] = [];
  private lunarGravity: number = -1.62;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();

    const geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.particleCount * 3);

    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: 0,
        y: -1000,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.8,
        initialY: 0
      });
      this.positions[i * 3] = 0;
      this.positions[i * 3 + 1] = -1000;
      this.positions[i * 3 + 2] = 0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x9ca3af, // Cinza basalto lunar
      size: 0.45,
      transparent: true,
      opacity: 0.8,
      depthWrite: false
    });

    this.points = new THREE.Points(geometry, material);
    this.group.add(this.points);
    scene.add(this.group);
  }

  /**
   * Dispara partículas discretas das 6 rodas quando o rover acelera ou freia no solo
   */
  public emitFromWheels(
    wheelPositions: THREE.Vector3[],
    roverVelocity: THREE.Vector3,
    isAccelerating: boolean,
    speedKmh: number
  ): void {
    if (speedKmh < 2.0) return;

    const particlesPerWheel = isAccelerating ? 2 : 1;

    for (let w = 0; w < wheelPositions.length; w++) {
      const wheelPos = wheelPositions[w];

      for (let p = 0; p < particlesPerWheel; p++) {
        // Encontra uma partícula inativa
        const particle = this.particles.find((pt) => pt.life <= 0);
        if (!particle) break;

        particle.x = wheelPos.x + (Math.random() - 0.5) * 0.2;
        particle.y = wheelPos.y + 0.05;
        particle.z = wheelPos.z + (Math.random() - 0.5) * 0.2;
        particle.initialY = wheelPos.y;

        // Velocidade balística: ejetada para trás e para cima com base na rotação das rodas
        const kickFactor = 0.45 + (speedKmh / 28) * 0.8;
        particle.vx = -roverVelocity.x * kickFactor + (Math.random() - 0.5) * 0.8;
        particle.vy = 0.6 + Math.random() * 1.4; // Altura de ejeção parabólica
        particle.vz = -roverVelocity.z * kickFactor + (Math.random() - 0.5) * 0.8;

        particle.maxLife = 0.6 + Math.random() * 0.5;
        particle.life = particle.maxLife;
      }
    }
  }

  public update(delta: number): void {
    const posAttr = this.points.geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particles[i];

      if (p.life > 0) {
        p.life -= delta;

        // Gravidade lunar g = -1.62 m/s²
        p.vy += this.lunarGravity * delta;

        p.x += p.vx * delta;
        p.y += p.vy * delta;
        p.z += p.vz * delta;

        // Ao cair de volta no solo, a partícula se extingue
        if (p.y <= p.initialY - 0.02) {
          p.life = 0;
          p.y = -1000;
        }

        this.positions[i * 3] = p.x;
        this.positions[i * 3 + 1] = p.y;
        this.positions[i * 3 + 2] = p.z;
      } else {
        this.positions[i * 3 + 1] = -1000;
      }
    }

    posAttr.needsUpdate = true;
  }
}
