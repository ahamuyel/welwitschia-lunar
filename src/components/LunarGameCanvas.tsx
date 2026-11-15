/**
 * Welwitschia Lunar - Viewport 3D Three.js com Post-Processing, Física Avançada e WebVR
 * Equipe Mochileiros da Galáxia (NASA Space Apps Angola)
 * - Suporte a Modo VR Imersivo com calibração de giroscópio e Gaze Fuse (0.85s)
 * - Terminais Holográficos 3D interativos no interior da Cúpula (Código do Edgar)
 * - Exploração do terreno de 2500m x 2500m com física de condução do Rover e Cockpit VR (Código do Alberto)
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type {
  GameState,
  TelemetryData,
  CameraViewMode,
  DomeInteractions,
  ResourceState,
  BaseInteriorState
} from '../types/game';
import { LunarTerrain } from '../world/LunarTerrain';
import { SkyAndLighting } from '../world/SkyAndLighting';
import { DustStormSystem } from '../world/DustStormSystem';
import { WheelDustSystem } from '../world/WheelDustSystem';
import { WelwitschiaStation } from '../entities/WelwitschiaStation';
import { PlayerRover } from '../entities/PlayerRover';
import { LostRover } from '../entities/LostRover';
import { RoverPhysics, type RoverInputs } from '../physics/RoverPhysics';
import { soundManager } from '../audio/SoundManager';
import { calculateNavTelemetry } from '../state/telemetry';
import { VRManager } from '../vr/VRManager';

export interface TouchDriveInputs {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  brake: boolean;
}

interface LunarGameCanvasProps {
  gameState: GameState;
  onUpdateTelemetry: (telemetry: TelemetryData) => void;
  onHighSpeedAlert: () => void;
  onCollisionAlert: () => void;
  onRockDamage: () => void;
  onNearLostRoverChange: (isNear: boolean) => void;
  onExtractDataModule: () => void;
  cameraMode: CameraViewMode;
  onToggleCamera: () => void;
  onToggleHeadlights: () => void;

  // Suporte VR & Interações da Cúpula 3D
  isVRActive: boolean;
  onToggleVR?: () => void;
  domeInteractions: DomeInteractions;
  resources: ResourceState;
  baseInterior: BaseInteriorState;
  onRedirectEnergy: () => void;
  onRefillSuitOxygen: () => void;
  onViewBriefing: () => void;
  onOpenAirlock: () => void;
  onResolveEmergencyChoice: (choice: 'A' | 'B') => void;
  onCalibrateValve: (valveIndex: 1 | 2) => void;
  onCycleHologram: () => void;
  onNearBaseAirlockChange?: (isNear: boolean) => void;
  onEnterBase?: () => void;
  onMineIce?: () => void;
  onProcessIceToWater?: () => void;
  onReactivateScout?: () => void;
  onInstallSeismograph?: () => void;
  onNearIceDepositChange?: (isNear: boolean) => void;
  onNearSeismographChange?: (isNear: boolean) => void;
  touchDriveInputs?: TouchDriveInputs;
}

export const LunarGameCanvas: React.FC<LunarGameCanvasProps> = ({
  gameState,
  onUpdateTelemetry,
  onHighSpeedAlert,
  onCollisionAlert,
  onRockDamage,
  onNearLostRoverChange,
  onExtractDataModule,
  cameraMode,
  onToggleCamera,
  onToggleHeadlights,
  isVRActive,
  domeInteractions,
  resources,
  baseInterior,
  onRedirectEnergy,
  onRefillSuitOxygen,
  onViewBriefing,
  onOpenAirlock,
  onResolveEmergencyChoice,
  onCalibrateValve,
  onCycleHologram,
  onNearBaseAirlockChange,
  onEnterBase,
  onMineIce,
  onProcessIceToWater,
  onReactivateScout,
  onInstallSeismograph,
  onNearIceDepositChange,
  onNearSeismographChange,
  touchDriveInputs
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isNearRef = useRef<boolean>(false);
  const isNearAirlockRef = useRef<boolean>(false);
  const isNearIceRef = useRef<boolean>(false);
  const isNearSeismographRef = useRef<boolean>(false);
  const gameStateRef = useRef<GameState>(gameState);
  const cameraModeRef = useRef<CameraViewMode>(cameraMode);
  const isVRActiveRef = useRef<boolean>(isVRActive);
  const domeInteractionsRef = useRef<DomeInteractions>(domeInteractions);
  const resourcesRef = useRef<ResourceState>(resources);
  const baseInteriorRef = useRef<BaseInteriorState>(baseInterior);
  const touchDriveInputsRef = useRef<TouchDriveInputs | undefined>(touchDriveInputs);

  const vrManagerRef = useRef<VRManager | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    gameStateRef.current = gameState;
    // Sempre que houver troca de ambiente (interior <-> exterior), liga explicitamente camera + canvas e reaplica o modo VR/360°
    if (vrManagerRef.current && cameraRef.current && rendererRef.current) {
      vrManagerRef.current.attachCamera(cameraRef.current, rendererRef.current.domElement);
      vrManagerRef.current.setVRMode(isVRActiveRef.current);
    }
  }, [gameState]);

  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);

  useEffect(() => {
    isVRActiveRef.current = isVRActive;
    if (vrManagerRef.current) {
      vrManagerRef.current.setVRMode(isVRActive);
    }
  }, [isVRActive]);

  useEffect(() => {
    domeInteractionsRef.current = domeInteractions;
  }, [domeInteractions]);

  useEffect(() => {
    resourcesRef.current = resources;
  }, [resources]);

  useEffect(() => {
    baseInteriorRef.current = baseInterior;
  }, [baseInterior]);

  useEffect(() => {
    touchDriveInputsRef.current = touchDriveInputs;
  }, [touchDriveInputs]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Inicialização do Three.js WebGLRenderer otimizado para Mobile 60 FPS (pixelRatio máx 1.75)
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. Cena & Câmera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.15,
      6000
    );
    scene.add(camera);
    cameraRef.current = camera;

    // 3. VR Manager Unificado (Head-Tracking, Quaternions calibrados, Gaze Fuse 0.8s e Controlo 360° com setPointerCapture)
    const vrManager = new VRManager(camera, renderer.domElement);
    vrManager.setVRMode(isVRActiveRef.current);
    vrManagerRef.current = vrManager;

    // 4. Post-Processing Pipeline (EffectComposer + UnrealBloomPass sutil)
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.35,
      0.45,
      0.82
    );
    composer.addPass(bloomPass);

    // 5. Iluminação Astronômica Realista e Céu
    const skyAndLighting = new SkyAndLighting(scene);

    // 6. Terreno Lunar Procedural (2500m x 2500m com bump map de alta frequência e colisores)
    const terrain = new LunarTerrain();
    scene.add(terrain.mesh);
    scene.add(terrain.rocksGroup);
    scene.add(terrain.iceGroup);

    // 7. Sistema de Partículas da Tempestade e Poeira Balística das Rodas
    const dustStorm = new DustStormSystem(scene);
    const wheelDust = new WheelDustSystem(scene);

    // 8. Estação Welwitschia na origem com Terminais Holográficos Interativos 3D
    const baseAltitude = terrain.getHeight(0, 0);
    const station = new WelwitschiaStation(baseAltitude);
    scene.add(station.group);

    // 9. Rover do Jogador (inicialmente posicionado na baía exterior da escotilha)
    const roverInitialPos = new THREE.Vector3(0, baseAltitude + 0.52, 24.5);
    const playerRover = new PlayerRover();
    scene.add(playerRover.group);

    const roverPhysics = new RoverPhysics(terrain, roverInitialPos, 0.78);

    // 10. Missão Paralela A: Rover Perdido (LRO-Scout) numa cratera a ~45m da base (30.0, y, 54.0) com SOS âmbar
    const targetX = 30.0;
    const targetZ = 54.0;
    const targetY = terrain.getHeight(targetX, targetZ);
    const lostRover = new LostRover(targetX, targetY, targetZ);
    lostRover.interactionBeacon.userData = { actionId: 'SCOUT_DATA', type: 'scout' };
    scene.add(lostRover.group);

    // 11. Atividade Principal ISRU: Depósito de Gelo Lunar Bruto na Cratera Sombreada (-28.0, y, 48.0)
    const icePos = new THREE.Vector3(-28.0, terrain.getHeight(-28.0, 48.0), 48.0);
    const iceDepositGroup = new THREE.Group();
    iceDepositGroup.position.copy(icePos);

    const iceCrystalMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.65,
      transmission: 0.72,
      transparent: true,
      opacity: 0.88,
      roughness: 0.15
    });
    const crystalOffsets = [
      { x: 0, z: 0, h: 1.55, r: 0.48, rotZ: 0.1 },
      { x: -0.65, z: 0.35, h: 1.1, r: 0.36, rotZ: -0.25 },
      { x: 0.6, z: -0.3, h: 1.2, r: 0.38, rotZ: 0.22 },
      { x: 0.2, z: 0.65, h: 0.9, r: 0.3, rotZ: -0.15 }
    ];
    crystalOffsets.forEach((co) => {
      const cGeo = new THREE.ConeGeometry(co.r, co.h, 6);
      const cMesh = new THREE.Mesh(cGeo, iceCrystalMat);
      cMesh.position.set(co.x, co.h * 0.45, co.z);
      cMesh.rotation.z = co.rotZ;
      iceDepositGroup.add(cMesh);
    });

    const iceRingGeo = new THREE.RingGeometry(1.6, 1.95, 32);
    iceRingGeo.rotateX(-Math.PI / 2);
    const iceRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75
    });
    const iceInteractionRing = new THREE.Mesh(iceRingGeo, iceRingMat);
    iceInteractionRing.position.set(0, 0.14, 0);
    iceInteractionRing.userData = { actionId: 'MINE_ICE', type: 'ice_deposit' };
    iceDepositGroup.add(iceInteractionRing);

    const iceLight = new THREE.PointLight(0x38bdf8, 2.4, 14);
    iceLight.position.set(0, 1.8, 0);
    iceDepositGroup.add(iceLight);
    scene.add(iceDepositGroup);

    // 12. Missão Paralela B: Sismógrafo Lunar Artemis na borda elevada da cratera (0.0, y, 66.0)
    const seismoPos = new THREE.Vector3(0.0, terrain.getHeight(0.0, 66.0), 66.0);
    const seismographGroup = new THREE.Group();
    seismographGroup.position.copy(seismoPos);

    // Baliza/Feixe vertical ciano para localizar o ponto de instalação do Sismógrafo
    const beamGeo = new THREE.CylinderGeometry(0.18, 0.45, 16, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const seismoBeam = new THREE.Mesh(beamGeo, beamMat);
    seismoBeam.position.set(0, 8.0, 0);
    seismographGroup.add(seismoBeam);

    // Sensor Sísmico Lunar Artemis (cúpula dourada Kapton + 3 pés + antena para Luanda)
    const domeSensorGeo = new THREE.CylinderGeometry(0.45, 0.58, 0.55, 16);
    const domeSensorMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.88,
      roughness: 0.22
    });
    const domeSensor = new THREE.Mesh(domeSensorGeo, domeSensorMat);
    domeSensor.position.set(0, 0.45, 0);
    seismographGroup.add(domeSensor);

    const seismoRodGeo = new THREE.CylinderGeometry(0.03, 0.04, 1.3, 8);
    const seismoRod = new THREE.Mesh(seismoRodGeo, domeSensorMat);
    seismoRod.position.set(0, 1.15, 0);
    seismographGroup.add(seismoRod);

    const seismoTipGeo = new THREE.SphereGeometry(0.12, 10, 10);
    const seismoTipMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const seismoTip = new THREE.Mesh(seismoTipGeo, seismoTipMat);
    seismoTip.position.set(0, 1.85, 0);
    seismographGroup.add(seismoTip);

    const seismoRingGeo = new THREE.RingGeometry(1.5, 1.85, 32);
    seismoRingGeo.rotateX(-Math.PI / 2);
    const seismoRingMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75
    });
    const seismoInteractionRing = new THREE.Mesh(seismoRingGeo, seismoRingMat);
    seismoInteractionRing.position.set(0, 0.14, 0);
    seismoInteractionRing.userData = { actionId: 'INSTALL_SEISMOGRAPH', type: 'seismograph' };
    seismographGroup.add(seismoInteractionRing);
    scene.add(seismographGroup);

    // Callback de disparo por Gaze Fuse (0.8s) ou Toque Direto
    const handleTriggerAction = (actionId: string) => {
      soundManager.playUiBeep(920, 0.05);
      switch (actionId) {
        case 'ENERGY':
          onRedirectEnergy();
          break;
        case 'OXYGEN':
          if ((resourcesRef.current.rawIce ?? 0) > 0 && onProcessIceToWater) {
            onProcessIceToWater();
          } else {
            onRefillSuitOxygen();
          }
          break;
        case 'BRIEFING':
          onViewBriefing();
          break;
        case 'AIRLOCK':
          onOpenAirlock();
          break;
        case 'DECISION_A':
          onResolveEmergencyChoice('A');
          break;
        case 'DECISION_B':
          onResolveEmergencyChoice('B');
          break;
        case 'O2_VALVE_1':
          onCalibrateValve(1);
          break;
        case 'O2_VALVE_2':
          onCalibrateValve(2);
          break;
        case 'HOLOGRAM_DISCOVERY':
          onCycleHologram();
          break;
        case 'MINE_ICE':
          onMineIce?.();
          break;
        case 'INSTALL_SEISMOGRAPH':
          onInstallSeismograph?.();
          break;
        case 'SCOUT_DATA':
          if (onReactivateScout) {
            onReactivateScout();
          } else {
            onExtractDataModule();
          }
          break;
        case 'ENTER_BASE':
          onEnterBase?.();
          break;
      }
    };

    vrManager.setGazeTriggerCallback((obj) => {
      const actionId = obj.userData?.actionId;
      if (actionId) {
        handleTriggerAction(actionId);
      }
    });

    vrManager.setTapCallback((clientX, clientY) => {
      const currentSt = gameStateRef.current;
      const interactables: THREE.Object3D[] =
        currentSt === 'STATE_DOME_MANAGEMENT'
          ? station.getInteractiveObjects()
          : [
              ...station.getExteriorInteractiveObjects(),
              lostRover.interactionBeacon,
              iceInteractionRing,
              seismoInteractionRing
            ];
      const clicked = vrManager.performClickRaycast(clientX, clientY, interactables);
      if (clicked?.userData?.actionId) {
        handleTriggerAction(clicked.userData.actionId);
      }
    });

    // Entradas do teclado
    const inputs: RoverInputs = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      brake: false
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          inputs.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          inputs.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          inputs.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          inputs.right = true;
          break;
        case 'Space':
          inputs.brake = true;
          e.preventDefault();
          break;
        case 'KeyL':
          onToggleHeadlights();
          playerRover.toggleHeadlights();
          break;
        case 'KeyC':
          onToggleCamera();
          break;
        case 'KeyE':
          if (isNearIceRef.current && onMineIce) {
            onMineIce();
          } else if (isNearSeismographRef.current && onInstallSeismograph) {
            onInstallSeismograph();
          } else if (isNearRef.current) {
            if (onReactivateScout) {
              onReactivateScout();
            } else {
              onExtractDataModule();
            }
          }
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          inputs.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          inputs.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          inputs.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          inputs.right = false;
          break;
        case 'Space':
          inputs.brake = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Redimensionamento de tela
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      composer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Loop de Renderização e Animação
    let lastTime = performance.now();
    let startTime = performance.now();
    let animationFrameId: number;
    let orbitAngle = 0;
    const cameraCockpitPos = new THREE.Vector3();
    const cameraFollowPos = new THREE.Vector3();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.08);
      lastTime = now;
      const elapsedTime = (now - startTime) / 1000;

      const currentGameState = gameStateRef.current;
      const currentCameraMode = cameraModeRef.current;

      // 1. Rotação suave da Terra no horizonte
      skyAndLighting.updateEarthRotation(delta);

      // 2. Animação de LED do rover perdido, antena e estroboscópio da estação
      lostRover.update(elapsedTime);
      playerRover.updateAntenna(elapsedTime);
      station.update(elapsedTime, delta);

      // Atualiza displays holográficos 3D e estações da cúpula com o estado dos recursos e emergências
      station.updateTerminals(domeInteractionsRef.current, resourcesRef.current, baseInteriorRef.current);

      // 3. Atualização de partículas das rodas no vácuo lunar
      wheelDust.update(delta);

      // 4. Controle da Tempestade de Poeira (Estado 4)
      const isStorm = currentGameState === 'STATE_STORM_DILEMMA';
      dustStorm.setActive(isStorm);
      skyAndLighting.setStormFog(isStorm, 0.025);
      if (isStorm) {
        dustStorm.update(delta, roverPhysics.position);
      }

      // 5. Execução dos Estados da Máquina com Imersão WebVR & Exploração de Terreno
      if (currentGameState === 'STATE_PROLOGUE') {
        orbitAngle += delta * 0.15;
        const orbitRadius = 65;
        camera.position.set(
          Math.cos(orbitAngle) * orbitRadius,
          baseAltitude + 16,
          Math.sin(orbitAngle) * orbitRadius
        );
        camera.lookAt(0, baseAltitude + 4, 0);

        playerRover.group.visible = true;
        playerRover.group.position.copy(roverPhysics.position);
        playerRover.group.quaternion.copy(roverPhysics.orientationQuaternion);
      } else if (currentGameState === 'STATE_DOME_MANAGEMENT') {
        // --- INTERIOR DA BASE EM REALIDADE VIRTUAL / 360° (CÓDIGO DO EDGAR) ---
        // Trepidação da cabine em emergências ativas, sacrifício de integridade (HULL_SPARKS_SHAKE) ou Falha por Indecisão
        const sideEf = baseInteriorRef.current.activeSideEffect;
        const isShakeActive =
          baseInteriorRef.current.ledState === 'EMERGENCY' ||
          sideEf === 'HULL_SPARKS_SHAKE' ||
          sideEf === 'INDECISION_ALARM';
        const shakeAmp = sideEf === 'INDECISION_ALARM' ? 0.035 : 0.022;
        const shakeX = isShakeActive ? Math.sin(elapsedTime * 32.0) * shakeAmp : 0;
        const shakeY = isShakeActive ? Math.cos(elapsedTime * 38.0) * (shakeAmp * 0.85) : 0;

        // Posição de primeira pessoa no centro de comando da cúpula
        camera.position.set(shakeX, baseAltitude + 2.3 + shakeY, 0);

        // Orientação da cabeça pelo giroscópio (Head-Tracking) ou manual
        const headQuat = vrManager.getHeadOrientation();
        camera.quaternion.copy(headQuat);

        // Foco de olhar Gaze Fuse ativo nos terminais 3D, painéis de decisão e válvulas
        vrManager.updateGaze(delta, station.getInteractiveObjects());

        playerRover.group.visible = false;
      } else if (
        currentGameState === 'STATE_ROVER_EXPLORATION' ||
        currentGameState === 'STATE_STORM_DILEMMA'
      ) {
        playerRover.group.visible = true;

        // Combina teclado físico com botões táteis virtuais mobile
        const tInputs = touchDriveInputsRef.current;
        const mergedInputs: RoverInputs = {
          forward: inputs.forward || !!tInputs?.forward,
          backward: inputs.backward || !!tInputs?.backward,
          left: inputs.left || !!tInputs?.left,
          right: inputs.right || !!tInputs?.right,
          brake: inputs.brake || !!tInputs?.brake
        };

        // Atualização da física com detecção de colisão real
        const {
          speedKmh,
          headingDeg,
          triggeredHighSpeedAlert,
          sufferedRockDamage,
          sufferedCollision
        } = roverPhysics.update(delta, mergedInputs, isStorm);

        // Resposta a eventos físicos
        if (triggeredHighSpeedAlert) {
          onHighSpeedAlert();
        }

        if (sufferedCollision) {
          soundManager.playRockImpact();
          if (sufferedRockDamage) {
            onRockDamage();
            onCollisionAlert();
          }
        }

        // Emissão balística de partículas pelas 6 rodas no solo
        if (roverPhysics.isGrounded && roverPhysics.currentSpeedKmh > 1.8) {
          const wheelWorldPos = playerRover.getWheelWorldPositions();
          wheelDust.emitFromWheels(wheelWorldPos, roverPhysics.velocity, mergedInputs.forward, speedKmh);
        }

        // Aplica transformações físicas na malha do PlayerRover
        playerRover.group.position.copy(roverPhysics.position);
        playerRover.group.quaternion.copy(roverPhysics.orientationQuaternion);

        // Rotação das rodas, esterçamento, luzes de freio e intensificação automática na noite lunar / sombras
        playerRover.rotateWheels((roverPhysics.currentSpeedKmh / 3.6) * delta);
        playerRover.updateSteering(mergedInputs.left ? 1 : mergedInputs.right ? -1 : 0, speedKmh, delta);
        playerRover.setBraking(mergedInputs.brake);
        const isShadowedOrNight =
          isStorm ||
          roverPhysics.position.y < -1.0 ||
          baseInteriorRef.current.narrativeAct === 2;
        playerRover.updateLightingEnvironment(elapsedTime, isShadowedOrNight);

        // Áudio procedural do motor modulado pela velocidade
        soundManager.updateMotorSpeed(speedKmh, mergedInputs.forward);

        // Acompanhamento das sombras do sol no rover
        skyAndLighting.updateSunShadowTarget(roverPhysics.position);

        // Telemetria dupla: Relação com LRO-Scout e com a Base
        lostRover.setReactivated(!!baseInteriorRef.current.parallelMissionScoutDone);
        const nav = calculateNavTelemetry(roverPhysics.position, lostRover.targetPosition);

        const isNear = nav.distanceToTargetM <= 4.5;
        if (isNear !== isNearRef.current) {
          isNearRef.current = isNear;
          onNearLostRoverChange(isNear);
        }

        // Proximidade (< 4.8m) ao Depósito de Gelo Lunar Bruto na Cratera Sombreada (-28, 48)
        const distToIce = Math.hypot(roverPhysics.position.x - icePos.x, roverPhysics.position.z - icePos.z);
        const isNearIce = distToIce <= 4.8;
        if (isNearIce !== isNearIceRef.current) {
          isNearIceRef.current = isNearIce;
          onNearIceDepositChange?.(isNearIce);
        }

        // Proximidade (< 4.8m) ao Sismógrafo Lunar Artemis na borda da cratera (0, 66)
        const distToSeismo = Math.hypot(roverPhysics.position.x - seismoPos.x, roverPhysics.position.z - seismoPos.z);
        const isNearSeismo = distToSeismo <= 4.8;
        if (isNearSeismo !== isNearSeismographRef.current) {
          isNearSeismographRef.current = isNearSeismo;
          onNearSeismographChange?.(isNearSeismo);
        }

        // Animação suave dos anéis do Depósito de Gelo e do Sismógrafo Artemis
        iceInteractionRing.rotation.z = elapsedTime * 0.8;
        seismoInteractionRing.rotation.z = -elapsedTime * 0.8;
        if (baseInteriorRef.current.parallelMissionSeismographDone) {
          seismoTipMat.color.setHex(0x10b981);
          seismoRingMat.color.setHex(0x10b981);
        }

        // Deteção de proximidade (< 4.0m) da porta/escotilha exterior da base Welwitschia (z = 20.2m)
        const distToAirlock = Math.hypot(roverPhysics.position.x - 0, roverPhysics.position.z - 20.2);
        const isNearAirlock = distToAirlock <= 4.0;
        if (isNearAirlock !== isNearAirlockRef.current) {
          isNearAirlockRef.current = isNearAirlock;
          onNearBaseAirlockChange?.(isNearAirlock);
        }

        // Foco de olhar Gaze Fuse (0.8s) ativo no exterior para a porta da base, Depósito de Gelo, LRO-Scout e Sismógrafo
        vrManager.updateGaze(delta, [
          ...station.getExteriorInteractiveObjects(),
          lostRover.interactionBeacon,
          iceInteractionRing,
          seismoInteractionRing
        ]);

        onUpdateTelemetry({
          speedKmh,
          headingDeg,
          distanceToTargetM: nav.distanceToTargetM,
          azimuthToTargetDeg: nav.azimuthToTargetDeg,
          distanceToBaseM: nav.distanceToBaseM,
          azimuthToBaseDeg: nav.azimuthToBaseDeg,
          altitudeM: Math.round(roverPhysics.position.y),
          coordinates: {
            x: Math.round(roverPhysics.position.x),
            y: Math.round(roverPhysics.position.y),
            z: Math.round(roverPhysics.position.z)
          },
          isGpsActive: !isStorm || nav.distanceToTargetM <= 60,
          isHeadlightsOn: playerRover.getHeadlightsStatus(),
          isInStorm: isStorm,
          stormChoiceMade: false,
          isNearLostRover: isNear,
          isNearIceDeposit: isNearIce,
          isNearSeismograph: isNearSeismo,
          distanceToIceDepositM: Math.round(distToIce),
          distanceToSeismographM: Math.round(distToSeismo),
          highSpeedTimer: roverPhysics.highSpeedDuration,
          cameraMode: currentCameraMode
        });

        // --- CÂMARA NO EXTERIOR LUNAR (MODO VR & MODO 360°) ---
        if (vrManager.isVRActive || currentCameraMode === 'COCKPIT') {
          playerRover.cockpitCameraNode.getWorldPosition(cameraCockpitPos);
          camera.position.copy(cameraCockpitPos);

          // Tanto em VR (giroscópio) como em Cockpit 360° (toque/rato), combina o chassi do rover com a orientação de olhar
          const headQuat = vrManager.getHeadOrientation();
          camera.quaternion.copy(roverPhysics.orientationQuaternion).multiply(headQuat);
        } else {
          // Terceira Pessoa suave no Modo 360° com suporte a olhar 360° por arrasto
          playerRover.followCameraNode.getWorldPosition(cameraFollowPos);
          camera.position.lerp(cameraFollowPos, Math.min(1.0, delta * 8.0));

          const lookTarget = roverPhysics.position.clone().add(new THREE.Vector3(0, 1.2, 0));
          camera.lookAt(lookTarget);
          const headQuat = vrManager.getHeadOrientation();
          camera.quaternion.multiply(headQuat);
        }
      } else if (currentGameState === 'STATE_RESCUE_AND_ISRU') {
        orbitAngle += delta * 0.1;
        camera.position.set(
          -25 + Math.cos(orbitAngle) * 20,
          baseAltitude + 8,
          Math.sin(orbitAngle) * 20
        );
        camera.lookAt(-16, baseAltitude + 3, 0);

        station.cleanSolarPanels();
      }

      // Renderiza cena com pós-processamento bloom
      composer.render();
    };

    animate();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      soundManager.stopMotor();
      soundManager.stopSonar();
      vrManager.dispose();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
      composer.dispose();
      renderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full overflow-hidden bg-black select-none"
      style={{ touchAction: 'none' }}
    />
  );
};
