/**
 * Welwitschia Lunar - Sistema de Partículas da Tempestade de Micrometeoritos
 * Simula a poeira de regolito lunar eletrostático em suspensão balística reduzindo a visibilidade para 40m.
 */

import * as THREE from 'three';

export class DustStormSystem {
  public group: THREE.Group;
  public particleCount: number = 2400;
  private points: THREE.Points;
  private positions: Float32Array;
  private velocities: Float32Array;
  public isActive: boolean = false;
  private spreadRadius: number = 65;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();

    const geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);

    for (let i = 0; i < this.particleCount; i++) {
      this.resetParticle(i, 0, 0, 0);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    // Material de partículas de regolito lunar cinza-poeirento
    const material = new THREE.PointsMaterial({
      color: 0x8a929a,
      size: 0.6,
      transparent: true,
      opacity: 0.7,
      blending: THREE.NormalBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(geometry, material);
    this.group.add(this.points);
    this.group.visible = false;
    scene.add(this.group);
  }

  private resetParticle(i: number, centerX: number, centerY: number, centerZ: number): void {
    const idx = i * 3;
    const r = Math.random() * this.spreadRadius;
    const theta = Math.random() * Math.PI * 2;
    const phi = (Math.random() - 0.2) * Math.PI * 0.5;

    this.positions[idx] = centerX + r * Math.cos(theta) * Math.cos(phi);
    this.positions[idx + 1] = centerY + Math.random() * 18 - 1; // Altura próxima ao solo
    this.positions[idx + 2] = centerZ + r * Math.sin(theta) * Math.cos(phi);

    // Velocidade de dispersão balística lunar
    this.velocities[idx] = (Math.random() - 0.5) * 6;
    this.velocities[idx + 1] = (Math.random() - 0.5) * 4;
    this.velocities[idx + 2] = (Math.random() - 0.5) * 6;
  }

  public setActive(active: boolean): void {
    this.isActive = active;
    this.group.visible = active;
  }

  public update(delta: number, centerPos: THREE.Vector3): void {
    if (!this.isActive) return;

    const posAttr = this.points.geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;

      this.positions[idx] += this.velocities[idx] * delta;
      this.positions[idx + 1] += this.velocities[idx + 1] * delta;
      this.positions[idx + 2] += this.velocities[idx + 2] * delta;

      // Se a partícula se afastar demais do jogador, reposiciona ao redor
      const dx = this.positions[idx] - centerPos.x;
      const dy = this.positions[idx + 1] - centerPos.y;
      const dz = this.positions[idx + 2] - centerPos.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq > this.spreadRadius * this.spreadRadius || this.positions[idx + 1] < centerPos.y - 4) {
        this.resetParticle(i, centerPos.x, centerPos.y, centerPos.z);
      }
    }

    posAttr.needsUpdate = true;
  }
}
