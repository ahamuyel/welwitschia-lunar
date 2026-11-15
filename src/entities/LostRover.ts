/**
 * Welwitschia Lunar - Rover Perdido (LRO-Scout)
 * Posicionado inclinado a 18° na borda de uma cratera de impacto a 2.000m da base (azimute 045° NE).
 * Carenagem em folha dourada MLI degradada, painéis solares cobertos por regolito espesso,
 * braço robótico de coleta de gelo desativado e LED de emergência âmbar pulsante.
 */

import * as THREE from 'three';
import { createSolarPanelTexture } from '../world/ProceduralTextures';

export class LostRover {
  public group: THREE.Group;
  public beaconLight: THREE.PointLight;
  public beaconLed: THREE.Mesh;
  public interactionBeacon: THREE.Mesh;
  public targetPosition: THREE.Vector3;
  public roboticArm: THREE.Group;

  constructor(x: number, y: number, z: number) {
    this.group = new THREE.Group();
    this.targetPosition = new THREE.Vector3(x, y, z);
    this.group.position.set(x, y, z);

    // Inclinação geológica de 18° na borda da cratera
    this.group.rotation.x = 0.28;
    this.group.rotation.z = -0.15;
    this.group.rotation.y = 0.8;

    // 1. Chassi principal com acabamento em folha dourada MLI
    const bodyGeo = new THREE.BoxGeometry(1.6, 0.7, 2.2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xc8963e, // Dourado MLI com poeira acumulada
      metalness: 0.82,
      roughness: 0.55
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    body.receiveShadow = true;
    this.group.add(body);

    // 2. Painéis Solares com poeira eletrostática espessa
    const dustPanelTexture = createSolarPanelTexture(true);
    const panelMat = new THREE.MeshStandardMaterial({
      map: dustPanelTexture,
      roughness: 0.95,
      metalness: 0.1
    });

    const panelGeo = new THREE.BoxGeometry(2.5, 0.05, 1.4);
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(0, 1.0, 0);
    panel.castShadow = true;
    this.group.add(panel);

    // Camada física espessa de regolito acumulado sobre os painéis
    const dustLayerGeo = new THREE.PlaneGeometry(2.45, 1.35);
    dustLayerGeo.rotateX(-Math.PI / 2);
    const dustLayerMat = new THREE.MeshStandardMaterial({
      color: 0x5a6067,
      roughness: 0.98,
      metalness: 0.02
    });
    const dustLayer = new THREE.Mesh(dustLayerGeo, dustLayerMat);
    dustLayer.position.set(0, 1.04, 0);
    this.group.add(dustLayer);

    // 3. Braço robótico articulado de amostragem de regolito e gelo (desativado inclinado)
    this.roboticArm = new THREE.Group();
    this.roboticArm.position.set(0.65, 0.65, 0.85);

    const armSegment1Geo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8);
    armSegment1Geo.rotateZ(Math.PI / 4);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
    const seg1 = new THREE.Mesh(armSegment1Geo, armMat);
    seg1.position.set(0.2, 0.15, 0);
    this.roboticArm.add(seg1);

    const scoopGeo = new THREE.BoxGeometry(0.16, 0.1, 0.14);
    const scoopMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
    const scoop = new THREE.Mesh(scoopGeo, scoopMat);
    scoop.position.set(0.45, -0.05, 0);
    this.roboticArm.add(scoop);
    this.group.add(this.roboticArm);

    // 4. Mastro com câmera de sensoriamento (desligada)
    const mastGeo = new THREE.CylinderGeometry(0.05, 0.07, 1.2, 8);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.7 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(-0.4, 1.5, 0.65);
    this.group.add(mast);

    const camHeadGeo = new THREE.BoxGeometry(0.35, 0.18, 0.22);
    const camHead = new THREE.Mesh(camHeadGeo, mastMat);
    camHead.position.set(-0.4, 2.1, 0.65);
    this.group.add(camHead);

    // 5. 4 Rodas metálicas parcialmente soterradas no regolito
    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.85 });

    const wheelOffsets = [
      { x: 1.05, z: 0.75 },
      { x: -1.05, z: 0.75 },
      { x: 1.05, z: -0.75 },
      { x: -1.05, z: -0.75 }
    ];

    wheelOffsets.forEach((pos) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(pos.x, 0.35, pos.z);
      wheel.castShadow = true;
      this.group.add(wheel);
    });

    // 6. LED de emergência piscando lentamente em âmbar
    this.beaconLight = new THREE.PointLight(0xf59e0b, 2.0, 16);
    this.beaconLight.position.set(0, 1.45, -0.65);
    this.group.add(this.beaconLight);

    const ledGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    this.beaconLed = new THREE.Mesh(ledGeo, ledMat);
    this.beaconLed.position.set(0, 1.45, -0.65);
    this.group.add(this.beaconLed);

    // 7. Holograma de alvo interativo para o resgate
    const beaconRingsGeo = new THREE.RingGeometry(1.2, 1.45, 32);
    beaconRingsGeo.rotateX(-Math.PI / 2);
    const beaconRingsMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55
    });
    this.interactionBeacon = new THREE.Mesh(beaconRingsGeo, beaconRingsMat);
    this.interactionBeacon.position.set(0, 0.1, 0);
    this.group.add(this.interactionBeacon);
  }

  /** Atualiza o pulso do LED de emergência e rotação do anel interativo */
  public update(time: number): void {
    const pulse = Math.max(0.1, Math.sin(time * 3.0));
    this.beaconLight.intensity = pulse * 2.5;
    (this.beaconLed.material as THREE.MeshBasicMaterial).color.setRGB(
      0.96 * pulse,
      0.62 * pulse,
      0.05 * pulse
    );

    if (this.interactionBeacon) {
      this.interactionBeacon.rotation.z += 0.02;
    }
  }
}
