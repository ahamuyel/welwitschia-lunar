/**
 * Welwitschia Lunar - Estação Welwitschia (Base Lunar Polo Sul - Ano 2032)
 * Cúpula geodésica semitransparente com interior iluminado, painéis solares verticais
 * com acúmulo de regolito eletrostático, câmara de descompressão (airlock) e módulo ISRU.
 */

import * as THREE from 'three';
import { createSolarPanelTexture } from '../world/ProceduralTextures';

export class WelwitschiaStation {
  public group: THREE.Group;
  public airlockPosition: THREE.Vector3;
  public domeCenter: THREE.Vector3;
  public solarPanels: THREE.Mesh[] = [];
  public interiorLight: THREE.PointLight;
  public airlockLight: THREE.PointLight;

  constructor(baseAltitude: number = 0) {
    this.group = new THREE.Group();
    this.domeCenter = new THREE.Vector3(0, baseAltitude, 0);
    this.airlockPosition = new THREE.Vector3(0, baseAltitude + 1.2, 18);

    this.group.position.set(0, baseAltitude, 0);

    // 1. Fundação e plataforma circular da base
    this.buildFoundation();

    // 2. Cúpula Geodésica semitransparente com laboratório hidropônico interno
    this.interiorLight = this.buildGeodesicDome();

    // 3. Painéis solares verticais (orientados para o sol rasante polar)
    this.buildVerticalSolarArrays();

    // 4. Módulo de Descompressão (Airlock)
    this.airlockLight = this.buildAirlock();

    // 5. Módulo de Refinaria ISRU (In-Situ Resource Utilization) e tanques criogênicos
    this.buildISRUPlant();
  }

  private buildFoundation(): void {
    const padGeo = new THREE.CylinderGeometry(24, 25, 1.2, 32);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x2b3035,
      roughness: 0.85,
      metalness: 0.2
    });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.y = 0.6;
    pad.receiveShadow = true;
    this.group.add(pad);

    // Anel externo com balizas de iluminação
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = Math.cos(angle) * 23;
      const z = Math.sin(angle) * 23;

      const pylonGeo = new THREE.CylinderGeometry(0.2, 0.3, 1.8, 8);
      const pylonMat = new THREE.MeshStandardMaterial({ color: 0x555a60, metalness: 0.5 });
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

  private buildGeodesicDome(): THREE.PointLight {
    // Casca externa semitransparente de polímero reforçado com aerogel
    const domeRadius = 15;
    const domeGeo = new THREE.SphereGeometry(domeRadius, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const domeMat = new THREE.MeshPhysicalMaterial({
      color: 0xc8e6ff,
      transmission: 0.75, // Vidro/polímero semitransparente
      opacity: 0.85,
      transparent: true,
      roughness: 0.15,
      metalness: 0.1,
      ior: 1.45,
      side: THREE.DoubleSide
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.y = 1.2;
    dome.castShadow = true;
    this.group.add(dome);

    // Estrutura geodésica em treliça (wireframe reforçado)
    const wireGeo = new THREE.IcosahedronGeometry(domeRadius + 0.05, 2);
    const wireMat = new THREE.MeshStandardMaterial({
      color: 0x3a4550,
      wireframe: true,
      metalness: 0.8,
      roughness: 0.3
    });
    const wireDome = new THREE.Mesh(wireGeo, wireMat);
    wireDome.position.y = 1.2;
    this.group.add(wireDome);

    // Interior da Cúpula: Console de comando central e módulos hidropônicos
    const consoleGeo = new THREE.CylinderGeometry(3.5, 4, 1.6, 12);
    const consoleMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.4, metalness: 0.6 });
    const consoleMesh = new THREE.Mesh(consoleGeo, consoleMat);
    consoleMesh.position.set(0, 2.0, 0);
    this.group.add(consoleMesh);

    // Telas holográficas e painéis emissores
    const screenGeo = new THREE.BoxGeometry(2.2, 1.2, 0.1);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    for (let a = 0; a < 3; a++) {
      const scr = new THREE.Mesh(screenGeo, screenMat);
      scr.position.set(Math.cos(a * 2.1) * 2.5, 3.0, Math.sin(a * 2.1) * 2.5);
      scr.lookAt(0, 3.0, 0);
      this.group.add(scr);
    }

    // Luz interna quente (dourado/esmeralda simulando fotossíntese de plantas do deserto)
    const intLight = new THREE.PointLight(0xffeedd, 3.2, 45, 1.5);
    intLight.position.set(0, 7, 0);
    intLight.castShadow = true;
    this.group.add(intLight);

    return intLight;
  }

  private buildVerticalSolarArrays(): void {
    // No Polo Sul Lunar, o Sol não sobe; ele gira tangenciando o horizonte a 5°.
    // Portanto, os painéis solares precisam ser VERTICAIS para captar o sol rasante!
    const panelTexture = createSolarPanelTexture(true); // Inicialmente com pó eletrostático
    const panelMat = new THREE.MeshStandardMaterial({
      map: panelTexture,
      roughness: 0.7,
      metalness: 0.3
    });

    const panelGeo = new THREE.BoxGeometry(0.3, 10, 4.5);

    // 4 torres de painéis solares verticais ao redor da estação
    const panelPositions = [
      { x: -18, z: -16, rot: 0.6 },
      { x: 18, z: -16, rot: -0.6 },
      { x: -22, z: 8, rot: 1.8 },
      { x: 22, z: 8, rot: -1.8 }
    ];

    panelPositions.forEach((pos) => {
      const mastGeo = new THREE.CylinderGeometry(0.4, 0.6, 12, 8);
      const mastMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7 });
      const mast = new THREE.Mesh(mastGeo, mastMat);
      mast.position.set(pos.x, 6, pos.z);
      mast.castShadow = true;
      this.group.add(mast);

      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.position.set(pos.x, 7.5, pos.z);
      panel.rotation.y = pos.rot;
      panel.castShadow = true;
      this.group.add(panel);
      this.solarPanels.push(panel);
    });
  }

  private buildAirlock(): THREE.PointLight {
    // Câmara de descompressão ligada ao exterior
    const tunnelGeo = new THREE.CylinderGeometry(2.4, 2.4, 7, 16);
    tunnelGeo.rotateX(Math.PI / 2);
    const tunnelMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.4,
      metalness: 0.7
    });
    const tunnel = new THREE.Mesh(tunnelGeo, tunnelMat);
    tunnel.position.set(0, 2.4, 15);
    tunnel.castShadow = true;
    this.group.add(tunnel);

    // Escotilha frontal (porta de saída para o regolito)
    const doorGeo = new THREE.CylinderGeometry(2.1, 2.1, 0.6, 16);
    doorGeo.rotateX(Math.PI / 2);
    const doorMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Laranja industrial Artemis
      roughness: 0.5,
      metalness: 0.4
    });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 2.4, 18.3);
    door.castShadow = true;
    this.group.add(door);

    // Luz de status da câmara de descompressão (Vermelho = pressurizado / Verde = despressurizado pronto)
    const airLight = new THREE.PointLight(0xef4444, 2.0, 10);
    airLight.position.set(0, 4.2, 18.5);
    this.group.add(airLight);

    const bulbGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.set(0, 4.2, 18.5);
    this.group.add(bulb);

    return airLight;
  }

  private buildISRUPlant(): void {
    // Planta de Utilização de Recursos In-Situ (ISRU):
    // Extrai gelo de água das crateras permanentemente sombreadas (PSRs),
    // realiza eletrólise H2O -> H2 + O2 e armazena em tanques criogênicos.
    const isruGroup = new THREE.Group();
    isruGroup.position.set(-16, 1.2, 0);

    // Tanque Esférico Criogênico de Oxigênio Líquido (LOX)
    const loxTankGeo = new THREE.SphereGeometry(3.2, 16, 16);
    const loxMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Azul criogênico
      metalness: 0.85,
      roughness: 0.2
    });
    const loxTank = new THREE.Mesh(loxTankGeo, loxMat);
    loxTank.position.set(0, 4.0, -4);
    loxTank.castShadow = true;
    isruGroup.add(loxTank);

    // Tanque Esférico Criogênico de Hidrogênio Líquido (LH2)
    const lh2Mat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0, // Branco isolante térmico multicamada (MLI)
      metalness: 0.6,
      roughness: 0.3
    });
    const lh2Tank = new THREE.Mesh(loxTankGeo, lh2Mat);
    lh2Tank.position.set(0, 4.0, 4);
    lh2Tank.castShadow = true;
    isruGroup.add(lh2Tank);

    // Unidade de Eletrólise e Craqueamento Térmico
    const reactorGeo = new THREE.BoxGeometry(4.5, 4.0, 5.0);
    const reactorMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.7,
      roughness: 0.5
    });
    const reactor = new THREE.Mesh(reactorGeo, reactorMat);
    reactor.position.set(-2, 2.0, 0);
    reactor.castShadow = true;
    isruGroup.add(reactor);

    // Tubulações criogênicas conectando ao reator
    const pipeGeo = new THREE.CylinderGeometry(0.2, 0.2, 8, 8);
    pipeGeo.rotateX(Math.PI / 2);
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.1 });
    const pipe = new THREE.Mesh(pipeGeo, pipeMat);
    pipe.position.set(0, 4.0, 0);
    isruGroup.add(pipe);

    this.group.add(isruGroup);
  }

  /** Atualiza o status visual do Airlock para verde na despressurização */
  public setAirlockOpen(): void {
    if (this.airlockLight) {
      this.airlockLight.color.setHex(0x22c55e); // Verde
      this.airlockLight.intensity = 3.5;
    }
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
