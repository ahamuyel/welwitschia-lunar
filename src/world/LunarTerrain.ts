/**
 * Welwitschia Lunar - Terreno Lunar Procedural (Polo Sul Lunar - Cratera Shackleton)
 * Malha PBR 2500m x 2500m com relevo Simplex, morfologia de crateras de impacto,
 * relevo de alta frequência e sistema de colisores de obstáculos rochosos.
 */

import * as THREE from 'three';
import { getLunarHeight } from '../math/noise';
import { createHighResRegolithBumpMap } from './ProceduralTextures';
import type { ObstacleCollider } from '../types/game';

export class LunarTerrain {
  public mesh: THREE.Mesh;
  public size: number = 2500;
  public segments: number = 220; // 48.400 vértices para alta performance a 60 FPS
  public rocksGroup: THREE.Group;
  public colliders: ObstacleCollider[] = [];

  constructor() {
    this.rocksGroup = new THREE.Group();
    this.mesh = this.createTerrainMesh();
    this.scatterLunarBoulders();
    this.registerStationAndScoutColliders();
  }

  private createTerrainMesh(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(this.size, this.size, this.segments, this.segments);
    geometry.rotateX(-Math.PI / 2);

    const posAttr = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < posAttr.count; i++) {
      vertex.fromBufferAttribute(posAttr, i);
      const h = getLunarHeight(vertex.x, vertex.z);
      posAttr.setY(i, h);
    }

    geometry.computeVertexNormals();

    // Bump map de alta frequência que revela pedriscos e micro-relevo sob o sol rasante de 5°
    const bumpMap = createHighResRegolithBumpMap();

    const material = new THREE.MeshStandardMaterial({
      color: 0x484d52, // Cinza-ardósia lunar característico
      roughness: 0.92,
      metalness: 0.05,
      bumpMap: bumpMap,
      bumpScale: 0.55, // Efeito acentuado de micro-sombras no relevo
      flatShading: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    return mesh;
  }

  /** Espalha rochas basálticas pela superfície e cria colisores físicos reais */
  private scatterLunarBoulders(): void {
    const rockGeo = new THREE.DodecahedronGeometry(1.2, 1);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x36393e,
      roughness: 0.95,
      metalness: 0.02
    });

    const numRocks = 350;
    const instancedRocks = new THREE.InstancedMesh(rockGeo, rockMat, numRocks);
    instancedRocks.castShadow = true;
    instancedRocks.receiveShadow = true;

    const dummy = new THREE.Object3D();

    for (let i = 0; i < numRocks; i++) {
      const angle = (i / numRocks) * Math.PI * 2 + Math.sin(i * 3.7) * 0.5;
      const dist = 45 + Math.pow((i / numRocks), 0.75) * 1180;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = getLunarHeight(x, z);

      dummy.position.set(x, y + 0.35, z);

      dummy.rotation.set(
        Math.sin(i * 1.5) * Math.PI,
        Math.cos(i * 2.3) * Math.PI,
        Math.sin(i * 0.9) * Math.PI
      );

      const scale = 0.9 + (i % 5 === 0 ? 1.8 : Math.random() * 1.2);
      dummy.scale.set(scale, scale * 0.85, scale * 1.1);

      dummy.updateMatrix();
      instancedRocks.setMatrixAt(i, dummy.matrix);

      // Registra colisores para rochas de porte médio e grande (especialmente no trajeto até 2000m)
      if (scale > 1.2) {
        this.colliders.push({
          position: { x, y: y + 0.35, z },
          radius: scale * 1.05,
          type: 'ROCK'
        });
      }
    }

    instancedRocks.instanceMatrix.needsUpdate = true;
    this.rocksGroup.add(instancedRocks);
  }

  /** Registra os limites físicos de colisão da Estação Welwitschia e do LRO-Scout */
  private registerStationAndScoutColliders(): void {
    // 1. Cúpula Central da Estação (raio ~15m)
    this.colliders.push({
      position: { x: 0, y: getLunarHeight(0, 0), z: 0 },
      radius: 15.5,
      type: 'STATION'
    });

    // 2. Módulo de Refinaria ISRU e Tanques (-16m, 0)
    this.colliders.push({
      position: { x: -16, y: getLunarHeight(-16, 0), z: 0 },
      radius: 7.5,
      type: 'STATION'
    });

    // 3. Rover Perdido LRO-Scout (1414.2, 1414.2)
    this.colliders.push({
      position: { x: 1414.2, y: getLunarHeight(1414.2, 1414.2), z: 1414.2 },
      radius: 2.6,
      type: 'SCOUT'
    });
  }

  /** Retorna a altitude exata do terreno em (x, z) */
  public getHeight(x: number, z: number): number {
    return getLunarHeight(x, z);
  }

  /** Calcula o vetor normal do relevo lunar em (x, z) */
  public getNormal(x: number, z: number, sampleDist: number = 1.0): THREE.Vector3 {
    const hL = getLunarHeight(x - sampleDist, z);
    const hR = getLunarHeight(x + sampleDist, z);
    const hD = getLunarHeight(x, z - sampleDist);
    const hU = getLunarHeight(x, z + sampleDist);

    const normal = new THREE.Vector3(
      hL - hR,
      sampleDist * 2.0,
      hD - hU
    );
    normal.normalize();
    return normal;
  }
}
