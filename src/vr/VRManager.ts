/**
 * Welwitschia Lunar - Gerenciador WebVR, Head-Tracking e Gaze Fuse
 * Equipe Mochileiros da Galáxia (NASA Space Apps Angola)
 * - Calibração de Giroscópio (DeviceOrientation) com compensação de ecrã mobile
 * - Retículo 3D com fusão por olhar (Gaze Fuse de 0.85s)
 * - Controlo manual tátil/rato quando o giroscópio está inativo
 * - Suporte a visualização no Cockpit e no interior da Cúpula
 */

import * as THREE from 'three';

export interface GazeTarget {
  object: THREE.Object3D;
  actionId: string;
  label: string;
}

export class VRManager {
  public isVRActive: boolean = true; // Padrão imersivo
  public isGyroAvailable: boolean = false;
  public reticleMesh: THREE.Mesh;
  private progressCanvas: HTMLCanvasElement;
  private progressTexture: THREE.CanvasTexture;
  private progressRingMesh: THREE.Mesh;

  private camera: THREE.PerspectiveCamera;
  private euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private q0 = new THREE.Quaternion();
  private q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -90° X
  private targetQuat = new THREE.Quaternion();
  private manualQuat = new THREE.Quaternion();

  private deviceAlpha: number = 0;
  private deviceBeta: number = 0;
  private deviceGamma: number = 0;

  private pitch: number = 0;
  private yaw: number = 0;
  private isDragging: boolean = false;
  private lastTouchX: number = 0;
  private lastTouchY: number = 0;

  // Gaze Fuse (Olhar fixo de 0.80s com anel de progresso circular nítido)
  private raycaster = new THREE.Raycaster();
  private centerVec = new THREE.Vector2(0, 0);
  private gazedObject: THREE.Object3D | null = null;
  private gazeTimer: number = 0;
  private readonly FUSE_DURATION: number = 0.8; // 0.8 segundos

  private onGazeTriggerCallback?: (object: THREE.Object3D) => void;
  private orientationHandler?: (e: DeviceOrientationEvent) => void;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;

    // 1. Criação do Retículo 3D flutuante preso à câmara
    const reticleGeo = new THREE.RingGeometry(0.012, 0.02, 32);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      depthTest: false,
      transparent: true,
      opacity: 0.9
    });
    this.reticleMesh = new THREE.Mesh(reticleGeo, reticleMat);
    this.reticleMesh.position.set(0, 0, -1.5); // 1.5 metros à frente dos olhos
    this.reticleMesh.renderOrder = 999;

    // Anel de Progresso Circular Nítido para o Gaze Fuse (0.8s)
    this.progressCanvas = document.createElement('canvas');
    this.progressCanvas.width = 128;
    this.progressCanvas.height = 128;
    this.progressTexture = new THREE.CanvasTexture(this.progressCanvas);
    const progressGeo = new THREE.PlaneGeometry(0.09, 0.09);
    const progressMat = new THREE.MeshBasicMaterial({
      map: this.progressTexture,
      transparent: true,
      depthTest: false,
      side: THREE.DoubleSide
    });
    this.progressRingMesh = new THREE.Mesh(progressGeo, progressMat);
    this.progressRingMesh.renderOrder = 1000;
    this.reticleMesh.add(this.progressRingMesh);
    this.drawProgressArc(0);

    this.camera.add(this.reticleMesh);

    // 2. Ouvinte de Giroscópio
    this.bindEvents();
  }

  private drawProgressArc(progress: number): void {
    const ctx = this.progressCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 128, 128);
    if (progress <= 0.01) {
      this.progressTexture.needsUpdate = true;
      return;
    }

    // Trilha circular de fundo
    ctx.beginPath();
    ctx.arc(64, 64, 48, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.22)';
    ctx.lineWidth = 10;
    ctx.stroke();

    // Arco de progresso nítido
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + Math.PI * 2 * Math.min(1, progress);
    ctx.beginPath();
    ctx.arc(64, 64, 48, startAngle, endAngle);
    ctx.strokeStyle = progress >= 1.0 ? '#4ade80' : '#00f0ff';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.stroke();

    this.progressTexture.needsUpdate = true;
  }

  private bindEvents(): void {
    this.orientationHandler = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null && e.beta !== null && e.gamma !== null) {
        this.deviceAlpha = e.alpha;
        this.deviceBeta = e.beta;
        this.deviceGamma = e.gamma;
        this.isGyroAvailable = true;
      }
    };
    window.addEventListener('deviceorientation', this.orientationHandler, true);
  }

  public dispose(): void {
    if (this.orientationHandler) {
      window.removeEventListener('deviceorientation', this.orientationHandler, true);
    }
    this.progressTexture.dispose();
    this.reticleMesh.geometry.dispose();
    (this.reticleMesh.material as THREE.Material).dispose();
    this.progressRingMesh.geometry.dispose();
    (this.progressRingMesh.material as THREE.Material).dispose();
  }

  public requestIOSPermission(): void {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function'
    ) {
      (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> })
        .requestPermission()
        .then((resp) => {
          if (resp === 'granted') this.isGyroAvailable = true;
        })
        .catch(() => {});
    }
  }

  public setVRActive(active: boolean): void {
    this.isVRActive = active;
    this.reticleMesh.visible = active;
    if (active) {
      this.requestIOSPermission();
    }
  }

  public toggleVR(): boolean {
    this.setVRActive(!this.isVRActive);
    return this.isVRActive;
  }

  public onPointerDown(clientX: number, clientY: number): void {
    this.isDragging = true;
    this.lastTouchX = clientX;
    this.lastTouchY = clientY;
  }

  public onPointerMove(clientX: number, clientY: number): void {
    if (!this.isDragging) return;
    const dx = clientX - this.lastTouchX;
    const dy = clientY - this.lastTouchY;

    this.yaw -= dx * 0.0035;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch - dy * 0.0035));

    this.lastTouchX = clientX;
    this.lastTouchY = clientY;
  }

  public onPointerUp(): void {
    this.isDragging = false;
  }

  public getScreenAngle(): number {
    if (screen.orientation && typeof screen.orientation.angle === 'number') {
      return screen.orientation.angle;
    }
    if (typeof window.orientation === 'number') {
      return window.orientation;
    }
    return 0;
  }

  /**
   * Calcula o Quaternion de orientação do utilizador (Giroscópio ou Manual)
   */
  public getHeadOrientation(): THREE.Quaternion {
    if (this.isVRActive && this.isGyroAvailable && !this.isDragging) {
      const alpha = THREE.MathUtils.degToRad(this.deviceAlpha);
      const beta = THREE.MathUtils.degToRad(this.deviceBeta);
      const gamma = THREE.MathUtils.degToRad(this.deviceGamma);
      const orient = THREE.MathUtils.degToRad(this.getScreenAngle());

      this.euler.set(beta, alpha, -gamma, 'YXZ');
      this.q0.setFromEuler(this.euler);
      this.q0.multiply(this.q1);
      this.q0.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -orient));
      this.targetQuat.copy(this.q0);
      return this.targetQuat;
    } else {
      this.euler.set(this.pitch, this.yaw, 0, 'YXZ');
      this.manualQuat.setFromEuler(this.euler);
      return this.manualQuat;
    }
  }

  public setGazeTriggerCallback(cb: (object: THREE.Object3D) => void): void {
    this.onGazeTriggerCallback = cb;
  }

  /**
   * Atualiza o foco de olhar (Gaze Fuse) com base nos objetos interativos na cena
   */
  public updateGaze(delta: number, interactables: THREE.Object3D[]): void {
    if (!this.isVRActive) {
      this.reticleMesh.scale.set(1, 1, 1);
      return;
    }

    this.raycaster.setFromCamera(this.centerVec, this.camera);
    const hits = this.raycaster.intersectObjects(interactables, true);
    const hit = hits.find((h) => h.object.visible);

    if (hit) {
      // Procura o objeto raiz com userData válido
      let targetObj: THREE.Object3D | null = hit.object;
      while (targetObj && !targetObj.userData?.actionId && targetObj.parent && targetObj.parent !== targetObj) {
        if (targetObj.userData?.actionId) break;
        targetObj = targetObj.parent;
      }
      if (!targetObj?.userData?.actionId) targetObj = hit.object;

      if (this.gazedObject !== targetObj) {
        this.gazedObject = targetObj;
        this.gazeTimer = 0;
        this.drawProgressArc(0);
      } else {
        this.gazeTimer += delta;
        const progress = Math.max(0, Math.min(1.0, this.gazeTimer / this.FUSE_DURATION));
        const sc = 1.0 + progress * 0.35;
        this.reticleMesh.scale.set(sc, sc, 1);
        this.drawProgressArc(progress);

        const mat = this.reticleMesh.material as THREE.MeshBasicMaterial;
        mat.color.setHex(progress >= 1.0 ? 0x4ade80 : 0xffcb05);

        if (this.gazeTimer >= this.FUSE_DURATION) {
          if (this.onGazeTriggerCallback) {
            this.onGazeTriggerCallback(this.gazedObject);
          }
          this.gazeTimer = -0.55; // Cooldown após disparo
        }
      }
    } else {
      if (this.gazedObject !== null || this.gazeTimer !== 0) {
        this.drawProgressArc(0);
      }
      this.gazedObject = null;
      this.gazeTimer = 0;
      this.reticleMesh.scale.set(1, 1, 1);
      (this.reticleMesh.material as THREE.MeshBasicMaterial).color.setHex(0x00f0ff);
    }
  }

  public performClickRaycast(clientX: number, clientY: number, interactables: THREE.Object3D[]): THREE.Object3D | null {
    const mouse = new THREE.Vector2(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1
    );
    this.raycaster.setFromCamera(mouse, this.camera);
    const hits = this.raycaster.intersectObjects(interactables, true);
    const hit = hits.find((h) => h.object.visible);
    if (!hit) return null;

    let targetObj: THREE.Object3D | null = hit.object;
    while (targetObj && !targetObj.userData?.actionId && targetObj.parent && targetObj.parent !== targetObj) {
      if (targetObj.userData?.actionId) break;
      targetObj = targetObj.parent;
    }
    return targetObj || hit.object;
  }
}
