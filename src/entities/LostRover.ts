/**
 * Welwitschia Lunar - Rover Perdido (LRO-Scout)
 * Posicionado inclinado a 18° na borda de uma cratera de impacto a 2.000m da base (azimute 045° NE).
 * Painéis solares cobertos por poeira cinza e LED de emergência âmbar piscando lentamente.
 */

import * as THREE from 'three';
import { createSolarPanelTexture } from '../world/ProceduralTextures';

export class LostRover {
  public group: THREE.Group;
  public beaconLight: THREE.PointLight;
  public beaconLed: THREE.Mesh;
  public interactionBeacon: THREE.Mesh;
  public targetPosition: THREE.Vector3;

  constructor(x: number, y: number, z: number) {
    this.group = new THREE.Group();
    this.targetPosition = new THREE.Vector3(x, y, z);
    this.group.position.set(x, y, z);

    // Inclinação geológica de 18° na borda da cratera conforme diretriz do GDD
    // 18 graus = 18 * Math.PI / 180 = ~0.314 rad
    this.group.rotation.x = 0.28;
    this.group.rotation.z = -0.15;
    this.group.rotation.y = 0.8;

    // 1. Corpo principal do Scout robótico
    const bodyGeo = new THREE.BoxGeometry(1.6, 0.7, 2.2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      metalness: 0.6,
      roughness: 0.7
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    body.receiveShadow = true;
    this.group.add(body);

    // 2. Painéis Solares cobertos por poeira eletrostática espessa
    const dustPanelTexture = createSolarPanelTexture(true);
    const panelMat = new THREE.MeshStandardMaterial({
      map: dustPanelTexture,
      roughness: 0.9,
      metalness: 0.1
    });

    const panelGeo = new THREE.BoxGeometry(2.4, 0.05, 1.4);
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(0, 1.0, 0);
    panel.castShadow = true;
    this.group.add(panel);

    // Camada física visível de regolito acumulado sobre as asas solares
    const dustLayerGeo = new THREE.PlaneGeometry(2.35, 1.35);
    dustLayerGeo.rotateX(-Math.PI / 2);
    const dustLayerMat = new THREE.MeshStandardMaterial({
      color: 0x5a6067,
      roughness: 0.98,
      metalness: 0.02
    });
    const dustLayer = new THREE.Mesh(dustLayerGeo, dustLayerMat);
    dustLayer.position.set(0, 1.04, 0);
    this.group.add(dustLayer);

    // 3. Mastro com câmera panorâmica e sensores estéreo (desativados)
    const mastGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.2, 8);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.7 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(0.4, 1.5, 0.7);
    this.group.add(mast);

    const cameraHeadGeo = new THREE.BoxGeometry(0.35, 0.2, 0.25);
    const cameraHeadMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.9 });
    const cameraHead = new THREE.Mesh(cameraHeadGeo, cameraHeadMat);
    cameraHead.position.set(0.4, 2.1, 0.7);
    this.group.add(cameraHead);

    // 4. Rodas metálicas presas no regolito fino da borda
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.28, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.8 });

    const wheelOffsets = [
      { x: 1.0, z: 0.7 },
      { x: -1.0, z: 0.7 },
      { x: 1.0, z: -0.7 },
      { x: -1.0, z: -0.7 }
    ];

    wheelOffsets.forEach((pos) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(pos.x, 0.35, pos.z);
      wheel.castShadow = true;
      this.group.add(wheel);
    });

    // 5. LED de emergência piscando lentamente em âmbar
    this.beaconLight = new THREE.PointLight(0xf59e0b, 1.8, 15);
    this.beaconLight.position.set(0, 1.4, -0.6);
    this.group.add(this.beaconLight);

    const ledGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    this.beaconLed = new THREE.Mesh(ledGeo, ledMat);
    this.beaconLed.position.set(0, 1.4, -0.6);
    this.group.add(this.beaconLed);

    // 6. Holograma de alvo interativo para o resgate
    const beaconRingsGeo = new THREE.RingGeometry(1.2, 1.4, 32);
    beaconRingsGeo.rotateX(-Math.PI / 2);
    const beaconRingsMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5
    });
    this.interactionBeacon = new THREE.Mesh(beaconRingsGeo, beaconRingsMat);
    this.interactionBeacon.position.set(0, 0.1, 0);
    this.group.add(this.interactionBeacon);
  }

  /** Atualiza o pulso do LED de emergência e rotação do anel interativo */
  public update(time: number): void {
    // Pisca lentamente em âmbar (senoide suave com pulso)
    const pulse = Math.max(0.1, Math.sin(time * 3.0));
    this.beaconLight.intensity = pulse * 2.2;
    (this.beaconLed.material as THREE.MeshBasicMaterial).color.setRGB(
      0.96 * pulse,
      0.62 * pulse,
      0.05 * pulse
    );

    // Rotação suave do anel holográfico de resgate
    if (this.interactionBeacon) {
      this.interactionBeacon.rotation.z += 0.02;
    }
  }
}
