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
  touchDriveInputs
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isNearRef = useRef<boolean>(false);
  const isNearAirlockRef = useRef<boolean>(false);
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

    // 10. Rover Perdido (LRO-Scout) balanceado para 650m (460.0, y, 460.0)
    const targetX = 460.0;
    const targetZ = 460.0;
    const targetY = terrain.getHeight(targetX, targetZ);
    const lostRover = new LostRover(targetX, targetY, targetZ);
    lostRover.interactionBeacon.userData = { actionId: 'SCOUT_DATA', type: 'scout' };
    scene.add(lostRover.group);

    // Callback de disparo por Gaze Fuse (0.8s) ou Toque Direto
    const handleTriggerAction = (actionId: string) => {
      soundManager.playUiBeep(920, 0.05);
      switch (actionId) {
        case 'ENERGY':
          onRedirectEnergy();
          break;
        case 'OXYGEN':
          onRefillSuitOxygen();
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
        case 'SCOUT_DATA':
          onExtractDataModule();
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
          : [...station.getExteriorInteractiveObjects(), lostRover.interactionBeacon];
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
          if (isNearRef.current) {
            onExtractDataModule();
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
        // Trepidação leve da cabine em emergências ativas
        const isEmergencyActive = baseInteriorRef.current.ledState === 'EMERGENCY';
        const shakeX = isEmergencyActive ? Math.sin(elapsedTime * 28.0) * 0.018 : 0;
        const shakeY = isEmergencyActive ? Math.cos(elapsedTime * 34.0) * 0.015 : 0;

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

        // Rotação das rodas, esterçamento e luzes de freio
        playerRover.rotateWheels((roverPhysics.currentSpeedKmh / 3.6) * delta);
        playerRover.updateSteering(mergedInputs.left ? 1 : mergedInputs.right ? -1 : 0, speedKmh, delta);
        playerRover.setBraking(mergedInputs.brake);

        // Áudio procedural do motor modulado pela velocidade
        soundManager.updateMotorSpeed(speedKmh, mergedInputs.forward);

        // Acompanhamento das sombras do sol no rover
        skyAndLighting.updateSunShadowTarget(roverPhysics.position);

        // Telemetria dupla: Relação com LRO-Scout e com a Base
        const nav = calculateNavTelemetry(roverPhysics.position, lostRover.targetPosition);

        const isNear = nav.distanceToTargetM <= 15;
        if (isNear !== isNearRef.current) {
          isNearRef.current = isNear;
          onNearLostRoverChange(isNear);
        }

        // Deteção de proximidade (< 4.0m) da porta/escotilha exterior da base Welwitschia (z = 20.2m)
        const distToAirlock = Math.hypot(roverPhysics.position.x - 0, roverPhysics.position.z - 20.2);
        const isNearAirlock = distToAirlock <= 4.0;
        if (isNearAirlock !== isNearAirlockRef.current) {
          isNearAirlockRef.current = isNearAirlock;
          onNearBaseAirlockChange?.(isNearAirlock);
        }

        // Foco de olhar Gaze Fuse (0.8s) ativo no exterior para a porta da base e para o LRO-Scout
        vrManager.updateGaze(delta, [
          ...station.getExteriorInteractiveObjects(),
          lostRover.interactionBeacon
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
