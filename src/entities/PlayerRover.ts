/**
 * Welwitschia Lunar - Veículo Explorador Tripulado (PlayerRover)
 * Chassi articulado de 6 rodas independentes, suspensão visível, antena parabólica no teto,
 * faróis frontais duplos (SpotLight) de longo alcance e lanternas traseiras de freio.
 */

import * as THREE from 'three';

export class PlayerRover {
  public group: THREE.Group;
  public chassisMesh: THREE.Mesh;
  public wheels: THREE.Mesh[] = [];
  public leftHeadlight: THREE.SpotLight;
  public rightHeadlight: THREE.SpotLight;
  public leftLightTarget: THREE.Object3D;
  public rightLightTarget: THREE.Object3D;
  public leftLightCone: THREE.Mesh;
  public rightLightCone: THREE.Mesh;
  public brakeLights: THREE.Mesh[] = [];
  public dishAntenna: THREE.Group;
  public cockpitCameraNode: THREE.Object3D;
  public followCameraNode: THREE.Object3D;

  private isHeadlightsOn: boolean = true;

  constructor() {
    this.group = new THREE.Group();

    // 1. Chassi Principal e Cabine Pressurizada
    this.chassisMesh = this.buildChassis();
    this.group.add(this.chassisMesh);

    // 2. Sistema de Suspensão e 6 Rodas Independentes
    this.buildSuspensionAndWheels();

    // 3. Antena Parabólica de Alta Frequência (comunicação com a Terra/Welwitschia)
    this.dishAntenna = this.buildDishAntenna();
    this.group.add(this.dishAntenna);

    // 4. Faróis Frontais SpotLight e Cones Volumétricos
    const { leftLight, rightLight, leftTarget, rightTarget, leftCone, rightCone } = this.buildHeadlights();
    this.leftHeadlight = leftLight;
    this.rightHeadlight = rightLight;
    this.leftLightTarget = leftTarget;
    this.rightLightTarget = rightTarget;
    this.leftLightCone = leftCone;
    this.rightLightCone = rightCone;

    this.group.add(this.leftHeadlight);
    this.group.add(this.rightHeadlight);
    this.group.add(this.leftLightTarget);
    this.group.add(this.rightLightTarget);
    this.group.add(this.leftLightCone);
    this.group.add(this.rightLightCone);

    // 5. Lanternas Traseiras de Freio
    this.buildBrakeLights();

    // 6. Nós de Câmera (Cockpit vs 3ª Pessoa)
    this.cockpitCameraNode = new THREE.Object3D();
    this.cockpitCameraNode.position.set(0, 1.45, 0.4); // Dentro da cabine com vista frontal
    this.group.add(this.cockpitCameraNode);

    this.followCameraNode = new THREE.Object3D();
    this.followCameraNode.position.set(0, 3.2, -6.5); // Atrás e acima do rover
    this.group.add(this.followCameraNode);
  }

  private buildChassis(): THREE.Mesh {
    const chassisGroup = new THREE.Group();

    // Chassi inferior robusto
    const lowerBodyGeo = new THREE.BoxGeometry(2.2, 0.6, 3.8);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0xe5e7eb, // Branco Artemis com cobertura térmica
      metalness: 0.4,
      roughness: 0.5
    });
    const lowerBody = new THREE.Mesh(lowerBodyGeo, chassisMat);
    lowerBody.position.y = 0.8;
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    chassisGroup.add(lowerBody);

    // Cabine do Piloto com cúpula de vidro dourado protetora contra radiação solar
    const cabinGeo = new THREE.BoxGeometry(1.8, 0.9, 1.8);
    const cabinMat = new THREE.MeshPhysicalMaterial({
      color: 0x111827,
      metalness: 0.85,
      roughness: 0.1,
      reflectivity: 0.9,
      transmission: 0.35,
      transparent: true
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 1.4, 0.3);
    cabin.castShadow = true;
    chassisGroup.add(cabin);

    // Para-choque dianteiro reforçado com guincho
    const bumperGeo = new THREE.BoxGeometry(2.4, 0.4, 0.5);
    const bumperMat = new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.8 });
    const bumper = new THREE.Mesh(bumperGeo, bumperMat);
    bumper.position.set(0, 0.7, 2.05);
    bumper.castShadow = true;
    chassisGroup.add(bumper);

    // Faixa decorativa "WELWITSCHIA - 01" em dourado/laranja
    const stripeGeo = new THREE.BoxGeometry(2.22, 0.12, 3.4);
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(0, 0.9, 0);
    chassisGroup.add(stripe);

    // Rack de baterias e módulos de oxigênio traseiros
    const rackGeo = new THREE.BoxGeometry(1.6, 0.6, 1.0);
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7 });
    const rack = new THREE.Mesh(rackGeo, rackMat);
    rack.position.set(0, 1.25, -1.2);
    rack.castShadow = true;
    chassisGroup.add(rack);

    // Cilindros criogênicos de O2 traseiros
    const cylGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.4, 12);
    cylGeo.rotateZ(Math.PI / 2);
    const cylMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.6, roughness: 0.3 });
    const cyl1 = new THREE.Mesh(cylGeo, cylMat);
    cyl1.position.set(0, 1.65, -1.0);
    const cyl2 = new THREE.Mesh(cylGeo, cylMat);
    cyl2.position.set(0, 1.65, -1.4);
    chassisGroup.add(cyl1);
    chassisGroup.add(cyl2);

    return lowerBody;
  }

  private buildSuspensionAndWheels(): void {
    const wheelRadius = 0.52;
    const wheelWidth = 0.42;

    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16);
    wheelGeo.rotateZ(Math.PI / 2);

    // Material de pneu lunar em malha de titânio (estilo Lunar Rover / Spring Tire da NASA)
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.8,
      roughness: 0.6
    });

    const strutMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.9,
      roughness: 0.3
    });

    // 6 rodas: dianteira (+1.3), intermediária (0.0), traseira (-1.3)
    const zPositions = [1.3, 0.0, -1.3];
    const xOffsets = [1.35, -1.35];

    zPositions.forEach((z) => {
      xOffsets.forEach((x) => {
        // Haste de suspensão visível
        const strutGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.8, 8);
        const strut = new THREE.Mesh(strutGeo, strutMat);
        strut.position.set(x * 0.75, 0.7, z);
        strut.rotation.z = x > 0 ? -0.4 : 0.4;
        strut.castShadow = true;
        this.group.add(strut);

        // Roda
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.position.set(x, 0.52, z);
        wheel.castShadow = true;
        wheel.receiveShadow = true;
        this.group.add(wheel);
        this.wheels.push(wheel);
      });
    });
  }

  private buildDishAntenna(): THREE.Group {
    const antennaGroup = new THREE.Group();
    antennaGroup.position.set(0.5, 1.85, -0.6);

    const baseGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.4, 8);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    antennaGroup.add(base);

    // Prato parabólico
    const dishGeo = new THREE.SphereGeometry(0.4, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.4);
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.7,
      roughness: 0.2,
      side: THREE.DoubleSide
    });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.position.y = 0.3;
    dish.rotation.x = -Math.PI * 0.35; // Aponta para cima em direção à Terra
    antennaGroup.add(dish);

    return antennaGroup;
  }

  private buildHeadlights(): {
    leftLight: THREE.SpotLight;
    rightLight: THREE.SpotLight;
    leftTarget: THREE.Object3D;
    rightTarget: THREE.Object3D;
    leftCone: THREE.Mesh;
    rightCone: THREE.Mesh;
  } {
    const leftLight = new THREE.SpotLight(0xffffff, 5.0, 95, Math.PI * 0.22, 0.4, 1.2);
    leftLight.position.set(-0.8, 1.0, 2.1);
    leftLight.castShadow = true;
    leftLight.shadow.bias = -0.0005;

    const rightLight = new THREE.SpotLight(0xffffff, 5.0, 95, Math.PI * 0.22, 0.4, 1.2);
    rightLight.position.set(0.8, 1.0, 2.1);
    rightLight.castShadow = true;
    rightLight.shadow.bias = -0.0005;

    const leftTarget = new THREE.Object3D();
    leftTarget.position.set(-0.8, 0.2, 35.0);

    const rightTarget = new THREE.Object3D();
    rightTarget.position.set(0.8, 0.2, 35.0);

    leftLight.target = leftTarget;
    rightLight.target = rightTarget;

    // Cones volumétricos translúcidos para simular a dispersão da luz na poeira
    const coneGeo = new THREE.ConeGeometry(3.5, 30, 16, 1, true);
    coneGeo.rotateX(Math.PI / 2);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const leftCone = new THREE.Mesh(coneGeo, coneMat);
    leftCone.position.set(-0.8, 0.6, 17);

    const rightCone = new THREE.Mesh(coneGeo, coneMat);
    rightCone.position.set(0.8, 0.6, 17);

    return { leftLight, rightLight, leftTarget, rightTarget, leftCone, rightCone };
  }

  private buildBrakeLights(): void {
    const lightGeo = new THREE.BoxGeometry(0.3, 0.12, 0.08);
    const brakeMat = new THREE.MeshBasicMaterial({ color: 0x7f1d1d }); // Vermelho escuro quando solto

    const leftBrake = new THREE.Mesh(lightGeo, brakeMat.clone());
    leftBrake.position.set(-0.9, 0.9, -1.95);
    this.group.add(leftBrake);
    this.brakeLights.push(leftBrake);

    const rightBrake = new THREE.Mesh(lightGeo, brakeMat.clone());
    rightBrake.position.set(0.9, 0.9, -1.95);
    this.group.add(rightBrake);
    this.brakeLights.push(rightBrake);
  }

  public setHeadlights(on: boolean): void {
    this.isHeadlightsOn = on;
    this.leftHeadlight.intensity = on ? 5.0 : 0.0;
    this.rightHeadlight.intensity = on ? 5.0 : 0.0;
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
        mat.color.setHex(0xff0000); // Vermelho vibrante intenso
      } else {
        mat.color.setHex(0x7f1d1d); // Vermelho repouso
      }
    });
  }

  /** Gira as rodas de acordo com o deslocamento para frente/trás */
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
    for (let i = 0; i < this.wheels.length; i++) {
      this.wheels[i].getWorldPosition(tempVec);
      positions.push(tempVec.clone());
    }
    return positions;
  }

  /** Oscila sutilmente a antena parabólica para parecer ativa */
  public updateAntenna(time: number): void {
    if (this.dishAntenna) {
      this.dishAntenna.rotation.y = Math.sin(time * 0.8) * 0.25;
    }
  }
}
