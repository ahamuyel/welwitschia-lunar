/**
 * Welwitschia Lunar - Estação Welwitschia (Base Lunar Polo Sul - Ano 2032)
 * Arquitetura realista inspirada no Programa Artemis e ESA Moon Village:
 * - Blindagem de radiação e micrometeoritos em regolito lunar impresso em 3D (berma protetora em camadas)
 * - Arcos estruturais de titânio escovado com vidros duplos de observação de alta fidelidade
 * - Túneis pressurizados cilíndricos com juntas de expansão conectando cúpula, airlock e planta ISRU
 * - Refletores de alta potência iluminando a plataforma de estacionamento e marcas de pouso no solo
 * - Emblema iluminado da Welwitschia mirabilis na entrada da base
 */

import * as THREE from 'three';
import { createSolarPanelTexture, createWelwitschiaEmblemTexture } from '../world/ProceduralTextures';
import type { DomeInteractions, ResourceState, BaseInteriorState, HologramModelType } from '../types/game';

export class WelwitschiaStation {
  public group: THREE.Group;
  public airlockPosition: THREE.Vector3;
  public domeCenter: THREE.Vector3;
  public solarPanels: THREE.Mesh[] = [];
  public interiorLight: THREE.PointLight;
  public greenhouseLight: THREE.PointLight;
  public airlockLight: THREE.PointLight;
  public airlockStrobeLight: THREE.PointLight;
  public airlockStrobeBulb: THREE.Mesh;
  public parkingFloodLight: THREE.SpotLight;
  public highGainDishGroup: THREE.Group;
  public emblemMesh: THREE.Mesh;

  public interactiveTerminals: THREE.Mesh[] = [];
  public exteriorAirlockBeacon!: THREE.Mesh;
  public exteriorAirlockDoor!: THREE.Mesh;
  private exteriorAirlockRing!: THREE.Mesh;
  private terminalRenderers: Map<string, { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture }> = new Map();

  // Iluminação LED perimetral dinâmica e efeitos de janela
  private floorLedMat!: THREE.MeshBasicMaterial;
  private ceilingLedMat!: THREE.MeshBasicMaterial;
  private perimeterPointLight!: THREE.PointLight;
  private windowShieldDomeMat!: THREE.MeshBasicMaterial;

  // a) Estação de Suporte de Vida (O2) - Anéis ascendentes e 2 válvulas calibráveis
  private o2Bubbles: Array<{ mesh: THREE.Mesh; baseY: number; offset: number }> = [];
  private valveMeshes: THREE.Mesh[] = [];

  // b) Estação de Blindagem Solar Kapton - Anéis eletromagnéticos laranja
  private kaptonRings: THREE.Mesh[] = [];

  // c) Estufa Interior Welwitschia - Plantas 3D reativas à temperatura e energia
  private welwitschiaPlants: Array<{
    leafLeft: THREE.Mesh;
    leafRight: THREE.Mesh;
    mat: THREE.MeshStandardMaterial;
  }> = [];

  // d) Laboratório Científico - Mesa Holográfica 3D Rotativa (Lua, Terra, Cristal de Gelo)
  private hologramRoot!: THREE.Group;
  private hologramMoon!: THREE.Group;
  private hologramEarth!: THREE.Group;
  private hologramIce!: THREE.Group;

  // Painéis 3D de Decisão Tática (Opção A vs Opção B) ativáveis por Gaze Fuse (0.8s)
  private decisionPanelA!: THREE.Mesh;
  private decisionPanelB!: THREE.Mesh;
  private decisionCanvasA!: { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture };
  private decisionCanvasB!: { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture };

  // 3 Barras Luminosas 3D integradas em cada uma das 4 máquinas (Feedback Diegético)
  private stationEnergyBars: Map<
    'OXYGEN' | 'SHIELD' | 'GREENHOUSE' | 'LAB',
    THREE.MeshBasicMaterial[]
  > = new Map();
  private targetLedColor: THREE.Color = new THREE.Color(0x00f0ff);
  private floorGuideMat!: THREE.MeshStandardMaterial;
  private cabinAirParticles!: THREE.Points;

  private lastInteriorState: BaseInteriorState | null = null;
  private lastResourcesState: ResourceState | null = null;
  private isAirlockOpen: boolean = false;

  constructor(baseAltitude: number = 0) {
    this.group = new THREE.Group();
    this.domeCenter = new THREE.Vector3(0, baseAltitude, 0);
    this.airlockPosition = new THREE.Vector3(0, baseAltitude + 1.2, 18);

    this.group.position.set(0, baseAltitude, 0);

    // 1. Fundação, plataforma de pouso sinterizada e marcas de manobra do rover
    this.buildFoundation();

    // 2. Berma Protetora de Regolito Impresso em 3D (Blindagem contra Radiação e Micrometeoritos)
    this.build3DPrintedRegolithBerm();

    // 3. Cúpula com Arcos de Titânio Escovado, Vidros Duplos e Estufas Hidropônicas
    const lights = this.buildGeodesicDomeAndGreenhouse();
    this.interiorLight = lights.intLight;
    this.greenhouseLight = lights.ghLight;

    // 4. Painéis solares verticais (orientados para o Sol polar rasante a 5°)
    this.buildVerticalSolarArrays();

    // 5. Módulo de Descompressão (Airlock) e Túnel Pressurizado com Refletores de Estacionamento
    const airlockData = this.buildAirlock();
    this.airlockLight = airlockData.statusLight;
    this.airlockStrobeLight = airlockData.strobeLight;
    this.airlockStrobeBulb = airlockData.strobeBulb;
    this.parkingFloodLight = airlockData.floodLight;

    // 6. Módulo de Refinaria ISRU (In-Situ Resource Utilization) e tanques criogênicos
    this.buildISRUPlant();

    // 7. Antena Parabólica de Alto Ganho apontada para a Terra
    this.highGainDishGroup = this.buildEarthTrackingAntenna();
    this.group.add(this.highGainDishGroup);

    // 8. Emblema Iluminado da Welwitschia na entrada da base
    this.emblemMesh = this.buildEntranceEmblem();
    this.group.add(this.emblemMesh);
  }

  private buildFoundation(): void {
    // Plataforma principal circular de regolito sinterizado por micro-ondas
    const padGeo = new THREE.CylinderGeometry(25, 26, 1.2, 36);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x22272d,
      roughness: 0.92,
      metalness: 0.18
    });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.y = 0.6;
    pad.receiveShadow = true;
    this.group.add(pad);

    // Faixas de pouso e baía de manobra do Rover em frente ao airlock (z: 18 a 26)
    const apronGeo = new THREE.RingGeometry(18, 24, 32, 1, Math.PI * 0.25, Math.PI * 0.5);
    apronGeo.rotateX(-Math.PI / 2);
    const apronMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25
    });
    const apron = new THREE.Mesh(apronGeo, apronMat);
    apron.position.set(0, 1.22, 0);
    this.group.add(apron);

    // Trilhas de rodagem sinterizadas no piso de aproximação
    for (let t = -1; t <= 1; t += 2) {
      const trackGeo = new THREE.PlaneGeometry(0.5, 9.0);
      trackGeo.rotateX(-Math.PI / 2);
      const trackMat = new THREE.MeshStandardMaterial({ color: 0x14181c, roughness: 0.98 });
      const track = new THREE.Mesh(trackGeo, trackMat);
      track.position.set(t * 1.35, 1.21, 22.5);
      this.group.add(track);
    }

    // 12 Balizas perimetrais com sinalizadores de aproximação
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const x = Math.cos(angle) * 24.2;
      const z = Math.sin(angle) * 24.2;

      const pylonGeo = new THREE.CylinderGeometry(0.18, 0.24, 1.6, 8);
      const pylonMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7 });
      const pylon = new THREE.Mesh(pylonGeo, pylonMat);
      pylon.position.set(x, 1.4, z);
      this.group.add(pylon);

      const beaconGeo = new THREE.SphereGeometry(0.18, 8, 8);
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(x, 2.2, z);
      this.group.add(beacon);
    }
  }

  /**
   * Blindagem contra Radiação (Impressão 3D em Regolito Sinterizado):
   * Anel protetor de paredes inclinadas com estrias de extrusão horizontal
   * envolvendo as laterais inferiores da cúpula até 4.5m de altura.
   */
  private build3DPrintedRegolithBerm(): void {
    const bermGroup = new THREE.Group();
    const bermMat = new THREE.MeshStandardMaterial({
      color: 0x333940, // Tom escuro idêntico ao regolito lunar
      roughness: 0.95,
      metalness: 0.05
    });

    // Camadas horizontais empilhadas simulando os cordões de extrusão contínua de impressão 3D
    const layers = 8;
    for (let i = 0; i < layers; i++) {
      const layerY = 1.2 + i * 0.42;
      const innerRadius = 15.0 - i * 0.12;
      const outerRadius = 17.6 - i * 0.25;

      // Anel com abertura frontal para a passagem do túnel da câmara de descompressão (airlock)
      const ringGeo = new THREE.CylinderGeometry(
        innerRadius + 0.1,
        outerRadius,
        0.42,
        36,
        1,
        true,
        Math.PI * 0.35, // Abertura na frente (z+)
        Math.PI * 1.65
      );
      const layerMesh = new THREE.Mesh(ringGeo, bermMat);
      layerMesh.position.y = layerY + 0.21;
      layerMesh.castShadow = true;
      layerMesh.receiveShadow = true;
      bermGroup.add(layerMesh);
    }

    // Paredes de contraforte lateral ao redor da entrada do airlock
    const buttressGeo = new THREE.BoxGeometry(1.6, 3.5, 4.0);
    const leftButtress = new THREE.Mesh(buttressGeo, bermMat);
    leftButtress.position.set(-3.6, 2.8, 15.5);
    leftButtress.rotation.y = -0.25;
    leftButtress.castShadow = true;
    bermGroup.add(leftButtress);

    const rightButtress = new THREE.Mesh(buttressGeo, bermMat);
    rightButtress.position.set(3.6, 2.8, 15.5);
    rightButtress.rotation.y = 0.25;
    rightButtress.castShadow = true;
    bermGroup.add(rightButtress);

    this.group.add(bermGroup);
  }

  private buildGeodesicDomeAndGreenhouse(): { intLight: THREE.PointLight; ghLight: THREE.PointLight } {
    const domeRadius = 15;

    // 1. Vidros Panorâmicos de Observação Espacial (Vista limpa para o exterior lunar do Alberto)
    const domeGeo = new THREE.SphereGeometry(domeRadius, 36, 22, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const domeMat = new THREE.MeshPhysicalMaterial({
      color: 0xdce7f0,
      transmission: 0.78,
      opacity: 0.86,
      transparent: true,
      roughness: 0.12,
      metalness: 0.08,
      ior: 1.5,
      reflectivity: 0.65,
      side: THREE.DoubleSide
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.y = 1.2;
    dome.castShadow = true;
    this.group.add(dome);

    // Camada Interna nas Janelas para Brilho Protetor Kapton (Laranja/Dourado) ou Geada Polar (Azul Gelo)
    const shieldDomeGeo = new THREE.SphereGeometry(domeRadius - 0.15, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.48);
    this.windowShieldDomeMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.0,
      side: THREE.BackSide,
      depthWrite: false
    });
    const shieldDomeMesh = new THREE.Mesh(shieldDomeGeo, this.windowShieldDomeMat);
    shieldDomeMesh.position.y = 1.2;
    this.group.add(shieldDomeMesh);

    // 2. Nervuras Estruturais Metálicas (Titânio Escovado Externo + Nervuras Internas da Cabine)
    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.28
    });
    const cabinRibMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.35,
      roughness: 0.38,
      emissive: 0x0f172a,
      emissiveIntensity: 0.25
    });

    // 8 Grandes Arcos Metálicos que convergem no anel central superior
    for (let a = 0; a < 8; a++) {
      const archAngle = (a / 8) * Math.PI;
      const archGeo = new THREE.TorusGeometry(domeRadius + 0.06, 0.2, 10, 40, Math.PI);
      archGeo.rotateZ(Math.PI / 2);
      const arch = new THREE.Mesh(archGeo, titaniumMat);
      arch.position.y = 1.2;
      arch.rotation.y = archAngle;
      arch.castShadow = true;
      this.group.add(arch);

      // Nervura estrutural interna acolhedora e iluminada
      const innerRibGeo = new THREE.TorusGeometry(11.8, 0.14, 8, 32, Math.PI);
      innerRibGeo.rotateZ(Math.PI / 2);
      const innerRib = new THREE.Mesh(innerRibGeo, cabinRibMat);
      innerRib.position.y = 1.2;
      innerRib.rotation.y = archAngle;
      this.group.add(innerRib);
    }

    // Anel de ápice central (Oculus de amarração dos arcos)
    const oculusGeo = new THREE.TorusGeometry(2.4, 0.28, 10, 28);
    oculusGeo.rotateX(Math.PI / 2);
    const oculus = new THREE.Mesh(oculusGeo, titaniumMat);
    oculus.position.y = 1.2 + domeRadius;
    this.group.add(oculus);

    // Piso Técnico da Cabine: Grelha Modular Metálica Clara (color: 0x3b485e, roughness: 0.45, metalness: 0.35)
    const floorGridTex = this.createModularFloorTexture();
    const cabinFloorGeo = new THREE.CylinderGeometry(11.8, 12.0, 0.18, 36);
    const cabinFloorMat = new THREE.MeshStandardMaterial({
      color: 0x3b485e,
      map: floorGridTex,
      roughness: 0.45,
      metalness: 0.35,
      emissive: 0x0f2942,
      emissiveIntensity: 0.32
    });
    const cabinFloor = new THREE.Mesh(cabinFloorGeo, cabinFloorMat);
    cabinFloor.position.set(0, 1.25, 0);
    cabinFloor.receiveShadow = true;
    this.group.add(cabinFloor);

    // Faixas Guia Luminosas no Chão (emissive: 0x00d8ff, emissiveIntensity: 0.65) ligando o centro às 4 estações
    this.floorGuideMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x00d8ff,
      emissiveIntensity: 0.65,
      roughness: 0.25,
      metalness: 0.2
    });

    const guideAngles = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2, Math.PI * 1.25];
    guideAngles.forEach((angle) => {
      const stripGeo = new THREE.BoxGeometry(0.24, 0.02, 3.6);
      const strip = new THREE.Mesh(stripGeo, this.floorGuideMat);
      const dist = 3.45;
      strip.position.set(Math.sin(angle) * dist, 1.355, Math.cos(angle) * dist);
      strip.rotation.y = angle;
      this.group.add(strip);
    });

    // 3. Iluminação LED Perimetral Dinâmica no Chão e no Teto (Ciano / Âmbar / Vermelho / Azul Gelo)
    this.floorLedMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    this.ceilingLedMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

    const floorLedGeo = new THREE.TorusGeometry(9.6, 0.09, 8, 48);
    floorLedGeo.rotateX(Math.PI / 2);
    const floorLedMesh = new THREE.Mesh(floorLedGeo, this.floorLedMat);
    floorLedMesh.position.set(0, 1.36, 0);
    this.group.add(floorLedMesh);

    const innerFloorLedGeo = new THREE.TorusGeometry(3.4, 0.06, 8, 36);
    innerFloorLedGeo.rotateX(Math.PI / 2);
    const innerFloorLedMesh = new THREE.Mesh(innerFloorLedGeo, this.floorLedMat);
    innerFloorLedMesh.position.set(0, 1.36, 0);
    this.group.add(innerFloorLedMesh);

    const ceilingLedGeo = new THREE.TorusGeometry(7.2, 0.1, 8, 48);
    ceilingLedGeo.rotateX(Math.PI / 2);
    const ceilingLedMesh = new THREE.Mesh(ceilingLedGeo, this.ceilingLedMat);
    ceilingLedMesh.position.set(0, 9.2, 0);
    this.group.add(ceilingLedMesh);

    this.perimeterPointLight = new THREE.PointLight(0x00f0ff, 2.2, 26, 1.3);
    this.perimeterPointLight.position.set(0, 6.8, 0);
    this.group.add(this.perimeterPointLight);

    // Pedestal Central Anelar de Comando (onde o astronauta permanece no centro)
    const centerRingGeo = new THREE.TorusGeometry(1.65, 0.08, 8, 32);
    centerRingGeo.rotateX(Math.PI / 2);
    const centerRing = new THREE.Mesh(centerRingGeo, this.floorLedMat);
    centerRing.position.set(0, 1.37, 0);
    this.group.add(centerRing);

    // =========================================================================
    // 4 ESTAÇÕES DE TRABALHO 3D DISTINTAS E ANIMADAS NO INTERIOR DA BASE
    // =========================================================================
    this.buildStationA_OxygenLifeSupport();
    this.buildStationB_SolarShieldKapton();
    this.buildStationC_WelwitschiaGreenhouse();
    this.buildStationD_HolographicScienceLab();

    // Partículas suaves de ar purificado e energia flutuando no interior da cabine
    this.buildCabinAirParticles();

    // Terminais Holográficos 3D Interativos (posicionamento ergonómico a 2.8m do jogador)
    const terminalDefs = [
      { id: 'ENERGY', x: 2.9, z: 0, title: '[1] BLINDAGEM SOLAR // ENERGIA', color: '#ffb84d' },
      { id: 'OXYGEN', x: 0, z: -2.9, title: '[2] SUPORTE DE VIDA // O₂', color: '#00f0ff' },
      { id: 'BRIEFING', x: -2.9, z: 0, title: '[3] ESTUFA & LAB HOLOGRÁFICO', color: '#38bdf8' },
      { id: 'AIRLOCK', x: 0, z: 2.9, title: '[4] ESCOTILHA DE SAÍDA // EVA', color: '#a855f7' }
    ];

    terminalDefs.forEach((def) => {
      const { canvas, texture } = this.createTerminalCanvas(
        def.title,
        '[OLHAR 0.8s OU TOQUE PARA ATIVAR]',
        'ESTAÇÃO OPERACIONAL',
        false,
        def.color
      );
      this.terminalRenderers.set(def.id, { canvas, texture });

      const screenGeo = new THREE.BoxGeometry(1.95, 1.1, 0.06);
      const screenMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
      });
      const scr = new THREE.Mesh(screenGeo, screenMat);
      scr.position.set(def.x, 2.55, def.z);
      scr.lookAt(0, 2.55, 0);
      scr.userData = { actionId: def.id, type: 'terminal', title: def.title };

      this.interactiveTerminals.push(scr);
      this.group.add(scr);
    });

    // Painéis 3D Flutuantes de Decisão Tática (Opção A vs Opção B) por Gaze Fuse (0.8s)
    this.buildTacticalDecision3DPanels();

    // PointLight Principal de Teto Branca-Azulada Suave no centro superior da base
    const intLight = new THREE.PointLight(0xe0f2fe, 2.2, 22, 1.5);
    intLight.position.set(0, 7.6, 0);
    intLight.castShadow = true;
    this.group.add(intLight);

    // Preenchimento hemisférico interno suave para iluminar a grelha do pavimento sem sombras escuras
    const cabinHemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x3b485e, 1.15);
    cabinHemiLight.position.set(0, 8.0, 0);
    this.group.add(cabinHemiLight);

    // 4 Luzes de Destaque Coloridas nas 4 Estações (Ciano, Dourado/Âmbar, Magenta/Verde, Violeta)
    const o2AccentLight = new THREE.PointLight(0x00f0ff, 1.9, 12, 1.4);
    o2AccentLight.position.set(0, 3.6, -4.8);
    this.group.add(o2AccentLight);

    const shieldAccentLight = new THREE.PointLight(0xffb84d, 1.9, 12, 1.4);
    shieldAccentLight.position.set(4.8, 3.6, 0);
    this.group.add(shieldAccentLight);

    // Luz Hortícola Magenta + Verde Vivo sobre a Estufa Welwitschia
    const ghLight = new THREE.PointLight(0x22c55e, 2.2, 14, 1.3);
    ghLight.position.set(-4.8, 3.6, 0);
    this.group.add(ghLight);

    const ghMagentaLight = new THREE.PointLight(0xf472b6, 1.6, 12, 1.4);
    ghMagentaLight.position.set(-5.2, 4.5, 0);
    this.group.add(ghMagentaLight);

    // Luz Violeta no Laboratório Científico Holográfico
    const labVioletLight = new THREE.PointLight(0xa855f7, 2.0, 12, 1.4);
    labVioletLight.position.set(-3.5, 3.6, -3.5);
    this.group.add(labVioletLight);

    return { intLight, ghLight };
  }

  /**
   * Gera textura de grelha modular metálica clara com linhas técnicas luminosas para o pavimento da cabine.
   */
  private createModularFloorTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#3b485e';
    ctx.fillRect(0, 0, 512, 512);

    // Placas metálicas modulares
    ctx.strokeStyle = '#52637d';
    ctx.lineWidth = 4;
    for (let i = 0; i <= 512; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }

    // Sub-grelha técnica ciano suave
    ctx.strokeStyle = 'rgba(0, 216, 255, 0.28)';
    ctx.lineWidth = 2;
    for (let i = 32; i < 512; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 6);
    return texture;
  }

  /**
   * Cria partículas suaves de ar purificado e energia flutuando no interior da cabine.
   */
  private buildCabinAirParticles(): void {
    const count = 90;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.2 + Math.random() * 7.8;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = 1.5 + Math.random() * 5.2;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      // Alterna entre ciano (O2 purificado) e verde-esmeralda (fotossíntese Welwitschia)
      if (i % 3 === 0) {
        colors[i * 3] = 0.2;
        colors[i * 3 + 1] = 0.95;
        colors[i * 3 + 2] = 0.55;
      } else {
        colors[i * 3] = 0.0;
        colors[i * 3 + 1] = 0.88;
        colors[i * 3 + 2] = 1.0;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.085,
      vertexColors: true,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.cabinAirParticles = new THREE.Points(geo, mat);
    this.group.add(this.cabinAirParticles);
  }

  /**
   * a) Estação de Suporte de Vida (O2) (Norte: z = -5.2m):
   * Cilindros translúcidos iluminados com partículas/anéis de oxigénio ascendentes
   * cuja velocidade reflete o nível de potência + 2 Válvulas 3D calibráveis por olhar.
   */
  private buildStationA_OxygenLifeSupport(): void {
    const stationGroup = new THREE.Group();
    stationGroup.position.set(0, 1.35, -5.2);

    const baseGeo = new THREE.BoxGeometry(4.4, 0.9, 1.6);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.75, roughness: 0.35 });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.45;
    stationGroup.add(baseMesh);

    const glassCylGeo = new THREE.CylinderGeometry(0.55, 0.55, 2.8, 24);
    const glassCylMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transmission: 0.75,
      transparent: true,
      opacity: 0.55,
      roughness: 0.1,
      metalness: 0.1
    });
    const capGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.18, 24);
    const capMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });

    const ringGeo = new THREE.TorusGeometry(0.36, 0.045, 8, 20);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

    [-1.1, 1.1].forEach((offsetX, cylIdx) => {
      const cyl = new THREE.Mesh(glassCylGeo, glassCylMat);
      cyl.position.set(offsetX, 2.3, 0);
      stationGroup.add(cyl);

      const topCap = new THREE.Mesh(capGeo, capMat);
      topCap.position.set(offsetX, 3.75, 0);
      stationGroup.add(topCap);

      // Anéis/bolhas de oxigénio ascendentes dentro de cada cilindro
      for (let b = 0; b < 4; b++) {
        const bubbleRing = new THREE.Mesh(ringGeo, ringMat);
        const startY = 1.1 + b * 0.6;
        bubbleRing.position.set(offsetX, startY, 0);
        stationGroup.add(bubbleRing);
        this.o2Bubbles.push({
          mesh: bubbleRing,
          baseY: 1.05,
          offset: b * 0.25 + cylIdx * 0.12
        });
      }
    });

    // 2 Válvulas 3D Interativas para Calibração por Olhar (Gaze Fuse 0.85s) durante Fuga de O2
    const valveWheelGeo = new THREE.TorusGeometry(0.38, 0.08, 10, 20);
    [-1.85, 1.85].forEach((vx, idx) => {
      const valveMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const valveMesh = new THREE.Mesh(valveWheelGeo, valveMat);
      valveMesh.position.set(vx, 2.2, 0.85);
      const valveId = idx === 0 ? 'O2_VALVE_1' : 'O2_VALVE_2';
      valveMesh.userData = {
        actionId: valveId,
        type: 'valve',
        title: `VÁLVULA O₂ #${idx + 1}`
      };
      stationGroup.add(valveMesh);
      this.valveMeshes.push(valveMesh);
      this.interactiveTerminals.push(valveMesh);
    });

    // 3 Barras Luminosas 3D de Energia integradas na frente da máquina de O2
    this.addIntegratedEnergyBars(stationGroup, 'OXYGEN', new THREE.Vector3(0, 0.48, 0.82));

    this.group.add(stationGroup);
  }

  /**
   * Cria um módulo diegético com 3 barras luminosas 3D integradas na própria máquina
   * para indicar o nível de energia sem depender de texto.
   */
  private addIntegratedEnergyBars(
    parentGroup: THREE.Group,
    stationKey: 'OXYGEN' | 'SHIELD' | 'GREENHOUSE' | 'LAB',
    position: THREE.Vector3
  ): void {
    const housingGeo = new THREE.BoxGeometry(1.15, 0.34, 0.08);
    const housingMat = new THREE.MeshStandardMaterial({
      color: 0x020617,
      metalness: 0.8,
      roughness: 0.3
    });
    const housing = new THREE.Mesh(housingGeo, housingMat);
    housing.position.copy(position);
    parentGroup.add(housing);

    const barGeo = new THREE.BoxGeometry(0.28, 0.18, 0.09);
    const mats: THREE.MeshBasicMaterial[] = [];

    for (let i = 0; i < 3; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const bar = new THREE.Mesh(barGeo, mat);
      bar.position.set(position.x + (i - 1) * 0.34, position.y, position.z + 0.01);
      parentGroup.add(bar);
      mats.push(mat);
    }

    this.stationEnergyBars.set(stationKey, mats);
  }

  /**
   * b) Estação de Blindagem Solar (Leste: x = +5.4m):
   * Bobinas revestidas a folha dourada Kapton com anéis eletromagnéticos laranja
   * que projetam um brilho protetor nas janelas quando ativos.
   */
  private buildStationB_SolarShieldKapton(): void {
    const shieldGroup = new THREE.Group();
    shieldGroup.position.set(5.4, 1.35, 0);
    shieldGroup.rotation.y = -Math.PI / 2;

    const pedestalGeo = new THREE.BoxGeometry(4.2, 0.85, 1.6);
    const pedestalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = 0.42;
    shieldGroup.add(pedestal);

    // Folha Dourada Kapton (Poliimida espacial reflexiva)
    const kaptonMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0x78350f,
      emissiveIntensity: 0.25,
      metalness: 0.92,
      roughness: 0.18
    });

    const coilCylGeo = new THREE.CylinderGeometry(0.52, 0.52, 2.7, 24);
    const emRingGeo = new THREE.TorusGeometry(0.72, 0.055, 10, 28);
    emRingGeo.rotateX(Math.PI / 2);

    [-1.15, 1.15].forEach((cx) => {
      const coil = new THREE.Mesh(coilCylGeo, kaptonMat);
      coil.position.set(cx, 2.2, 0);
      shieldGroup.add(coil);

      for (let r = 0; r < 3; r++) {
        const emRingMat = new THREE.MeshBasicMaterial({ color: 0xff8c00 });
        const emRing = new THREE.Mesh(emRingGeo, emRingMat);
        emRing.position.set(cx, 1.4 + r * 0.75, 0);
        shieldGroup.add(emRing);
        this.kaptonRings.push(emRing);
      }
    });

    // 3 Barras Luminosas 3D integradas na máquina de Blindagem Kapton
    this.addIntegratedEnergyBars(shieldGroup, 'SHIELD', new THREE.Vector3(0, 0.45, 0.82));

    this.group.add(shieldGroup);
  }

  /**
   * c) Estufa Interior Welwitschia (Oeste: x = -5.4m):
   * Bancada hidropónica com luz hortícola magenta/rosa suave e plantas Welwitschia mirabilis
   * em 3D que reagem visualmente à temperatura e energia.
   */
  private buildStationC_WelwitschiaGreenhouse(): void {
    const ghGroup = new THREE.Group();
    ghGroup.position.set(-5.4, 1.35, 0);
    ghGroup.rotation.y = Math.PI / 2;

    // Bancada hidropónica iluminada
    const benchGeo = new THREE.BoxGeometry(4.8, 0.95, 1.8);
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.6, roughness: 0.4 });
    const bench = new THREE.Mesh(benchGeo, benchMat);
    bench.position.y = 0.48;
    ghGroup.add(bench);

    // Luminária Hortícola Superior Magenta/Rosa Suave
    const canopyGeo = new THREE.BoxGeometry(4.6, 0.16, 1.4);
    const canopyMat = new THREE.MeshBasicMaterial({ color: 0xf472b6 });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 3.2, 0);
    ghGroup.add(canopy);

    // 3 Plantas Welwitschia mirabilis em 3D (Caule lenhoso bilobado + 2 longas folhas arqueadas)
    const stemGeo = new THREE.CylinderGeometry(0.26, 0.2, 0.28, 12);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.85 });
    const leafGeo = new THREE.BoxGeometry(0.85, 0.04, 0.34);

    [-1.4, 0, 1.4].forEach((px) => {
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.set(px, 1.08, 0);
      ghGroup.add(stem);

      const plantLeafMat = new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        emissive: 0x052e16,
        emissiveIntensity: 0.3,
        roughness: 0.45
      });

      const leafLeft = new THREE.Mesh(leafGeo, plantLeafMat);
      leafLeft.position.set(px - 0.38, 1.18, 0);
      leafLeft.rotation.z = 0.18;
      ghGroup.add(leafLeft);

      const leafRight = new THREE.Mesh(leafGeo, plantLeafMat);
      leafRight.position.set(px + 0.38, 1.18, 0);
      leafRight.rotation.z = -0.18;
      ghGroup.add(leafRight);

      this.welwitschiaPlants.push({
        leafLeft,
        leafRight,
        mat: plantLeafMat
      });
    });

    // 3 Barras Luminosas 3D integradas na bancada da Estufa Welwitschia
    this.addIntegratedEnergyBars(ghGroup, 'GREENHOUSE', new THREE.Vector3(0, 0.5, 0.92));

    this.group.add(ghGroup);
  }

  /**
   * d) Laboratório Científico (Sudoeste: x = -3.8m, z = -3.8m):
   * Mesa holográfica onde aparece um modelo 3D rotativo (Lua, Terra ou Cristal de Gelo Lunar)
   * sempre que o jogador desbloqueia uma descoberta científica.
   */
  private buildStationD_HolographicScienceLab(): void {
    const labGroup = new THREE.Group();
    labGroup.position.set(-3.6, 1.35, -3.6);

    const tableBaseGeo = new THREE.CylinderGeometry(1.15, 1.35, 1.05, 24);
    const tableBaseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.75, roughness: 0.3 });
    const tableBase = new THREE.Mesh(tableBaseGeo, tableBaseMat);
    tableBase.position.y = 0.52;
    labGroup.add(tableBase);

    const emitterRingGeo = new THREE.TorusGeometry(0.95, 0.05, 8, 32);
    emitterRingGeo.rotateX(Math.PI / 2);
    const emitterRingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const emitterRing = new THREE.Mesh(emitterRingGeo, emitterRingMat);
    emitterRing.position.y = 1.08;
    labGroup.add(emitterRing);

    this.hologramRoot = new THREE.Group();
    this.hologramRoot.position.set(0, 2.05, 0);
    labGroup.add(this.hologramRoot);

    // Modelo 1: Lua Holográfica com Anel Orbital
    this.hologramMoon = new THREE.Group();
    const moonGeo = new THREE.SphereGeometry(0.55, 20, 20);
    const moonMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.55,
      wireframe: false,
      roughness: 0.6
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.hologramMoon.add(moonMesh);

    const moonOrbitGeo = new THREE.TorusGeometry(0.82, 0.02, 8, 32);
    moonOrbitGeo.rotateX(Math.PI * 0.35);
    const moonOrbit = new THREE.Mesh(moonOrbitGeo, new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
    this.hologramMoon.add(moonOrbit);
    this.hologramRoot.add(this.hologramMoon);

    // Modelo 2: Terra Holográfica Azul e Verde
    this.hologramEarth = new THREE.Group();
    const earthGeo = new THREE.SphereGeometry(0.58, 24, 24);
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x10b981,
      emissiveIntensity: 0.45,
      roughness: 0.3
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    this.hologramEarth.add(earthMesh);
    const atmoGeo = new THREE.TorusGeometry(0.85, 0.025, 8, 32);
    atmoGeo.rotateY(Math.PI * 0.25);
    this.hologramEarth.add(new THREE.Mesh(atmoGeo, new THREE.MeshBasicMaterial({ color: 0x38bdf8 })));
    this.hologramEarth.visible = false;
    this.hologramRoot.add(this.hologramEarth);

    // Modelo 3: Cristal de Gelo Lunar (H2O Polar)
    this.hologramIce = new THREE.Group();
    const iceGeo = new THREE.OctahedronGeometry(0.65, 0);
    const iceMat = new THREE.MeshPhysicalMaterial({
      color: 0x67e8f9,
      emissive: 0x0891b2,
      emissiveIntensity: 0.7,
      transmission: 0.6,
      transparent: true,
      opacity: 0.9,
      roughness: 0.1
    });
    const iceMesh = new THREE.Mesh(iceGeo, iceMat);
    this.hologramIce.add(iceMesh);
    this.hologramIce.visible = false;
    this.hologramRoot.add(this.hologramIce);

    // Torna o holograma clicável/olhável para alternar descobertas científicas
    moonMesh.userData = { actionId: 'HOLOGRAM_DISCOVERY', type: 'hologram' };
    earthMesh.userData = { actionId: 'HOLOGRAM_DISCOVERY', type: 'hologram' };
    iceMesh.userData = { actionId: 'HOLOGRAM_DISCOVERY', type: 'hologram' };
    this.interactiveTerminals.push(moonMesh, earthMesh, iceMesh);

    // 3 Barras Luminosas 3D integradas na base da Mesa Holográfica Científica
    this.addIntegratedEnergyBars(labGroup, 'LAB', new THREE.Vector3(0, 0.55, 1.25));

    this.group.add(labGroup);
  }

  /**
   * Cartões Holográficos 3D Limpos para as 2 Escolhas Táticas (Opção A vs Opção B)
   * ativáveis por Gaze Fuse (0.8s) ou toque direto.
   */
  private buildTacticalDecision3DPanels(): void {
    this.decisionCanvasA = this.createTerminalCanvas(
      'OPÇÃO A',
      'OLHAR 0.8s / TOQUE',
      'AGUARDANDO',
      false,
      '#00f0ff'
    );
    this.decisionCanvasB = this.createTerminalCanvas(
      'OPÇÃO B',
      'OLHAR 0.8s / TOQUE',
      'AGUARDANDO',
      false,
      '#ffb84d'
    );

    const panelGeo = new THREE.BoxGeometry(1.9, 1.0, 0.04);
    this.decisionPanelA = new THREE.Mesh(
      panelGeo,
      new THREE.MeshBasicMaterial({ map: this.decisionCanvasA.texture, transparent: true })
    );
    this.decisionPanelA.userData = { actionId: 'DECISION_A', type: 'decision' };

    this.decisionPanelB = new THREE.Mesh(
      panelGeo,
      new THREE.MeshBasicMaterial({ map: this.decisionCanvasB.texture, transparent: true })
    );
    this.decisionPanelB.userData = { actionId: 'DECISION_B', type: 'decision' };

    this.interactiveTerminals.push(this.decisionPanelA, this.decisionPanelB);
    this.group.add(this.decisionPanelA, this.decisionPanelB);
  }

  private buildVerticalSolarArrays(): void {
    const panelTexture = createSolarPanelTexture(true);
    const panelMat = new THREE.MeshStandardMaterial({
      map: panelTexture,
      roughness: 0.65,
      metalness: 0.35
    });

    const panelGeo = new THREE.BoxGeometry(0.35, 11, 4.8);
    const panelPositions = [
      { x: -18, z: -16, rot: 0.6 },
      { x: 18, z: -16, rot: -0.6 },
      { x: -22, z: 8, rot: 1.8 },
      { x: 22, z: 8, rot: -1.8 }
    ];

    panelPositions.forEach((pos) => {
      const mastGeo = new THREE.CylinderGeometry(0.4, 0.6, 13, 8);
      const mastMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
      const mast = new THREE.Mesh(mastGeo, mastMat);
      mast.position.set(pos.x, 6.5, pos.z);
      mast.castShadow = true;
      this.group.add(mast);

      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.position.set(pos.x, 8.0, pos.z);
      panel.rotation.y = pos.rot;
      panel.castShadow = true;
      this.group.add(panel);
      this.solarPanels.push(panel);
    });
  }

  private buildAirlock(): {
    statusLight: THREE.PointLight;
    strobeLight: THREE.PointLight;
    strobeBulb: THREE.Mesh;
    floodLight: THREE.SpotLight;
  } {
    // 1. Túnel Pressurizado Cilíndrico com Nervuras de Expansão (conecta cúpula ao airlock)
    const tunnelGeo = new THREE.CylinderGeometry(2.4, 2.4, 7.5, 20);
    tunnelGeo.rotateX(Math.PI / 2);
    const tunnelMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.35,
      metalness: 0.8
    });
    const tunnel = new THREE.Mesh(tunnelGeo, tunnelMat);
    tunnel.position.set(0, 2.5, 15);
    tunnel.castShadow = true;
    this.group.add(tunnel);

    // Anéis de reforço e isolamento térmico no túnel
    for (let r = 0; r < 4; r++) {
      const ribGeo = new THREE.TorusGeometry(2.5, 0.12, 8, 20);
      const ribMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 });
      const rib = new THREE.Mesh(ribGeo, ribMat);
      rib.position.set(0, 2.5, 12.5 + r * 1.8);
      this.group.add(rib);
    }

    // 2. Escotilha frontal laranja industrial Artemis
    const doorGeo = new THREE.CylinderGeometry(2.1, 2.1, 0.6, 20);
    doorGeo.rotateX(Math.PI / 2);
    const doorMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.45,
      metalness: 0.5
    });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 2.5, 18.5);
    door.castShadow = true;
    door.userData = { actionId: 'ENTER_BASE', type: 'airlock_entry' };
    this.exteriorAirlockDoor = door;
    this.group.add(door);

    // Anel luminoso verde/ciano no chão em frente à escotilha exterior + placa holográfica "🚪 ENTRAR NA BASE"
    const entryRingGeo = new THREE.TorusGeometry(2.35, 0.09, 10, 36);
    entryRingGeo.rotateX(Math.PI / 2);
    const entryRingMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    this.exteriorAirlockRing = new THREE.Mesh(entryRingGeo, entryRingMat);
    this.exteriorAirlockRing.position.set(0, 1.25, 20.2);
    this.group.add(this.exteriorAirlockRing);

    const { texture: entryHoloTex } = this.createTerminalCanvas(
      'ESCOTILHA // AIRLOCK WELWITSCHIA',
      '👁️ OLHAR 0.8s OU TOQUE P/ ENTRAR',
      '🚪 ENTRAR NA BASE',
      true,
      '#10b981'
    );
    const entryHoloGeo = new THREE.BoxGeometry(2.8, 1.25, 0.06);
    const entryHoloMat = new THREE.MeshBasicMaterial({
      map: entryHoloTex,
      transparent: true,
      side: THREE.DoubleSide
    });
    this.exteriorAirlockBeacon = new THREE.Mesh(entryHoloGeo, entryHoloMat);
    this.exteriorAirlockBeacon.position.set(0, 3.85, 19.05);
    this.exteriorAirlockBeacon.userData = { actionId: 'ENTER_BASE', type: 'airlock_entry' };
    this.group.add(this.exteriorAirlockBeacon);

    // Portal estrutural de vedação
    const portalGeo = new THREE.BoxGeometry(5.4, 4.4, 0.4);
    const portalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
    const portal = new THREE.Mesh(portalGeo, portalMat);
    portal.position.set(0, 2.5, 18.3);
    this.group.add(portal);

    // Luz de status da câmara (Vermelho = pressurizado / Verde = pronto)
    const statusLight = new THREE.PointLight(0xef4444, 2.2, 12);
    statusLight.position.set(0, 4.5, 18.6);
    this.group.add(statusLight);

    const bulbGeo = new THREE.SphereGeometry(0.22, 8, 8);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.set(0, 4.5, 18.6);
    this.group.add(bulb);

    // Baliza estroboscópica Âmbar de aviso de pressurização
    const strobeLight = new THREE.PointLight(0xf59e0b, 3.0, 16);
    strobeLight.position.set(0, 5.2, 18.6);
    this.group.add(strobeLight);

    const strobeBulbGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.35, 12);
    const strobeBulbMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const strobeBulb = new THREE.Mesh(strobeBulbGeo, strobeBulbMat);
    strobeBulb.position.set(0, 5.2, 18.6);
    this.group.add(strobeBulb);

    // 3. Refletor Externo de Alta Potência (ilumina a baía de estacionamento do rover em z: 22m)
    const floodLight = new THREE.SpotLight(0xfffaed, 5.0, 40, Math.PI * 0.32, 0.45, 1.1);
    floodLight.position.set(0, 6.2, 18.8);
    const floodTarget = new THREE.Object3D();
    floodTarget.position.set(0, 0.5, 23.0);
    this.group.add(floodTarget);
    floodLight.target = floodTarget;
    floodLight.castShadow = true;
    this.group.add(floodLight);

    return { statusLight, strobeLight, strobeBulb, floodLight };
  }

  private buildISRUPlant(): void {
    const isruGroup = new THREE.Group();
    isruGroup.position.set(-16, 1.2, 0);

    // Túnel pressurizado de transferência conectando cúpula ao reator ISRU
    const corridorGeo = new THREE.CylinderGeometry(1.5, 1.5, 5.0, 16);
    corridorGeo.rotateZ(Math.PI / 2);
    const corridorMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.3 });
    const corridor = new THREE.Mesh(corridorGeo, corridorMat);
    corridor.position.set(2.5, 2.0, 0);
    corridor.castShadow = true;
    isruGroup.add(corridor);

    // Tanque Esférico Criogênico LOX (Oxigênio Líquido)
    const loxTankGeo = new THREE.SphereGeometry(3.4, 20, 20);
    const loxMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.88,
      roughness: 0.18
    });
    const loxTank = new THREE.Mesh(loxTankGeo, loxMat);
    loxTank.position.set(0, 4.2, -4.5);
    loxTank.castShadow = true;
    isruGroup.add(loxTank);

    // Tanque Esférico Criogênico LH2 (Hidrogênio Líquido com isolamento MLI branco)
    const lh2Mat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.65,
      roughness: 0.25
    });
    const lh2Tank = new THREE.Mesh(loxTankGeo, lh2Mat);
    lh2Tank.position.set(0, 4.2, 4.5);
    lh2Tank.castShadow = true;
    isruGroup.add(lh2Tank);

    // Reator de Eletrólise e Craqueamento Térmico
    const reactorGeo = new THREE.BoxGeometry(5.0, 4.5, 5.5);
    const reactorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.4
    });
    const reactor = new THREE.Mesh(reactorGeo, reactorMat);
    reactor.position.set(-2, 2.2, 0);
    reactor.castShadow = true;
    isruGroup.add(reactor);

    // Tubulação criogênica de alta pressão conectando os módulos
    const pipeGeo = new THREE.CylinderGeometry(0.22, 0.22, 9.2, 12);
    pipeGeo.rotateX(Math.PI / 2);
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.1 });
    const pipe = new THREE.Mesh(pipeGeo, pipeMat);
    pipe.position.set(0, 4.2, 0);
    isruGroup.add(pipe);

    this.group.add(isruGroup);
  }

  private buildEarthTrackingAntenna(): THREE.Group {
    const antennaGroup = new THREE.Group();
    antennaGroup.position.set(16, 1.2, -4);

    const towerGeo = new THREE.CylinderGeometry(0.6, 0.9, 14, 8);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.3 });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.y = 7.0;
    tower.castShadow = true;
    antennaGroup.add(tower);

    const gimbalGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.6, 16);
    const gimbalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7 });
    const gimbal = new THREE.Mesh(gimbalGeo, gimbalMat);
    gimbal.position.y = 14.3;
    antennaGroup.add(gimbal);

    const dishHead = new THREE.Group();
    dishHead.position.set(0, 15.5, 0);

    const dishGeo = new THREE.SphereGeometry(2.2, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.35);
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.85,
      roughness: 0.2,
      side: THREE.DoubleSide
    });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.castShadow = true;
    dishHead.add(dish);

    const feederGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.6, 8);
    feederGeo.rotateX(Math.PI / 2);
    const feederMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9 });
    const feeder = new THREE.Mesh(feederGeo, feederMat);
    feeder.position.z = 1.0;
    dishHead.add(feeder);

    const earthElevation = 8.5 * (Math.PI / 180);
    const earthAzimuth = Math.PI * 1.2;
    dishHead.rotation.order = 'YXZ';
    dishHead.rotation.y = earthAzimuth + Math.PI;
    dishHead.rotation.x = -earthElevation;

    antennaGroup.add(dishHead);
    return antennaGroup;
  }

  private buildEntranceEmblem(): THREE.Mesh {
    const emblemTexture = createWelwitschiaEmblemTexture();
    const signGeo = new THREE.BoxGeometry(4.2, 1.8, 0.15);
    const signMat = new THREE.MeshStandardMaterial({
      map: emblemTexture,
      roughness: 0.3,
      metalness: 0.4,
      emissive: new THREE.Color(0x00f0ff),
      emissiveIntensity: 0.2,
      emissiveMap: emblemTexture
    });

    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 5.6, 18.4);
    sign.castShadow = true;
    return sign;
  }

  public update(time: number, delta: number): void {
    const strobePulse = Math.sin(time * 6.0) > 0.4 ? 1.0 : 0.15;
    if (this.airlockStrobeLight) {
      this.airlockStrobeLight.intensity = strobePulse * 3.5;
    }
    if (this.airlockStrobeBulb) {
      (this.airlockStrobeBulb.material as THREE.MeshBasicMaterial).color.setRGB(
        0.96 * strobePulse,
        0.62 * strobePulse,
        0.05 * strobePulse
      );
    }

    if (this.exteriorAirlockRing) {
      const ringPulse = 1.0 + Math.sin(time * 3.5) * 0.06;
      this.exteriorAirlockRing.scale.set(ringPulse, ringPulse, 1);
      (this.exteriorAirlockRing.material as THREE.MeshBasicMaterial).color.setHex(
        Math.sin(time * 3.5) > 0 ? 0x10b981 : 0x00f0ff
      );
    }

    const interior = this.lastInteriorState;
    const resources = this.lastResourcesState;

    // 1. Iluminação LED perimetral no chão e teto com transição suave de cor (Feedback Diegético)
    if (this.floorLedMat && this.ceilingLedMat && this.perimeterPointLight) {
      const ledState = interior?.ledState ?? 'NORMAL';
      let targetIntensity = 2.0;

      if (ledState === 'ALERT') {
        this.targetLedColor.setHex(0xf59e0b); // Âmbar = Atenção / Poeira
        targetIntensity = 2.2 + Math.sin(time * 3.5) * 0.4;
      } else if (ledState === 'EMERGENCY') {
        // Vermelho suave pulsante = Emergência
        const pulse = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(time * 6.5));
        this.targetLedColor.setRGB(0.95 * pulse, 0.2 * pulse, 0.22 * pulse);
        targetIntensity = 1.8 + pulse * 1.6;
      } else if (ledState === 'HYPOTHERMIA') {
        this.targetLedColor.setHex(0x38bdf8); // Azul Gelo = Frio Extremo
        targetIntensity = 2.3;
      } else {
        this.targetLedColor.setHex(0x00f0ff); // Ciano = Tudo Estável
        targetIntensity = 2.0;
      }

      const lerpAlpha = Math.min(1.0, delta * 4.5);
      this.floorLedMat.color.lerp(this.targetLedColor, lerpAlpha);
      this.ceilingLedMat.color.lerp(this.targetLedColor, lerpAlpha);
      this.perimeterPointLight.color.lerp(this.targetLedColor, lerpAlpha);
      this.perimeterPointLight.intensity += (targetIntensity - this.perimeterPointLight.intensity) * lerpAlpha;
    }

    // 1b. Atualiza as 3 Barras Luminosas 3D integradas em cada uma das 4 máquinas
    this.updateStationEnergyBars(resources, interior);

    // 2. Anéis/partículas de O2 ascendentes na Estação de Suporte de Vida (velocidade reflete potência/O2)
    const powerFactor = ((resources?.baseOxygen ?? 85) / 100) * ((resources?.baseSolarEnergy ?? 60) / 100);
    const speedMultiplier = Math.max(0.35, 0.5 + powerFactor * 1.6);
    this.o2Bubbles.forEach((b) => {
      const cycle = ((time * speedMultiplier + b.offset) % 1.0);
      b.mesh.position.y = b.baseY + cycle * 2.4;
      const scale = 0.75 + Math.sin(cycle * Math.PI) * 0.35;
      b.mesh.scale.set(scale, scale, 1);
    });

    // 3. Anéis eletromagnéticos laranja nas bobinas Kapton + brilho protetor / geada nas janelas
    const shieldActive = !!interior?.shieldActive || interior?.activeEmergency?.type === 'SOLAR_STORM';
    this.kaptonRings.forEach((ring, idx) => {
      ring.rotation.z = time * (shieldActive ? 2.5 : 0.7) * (idx % 2 === 0 ? 1 : -1);
      const pulseScale = 1.0 + Math.sin(time * 4.0 + idx) * (shieldActive ? 0.12 : 0.04);
      ring.scale.set(pulseScale, pulseScale, 1);
      (ring.material as THREE.MeshBasicMaterial).color.setHex(shieldActive ? 0xff9500 : 0xd97706);
    });

    if (this.windowShieldDomeMat) {
      if ((interior?.frostLevel ?? 0) > 0.05) {
        // Efeito de geada azul-gelo nas janelas durante o frio extremo
        this.windowShieldDomeMat.color.setHex(0x7dd3fc);
        this.windowShieldDomeMat.opacity = (interior?.frostLevel ?? 0) * (0.22 + 0.05 * Math.sin(time * 2));
      } else if (interior?.shieldActive) {
        // Brilho protetor dourado/laranja das bobinas Kapton nas janelas
        this.windowShieldDomeMat.color.setHex(0xf59e0b);
        this.windowShieldDomeMat.opacity = 0.12 + 0.04 * Math.sin(time * 3.0);
      } else {
        this.windowShieldDomeMat.opacity = 0;
      }
    }

    // 4. Plantas Welwitschia mirabilis em 3D (verdes/firmes quando saudáveis, inclinadas/amareladas no frio ou baixa energia)
    const healthy = interior ? interior.greenhouseHealthy && !interior.labPaused : true;
    this.welwitschiaPlants.forEach((plant, idx) => {
      if (healthy) {
        plant.mat.color.setHex(0x22c55e);
        plant.mat.emissive.setHex(0x16a34a);
        plant.mat.emissiveIntensity = 0.55;
        const breeze = Math.sin(time * 1.8 + idx) * 0.04;
        plant.leafLeft.rotation.z = 0.18 + breeze;
        plant.leafRight.rotation.z = -0.18 - breeze;
      } else {
        // Inclinadas e amareladas por frio ou falta de energia
        plant.mat.color.setHex(0xeab308);
        plant.mat.emissive.setHex(0x854d0e);
        plant.mat.emissiveIntensity = 0.35;
        plant.leafLeft.rotation.z = -0.28;
        plant.leafRight.rotation.z = 0.28;
      }
    });

    // 4b. Faixas guia luminosas no chão e partículas suaves de ar purificado/energia flutuando
    if (this.floorGuideMat) {
      this.floorGuideMat.emissiveIntensity = 0.65 + Math.sin(time * 2.4) * 0.12;
    }
    if (this.cabinAirParticles) {
      this.cabinAirParticles.rotation.y = time * 0.06;
      const posAttr = this.cabinAirParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < posAttr.count; i++) {
        let y = posAttr.getY(i) + delta * 0.22;
        if (y > 6.8) y = 1.5;
        posAttr.setY(i, y);
      }
      posAttr.needsUpdate = true;
    }

    // 5. Mesa Holográfica do Laboratório Científico (Rotação contínua da Lua, Terra ou Cristal de Gelo)
    if (this.hologramRoot) {
      const paused = !!interior?.labPaused;
      this.hologramRoot.visible = !paused;
      if (!paused) {
        this.hologramRoot.rotation.y += delta * 0.95;
        this.hologramRoot.position.y = 2.05 + Math.sin(time * 2.2) * 0.08;
      }
      const activeModel: HologramModelType = interior?.activeHologram ?? 'MOON';
      if (this.hologramMoon) this.hologramMoon.visible = activeModel === 'MOON';
      if (this.hologramEarth) this.hologramEarth.visible = activeModel === 'EARTH';
      if (this.hologramIce) this.hologramIce.visible = activeModel === 'ICE_CRYSTAL';
    }

    // 6. Válvulas 3D calibráveis de O2
    const valveCal = interior?.valveCalibration;
    this.valveMeshes.forEach((vMesh, idx) => {
      const isCalibrated = idx === 0 ? valveCal?.valve1Calibrated : valveCal?.valve2Calibrated;
      vMesh.visible = !!valveCal?.active || interior?.activeEmergency?.type === 'OXYGEN_LEAK';
      if (vMesh.visible) {
        vMesh.rotation.z = time * (isCalibrated ? 0.5 : 3.2);
        (vMesh.material as THREE.MeshBasicMaterial).color.setHex(
          isCalibrated ? 0x22c55e : Math.sin(time * 10) > 0 ? 0xef4444 : 0xffb84d
        );
      }
    });
  }

  /**
   * Atualiza as 3 barras luminosas 3D integradas em cada uma das 4 máquinas da base
   * (Suporte de Vida, Blindagem, Estufa Welwitschia, Laboratório).
   */
  private updateStationEnergyBars(
    resources: ResourceState | null,
    interior: BaseInteriorState | null
  ): void {
    const solar = resources?.baseSolarEnergy ?? 60;
    const o2 = resources?.baseOxygen ?? 85;
    const paused = !!interior?.labPaused;
    const dusty = interior?.activeEmergency?.type === 'ELECTROSTATIC_DUST';

    const getBarLevel = (pct: number, isPaused: boolean): number => {
      if (isPaused) return 0;
      if (pct >= 68) return 3;
      if (pct >= 35) return 2;
      return pct > 5 ? 1 : 0;
    };

    const setBars = (
      key: 'OXYGEN' | 'SHIELD' | 'GREENHOUSE' | 'LAB',
      litCount: number,
      activeColorHex: number
    ) => {
      const bars = this.stationEnergyBars.get(key);
      if (!bars) return;
      bars.forEach((mat, idx) => {
        if (idx < litCount) {
          mat.color.setHex(activeColorHex);
        } else {
          mat.color.setHex(0x1e293b); // Barra apagada
        }
      });
    };

    const o2Bars = getBarLevel((o2 + solar) * 0.5, false);
    setBars('OXYGEN', o2Bars, o2Bars === 3 ? 0x00f0ff : o2Bars === 2 ? 0xf59e0b : 0xef4444);

    const shieldBars = getBarLevel(dusty ? Math.min(solar, 50) : solar, false);
    setBars('SHIELD', shieldBars, shieldBars === 3 ? 0x22c55e : shieldBars === 2 ? 0xf59e0b : 0xef4444);

    const ghBars = getBarLevel(solar, paused);
    setBars('GREENHOUSE', ghBars, ghBars === 3 ? 0x22c55e : ghBars === 2 ? 0xf59e0b : 0xef4444);

    const labBars = getBarLevel(solar, paused);
    setBars('LAB', labBars, labBars === 3 ? 0x38bdf8 : labBars === 2 ? 0xf59e0b : 0xef4444);
  }

  public setAirlockOpen(): void {
    this.isAirlockOpen = true;
    if (this.airlockLight) {
      this.airlockLight.color.setHex(0x22c55e);
      this.airlockLight.intensity = 3.5;
    }
  }

  public getIsAirlockOpen(): boolean {
    return this.isAirlockOpen;
  }

  public cleanSolarPanels(): void {
    const cleanTexture = createSolarPanelTexture(false);
    this.solarPanels.forEach((panel) => {
      (panel.material as THREE.MeshStandardMaterial).map = cleanTexture;
      (panel.material as THREE.MeshStandardMaterial).needsUpdate = true;
    });
  }

  private createTerminalCanvas(
    title: string,
    actionText: string,
    statusText: string,
    isComplete: boolean,
    colorHex: string
  ): { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture } {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    this.drawTerminalCanvas(canvas, title, actionText, statusText, isComplete, colorHex);
    const texture = new THREE.CanvasTexture(canvas);
    return { canvas, texture };
  }

  private drawTerminalCanvas(
    canvas: HTMLCanvasElement,
    title: string,
    actionText: string,
    statusText: string,
    isComplete: boolean,
    colorHex: string
  ): void {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 512, 256);

    // Fundo holográfico translúcido escuro ultra-limpo
    ctx.fillStyle = 'rgba(4, 12, 28, 0.92)';
    ctx.fillRect(0, 0, 512, 256);

    const accent = isComplete ? '#22c55e' : colorHex;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 5;
    ctx.strokeRect(8, 8, 496, 240);

    // Barra superior fina de destaque
    ctx.fillStyle = accent;
    ctx.fillRect(8, 8, 496, 42);

    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#020617';
    ctx.textAlign = 'center';
    ctx.fillText(title.slice(0, 34), 256, 36);

    // Título / Efeito Principal grande e fácil de ler em VR
    ctx.font = 'bold 26px sans-serif';
    ctx.fillStyle = isComplete ? '#4ade80' : '#ffffff';
    ctx.fillText(statusText.slice(0, 32), 256, 122);

    // Pílula inferior de ação (Gaze 0.8s / Toque)
    ctx.fillStyle = isComplete ? 'rgba(34, 197, 94, 0.18)' : 'rgba(0, 240, 255, 0.14)';
    ctx.fillRect(36, 162, 440, 62);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(36, 162, 440, 62);

    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = isComplete ? '#86efac' : '#7dd3fc';
    ctx.fillText(actionText.slice(0, 36), 256, 200);
  }

  public updateTerminals(
    interactions: DomeInteractions,
    resources: ResourceState,
    interior?: BaseInteriorState
  ): void {
    if (interior) this.lastInteriorState = interior;
    this.lastResourcesState = resources;

    // 1. Estação de Blindagem Solar Kapton & Energia
    const energyData = this.terminalRenderers.get('ENERGY');
    if (energyData) {
      const isComplete = interactions.energyRedirected;
      this.drawTerminalCanvas(
        energyData.canvas,
        '🛡️ BLINDAGEM & ENERGIA',
        isComplete ? '✓ CARREGADO' : '👁️ OLHAR 0.8s / TOQUE',
        `⚡ ${Math.round(resources.baseSolarEnergy)}% • ROVER ${Math.round(resources.roverBattery)}%`,
        isComplete,
        '#ffb84d'
      );
      energyData.texture.needsUpdate = true;
    }

    // 2. Estação de Suporte de Vida (O2)
    const oxygenData = this.terminalRenderers.get('OXYGEN');
    if (oxygenData) {
      const isComplete = interactions.suitRefilled;
      this.drawTerminalCanvas(
        oxygenData.canvas,
        '💨 SUPORTE DE VIDA O₂',
        isComplete ? '✓ PRESSURIZADO' : '👁️ OLHAR 0.8s / TOQUE',
        `💨 O₂ ${Math.round(resources.baseOxygen)}% • TRAJE ${Math.round(resources.suitOxygen)}%`,
        isComplete,
        '#00f0ff'
      );
      oxygenData.texture.needsUpdate = true;
    }

    // 3. Estufa Welwitschia & Laboratório Científico
    const briefingData = this.terminalRenderers.get('BRIEFING');
    if (briefingData) {
      const isComplete = interactions.briefingViewed;
      const modelLabel = interior?.activeHologram ?? 'MOON';
      this.drawTerminalCanvas(
        briefingData.canvas,
        '🌱 ESTUFA & LAB 3D',
        isComplete ? '👁️ MUDAR HOLOGRAMA' : '👁️ OLHAR 0.8s / TOQUE',
        `🌡️ ${interior?.cabinTempC ?? 21}°C • 🔬 ${modelLabel}`,
        isComplete,
        '#38bdf8'
      );
      briefingData.texture.needsUpdate = true;
    }

    // 4. Escotilha de Saída (Airlock)
    const airlockData = this.terminalRenderers.get('AIRLOCK');
    if (airlockData) {
      const canOpen = interactions.energyRedirected && interactions.suitRefilled && interactions.briefingViewed;
      const isComplete = interactions.airlockOpened;
      this.drawTerminalCanvas(
        airlockData.canvas,
        '🚪 SAÍDA EVA // ROVER',
        canOpen
          ? isComplete ? '✓ A SAIR...' : '👁️ OLHAR 0.8s P/ SAIR'
          : '🔒 ATIVE AS 3 ESTAÇÕES',
        canOpen ? 'ROVER PRONTO' : 'PREPARAR MISSÃO',
        isComplete,
        '#a855f7'
      );
      airlockData.texture.needsUpdate = true;
    }

    // 5. Cartões Holográficos 3D de Decisão (Opção A vs Opção B) grandes e limpos
    const activeEm = interior?.activeEmergency;
    if (this.decisionPanelA && this.decisionPanelB) {
      if (activeEm && !interior?.valveCalibration.active) {
        this.decisionPanelA.visible = true;
        this.decisionPanelB.visible = true;

        // Posiciona os 2 cartões holográficos na estação afetada
        if (activeEm.stationId === 'SHIELD' || activeEm.stationId === 'ENERGY') {
          this.decisionPanelA.position.set(2.8, 3.65, -1.02);
          this.decisionPanelB.position.set(2.8, 3.65, 1.02);
        } else if (activeEm.stationId === 'OXYGEN') {
          this.decisionPanelA.position.set(-1.02, 3.65, -2.8);
          this.decisionPanelB.position.set(1.02, 3.65, -2.8);
        } else {
          this.decisionPanelA.position.set(-2.8, 3.65, 1.02);
          this.decisionPanelB.position.set(-2.8, 3.65, -1.02);
        }
        this.decisionPanelA.lookAt(0, 3.2, 0);
        this.decisionPanelB.lookAt(0, 3.2, 0);

        const shortA = activeEm.optionA.label.replace(/^\[A\]\s*/, '');
        const shortB = activeEm.optionB.label.replace(/^\[B\]\s*/, '');

        this.drawTerminalCanvas(
          this.decisionCanvasA.canvas,
          `OPÇÃO A • ${activeEm.title.toUpperCase()}`,
          `🛡️ ${shortA.slice(0, 34)}`,
          shortA.slice(0, 26),
          false,
          '#00f0ff'
        );
        this.decisionCanvasA.texture.needsUpdate = true;

        this.drawTerminalCanvas(
          this.decisionCanvasB.canvas,
          `OPÇÃO B • ${activeEm.title.toUpperCase()}`,
          `⚡ ${shortB.slice(0, 34)}`,
          shortB.slice(0, 26),
          false,
          '#ffb84d'
        );
        this.decisionCanvasB.texture.needsUpdate = true;
      } else {
        this.decisionPanelA.visible = false;
        this.decisionPanelB.visible = false;
      }
    }
  }

  public getInteractiveObjects(): THREE.Object3D[] {
    return [...this.interactiveTerminals];
  }

  public getExteriorInteractiveObjects(): THREE.Object3D[] {
    const objs: THREE.Object3D[] = [];
    if (this.exteriorAirlockBeacon) objs.push(this.exteriorAirlockBeacon);
    if (this.exteriorAirlockDoor) objs.push(this.exteriorAirlockDoor);
    return objs;
  }
}
