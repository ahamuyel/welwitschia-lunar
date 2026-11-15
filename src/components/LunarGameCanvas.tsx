/**
 * Welwitschia Lunar - Viewport 3D Three.js com Post-Processing e Física Avançada
 * EffectComposer com UnrealBloomPass, ACESFilmicToneMapping, partículas balísticas de rodas
 * no vácuo lunar e sistema de colisão física real com resposta mecânica e ricochete.
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { GameState, TelemetryData, CameraViewMode } from '../types/game';
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
  onToggleHeadlights
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isNearRef = useRef<boolean>(false);
  const gameStateRef = useRef<GameState>(gameState);
  const cameraModeRef = useRef<CameraViewMode>(cameraMode);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Inicialização do Three.js WebGLRenderer com ACESFilmicToneMapping
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    // 2. Cena & Câmera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.2,
      6000
    );

    // 3. Post-Processing Pipeline (EffectComposer + UnrealBloomPass sutil)
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.35, // Intensidade do bloom (sutil para faróis e cúpula)
      0.45, // Raio
      0.82  // Limiar de luminância
    );
    composer.addPass(bloomPass);

    // 4. Iluminação Astronômica Realista e Céu
    const skyAndLighting = new SkyAndLighting(scene);

    // 5. Terreno Lunar Procedural (2500m x 2500m com bump map de alta frequência e colisores)
    const terrain = new LunarTerrain();
    scene.add(terrain.mesh);
    scene.add(terrain.rocksGroup);
    scene.add(terrain.iceGroup);

    // 6. Sistema de Partículas da Tempestade de Regolito e Sistema de Poeira Balística das Rodas
    const dustStorm = new DustStormSystem(scene);
    const wheelDust = new WheelDustSystem(scene);

    // 7. Estação Welwitschia na origem (0, 0, 0)
    const baseAltitude = terrain.getHeight(0, 0);
    const station = new WelwitschiaStation(baseAltitude);
    scene.add(station.group);

    // 8. Rover do Jogador (inicialmente posicionado na saída da escotilha)
    const roverInitialPos = new THREE.Vector3(0, baseAltitude + 0.52, 22.0);
    const playerRover = new PlayerRover();
    scene.add(playerRover.group);

    const roverPhysics = new RoverPhysics(terrain, roverInitialPos, 0.78);

    // 9. Rover Perdido (LRO-Scout) balanceado para 650m (460.0, y, 460.0)
    const targetX = 460.0;
    const targetZ = 460.0;
    const targetY = terrain.getHeight(targetX, targetZ);
    const lostRover = new LostRover(targetX, targetY, targetZ);
    scene.add(lostRover.group);

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
    let cameraCockpitPos = new THREE.Vector3();
    let cameraFollowPos = new THREE.Vector3();

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

      // 3. Atualização de partículas das rodas no vácuo lunar
      wheelDust.update(delta);

      // 4. Controle da Tempestade de Poeira (Estado 4)
      const isStorm = currentGameState === 'STATE_STORM_DILEMMA';
      dustStorm.setActive(isStorm);
      skyAndLighting.setStormFog(isStorm, 0.025);
      if (isStorm) {
        dustStorm.update(delta, roverPhysics.position);
      }

      // 5. Execução dos Estados da Máquina
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
        camera.position.set(0, baseAltitude + 3.8, 5.0);
        camera.lookAt(0, baseAltitude + 3.0, 0);
        playerRover.group.visible = false;
      } else if (
        currentGameState === 'STATE_ROVER_EXPLORATION' ||
        currentGameState === 'STATE_STORM_DILEMMA'
      ) {
        playerRover.group.visible = true;

        // Atualização da física com detecção de colisão real
        const {
          speedKmh,
          headingDeg,
          triggeredHighSpeedAlert,
          sufferedRockDamage,
          sufferedCollision
        } = roverPhysics.update(delta, inputs, isStorm);

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
          wheelDust.emitFromWheels(wheelWorldPos, roverPhysics.velocity, inputs.forward, speedKmh);
        }

        // Aplica transformações físicas na malha do PlayerRover
        playerRover.group.position.copy(roverPhysics.position);
        playerRover.group.quaternion.copy(roverPhysics.orientationQuaternion);

        // Rotação das rodas, esterçamento e acionamento de luzes de freio
        playerRover.rotateWheels((roverPhysics.currentSpeedKmh / 3.6) * delta);
        playerRover.updateSteering(inputs.left ? 1 : inputs.right ? -1 : 0, speedKmh, delta);
        playerRover.setBraking(inputs.brake);

        // Áudio procedural do motor modulado pela velocidade
        soundManager.updateMotorSpeed(speedKmh, inputs.forward);

        // Acompanhamento das sombras do sol no rover
        skyAndLighting.updateSunShadowTarget(roverPhysics.position);

        // Telemetria dupla: Relação com LRO-Scout e com a Base
        const nav = calculateNavTelemetry(roverPhysics.position, lostRover.targetPosition);

        const isNear = nav.distanceToTargetM <= 15;
        if (isNear !== isNearRef.current) {
          isNearRef.current = isNear;
          onNearLostRoverChange(isNear);
        }

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

        // Posicionamento da Câmera (Cockpit vs 3ª Pessoa)
        if (currentCameraMode === 'COCKPIT') {
          playerRover.cockpitCameraNode.getWorldPosition(cameraCockpitPos);
          camera.position.copy(cameraCockpitPos);

          const forwardWorld = new THREE.Vector3(0, 0, 1)
            .applyQuaternion(roverPhysics.orientationQuaternion)
            .normalize();
          const lookTarget = cameraCockpitPos.clone().add(forwardWorld.multiplyScalar(15));
          camera.lookAt(lookTarget);
        } else {
          playerRover.followCameraNode.getWorldPosition(cameraFollowPos);
          camera.position.lerp(cameraFollowPos, Math.min(1.0, delta * 8.0));

          const lookTarget = roverPhysics.position.clone().add(new THREE.Vector3(0, 1.2, 0));
          camera.lookAt(lookTarget);
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
