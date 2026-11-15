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

    // 1. Vidros de Observação Espacial (Aparência neutra com refração sutil, sem saturação plástica)
    const domeGeo = new THREE.SphereGeometry(domeRadius, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const domeMat = new THREE.MeshPhysicalMaterial({
      color: 0xdce7f0,
      transmission: 0.74,
      opacity: 0.9,
      transparent: true,
      roughness: 0.15,
      metalness: 0.1,
      ior: 1.5,
      reflectivity: 0.65,
      side: THREE.DoubleSide
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.y = 1.2;
    dome.castShadow = true;
    this.group.add(dome);

    // 2. Arcos Estruturais de Titânio Escovado (Brushed Titanium Ribs)
    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.3
    });

    // 6 Grandes Arcos que convergem no anel central superior
    for (let a = 0; a < 6; a++) {
      const archAngle = (a / 6) * Math.PI;
      const archGeo = new THREE.TorusGeometry(domeRadius + 0.08, 0.22, 8, 36, Math.PI);
      archGeo.rotateZ(Math.PI / 2);
      const arch = new THREE.Mesh(archGeo, titaniumMat);
      arch.position.y = 1.2;
      arch.rotation.y = archAngle;
      arch.castShadow = true;
      this.group.add(arch);
    }

    // Anel de ápice central (Oculus de amarração dos arcos)
    const oculusGeo = new THREE.TorusGeometry(2.2, 0.28, 8, 24);
    oculusGeo.rotateX(Math.PI / 2);
    const oculus = new THREE.Mesh(oculusGeo, titaniumMat);
    oculus.position.y = 1.2 + domeRadius;
    this.group.add(oculus);

    // 3. Interior da Cúpula: Console central e estufas hidropônicas
    const consoleGeo = new THREE.CylinderGeometry(3.2, 3.8, 1.6, 16);
    const consoleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.7 });
    const consoleMesh = new THREE.Mesh(consoleGeo, consoleMat);
    consoleMesh.position.set(0, 2.0, 0);
    this.group.add(consoleMesh);

    // Telas holográficas centrais emissivas em ciano
    const screenGeo = new THREE.BoxGeometry(2.0, 1.1, 0.08);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    for (let s = 0; s < 4; s++) {
      const scr = new THREE.Mesh(screenGeo, screenMat);
      scr.position.set(Math.cos(s * 1.57) * 2.2, 3.1, Math.sin(s * 1.57) * 2.2);
      scr.lookAt(0, 3.1, 0);
      this.group.add(scr);
    }

    // 4 Módulos de Estufa Hidropônica Vertical (torres de cultivo)
    const towerGeo = new THREE.CylinderGeometry(1.2, 1.2, 6.0, 12);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.5, roughness: 0.4 });
    const plantMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.6, metalness: 0.1 });

    const towerPositions = [
      { x: -6.5, z: -4.0 },
      { x: 6.5, z: -4.0 },
      { x: -6.5, z: 4.0 },
      { x: 6.5, z: 4.0 }
    ];

    towerPositions.forEach((pos) => {
      const tower = new THREE.Mesh(towerGeo, towerMat);
      tower.position.set(pos.x, 4.2, pos.z);
      this.group.add(tower);

      for (let level = 0; level < 4; level++) {
        const foliageGeo = new THREE.TorusGeometry(1.35, 0.28, 8, 16);
        foliageGeo.rotateX(Math.PI / 2);
        const foliage = new THREE.Mesh(foliageGeo, plantMat);
        foliage.position.set(pos.x, 2.2 + level * 1.2, pos.z);
        this.group.add(foliage);

        const ledGeo = new THREE.TorusGeometry(1.42, 0.06, 6, 16);
        ledGeo.rotateX(Math.PI / 2);
        const ledMat = new THREE.MeshBasicMaterial({ color: 0xd946ef });
        const led = new THREE.Mesh(ledGeo, ledMat);
        led.position.set(pos.x, 2.5 + level * 1.2, pos.z);
        this.group.add(led);
      }
    });

    // Luz Geral Interna da Cúpula (Quente/Dourada)
    const intLight = new THREE.PointLight(0xffeedd, 3.2, 45, 1.4);
    intLight.position.set(0, 8.5, 0);
    intLight.castShadow = true;
    this.group.add(intLight);

    // Luz de Cultivo Fotossintético (Magenta/Verde)
    const ghLight = new THREE.PointLight(0xd946ef, 2.8, 28, 1.2);
    ghLight.position.set(0, 5.0, 0);
    this.group.add(ghLight);

    return { intLight, ghLight };
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
    this.group.add(door);

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

  public update(time: number, _delta: number): void {
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
}
