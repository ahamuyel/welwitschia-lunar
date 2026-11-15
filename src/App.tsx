/**
 * Welwitschia Lunar (We Hitch a Lunar)
 * Equipe Mochileiros da Galáxia (2032 - Programa Artemis / Polo Sul Lunar)
 * Componente Raiz da Aplicação: Conecta Three.js, Física, Máquina de Estados e UI.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameState, ResourceState, TelemetryData, DomeInteractions, MissionReport, CameraViewMode } from './types/game';
import { gameStateManager } from './state/GameStateManager';
import { soundManager } from './audio/SoundManager';
import { LunarGameCanvas } from './components/LunarGameCanvas';
import { WellyCopilot } from './ui/WellyCopilot';
import { PrologueScreen } from './ui/PrologueScreen';
import { DomeManagementScreen } from './ui/DomeManagementScreen';
import { RoverHUD } from './ui/RoverHUD';
import { StormDilemmaModal } from './ui/StormDilemmaModal';
import { RescueAndISRUScreen } from './ui/RescueAndISRUScreen';
import { ControlsHelp } from './ui/ControlsHelp';

export function App() {
  const [gameState, setGameState] = useState<GameState>(gameStateManager.currentState);
  const [resources, setResources] = useState<ResourceState>({ ...gameStateManager.resources });
  const [domeInteractions, setDomeInteractions] = useState<DomeInteractions>({ ...gameStateManager.domeInteractions });
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    speedKmh: 0,
    headingDeg: 45,
    distanceToTargetM: 2000,
    azimuthToTargetDeg: 45,
    distanceToBaseM: 0,
    azimuthToBaseDeg: 180,
    altitudeM: 0,
    coordinates: { x: 0, y: 0, z: 22 },
    isGpsActive: true,
    isHeadlightsOn: true,
    isInStorm: false,
    stormChoiceMade: false,
    isNearLostRover: false,
    highSpeedTimer: 0,
    cameraMode: 'THIRD_PERSON'
  });
  const [wellyTrigger, setWellyTrigger] = useState<string>('ON_START');
  const [isNearLostRover, setIsNearLostRover] = useState<boolean>(false);
  const [missionReport, setMissionReport] = useState<MissionReport | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('THIRD_PERSON');

  const highSpeedWarningCooldown = useRef<boolean>(false);
  const collisionAlertCooldown = useRef<boolean>(false);

  // Inscrição na máquina de estados
  useEffect(() => {
    (window as unknown as { gameStateManager: typeof gameStateManager }).gameStateManager = gameStateManager;
    const unsubState = gameStateManager.subscribeState((newState) => {
      setGameState(newState);
      if (newState === 'STATE_DOME_MANAGEMENT') {
        setWellyTrigger('ON_DOME_ENTER');
      } else if (newState === 'STATE_STORM_DILEMMA') {
        setWellyTrigger('ON_STORM_START');
      } else if (newState === 'STATE_RESCUE_AND_ISRU') {
        setMissionReport(gameStateManager.generateMissionReport());
        setWellyTrigger('ON_ROVER_FOUND');
        setTimeout(() => {
          setWellyTrigger('ON_ISRU_COMPLETE');
        }, 5000);
      }
    });

    const unsubResources = gameStateManager.subscribeResources((newResources) => {
      setResources(newResources);
    });

    return () => {
      unsubState();
      unsubResources();
    };
  }, []);

  // Loop de atualização de recursos e checagem de distância em tempo real
  useEffect(() => {
    let lastTime = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (gameState === 'STATE_ROVER_EXPLORATION' || gameState === 'STATE_STORM_DILEMMA') {
        gameStateManager.updateResources(delta, telemetry.speedKmh, telemetry.isHeadlightsOn);
        gameStateManager.checkStormDistance(telemetry.distanceToTargetM);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [gameState, telemetry.speedKmh, telemetry.isHeadlightsOn, telemetry.distanceToTargetM]);

  // Handlers do Prólogo (Estado 1)
  const handleStartMission = useCallback(() => {
    gameStateManager.setState('STATE_DOME_MANAGEMENT');
  }, []);

  // Handlers da Cúpula (Estado 2)
  const handleRedirectEnergy = useCallback(() => {
    gameStateManager.redirectEnergyToRover();
    setDomeInteractions({ ...gameStateManager.domeInteractions });
  }, []);

  const handleRefillSuitOxygen = useCallback(() => {
    gameStateManager.refillSuitOxygen();
    setDomeInteractions({ ...gameStateManager.domeInteractions });
  }, []);

  const handleViewBriefing = useCallback(() => {
    gameStateManager.viewBriefing();
    setDomeInteractions({ ...gameStateManager.domeInteractions });
  }, []);

  const handleOpenAirlock = useCallback(() => {
    gameStateManager.openAirlock();
    setDomeInteractions({ ...gameStateManager.domeInteractions });
  }, []);

  // Handlers de Telemetria e Alertas (Estado 3 & 4)
  const handleUpdateTelemetry = useCallback((data: TelemetryData) => {
    setTelemetry(data);
  }, []);

  const handleHighSpeedAlert = useCallback(() => {
    if (highSpeedWarningCooldown.current) return;
    highSpeedWarningCooldown.current = true;
    setWellyTrigger('ON_HIGH_SPEED');
    setTimeout(() => {
      highSpeedWarningCooldown.current = false;
    }, 6000);
  }, []);

  const handleCollisionAlert = useCallback(() => {
    if (collisionAlertCooldown.current) return;
    collisionAlertCooldown.current = true;
    setWellyTrigger('ON_COLLISION');
    setTimeout(() => {
      collisionAlertCooldown.current = false;
    }, 4500);
  }, []);

  const handleRockDamage = useCallback(() => {
    gameStateManager.applyRockDamage();
  }, []);

  const handleNearLostRoverChange = useCallback((isNear: boolean) => {
    setIsNearLostRover(isNear);
  }, []);

  const handleToggleHeadlights = useCallback(() => {
    setTelemetry((prev) => ({ ...prev, isHeadlightsOn: !prev.isHeadlightsOn }));
  }, []);

  const handleToggleCamera = useCallback(() => {
    const newMode = gameStateManager.toggleCameraMode();
    setCameraMode(newMode);
    setTelemetry((prev) => ({ ...prev, cameraMode: newMode }));
  }, []);

  // Handlers da Tempestade (Estado 4)
  const handleChooseRetreat = useCallback(() => {
    gameStateManager.chooseStormRetreat();
  }, []);

  const handleChooseAdvance = useCallback(() => {
    gameStateManager.chooseStormAdvance();
  }, []);

  // Handlers do Resgate (Estado 5)
  const handleExtractDataModule = useCallback(() => {
    gameStateManager.extractDataModule();
    const report = gameStateManager.generateMissionReport();
    setMissionReport(report);
  }, []);

  const handleRestartMission = useCallback(() => {
    gameStateManager.resetMission();
    setDomeInteractions({ ...gameStateManager.domeInteractions });
    setMissionReport(null);
    setWellyTrigger('ON_START');
  }, []);

  const handleToggleMute = useCallback(() => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black font-sans select-none">
      {/* 1. Viewport 3D Three.js com Post-Processing e Física Avançada */}
      <LunarGameCanvas
        gameState={gameState}
        onUpdateTelemetry={handleUpdateTelemetry}
        onHighSpeedAlert={handleHighSpeedAlert}
        onCollisionAlert={handleCollisionAlert}
        onRockDamage={handleRockDamage}
        onNearLostRoverChange={handleNearLostRoverChange}
        onExtractDataModule={handleExtractDataModule}
        cameraMode={cameraMode}
        onToggleCamera={handleToggleCamera}
        onToggleHeadlights={handleToggleHeadlights}
      />

      {/* 2. Botão Flutuante de Silenciar Áudio */}
      <button
        onClick={handleToggleMute}
        className="fixed top-4 left-4 z-50 p-2.5 rounded-full bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white shadow-lg backdrop-blur-md cursor-pointer transition-all"
        title={isMuted ? 'Desmutar áudio' : 'Silenciar áudio'}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>

      {/* 3. Copiloto IA Welly (Fila Sequencial, Chat Conversacional Híbrido e Voz) */}
      <WellyCopilot
        currentTrigger={wellyTrigger}
        telemetry={telemetry}
        resources={resources}
        gameState={gameState}
      />

      {/* 4. Telas dos 5 Estados de Jogo */}
      {gameState === 'STATE_PROLOGUE' && (
        <PrologueScreen onStartMission={handleStartMission} />
      )}

      {gameState === 'STATE_DOME_MANAGEMENT' && (
        <DomeManagementScreen
          resources={resources}
          interactions={domeInteractions}
          onRedirectEnergy={handleRedirectEnergy}
          onRefillSuitOxygen={handleRefillSuitOxygen}
          onViewBriefing={handleViewBriefing}
          onOpenAirlock={handleOpenAirlock}
        />
      )}

      {(gameState === 'STATE_ROVER_EXPLORATION' || gameState === 'STATE_STORM_DILEMMA') && (
        <>
          <RoverHUD
            telemetry={telemetry}
            resources={resources}
            onToggleHeadlights={handleToggleHeadlights}
            onToggleCamera={handleToggleCamera}
            onExtractData={isNearLostRover ? handleExtractDataModule : undefined}
          />
          <ControlsHelp />
        </>
      )}

      {gameState === 'STATE_STORM_DILEMMA' && !gameStateManager.stormChoiceMade && (
        <StormDilemmaModal
          isOpen={true}
          onChooseRetreat={handleChooseRetreat}
          onChooseAdvance={handleChooseAdvance}
        />
      )}

      {gameState === 'STATE_RESCUE_AND_ISRU' && missionReport && (
        <RescueAndISRUScreen
          report={missionReport}
          onRestart={handleRestartMission}
        />
      )}
    </div>
  );
}

export default App;
