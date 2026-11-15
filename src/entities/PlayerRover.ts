/**
 * Welwitschia Lunar - Veículo Explorador Tripulado (PlayerRover)
 * Design estilo NASA Artemis / LTV (Lunar Terrain Vehicle):
 * - Chassi em fibra de carbono escura com manta térmica MLI dourada/cobre (Multi-Layer Insulation)
 * - 6 rodas articuladas com banda de rodagem (treads/grousers) e aros metálicos
 * - Esterçamento nas 4 rodas (dianteiras e traseiras coordenadas)
 * - Mastro frontal estereoscópico (Mastcam) que vira na direção da curva
 * - Gerador térmico RTG traseiro com aletas de resfriamento radiais
 * - Cockpit físico 3D para câmera interna (C) com manche/volante interativo e telas de telemetria
 */

import * as THREE from 'three';

export class PlayerRover {
  public group: THREE.Group;
  public chassisGroup: THREE.Group;
  public wheels: THREE.Mesh[] = [];
  public wheelPivots: THREE.Group[] = [];
  public frontLeftPivot!: THREE.Group;
  public frontRightPivot!: THREE.Group;
  public rearLeftPivot!: THREE.Group;
  public rearRightPivot!: THREE.Group;

  public mastcamHead!: THREE.Group;
  public steeringYoke!: THREE.Group;
  public cockpitGroup!: THREE.Group;

  public leftHeadlight!: THREE.SpotLight;
  public rightHeadlight!: THREE.SpotLight;
  public auxFrontFloodLight!: THREE.SpotLight;
  public sharedHeadlightTarget!: THREE.Object3D;
  public leftLightCone!: THREE.Mesh;
  public rightLightCone!: THREE.Mesh;
  public auxLedBarMat!: THREE.MeshBasicMaterial;
  public mastCyanBeaconMat!: THREE.MeshBasicMaterial;
  public rearAmberBeaconMats: THREE.MeshBasicMaterial[] = [];
  public brakeLights: THREE.Mesh[] = [];
  public dishAntenna!: THREE.Group;
  public miningDrillBit!: THREE.Group;
  public cockpitCameraNode: THREE.Object3D;
  public followCameraNode: THREE.Object3D;

  private isHeadlightsOn: boolean = true;
  private currentSteerAngle: number = 0;

  constructor() {
    this.group = new THREE.Group();
    this.chassisGroup = new THREE.Group();
    this.group.add(this.chassisGroup);

    // 1. Materiais PBR Avançados (MLI Gold Foil Kapton + Placas Aeroespaciais Brancas + Carbono + Titânio)
    const mliMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37, // Dourado metálico da manta térmica Kapton multicamada
      metalness: 0.88,
      roughness: 0.24
    });

    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x1b2026,
      metalness: 0.68,
      roughness: 0.42
    });

    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.86,
      roughness: 0.26
    });

    const aeroWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9, // Placas aeroespaciais brancas estilo NASA LTV / VIPER
      metalness: 0.25,
      roughness: 0.32
    });

    // 2. Chassi Principal, Placas Aeroespaciais Brancas, Carenagem Kapton e Braço Frontal de Mineração
    this.buildBody(mliMat, carbonMat, titaniumMat, aeroWhiteMat);

    // 3. Sistema de Suspensão Rocker-Bogie Articulada e 6 Rodas de Malha Metálica
    this.buildSuspensionAndWheels(titaniumMat, mliMat, aeroWhiteMat);

    // 4. Mastro com Câmeras Estereoscópicas Frontais (Mastcam)
    this.buildMastcam(carbonMat, titaniumMat);

    // 5. Painel Solar Traseiro Inclinado & RTG com Aletas de Refrigeração
    this.buildRTGGenerator(aeroWhiteMat, mliMat);

    // 6. Cockpit 3D Interno para a Câmera em Primeira Pessoa (Tecla C)
    this.buildCockpitInterior();

    // 7. Antena Parabólica Dourada Rotativa de Alta Frequência
    this.dishAntenna = this.buildDishAntenna(mliMat);
    this.chassisGroup.add(this.dishAntenna);

    // 8. Faróis SpotLight Calibrados com Cones Volumétricos Alinhados (+Z)
    this.buildHeadlights();

    // 9. Painel Traseiro com Luzes de Travão e Navegação Nítidas
    this.buildBrakeLights();

    // 10. Nós de Câmera (Cockpit vs 3ª Pessoa)
    this.cockpitCameraNode = new THREE.Object3D();
    this.cockpitCameraNode.position.set(0, 1.48, 0.45); // Altura dos olhos do piloto
    this.group.add(this.cockpitCameraNode);

    this.followCameraNode = new THREE.Object3D();
    this.followCameraNode.position.set(0, 3.2, -6.6); // Atrás e acima do rover
    this.group.add(this.followCameraNode);
  }

  private buildBody(
    mliMat: THREE.Material,
    carbonMat: THREE.Material,
    titaniumMat: THREE.Material,
    aeroWhiteMat: THREE.Material
  ): void {
    // Banheira estrutural inferior (carbono e blindagem de micrometeoritos)
    const tubGeo = new THREE.BoxGeometry(2.1, 0.55, 3.9);
    const tub = new THREE.Mesh(tubGeo, carbonMat);
    tub.position.y = 0.82;
    tub.castShadow = true;
    tub.receiveShadow = true;
    this.chassisGroup.add(tub);

    // Placas aeroespaciais brancas superiores e carenagens laterais (estilo NASA LTV / VIPER)
    const whiteDeckGeo = new THREE.BoxGeometry(2.24, 0.16, 3.72);
    const whiteDeck = new THREE.Mesh(whiteDeckGeo, aeroWhiteMat);
    whiteDeck.position.set(0, 1.12, 0.04);
    whiteDeck.castShadow = true;
    whiteDeck.receiveShadow = true;
    this.chassisGroup.add(whiteDeck);

    const fenderGeo = new THREE.BoxGeometry(0.32, 0.14, 3.85);
    [-1.16, 1.16].forEach((fx) => {
      const fender = new THREE.Mesh(fenderGeo, aeroWhiteMat);
      fender.position.set(fx, 1.06, 0);
      fender.castShadow = true;
      this.chassisGroup.add(fender);
    });

    // Painéis laterais cobertos com folha térmica dourada Kapton detalhada
    const mliSideGeo = new THREE.BoxGeometry(0.26, 0.44, 3.55);
    const leftMli = new THREE.Mesh(mliSideGeo, mliMat);
    leftMli.position.set(-1.05, 0.86, 0);
    leftMli.castShadow = true;
    this.chassisGroup.add(leftMli);

    const rightMli = new THREE.Mesh(mliSideGeo, mliMat);
    rightMli.position.set(1.05, 0.86, 0);
    rightMli.castShadow = true;
    this.chassisGroup.add(rightMli);

    // Manta térmica dourada Kapton frontal sob o para-brisas
    const frontKaptonGeo = new THREE.BoxGeometry(1.78, 0.34, 0.65);
    const frontKapton = new THREE.Mesh(frontKaptonGeo, mliMat);
    frontKapton.position.set(0, 1.16, 1.62);
    frontKapton.castShadow = true;
    this.chassisGroup.add(frontKapton);

    // Cúpula superior da cabine pressurizada com teto aeroespacial branco
    const cabinGeo = new THREE.BoxGeometry(1.85, 0.85, 2.0);
    const cabinMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      metalness: 0.85,
      roughness: 0.12,
      reflectivity: 0.9,
      transmission: 0.45,
      transparent: true,
      ior: 1.52
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 1.42, 0.35);
    cabin.castShadow = true;
    this.chassisGroup.add(cabin);

    const roofPlateGeo = new THREE.BoxGeometry(1.92, 0.1, 2.06);
    const roofPlate = new THREE.Mesh(roofPlateGeo, aeroWhiteMat);
    roofPlate.position.set(0, 1.86, 0.35);
    roofPlate.castShadow = true;
    this.chassisGroup.add(roofPlate);

    // Moldura estrutural externa de titânio na cabine
    const cabinFrameGeo = new THREE.BoxGeometry(1.9, 0.88, 2.05);
    const cabinFrameMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      wireframe: true,
      metalness: 0.88,
      roughness: 0.22
    });
    const cabinFrame = new THREE.Mesh(cabinFrameGeo, cabinFrameMat);
    cabinFrame.position.set(0, 1.42, 0.35);
    this.chassisGroup.add(cabinFrame);

    // Grelha e para-choque dianteiro reforçado
    const bumperGeo = new THREE.BoxGeometry(2.36, 0.42, 0.46);
    const bumper = new THREE.Mesh(bumperGeo, titaniumMat);
    bumper.position.set(0, 0.74, 2.1);
    bumper.castShadow = true;
    this.chassisGroup.add(bumper);

    // Braço / Broca Frontal de Mineração ISRU Iluminado (estilo NASA VIPER)
    const drillArmGroup = new THREE.Group();
    drillArmGroup.position.set(0.56, 0.82, 2.28);

    const armBoomGeo = new THREE.BoxGeometry(0.16, 0.16, 0.58);
    const armBoom = new THREE.Mesh(armBoomGeo, aeroWhiteMat);
    armBoom.position.set(0, 0.04, 0.22);
    drillArmGroup.add(armBoom);

    const drillHousingGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.52, 12);
    const drillHousing = new THREE.Mesh(drillHousingGeo, mliMat);
    drillHousing.position.set(0, 0.02, 0.52);
    drillHousing.rotation.x = 0.35;
    drillArmGroup.add(drillHousing);

    this.miningDrillBit = new THREE.Group();
    this.miningDrillBit.position.set(0, -0.18, 0.62);
    this.miningDrillBit.rotation.x = 0.35;

    const bitConeGeo = new THREE.ConeGeometry(0.08, 0.42, 10);
    bitConeGeo.rotateX(Math.PI);
    const bitCone = new THREE.Mesh(bitConeGeo, titaniumMat);
    this.miningDrillBit.add(bitCone);

    const spiralGeo = new THREE.TorusGeometry(0.065, 0.018, 8, 16);
    spiralGeo.rotateX(Math.PI / 2);
    const spiralMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    for (let s = 0; s < 3; s++) {
      const ring = new THREE.Mesh(spiralGeo, spiralMat);
      ring.position.y = 0.08 - s * 0.1;
      ring.scale.setScalar(1 - s * 0.22);
      this.miningDrillBit.add(ring);
    }
    drillArmGroup.add(this.miningDrillBit);

    // Luz de trabalho ciano no cabeçote da broca de gelo
    const drillLampGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const drillLamp = new THREE.Mesh(drillLampGeo, spiralMat);
    drillLamp.position.set(0, 0.14, 0.58);
    drillArmGroup.add(drillLamp);

    this.chassisGroup.add(drillArmGroup);

    // Placa de identificação "WELWITSCHIA 01"
    const badgeGeo = new THREE.BoxGeometry(1.1, 0.15, 0.05);
    const badgeMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: new THREE.Color(0x00f0ff),
      emissiveIntensity: 0.35
    });
    const badge = new THREE.Mesh(badgeGeo, badgeMat);
    badge.position.set(-0.22, 0.76, 2.34);
    this.chassisGroup.add(badge);
  }

  private buildSuspensionAndWheels(
    strutMat: THREE.Material,
    hubMat: THREE.Material,
    aeroWhiteMat: THREE.Material
  ): void {
    const wheelRadius = 0.52;
    const wheelWidth = 0.44;

    // Banda de rodagem metálica flexível texturizada (Spring Tire em malha de titânio)
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x2a3038,
      metalness: 0.88,
      roughness: 0.48
    });

    // Tubos articulados principais da suspensão Rocker-Bogie nas laterais
    [-1.18, 1.18].forEach((sideX) => {
      const rockerBeamGeo = new THREE.CylinderGeometry(0.055, 0.055, 2.75, 10);
      rockerBeamGeo.rotateX(Math.PI / 2);
      const rockerBeam = new THREE.Mesh(rockerBeamGeo, aeroWhiteMat);
      rockerBeam.position.set(sideX, 0.76, 0);
      this.chassisGroup.add(rockerBeam);

      const pivotJointGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.16, 12);
      pivotJointGeo.rotateZ(Math.PI / 2);
      const pivotJoint = new THREE.Mesh(pivotJointGeo, hubMat);
      pivotJoint.position.set(sideX, 0.82, 0.15);
      this.chassisGroup.add(pivotJoint);
    });

    const zOffsets = [1.35, 0.0, -1.35];
    const xPositions = [-1.35, 1.35];

    zOffsets.forEach((z, zIdx) => {
      xPositions.forEach((x, xIdx) => {
        // Grupo de esterçamento (pivot) para rodas dianteiras e traseiras
        const steerPivot = new THREE.Group();
        steerPivot.position.set(x, 0.52, z);
        this.group.add(steerPivot);
        this.wheelPivots.push(steerPivot);

        if (zIdx === 0 && xIdx === 0) this.frontLeftPivot = steerPivot;
        if (zIdx === 0 && xIdx === 1) this.frontRightPivot = steerPivot;
        if (zIdx === 2 && xIdx === 0) this.rearLeftPivot = steerPivot;
        if (zIdx === 2 && xIdx === 1) this.rearRightPivot = steerPivot;

        // Cilindro da Roda
        const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 18);
        wheelGeo.rotateZ(Math.PI / 2);
        const wheel = new THREE.Mesh(wheelGeo, tireMat);
        wheel.castShadow = true;
        wheel.receiveShadow = true;
        steerPivot.add(wheel);
        this.wheels.push(wheel);

        // Aros e ranhuras de tração (12 Grousers metálicos + anel de malha) ao redor da roda
        for (let g = 0; g < 12; g++) {
          const grouserAngle = (g / 12) * Math.PI * 2;
          const grouserGeo = new THREE.BoxGeometry(wheelWidth + 0.025, 0.04, 0.055);
          const grouser = new THREE.Mesh(grouserGeo, strutMat);
          grouser.position.set(
            0,
            Math.cos(grouserAngle) * (wheelRadius - 0.01),
            Math.sin(grouserAngle) * (wheelRadius - 0.01)
          );
          grouser.rotation.x = -grouserAngle;
          wheel.add(grouser);
        }

        // Calota central dourada Kapton com cubo metálico
        const capGeo = new THREE.CylinderGeometry(0.2, 0.2, wheelWidth + 0.05, 12);
        capGeo.rotateZ(Math.PI / 2);
        const cap = new THREE.Mesh(capGeo, hubMat);
        wheel.add(cap);

        // Braço articulado vertical/diagonal de suspensão rocker-bogie
        const armGeo = new THREE.CylinderGeometry(0.055, 0.07, 0.82, 8);
        const arm = new THREE.Mesh(armGeo, strutMat);
        arm.position.set(x * 0.72, 0.72, z);
        arm.rotation.z = x > 0 ? -0.42 : 0.42;
        arm.castShadow = true;
        this.chassisGroup.add(arm);
      });
    });
  }

  private buildMastcam(carbonMat: THREE.Material, titaniumMat: THREE.Material): void {
    // Mastro vertical frontal com câmeras estereoscópicas
    const mastcamGroup = new THREE.Group();
    mastcamGroup.position.set(0.65, 1.85, 1.1);

    const poleGeo = new THREE.CylinderGeometry(0.05, 0.07, 0.8, 8);
    const pole = new THREE.Mesh(poleGeo, carbonMat);
    pole.position.y = 0.4;
    pole.castShadow = true;
    mastcamGroup.add(pole);

    // Cabeça da câmera articulada
    this.mastcamHead = new THREE.Group();
    this.mastcamHead.position.set(0, 0.82, 0);

    const headGeo = new THREE.BoxGeometry(0.42, 0.18, 0.22);
    const head = new THREE.Mesh(headGeo, titaniumMat);
    head.castShadow = true;
    this.mastcamHead.add(head);

    // Lentes estereoscópicas (olho esquerdo e direito) com emissão ciano
    const lensGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.08, 12);
    lensGeo.rotateX(Math.PI / 2);
    const lensMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

    const leftEye = new THREE.Mesh(lensGeo, lensMat);
    leftEye.position.set(-0.12, 0, 0.12);
    this.mastcamHead.add(leftEye);

    const rightEye = new THREE.Mesh(lensGeo, lensMat);
    rightEye.position.set(0.12, 0, 0.12);
    this.mastcamHead.add(rightEye);

    // Baliza superior ciano de navegação no mastro de sensores (visibilidade noturna lunar)
    this.mastCyanBeaconMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const mastBeaconGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12);
    const mastBeacon = new THREE.Mesh(mastBeaconGeo, this.mastCyanBeaconMat);
    mastBeacon.position.set(0, 0.16, 0);
    this.mastcamHead.add(mastBeacon);

    const mastPointLight = new THREE.PointLight(0x00f0ff, 1.4, 9, 1.5);
    mastPointLight.position.set(0, 0.22, 0);
    this.mastcamHead.add(mastPointLight);

    mastcamGroup.add(this.mastcamHead);
    this.chassisGroup.add(mastcamGroup);
  }

  private buildRTGGenerator(aeroWhiteMat: THREE.Material, mliMat: THREE.Material): void {
    // Gerador Termoelétrico por Radioisótopos (RTG) traseiro + Painel Solar Traseiro Inclinado
    const rtgGroup = new THREE.Group();
    rtgGroup.position.set(0, 1.25, -1.55);

    // Núcleo cilíndrico
    const coreGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.8, 16);
    coreGeo.rotateX(Math.PI / 2);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.3
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.castShadow = true;
    rtgGroup.add(core);

    // 8 Aletas de refrigeração radiais
    const finGeo = new THREE.BoxGeometry(0.04, 0.85, 0.75);
    const finMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.4 });
    for (let f = 0; f < 4; f++) {
      const fin = new THREE.Mesh(finGeo, finMat);
      fin.rotation.z = (f / 4) * Math.PI;
      rtgGroup.add(fin);
    }

    // Painel Solar Traseiro Inclinado (estilo NASA VIPER / LTV)
    const solarFrameGeo = new THREE.BoxGeometry(1.75, 0.06, 1.05);
    const solarFrame = new THREE.Mesh(solarFrameGeo, aeroWhiteMat);
    solarFrame.position.set(0, 0.56, 0.12);
    solarFrame.rotation.x = 0.38;
    solarFrame.castShadow = true;
    rtgGroup.add(solarFrame);

    const solarCellsGeo = new THREE.BoxGeometry(1.64, 0.02, 0.96);
    const solarCellsMat = new THREE.MeshStandardMaterial({
      color: 0x0c4a6e,
      emissive: 0x082f49,
      emissiveIntensity: 0.35,
      metalness: 0.85,
      roughness: 0.18
    });
    const solarCells = new THREE.Mesh(solarCellsGeo, solarCellsMat);
    solarCells.position.set(0, 0.59, 0.13);
    solarCells.rotation.x = 0.38;
    rtgGroup.add(solarCells);

    // Suporte dourado Kapton sob o painel solar traseiro
    const supportGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.38, 8);
    const support = new THREE.Mesh(supportGeo, mliMat);
    support.position.set(0, 0.35, 0.1);
    rtgGroup.add(support);

    // LED de telemetria térmica
    const ledGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(0, 0.22, -0.42);
    rtgGroup.add(led);

    this.chassisGroup.add(rtgGroup);
  }

  private buildCockpitInterior(): void {
    // Sub-grupo do cockpit 3D que fica visível na câmera interna
    this.cockpitGroup = new THREE.Group();
    this.cockpitGroup.position.set(0, 1.15, 0.45);

    // Painel de instrumentos frontal
    const dashGeo = new THREE.BoxGeometry(1.4, 0.45, 0.5);
    const dashMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.7,
      roughness: 0.35
    });
    const dash = new THREE.Mesh(dashGeo, dashMat);
    dash.position.set(0, 0, 0.45);
    this.cockpitGroup.add(dash);

    // Telas digitais de instrumentos emissivas (HUD Interno)
    const screenGeo = new THREE.PlaneGeometry(0.35, 0.22);
    const speedScreenMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const speedScreen = new THREE.Mesh(screenGeo, speedScreenMat);
    speedScreen.position.set(-0.35, 0.08, 0.71);
    speedScreen.rotation.x = -0.3;
    this.cockpitGroup.add(speedScreen);

    const radarScreenMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const radarScreen = new THREE.Mesh(screenGeo, radarScreenMat);
    radarScreen.position.set(0.35, 0.08, 0.71);
    radarScreen.rotation.x = -0.3;
    this.cockpitGroup.add(radarScreen);

    // Manche / Volante de pilotagem (Steering Yoke)
    this.steeringYoke = new THREE.Group();
    this.steeringYoke.position.set(0, 0.08, 0.32);

    const columnGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.28, 8);
    columnGeo.rotateX(Math.PI / 4);
    const columnMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
    const column = new THREE.Mesh(columnGeo, columnMat);
    this.steeringYoke.add(column);

    // Barra em U do volante espacial
    const barGeo = new THREE.TorusGeometry(0.18, 0.025, 8, 16, Math.PI);
    barGeo.rotateZ(Math.PI);
    const barMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.5 });
    const bar = new THREE.Mesh(barGeo, barMat);
    bar.position.set(0, 0.1, 0.1);
    this.steeringYoke.add(bar);

    this.cockpitGroup.add(this.steeringYoke);
    this.chassisGroup.add(this.cockpitGroup);
  }

  private buildDishAntenna(mliMat: THREE.Material): THREE.Group {
    const antennaGroup = new THREE.Group();
    antennaGroup.position.set(-0.55, 1.9, -0.6);

    const baseGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.4, 8);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    antennaGroup.add(base);

    // Prato parabólico dourado rotativo (malha refletiva Kapton)
    const dishGeo = new THREE.SphereGeometry(0.44, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.42);
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.88,
      roughness: 0.2,
      side: THREE.DoubleSide
    });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.position.y = 0.3;
    dish.rotation.x = -Math.PI * 0.35;
    antennaGroup.add(dish);

    const feedArmGeo = new THREE.CylinderGeometry(0.02, 0.025, 0.32, 8);
    const feedArm = new THREE.Mesh(feedArmGeo, mliMat);
    feedArm.position.set(0, 0.42, 0.08);
    feedArm.rotation.x = 0.35;
    antennaGroup.add(feedArm);

    // Ponteira luminosa ciano no mastro da antena parabólica
    const tipGeo = new THREE.SphereGeometry(0.055, 10, 10);
    const tipMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.set(0, 0.56, 0.14);
    antennaGroup.add(tip);

    return antennaGroup;
  }

  /**
   * Gera textura de feixe volumétrico com gradiente longitudinal suave:
   * - Em ConeGeometry(r, h, ..., true), v=1 corresponde ao vértice estreito (na lente) e v=0 à base larga distante.
   * - No Canvas 2D (flipY=true por padrão), y=0 corresponde a v=1 (lente) e y=256 corresponde a v=0 (ponta distante).
   */
  private createVolumetricBeamTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, 'rgba(224, 242, 254, 0.0)');
    grad.addColorStop(0.08, 'rgba(224, 242, 254, 0.65)');
    grad.addColorStop(0.45, 'rgba(186, 230, 253, 0.28)');
    grad.addColorStop(0.82, 'rgba(125, 211, 252, 0.08)');
    grad.addColorStop(1.0, 'rgba(56, 189, 248, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 256);

    return new THREE.CanvasTexture(canvas);
  }

  private buildHeadlights(): void {
    // 1. 2 SpotLights frontais exatamente na grelha dianteira apontando para um target fixo relativo ao Rover (0, -1.1, 14)
    // angle = 0.42, penumbra = 0.65, decay = 1.6 e intensidade equilibrada (4.2 de dia, 6.8 na noite lunar)
    this.sharedHeadlightTarget = new THREE.Object3D();
    this.sharedHeadlightTarget.position.set(0, -1.1, 14);
    this.group.add(this.sharedHeadlightTarget);

    this.leftHeadlight = new THREE.SpotLight(0xf8fafc, 4.2, 65, 0.42, 0.65, 1.6);
    this.leftHeadlight.position.set(-0.78, 0.96, 2.26);
    this.leftHeadlight.castShadow = true;
    this.leftHeadlight.shadow.bias = -0.0005;
    this.leftHeadlight.target = this.sharedHeadlightTarget;

    this.rightHeadlight = new THREE.SpotLight(0xf8fafc, 4.2, 65, 0.42, 0.65, 1.6);
    this.rightHeadlight.position.set(0.78, 0.96, 2.26);
    this.rightHeadlight.castShadow = true;
    this.rightHeadlight.shadow.bias = -0.0005;
    this.rightHeadlight.target = this.sharedHeadlightTarget;

    // 2. Barra de LED Auxiliar Frontal suave na grelha dianteira
    this.auxLedBarMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
    const auxBarGeo = new THREE.BoxGeometry(1.18, 0.08, 0.06);
    const auxBarMesh = new THREE.Mesh(auxBarGeo, this.auxLedBarMat);
    auxBarMesh.position.set(0, 0.92, 2.34);
    this.chassisGroup.add(auxBarMesh);

    this.auxFrontFloodLight = new THREE.SpotLight(0xe0f2fe, 1.8, 28, 0.52, 0.72, 1.7);
    this.auxFrontFloodLight.position.set(0, 0.92, 2.34);
    this.auxFrontFloodLight.target = this.sharedHeadlightTarget;

    // Lentes LED frontais emissivas na grelha dianteira
    const lensGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.08, 16);
    lensGeo.rotateX(Math.PI / 2);
    const lensMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });

    const leftLens = new THREE.Mesh(lensGeo, lensMat);
    leftLens.position.set(-0.78, 0.96, 2.26);
    this.chassisGroup.add(leftLens);

    const rightLens = new THREE.Mesh(lensGeo, lensMat);
    rightLens.position.set(0.78, 0.96, 2.26);
    this.chassisGroup.add(rightLens);

    // 3. Cones Volumétricos (ConeGeometry aberta nas pontas, depthWrite: false, transparent: true, opacidade 0.08 a 0.14)
    // Ancorados com o vértice estreito (0,0,0) exatamente na lente e abrindo suavemente ao longo do eixo +Z frontal do Rover
    const beamLength = 11.5;
    const beamRadius = 2.35;
    const beamTexture = this.createVolumetricBeamTexture();
    const coneGeo = new THREE.ConeGeometry(beamRadius, beamLength, 24, 1, true);
    // Move o vértice estreito (+Y/2) para a origem (0,0,0) e a base aberta para (0, -beamLength, 0)
    coneGeo.translate(0, -beamLength / 2, 0);
    // Roda -90° em X para que o eixo -Y passe a apontar exatamente para +Z frontal!
    coneGeo.rotateX(-Math.PI / 2);

    const coneMat = new THREE.MeshBasicMaterial({
      map: beamTexture,
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.09,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.leftLightCone = new THREE.Mesh(coneGeo, coneMat);
    this.leftLightCone.position.set(-0.78, 0.96, 2.3);
    this.leftLightCone.rotation.x = 0.14; // Inclinação suave para o solo acompanhando o target (0, -1.1, 14)
    this.leftLightCone.rotation.y = 0.05;

    this.rightLightCone = new THREE.Mesh(coneGeo, coneMat);
    this.rightLightCone.position.set(0.78, 0.96, 2.3);
    this.rightLightCone.rotation.x = 0.14;
    this.rightLightCone.rotation.y = -0.05;

    this.group.add(this.leftHeadlight);
    this.group.add(this.rightHeadlight);
    this.group.add(this.auxFrontFloodLight);
    this.group.add(this.leftLightCone);
    this.group.add(this.rightLightCone);
  }

  private buildBrakeLights(): void {
    // Painel traseiro estruturado com luzes de travão e navegação nítidas
    const rearPanelGeo = new THREE.BoxGeometry(2.12, 0.42, 0.08);
    const rearPanelMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.75,
      roughness: 0.35
    });
    const rearPanel = new THREE.Mesh(rearPanelGeo, rearPanelMat);
    rearPanel.position.set(0, 0.92, -1.96);
    this.chassisGroup.add(rearPanel);

    const lightGeo = new THREE.BoxGeometry(0.42, 0.15, 0.08);
    const brakeMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });

    const leftBrake = new THREE.Mesh(lightGeo, brakeMat.clone());
    leftBrake.position.set(-0.82, 0.9, -1.99);
    this.chassisGroup.add(leftBrake);
    this.brakeLights.push(leftBrake);

    const rightBrake = new THREE.Mesh(lightGeo, brakeMat.clone());
    rightBrake.position.set(0.82, 0.9, -1.99);
    this.chassisGroup.add(rightBrake);
    this.brakeLights.push(rightBrake);

    // Barra central traseira de telemetria ciano
    const centerBarGeo = new THREE.BoxGeometry(0.68, 0.06, 0.08);
    const centerBarMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const centerBar = new THREE.Mesh(centerBarGeo, centerBarMat);
    centerBar.position.set(0, 0.92, -1.99);
    this.chassisGroup.add(centerBar);

    // Luzes de navegação traseiras âmbar nas extremidades superiores do chassi
    const amberGeo = new THREE.BoxGeometry(0.2, 0.1, 0.08);
    [-1.02, 1.02].forEach((ax) => {
      const amberMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
      const amberMesh = new THREE.Mesh(amberGeo, amberMat);
      amberMesh.position.set(ax, 1.15, -1.97);
      this.chassisGroup.add(amberMesh);
      this.rearAmberBeaconMats.push(amberMat);
    });

    // Luz pontual traseira vermelha/âmbar equilibrada
    const rearNavLight = new THREE.PointLight(0xef4444, 1.2, 8, 1.5);
    rearNavLight.position.set(0, 1.0, -2.2);
    this.chassisGroup.add(rearNavLight);
  }

  /** Atualiza o ângulo de esterçamento das rodas dianteiras e traseiras e a rotação do manche/câmera */
  public updateSteering(turnInput: number, _speedKmh: number, delta: number): void {
    const maxSteerRad = 0.38; // ~22 graus de esterçamento
    const targetAngle = turnInput * maxSteerRad;

    // Interpolação suave do ângulo de esterçamento
    this.currentSteerAngle = THREE.MathUtils.lerp(this.currentSteerAngle, targetAngle, Math.min(1.0, delta * 12.0));

    // Rodas dianteiras esterçam na direção do volante
    if (this.frontLeftPivot) this.frontLeftPivot.rotation.y = this.currentSteerAngle;
    if (this.frontRightPivot) this.frontRightPivot.rotation.y = this.currentSteerAngle;

    // Rodas traseiras esterçam em direção oposta (4WS - 4 Wheel Steering) para raio de curva reduzido
    if (this.rearLeftPivot) this.rearLeftPivot.rotation.y = -this.currentSteerAngle * 0.7;
    if (this.rearRightPivot) this.rearRightPivot.rotation.y = -this.currentSteerAngle * 0.7;

    // O manche (yoke) dentro do cockpit gira conforme a direção A/D
    if (this.steeringYoke) {
      this.steeringYoke.rotation.z = -this.currentSteerAngle * 1.8;
    }

    // A cabeça da mastcam olha ligeiramente para o lado da curva
    if (this.mastcamHead) {
      this.mastcamHead.rotation.y = this.currentSteerAngle * 0.55;
    }
  }

  public setHeadlights(on: boolean): void {
    this.isHeadlightsOn = on;
    this.leftHeadlight.intensity = on ? 4.2 : 0.0;
    this.rightHeadlight.intensity = on ? 4.2 : 0.0;
    if (this.auxFrontFloodLight) {
      this.auxFrontFloodLight.intensity = on ? 1.8 : 0.0;
    }
    if (this.auxLedBarMat) {
      this.auxLedBarMat.color.setHex(on ? 0xe0f2fe : 0x334155);
    }
    this.leftLightCone.visible = on;
    this.rightLightCone.visible = on;
  }

  /**
   * Ajusta os faróis com intensidade equilibrada (4.2 de dia, 6.8 na noite lunar)
   * e opacidade suave nos cones volumétricos (0.08 a 0.14) para iluminar o chão sem estourar o branco.
   */
  public updateLightingEnvironment(time: number, isShadowedOrNight: boolean): void {
    if (this.isHeadlightsOn) {
      const targetIntensity = isShadowedOrNight ? 6.8 : 4.2;
      this.leftHeadlight.intensity = targetIntensity;
      this.rightHeadlight.intensity = targetIntensity;
      if (this.auxFrontFloodLight) {
        this.auxFrontFloodLight.intensity = isShadowedOrNight ? 2.6 : 1.8;
      }
      const coneMat = this.leftLightCone.material as THREE.MeshBasicMaterial;
      if (coneMat) {
        coneMat.opacity = isShadowedOrNight ? 0.14 : 0.08;
      }
    }

    // Pulso das balizas ciano do mastro e âmbar traseiras na noite lunar
    const beaconPulse = 0.65 + 0.35 * Math.sin(time * 4.5);
    if (this.mastCyanBeaconMat) {
      this.mastCyanBeaconMat.color.setRGB(0, 0.94 * beaconPulse, 1.0 * beaconPulse);
    }
    this.rearAmberBeaconMats.forEach((mat, idx) => {
      const p = 0.6 + 0.4 * Math.sin(time * 3.8 + idx * Math.PI);
      mat.color.setRGB(0.96 * p, 0.62 * p, 0.05 * p);
    });
  }

  public toggleHeadlights(): boolean {
    this.setHeadlights(!this.isHeadlightsOn);
    return this.isHeadlightsOn;
  }

  public getHeadlightsStatus(): boolean {
    return this.isHeadlightsOn;
  }

  public setBraking(isBraking: boolean): void {
    this.brakeLights.forEach((light) => {
      const mat = light.material as THREE.MeshBasicMaterial;
      if (isBraking) {
        mat.color.setHex(0xff0000);
      } else {
        mat.color.setHex(0x7f1d1d);
      }
    });
  }

  /** Gira as rodas conforme a distância percorrida */
  public rotateWheels(distanceTravelled: number): void {
    const wheelCircumference = 2 * Math.PI * 0.52;
    const angleDelta = (distanceTravelled / wheelCircumference) * Math.PI * 2;
    this.wheels.forEach((wheel) => {
      wheel.rotation.x += angleDelta;
    });
  }

  /** Retorna as posições no espaço global das 6 rodas para emissão de partículas */
  public getWheelWorldPositions(): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    const tempVec = new THREE.Vector3();
    for (let i = 0; i < this.wheelPivots.length; i++) {
      this.wheelPivots[i].getWorldPosition(tempVec);
      positions.push(tempVec.clone());
    }
    return positions;
  }

  /** Oscila sutilmente a antena parabólica dourada e gira a broca frontal de mineração */
  public updateAntenna(time: number): void {
    if (this.dishAntenna) {
      this.dishAntenna.rotation.y = Math.sin(time * 0.8) * 0.35;
    }
    if (this.miningDrillBit) {
      this.miningDrillBit.rotation.y = time * 4.5;
    }
  }
}
