/**
 * Welwitschia Lunar - Estação Welwitschia (Base Lunar Polo Sul - Ano 2032)
 * Cúpula geodésica arquitetônica com treliças estruturais metálicas, interior visível
 * com estufas hidropônicas iluminadas em magenta/esmeralda (luz de cultivo 450nm/660nm),
 * câmara de descompressão (airlock) com balizas estroboscópicas âmbar, antena de alto ganho
 * apontada para a Terra e emblema iluminado da Welwitschia mirabilis na entrada.
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
  public highGainDishGroup: THREE.Group;
  public emblemMesh: THREE.Mesh;

  private isAirlockOpen: boolean = false;

  constructor(baseAltitude: number = 0) {
    this.group = new THREE.Group();
    this.domeCenter = new THREE.Vector3(0, baseAltitude, 0);
    this.airlockPosition = new THREE.Vector3(0, baseAltitude + 1.2, 18);

    this.group.position.set(0, baseAltitude, 0);

    // 1. Fundação e plataforma circular de ancoragem em regolito sinterizado
    this.buildFoundation();

    // 2. Cúpula Geodésica semitransparente com estufas hidropônicas e luzes de cultivo
    const lights = this.buildGeodesicDomeAndGreenhouse();
    this.interiorLight = lights.intLight;
    this.greenhouseLight = lights.ghLight;

    // 3. Painéis solares verticais (orientados para o Sol polar rasante a 5°)
    this.buildVerticalSolarArrays();

    // 4. Módulo de Descompressão (Airlock) com estroboscópio âmbar
    const airlockData = this.buildAirlock();
    this.airlockLight = airlockData.statusLight;
    this.airlockStrobeLight = airlockData.strobeLight;
    this.airlockStrobeBulb = airlockData.strobeBulb;

    // 5. Módulo de Refinaria ISRU (In-Situ Resource Utilization) e tanques criogênicos
    this.buildISRUPlant();

    // 6. Antena Parabólica de Alto Ganho apontada para a Terra
    this.highGainDishGroup = this.buildEarthTrackingAntenna();
    this.group.add(this.highGainDishGroup);

    // 7. Emblema Iluminado da Welwitschia na entrada da base
    this.emblemMesh = this.buildEntranceEmblem();
    this.group.add(this.emblemMesh);
  }

  private buildFoundation(): void {
    const padGeo = new THREE.CylinderGeometry(24, 25, 1.2, 32);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x252a30,
      roughness: 0.88,
      metalness: 0.25
    });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.y = 0.6;
    pad.receiveShadow = true;
    this.group.add(pad);

    // Anel externo com 12 balizas de perímetro com LEDs azuis
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const x = Math.cos(angle) * 23.2;
      const z = Math.sin(angle) * 23.2;

      const pylonGeo = new THREE.CylinderGeometry(0.18, 0.26, 1.8, 8);
      const pylonMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6 });
      const pylon = new THREE.Mesh(pylonGeo, pylonMat);
      pylon.position.set(x, 1.5, z);
      this.group.add(pylon);

      const beaconGeo = new THREE.SphereGeometry(0.2, 8, 8);
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(x, 2.4, z);
      this.group.add(beacon);
    }
  }

  private buildGeodesicDomeAndGreenhouse(): { intLight: THREE.PointLight; ghLight: THREE.PointLight } {
    const domeRadius = 15;

    // Casca externa translúcida de polímero com aerogel protetor contra radiação
    const domeGeo = new THREE.SphereGeometry(domeRadius, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const domeMat = new THREE.MeshPhysicalMaterial({
      color: 0xd0e8ff,
      transmission: 0.82,
      opacity: 0.85,
      transparent: true,
      roughness: 0.12,
      metalness: 0.08,
      ior: 1.48,
      side: THREE.DoubleSide
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.y = 1.2;
    dome.castShadow = true;
    this.group.add(dome);

    // Treliça geodésica em icosaedro subdividido (Struts de titânio externos)
    const wireGeo = new THREE.IcosahedronGeometry(domeRadius + 0.06, 2);
    const wireMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      wireframe: true,
      metalness: 0.9,
      roughness: 0.25
    });
    const wireDome = new THREE.Mesh(wireGeo, wireMat);
    wireDome.position.y = 1.2;
    this.group.add(wireDome);

    // Anéis estruturais circulares de reforço
    for (let r = 0; r < 3; r++) {
      const ringHeight = 3.5 + r * 4.0;
      const currentRadius = Math.sqrt(Math.max(0, domeRadius * domeRadius - ringHeight * ringHeight));
      const ringGeo = new THREE.TorusGeometry(currentRadius, 0.12, 8, 36);
      ringGeo.rotateX(Math.PI / 2);
      const ringMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 1.2 + ringHeight;
      this.group.add(ring);
    }

    // === INTERIOR DA CÚPULA: LABORATÓRIO HIDROPÔNICO E ESTUFAS ===
    // Console de controle central
    const consoleGeo = new THREE.CylinderGeometry(3.2, 3.8, 1.6, 16);
    const consoleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.7 });
    const consoleMesh = new THREE.Mesh(consoleGeo, consoleMat);
    consoleMesh.position.set(0, 2.0, 0);
    this.group.add(consoleMesh);

    // Telas holográficas centrais emissivas em ciano
    const screenGeo = new THREE.BoxGeometry(2.0, 1.1, 0.08);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    for (let a = 0; a < 4; a++) {
      const scr = new THREE.Mesh(screenGeo, screenMat);
      scr.position.set(Math.cos(a * 1.57) * 2.2, 3.1, Math.sin(a * 1.57) * 2.2);
      scr.lookAt(0, 3.1, 0);
      this.group.add(scr);
    }

    // Módulos de Estufa Hidropônica Vertical (4 cilindros de cultivo ao redor do console)
    const towerGeo = new THREE.CylinderGeometry(1.2, 1.2, 6.0, 12);
    const towerMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.5,
      roughness: 0.4
    });

    const plantMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e, // Folhagem verde vibrante
      roughness: 0.6,
      metalness: 0.1
    });

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

      // Anéis de folhagem hidropônica em camadas
      for (let level = 0; level < 4; level++) {
        const foliageGeo = new THREE.TorusGeometry(1.35, 0.28, 8, 16);
        foliageGeo.rotateX(Math.PI / 2);
        const foliage = new THREE.Mesh(foliageGeo, plantMat);
        foliage.position.set(pos.x, 2.2 + level * 1.2, pos.z);
        this.group.add(foliage);

        // Faixas de LED de cultivo (Grow lights) em Magenta/Vermelho profundo (660nm)
        const ledGeo = new THREE.TorusGeometry(1.42, 0.06, 6, 16);
        ledGeo.rotateX(Math.PI / 2);
        const ledMat = new THREE.MeshBasicMaterial({ color: 0xd946ef });
        const led = new THREE.Mesh(ledGeo, ledMat);
        led.position.set(pos.x, 2.5 + level * 1.2, pos.z);
        this.group.add(led);
      }
    });

    // Luz Geral Interna da Cúpula (Quente/Dourada)
    const intLight = new THREE.PointLight(0xffeedd, 3.5, 45, 1.4);
    intLight.position.set(0, 8.5, 0);
    intLight.castShadow = true;
    this.group.add(intLight);

    // Luz Especial de Estufa (Magenta/Esmeralda - simulando o espectro de fotossíntese LED 450nm + 660nm)
    const ghLight = new THREE.PointLight(0xd946ef, 3.0, 28, 1.2);
    ghLight.position.set(0, 5.0, 0);
    this.group.add(ghLight);

    return { intLight, ghLight };
  }

  private buildVerticalSolarArrays(): void {
    // Painéis solares verticais otimizados para o ângulo solar de 5°
    const panelTexture = createSolarPanelTexture(true); // Camada inicial de poeira lunar
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
      // Mastro de suporte
      const mastGeo = new THREE.CylinderGeometry(0.4, 0.6, 13, 8);
      const mastMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
      const mast = new THREE.Mesh(mastGeo, mastMat);
      mast.position.set(pos.x, 6.5, pos.z);
      mast.castShadow = true;
      this.group.add(mast);

      // Painel solar vertical
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
  } {
    // Túnel da câmara de descompressão
    const tunnelGeo = new THREE.CylinderGeometry(2.5, 2.5, 7.5, 20);
    tunnelGeo.rotateX(Math.PI / 2);
    const tunnelMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.35,
      metalness: 0.75
    });
    const tunnel = new THREE.Mesh(tunnelGeo, tunnelMat);
    tunnel.position.set(0, 2.5, 15);
    tunnel.castShadow = true;
    this.group.add(tunnel);

    // Escotilha frontal laranja industrial
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

    // Portal de vedação ao redor da escotilha
    const portalGeo = new THREE.BoxGeometry(5.4, 4.4, 0.4);
    const portalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
    const portal = new THREE.Mesh(portalGeo, portalMat);
    portal.position.set(0, 2.5, 18.3);
    this.group.add(portal);

    // Luz de status da câmara (Vermelho = pressurizado / Verde = despressurizado pronto)
    const statusLight = new THREE.PointLight(0xef4444, 2.2, 12);
    statusLight.position.set(0, 4.5, 18.6);
    this.group.add(statusLight);

    const bulbGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.set(0, 4.5, 18.6);
    this.group.add(bulb);

    // Baliza estroboscópica Âmbar de aviso de pressurização / aproximação
    const strobeLight = new THREE.PointLight(0xf59e0b, 3.0, 16);
    strobeLight.position.set(0, 5.2, 18.6);
    this.group.add(strobeLight);

    const strobeBulbGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.35, 12);
    const strobeBulbMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const strobeBulb = new THREE.Mesh(strobeBulbGeo, strobeBulbMat);
    strobeBulb.position.set(0, 5.2, 18.6);
    this.group.add(strobeBulb);

    return { statusLight, strobeLight, strobeBulb };
  }

  private buildISRUPlant(): void {
    const isruGroup = new THREE.Group();
    isruGroup.position.set(-16, 1.2, 0);

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

  /** Cria a Antena Parabólica de Alto Ganho que rastreia continuamente a Terra */
  private buildEarthTrackingAntenna(): THREE.Group {
    const antennaGroup = new THREE.Group();
    // Posicionada no alto de uma torre ao lado da cúpula
    antennaGroup.position.set(16, 1.2, -4);

    // Torre de suporte
    const towerGeo = new THREE.CylinderGeometry(0.6, 0.9, 14, 8);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.3 });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.y = 7.0;
    tower.castShadow = true;
    antennaGroup.add(tower);

    // Plataforma rotativa de elevação/azimute
    const gimbalGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.6, 16);
    const gimbalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7 });
    const gimbal = new THREE.Mesh(gimbalGeo, gimbalMat);
    gimbal.position.y = 14.3;
    antennaGroup.add(gimbal);

    // Prato parabólico de 4 metros de diâmetro
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

    // Alimentador focal central (sub-refletor)
    const feederGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.6, 8);
    feederGeo.rotateX(Math.PI / 2);
    const feederMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9 });
    const feeder = new THREE.Mesh(feederGeo, feederMat);
    feeder.position.z = 1.0;
    dishHead.add(feeder);

    // Aponta a antena na direção exata da Terra (Sudoeste, azimute 216°, elevação ~8.5°)
    // Conforme definido no SkyAndLighting.ts
    const earthElevation = 8.5 * (Math.PI / 180);
    const earthAzimuth = Math.PI * 1.2;
    dishHead.rotation.order = 'YXZ';
    dishHead.rotation.y = earthAzimuth + Math.PI; // Face côncava voltada para a Terra
    dishHead.rotation.x = -earthElevation;

    antennaGroup.add(dishHead);
    return antennaGroup;
  }

  /** Cria a placa/emblema iluminada com o logo da planta Welwitschia e nome da Estação */
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
    // Posicionado sobre o portal da escotilha de entrada
    sign.position.set(0, 5.6, 18.4);
    sign.castShadow = true;
    return sign;
  }

  /** Atualiza animações em tempo real (estroboscópio âmbar, oscilações sutis) */
  public update(time: number, _delta: number): void {
    // Baliza estroboscópica do airlock: pulso rápido estilo farol de segurança espacial
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

  /** Atualiza o status visual do Airlock para verde na despressurização */
  public setAirlockOpen(): void {
    this.isAirlockOpen = true;
    if (this.airlockLight) {
      this.airlockLight.color.setHex(0x22c55e); // Verde despressurizado
      this.airlockLight.intensity = 3.5;
    }
  }

  public getIsAirlockOpen(): boolean {
    return this.isAirlockOpen;
  }

  /** Limpa os painéis solares após redirecionamento de energia / limpeza */
  public cleanSolarPanels(): void {
    const cleanTexture = createSolarPanelTexture(false);
    this.solarPanels.forEach((panel) => {
      (panel.material as THREE.MeshStandardMaterial).map = cleanTexture;
      (panel.material as THREE.MeshStandardMaterial).needsUpdate = true;
    });
  }
}
