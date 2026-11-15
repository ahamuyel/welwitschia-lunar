/**
 * Welwitschia Lunar - Terreno Lunar Procedural PBR Avançado
 * Malha PBR 2500m x 2500m com NormalMap/RoughnessMap/BumpMap de alta frequência,
 * rochas basálticas facetadas com perturbação de vértices, depósitos de gelo em crateras
 * permanentemente sombreadas e colisores físicos integrados.
 */

import * as THREE from 'three';
import { getLunarHeight, simplex2D, LUNAR_CRATERS } from '../math/noise';
import {
  createHighResRegolithBumpMap,
  createHighResRegolithNormalMap,
  createHighResRegolithRoughnessMap,
  createIceDepositTexture
} from './ProceduralTextures';
import type { ObstacleCollider } from '../types/game';

export class LunarTerrain {
  public mesh: THREE.Mesh;
  public size: number = 2500;
  public segments: number = 220; // 48.400 vértices para alta performance a 60 FPS
  public rocksGroup: THREE.Group;
  public iceGroup: THREE.Group;
  public colliders: ObstacleCollider[] = [];

  constructor() {
    this.rocksGroup = new THREE.Group();
    this.iceGroup = new THREE.Group();
    this.mesh = this.createTerrainMesh();
    this.createCraterIceDeposits();
    this.scatterFacetedBasaltBoulders();
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

    const bumpMap = createHighResRegolithBumpMap();
    const normalMap = createHighResRegolithNormalMap();
    const roughnessMap = createHighResRegolithRoughnessMap();

    // Material PBR multi-camadas cinza-ardósia
    const material = new THREE.MeshStandardMaterial({
      color: 0x44494e,
      roughness: 0.92,
      metalness: 0.05,
      bumpMap: bumpMap,
      bumpScale: 0.45,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(0.65, 0.65),
      roughnessMap: roughnessMap,
      flatShading: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    return mesh;
  }

  /**
   * Adiciona depósitos de gelo de água brilhante (H2O) nas crateras sombreadas
   * com specular alto e brilho azulado sutil
   */
  private createCraterIceDeposits(): void {
    const iceTexture = createIceDepositTexture();

    const iceMaterial = new THREE.MeshStandardMaterial({
      color: 0x93c5fd, // Azul gelo claro
      metalness: 0.35,
      roughness: 0.16,
      map: iceTexture,
      emissive: 0x0f2b48,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.92,
      roughnessMap: iceTexture
    });

    // Cria lentes de gelo no fundo das crateras da rota
    LUNAR_CRATERS.forEach((crater) => {
      const iceRadius = crater.radius * 0.45;
      const iceGeo = new THREE.CircleGeometry(iceRadius, 24);
      iceGeo.rotateX(-Math.PI / 2);

      const iceMesh = new THREE.Mesh(iceGeo, iceMaterial);
      const floorY = getLunarHeight(crater.x, crater.z) + 0.15;
      iceMesh.position.set(crater.x, floorY, crater.z);
      iceMesh.receiveShadow = true;
      this.iceGroup.add(iceMesh);
    });
  }

  /**
   * Cria geometria de basalto facetada com perturbação de vértices via ruído Simplex
   * Evita formas plásticas e redondas, gerando blocos de fratura geológica real
   */
  private createFacetedBasaltGeometry(): THREE.BufferGeometry {
    const geo = new THREE.IcosahedronGeometry(1.0, 1);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      // Desloca vértices ao longo da normal com ruído Simplex tridimensional
      const noise = simplex2D(v.x * 2.5, v.y * 2.5 + v.z * 2.0);
      const displacement = 1.0 + noise * 0.32;
      v.multiplyScalar(displacement);
      pos.setXYZ(i, v.x, v.y, v.z);
    }

    geo.computeVertexNormals();
    return geo;
  }

  /**
   * Espalha matacões facetados com collider e seixos decorativos pequenos
   */
  private scatterFacetedBasaltBoulders(): void {
    const rockGeo = this.createFacetedBasaltGeometry();
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x32353a, // Basalto escuro vulcânico
      roughness: 0.94,
      metalness: 0.08,
      flatShading: true // Facetas visíveis nítidas sob a luz polar
    });

    // 1. Grandes Matacões com Colisor Físico
    const numBigRocks = 180;
    const bigRocks = new THREE.InstancedMesh(rockGeo, rockMat, numBigRocks);
    bigRocks.castShadow = true;
    bigRocks.receiveShadow = true;

    const dummy = new THREE.Object3D();

    for (let i = 0; i < numBigRocks; i++) {
      const angle = (i / numBigRocks) * Math.PI * 2 + Math.sin(i * 3.7) * 0.5;
      const dist = 50 + Math.pow((i / numBigRocks), 0.75) * 1150;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = getLunarHeight(x, z);

      dummy.position.set(x, y + 0.4, z);
      dummy.rotation.set(
        Math.sin(i * 1.5) * Math.PI,
        Math.cos(i * 2.3) * Math.PI,
        Math.sin(i * 0.9) * Math.PI
      );

      const scale = 1.2 + (i % 4 === 0 ? 1.6 : Math.random() * 1.0);
      dummy.scale.set(scale, scale * 0.75, scale * 1.15);
      dummy.updateMatrix();
      bigRocks.setMatrixAt(i, dummy.matrix);

      // Registra colisor esférico
      this.colliders.push({
        position: { x, y: y + 0.4, z },
        radius: scale * 1.1,
        type: 'ROCK'
      });
    }

    bigRocks.instanceMatrix.needsUpdate = true;
    this.rocksGroup.add(bigRocks);

    // 2. Seixos e Pedriscos Decorativos (sem colisor para manter 60 FPS estáveis)
    const numPebbles = 320;
    const pebbleMat = new THREE.MeshStandardMaterial({
      color: 0x2b2e33,
      roughness: 0.96,
      metalness: 0.02,
      flatShading: true
    });
    const pebbles = new THREE.InstancedMesh(rockGeo, pebbleMat, numPebbles);
    pebbles.receiveShadow = true;

    for (let i = 0; i < numPebbles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 1180;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = getLunarHeight(x, z);

      dummy.position.set(x, y + 0.15, z);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      const s = 0.25 + Math.random() * 0.45;
      dummy.scale.set(s, s * 0.8, s);
      dummy.updateMatrix();
      pebbles.setMatrixAt(i, dummy.matrix);
    }

    pebbles.instanceMatrix.needsUpdate = true;
    this.rocksGroup.add(pebbles);
  }

  private registerStationAndScoutColliders(): void {
    this.colliders.push({
      position: { x: 0, y: getLunarHeight(0, 0), z: 0 },
      radius: 15.5,
      type: 'STATION'
    });

    this.colliders.push({
      position: { x: -16, y: getLunarHeight(-16, 0), z: 0 },
      radius: 7.5,
      type: 'STATION'
    });

    this.colliders.push({
      position: { x: 1414.2, y: getLunarHeight(1414.2, 1414.2), z: 1414.2 },
      radius: 2.6,
      type: 'SCOUT'
    });
  }

  public getHeight(x: number, z: number): number {
    return getLunarHeight(x, z);
  }

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
