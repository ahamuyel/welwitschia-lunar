/**
 * Welwitschia Lunar - Gerenciador Unificado WebVR, Head-Tracking e Controlo 360°
 * Equipe Mochileiros da Galáxia (NASA Space Apps Angola)
 * - Instância única sincronizada entre Interior da Base e Exterior Lunar
 * - Modo VR (isVRActive = true): Giroscópio calibrado (DeviceOrientation) + Gaze Fuse (0.8s)
 * - Modo Normal 360° (isVRActive = false): Giroscópio desativado + arrasto tátil fluido com setPointerCapture
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
  private domElement: HTMLElement | null = null;
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
  private activePointerId: number | null = null;
  private lastTouchX: number = 0;
  private lastTouchY: number = 0;
  private dragDistance: number = 0;

  // Gaze Fuse (Olhar fixo de 0.80s com anel de progresso circular nítido)
  private raycaster = new THREE.Raycaster();
  private centerVec = new THREE.Vector2(0, 0);
  private gazedObject: THREE.Object3D | null = null;
  private gazeTimer: number = 0;
  private readonly FUSE_DURATION: number = 0.8; // 0.8 segundos

  private onGazeTriggerCallback?: (object: THREE.Object3D) => void;
  private onTapCallback?: (clientX: number, clientY: number) => void;
  private orientationHandler?: (e: DeviceOrientationEvent) => void;

  private boundPointerDown?: (e: PointerEvent) => void;
  private boundPointerMove?: (e: PointerEvent) => void;
  private boundPointerUp?: (e: PointerEvent) => void;

  constructor(camera: THREE.PerspectiveCamera, domElement?: HTMLElement) {
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

    // 2. Ouvinte de Giroscópio e ligação à câmara/canvas
    this.bindGyroEvents();
    this.attachCamera(camera, domElement);
  }

  /**
   * Liga explicitamente o VRManager à câmara ativa e ao canvas 3D (usado na inicialização e troca interior <-> exterior).
   */
  public attachCamera(camera: THREE.PerspectiveCamera, domElement?: HTMLElement): void {
    this.camera = camera;
    if (this.reticleMesh.parent !== this.camera) {
      this.camera.add(this.reticleMesh);
    }
    this.reticleMesh.visible = this.isVRActive;

    if (domElement && domElement !== this.domElement) {
      this.detachDomEvents();
      this.domElement = domElement;
      this.domElement.style.touchAction = 'none';

      this.boundPointerDown = (e: PointerEvent) => {
        if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
        this.activePointerId = e.pointerId;
        try {
          this.domElement?.setPointerCapture(e.pointerId);
        } catch {
          // Ignora se o browser não suportar setPointerCapture para este evento
        }
        this.onPointerDown(e.clientX, e.clientY);
      };

      this.boundPointerMove = (e: PointerEvent) => {
        if (!this.isDragging) return;
        if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;
        this.onPointerMove(e.clientX, e.clientY);
      };

      this.boundPointerUp = (e: PointerEvent) => {
        if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;
        try {
          if (this.domElement?.hasPointerCapture(e.pointerId)) {
            this.domElement.releasePointerCapture(e.pointerId);
          }
        } catch {
          // Ignora
        }
        this.activePointerId = null;
        const wasTap = this.onPointerUp();
        if (wasTap && this.onTapCallback) {
          this.onTapCallback(e.clientX, e.clientY);
        }
      };

      this.domElement.addEventListener('pointerdown', this.boundPointerDown);
      this.domElement.addEventListener('pointermove', this.boundPointerMove);
      this.domElement.addEventListener('pointerup', this.boundPointerUp);
      this.domElement.addEventListener('pointercancel', this.boundPointerUp);
    }
  }

  private detachDomEvents(): void {
    if (!this.domElement) return;
    if (this.boundPointerDown) {
      this.domElement.removeEventListener('pointerdown', this.boundPointerDown);
    }
    if (this.boundPointerMove) {
      this.domElement.removeEventListener('pointermove', this.boundPointerMove);
    }
    if (this.boundPointerUp) {
      this.domElement.removeEventListener('pointerup', this.boundPointerUp);
      this.domElement.removeEventListener('pointercancel', this.boundPointerUp);
    }
  }

  public setTapCallback(cb: (clientX: number, clientY: number) => void): void {
    this.onTapCallback = cb;
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

  private bindGyroEvents(): void {
    this.orientationHandler = (e: DeviceOrientationEvent) => {
      // No Modo 360° (isVRActive === false), ignora completamente leituras do giroscópio
      if (!this.isVRActive) return;
      if (e.alpha !== null && e.beta !== null && e.gamma !== null) {
        if (e.alpha === 0 && e.beta === 0 && e.gamma === 0) return;
        this.deviceAlpha = e.alpha;
        this.deviceBeta = e.beta;
        this.deviceGamma = e.gamma;
        this.isGyroAvailable = true;
      }
    };
    window.addEventListener('deviceorientation', this.orientationHandler, true);
  }

  public dispose(): void {
    this.detachDomEvents();
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

  public setVRMode(active: boolean): void {
    const wasVR = this.isVRActive;
    this.isVRActive = active;
    this.reticleMesh.visible = active;

    if (!active && wasVR && this.camera) {
      // Sincroniza yaw/pitch atuais da câmara ao entrar no Modo Normal 360° para rotação suave sem saltos
      const currentEuler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
      this.yaw = currentEuler.y;
      this.pitch = Math.max(-1.31, Math.min(1.31, currentEuler.x));
    }

    if (active) {
      this.requestIOSPermission();
    } else {
      this.drawProgressArc(0);
      this.gazedObject = null;
      this.gazeTimer = 0;
    }
  }

  public setVRActive(active: boolean): void {
    this.setVRMode(active);
  }

  public toggleVR(): boolean {
    this.setVRMode(!this.isVRActive);
    return this.isVRActive;
  }

  public onPointerDown(clientX: number, clientY: number): void {
    this.isDragging = true;
    this.lastTouchX = clientX;
    this.lastTouchY = clientY;
    this.dragDistance = 0;
  }

  public onPointerMove(clientX: number, clientY: number): void {
    if (!this.isDragging) return;
    const dx = clientX - this.lastTouchX;
    const dy = clientY - this.lastTouchY;
    this.dragDistance += Math.hypot(dx, dy);

    // Rotação horizontal livre 360° (yaw) e vertical -75° a +75° (-1.31 a +1.31 rad)
    const sensitivity = 0.0052;
    this.yaw -= dx * sensitivity;
    this.pitch = Math.max(-1.31, Math.min(1.31, this.pitch - dy * sensitivity));

    this.lastTouchX = clientX;
    this.lastTouchY = clientY;
  }

  public onPointerUp(): boolean {
    const wasTap = this.isDragging && this.dragDistance < 14;
    this.isDragging = false;
    return wasTap;
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
   * Calcula o Quaternion de orientação da câmara:
   * - Modo VR (isVRActive === true): Giroscópio calibrado do Edgar (ou fallback tátil se sem giroscópio)
   * - Modo Normal 360° (isVRActive === false): Controlo tátil/rato 100% fluido (yaw 360°, pitch -75° a +75°)
   */
  public getHeadOrientation(): THREE.Quaternion {
    if (this.isVRActive && this.isGyroAvailable) {
      const alpha = THREE.MathUtils.degToRad(this.deviceAlpha) + this.yaw;
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
   * Atualiza o foco de olhar (Gaze Fuse 0.8s) nos objetos interativos do ambiente ativo (interior ou exterior)
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
    const rect = this.domElement?.getBoundingClientRect();
    const width = rect ? rect.width : window.innerWidth;
    const height = rect ? rect.height : window.innerHeight;
    const x = rect ? clientX - rect.left : clientX;
    const y = rect ? clientY - rect.top : clientY;

    const mouse = new THREE.Vector2((x / width) * 2 - 1, -(y / height) * 2 + 1);
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
