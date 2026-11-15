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
  public leftLightTarget!: THREE.Object3D;
  public rightLightTarget!: THREE.Object3D;
  public leftLightCone!: THREE.Mesh;
  public rightLightCone!: THREE.Mesh;
  public brakeLights: THREE.Mesh[] = [];
  public dishAntenna!: THREE.Group;
  public cockpitCameraNode: THREE.Object3D;
  public followCameraNode: THREE.Object3D;

  private isHeadlightsOn: boolean = true;
  private currentSteerAngle: number = 0;

  constructor() {
    this.group = new THREE.Group();
    this.chassisGroup = new THREE.Group();
    this.group.add(this.chassisGroup);

    // 1. Materiais PBR Avançados (MLI Gold Foil + Fibra de Carbono)
    const mliMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37, // Dourado metálico da manta de isolamento térmico multicamada
      metalness: 0.92,
      roughness: 0.22
    });

    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x1b2026,
      metalness: 0.7,
      roughness: 0.4
    });

    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.88,
      roughness: 0.25
    });

    // 2. Chassi Principal e Carenagem MLI
    this.buildBody(mliMat, carbonMat, titaniumMat);

    // 3. Sistema de Suspensão e 6 Rodas com Treads e Esterçamento
    this.buildSuspensionAndWheels(titaniumMat, mliMat);

    // 4. Mastro com Câmeras Estereoscópicas Frontais (Mastcam)
    this.buildMastcam(carbonMat, titaniumMat);

    // 5. RTG Traseiro (Radioisotope Thermoelectric Generator) com Aletas de Refrigeração
    this.buildRTGGenerator();

    // 6. Cockpit 3D Interno para a Câmera em Primeira Pessoa (Tecla C)
    this.buildCockpitInterior();

    // 7. Antena Parabólica de Alta Frequência
    this.dishAntenna = this.buildDishAntenna();
    this.chassisGroup.add(this.dishAntenna);

    // 8. Faróis SpotLight com Cones Volumétricos
    this.buildHeadlights();

    // 9. Lanternas de Freio Traseiras
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
    titaniumMat: THREE.Material
  ): void {
    // Banheira estrutural inferior (carbono e blindagem de micrometeoritos)
    const tubGeo = new THREE.BoxGeometry(2.1, 0.55, 3.9);
    const tub = new THREE.Mesh(tubGeo, carbonMat);
    tub.position.y = 0.82;
    tub.castShadow = true;
    tub.receiveShadow = true;
    this.chassisGroup.add(tub);

    // Painéis laterais cobertos com folha térmica dourada MLI
    const mliSideGeo = new THREE.BoxGeometry(0.25, 0.45, 3.6);
    const leftMli = new THREE.Mesh(mliSideGeo, mliMat);
    leftMli.position.set(-1.05, 0.9, 0);
    leftMli.castShadow = true;
    this.chassisGroup.add(leftMli);

    const rightMli = new THREE.Mesh(mliSideGeo, mliMat);
    rightMli.position.set(1.05, 0.9, 0);
    rightMli.castShadow = true;
    this.chassisGroup.add(rightMli);

    // Cúpula superior da cabine pressurizada (canópia angular protetora com vidro dourado refletivo)
    const cabinGeo = new THREE.BoxGeometry(1.85, 0.85, 2.0);
    const cabinMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.1,
      reflectivity: 0.95,
      transmission: 0.45,
      transparent: true,
      ior: 1.55
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 1.42, 0.35);
    cabin.castShadow = true;
    this.chassisGroup.add(cabin);

    // Moldura estrutural externa de titânio na cabine
    const cabinFrameGeo = new THREE.BoxGeometry(1.9, 0.88, 2.05);
    const cabinFrameMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      wireframe: true,
      metalness: 0.9,
      roughness: 0.2
    });
    const cabinFrame = new THREE.Mesh(cabinFrameGeo, cabinFrameMat);
    cabinFrame.position.set(0, 1.42, 0.35);
    this.chassisGroup.add(cabinFrame);

    // Para-choque dianteiro reforçado com sensor de obstáculos e anéis de reboque
    const bumperGeo = new THREE.BoxGeometry(2.4, 0.42, 0.5);
    const bumper = new THREE.Mesh(bumperGeo, titaniumMat);
    bumper.position.set(0, 0.72, 2.1);
    bumper.castShadow = true;
    this.chassisGroup.add(bumper);

    // Placa de identificação "WELWITSCHIA 01"
    const badgeGeo = new THREE.BoxGeometry(1.2, 0.16, 0.05);
    const badgeMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: new THREE.Color(0x00f0ff),
      emissiveIntensity: 0.3
    });
    const badge = new THREE.Mesh(badgeGeo, badgeMat);
    badge.position.set(0, 0.75, 2.37);
    this.chassisGroup.add(badge);
  }

  private buildSuspensionAndWheels(
    strutMat: THREE.Material,
    hubMat: THREE.Material
  ): void {
    const wheelRadius = 0.52;
    const wheelWidth = 0.44;

    // Banda de rodagem metálica flexível (Spring Tire em malha de titânio)
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x22262b,
      metalness: 0.85,
      roughness: 0.55
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
        const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16);
        wheelGeo.rotateZ(Math.PI / 2);
        const wheel = new THREE.Mesh(wheelGeo, tireMat);
        wheel.castShadow = true;
        wheel.receiveShadow = true;
        steerPivot.add(wheel);
        this.wheels.push(wheel);

        // Aros e ranhuras de tração (Grousers) ao redor da roda
        for (let g = 0; g < 8; g++) {
          const grouserAngle = (g / 8) * Math.PI * 2;
          const grouserGeo = new THREE.BoxGeometry(wheelWidth + 0.02, 0.04, 0.06);
          const grouser = new THREE.Mesh(grouserGeo, strutMat);
          grouser.position.set(
            0,
            Math.cos(grouserAngle) * (wheelRadius - 0.01),
            Math.sin(grouserAngle) * (wheelRadius - 0.01)
          );
          wheel.add(grouser);
        }

        // Calota central dourada com emblema
        const capGeo = new THREE.CylinderGeometry(0.18, 0.18, wheelWidth + 0.04, 12);
        capGeo.rotateZ(Math.PI / 2);
        const cap = new THREE.Mesh(capGeo, hubMat);
        wheel.add(cap);

        // Braço articulado de suspensão rocker-bogie
        const armGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.85, 8);
        const arm = new THREE.Mesh(armGeo, strutMat);
        arm.position.set(x * 0.7, 0.72, z);
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

    mastcamGroup.add(this.mastcamHead);
    this.chassisGroup.add(mastcamGroup);
  }

  private buildRTGGenerator(): void {
    // Gerador Termoelétrico por Radioisótopos (RTG) traseiro estilo NASA Curiosity/Perseverance
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

  private buildDishAntenna(): THREE.Group {
    const antennaGroup = new THREE.Group();
    antennaGroup.position.set(-0.55, 1.9, -0.6);

    const baseGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.4, 8);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    antennaGroup.add(base);

    // Prato parabólico
    const dishGeo = new THREE.SphereGeometry(0.42, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.4);
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.7,
      roughness: 0.2,
      side: THREE.DoubleSide
    });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.position.y = 0.3;
    dish.rotation.x = -Math.PI * 0.35;
    antennaGroup.add(dish);

    return antennaGroup;
  }

  private buildHeadlights(): void {
    this.leftHeadlight = new THREE.SpotLight(0xffffff, 5.5, 95, Math.PI * 0.22, 0.35, 1.2);
    this.leftHeadlight.position.set(-0.85, 1.05, 2.15);
    this.leftHeadlight.castShadow = true;
    this.leftHeadlight.shadow.bias = -0.0005;

    this.rightHeadlight = new THREE.SpotLight(0xffffff, 5.5, 95, Math.PI * 0.22, 0.35, 1.2);
    this.rightHeadlight.position.set(0.85, 1.05, 2.15);
    this.rightHeadlight.castShadow = true;
    this.rightHeadlight.shadow.bias = -0.0005;

    this.leftLightTarget = new THREE.Object3D();
    this.leftLightTarget.position.set(-0.85, 0.2, 35.0);

    this.rightLightTarget = new THREE.Object3D();
    this.rightLightTarget.position.set(0.85, 0.2, 35.0);

    this.leftHeadlight.target = this.leftLightTarget;
    this.rightHeadlight.target = this.rightLightTarget;

    // Lentes LED frontais emissivas
    const lensGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.08, 16);
    lensGeo.rotateX(Math.PI / 2);
    const lensMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const leftLens = new THREE.Mesh(lensGeo, lensMat);
    leftLens.position.set(-0.85, 1.05, 2.15);
    this.chassisGroup.add(leftLens);

    const rightLens = new THREE.Mesh(lensGeo, lensMat);
    rightLens.position.set(0.85, 1.05, 2.15);
    this.chassisGroup.add(rightLens);

    // Cones volumétricos translúcidos
    const coneGeo = new THREE.ConeGeometry(3.5, 30, 16, 1, true);
    coneGeo.rotateX(Math.PI / 2);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.09,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.leftLightCone = new THREE.Mesh(coneGeo, coneMat);
    this.leftLightCone.position.set(-0.85, 0.65, 17);

    this.rightLightCone = new THREE.Mesh(coneGeo, coneMat);
    this.rightLightCone.position.set(0.85, 0.65, 17);

    this.group.add(this.leftHeadlight);
    this.group.add(this.rightHeadlight);
    this.group.add(this.leftLightTarget);
    this.group.add(this.rightLightTarget);
    this.group.add(this.leftLightCone);
    this.group.add(this.rightLightCone);
  }

  private buildBrakeLights(): void {
    const lightGeo = new THREE.BoxGeometry(0.35, 0.14, 0.08);
    const brakeMat = new THREE.MeshBasicMaterial({ color: 0x7f1d1d });

    const leftBrake = new THREE.Mesh(lightGeo, brakeMat.clone());
    leftBrake.position.set(-0.95, 0.9, -1.98);
    this.chassisGroup.add(leftBrake);
    this.brakeLights.push(leftBrake);

    const rightBrake = new THREE.Mesh(lightGeo, brakeMat.clone());
    rightBrake.position.set(0.95, 0.9, -1.98);
    this.chassisGroup.add(rightBrake);
    this.brakeLights.push(rightBrake);
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
    this.leftHeadlight.intensity = on ? 5.5 : 0.0;
    this.rightHeadlight.intensity = on ? 5.5 : 0.0;
    this.leftLightCone.visible = on;
    this.rightLightCone.visible = on;
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

  /** Oscila sutilmente a antena parabólica */
  public updateAntenna(time: number): void {
    if (this.dishAntenna) {
      this.dishAntenna.rotation.y = Math.sin(time * 0.8) * 0.25;
    }
  }
}
