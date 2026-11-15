/**
 * Welwitschia Lunar (We Hitch a Lunar)
 * Equipe Mochileiros da Galáxia (2032 - Programa Artemis / Polo Sul Lunar)
 * Componente Raiz da Aplicação: Conecta Three.js, Física, Máquina de Estados e UI.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  GameState,
  ResourceState,
  TelemetryData,
  DomeInteractions,
  MissionReport,
  CameraViewMode,
  BaseInteriorState,
  BaseEmergencyType,
  ActiveUIPanel
} from './types/game';
import { gameStateManager } from './state/GameStateManager';
import { LunarGameCanvas, type TouchDriveInputs } from './components/LunarGameCanvas';
import { WellyCopilot } from './ui/WellyCopilot';
import { PrologueScreen } from './ui/PrologueScreen';
import { DomeManagementScreen } from './ui/DomeManagementScreen';
import { RoverHUD } from './ui/RoverHUD';
import { StormDilemmaModal } from './ui/StormDilemmaModal';
import { RescueAndISRUScreen } from './ui/RescueAndISRUScreen';

export function App() {
  const [gameState, setGameState] = useState<GameState>(gameStateManager.currentState);
  const [resources, setResources] = useState<ResourceState>({ ...gameStateManager.resources });
  const [domeInteractions, setDomeInteractions] = useState<DomeInteractions>({ ...gameStateManager.domeInteractions });
  const [baseInterior, setBaseInterior] = useState<BaseInteriorState>({ ...gameStateManager.baseInterior });
  const [activePanel, setActivePanel] = useState<ActiveUIPanel>('none');
  const [isVRActive, setIsVRActive] = useState<boolean>(true); // Modo VR ativado como padrão
  const [touchDriveInputs, setTouchDriveInputs] = useState<TouchDriveInputs>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    brake: false
  });
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    speedKmh: 0,
    headingDeg: 45,
    distanceToTargetM: 650,
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

    const unsubInterior = gameStateManager.subscribeBaseInterior((newInterior) => {
      setBaseInterior(newInterior);
      setDomeInteractions({ ...gameStateManager.domeInteractions });
      if (newInterior.activeEmergency && !newInterior.valveCalibration.active) {
        setActivePanel('decision');
      } else {
        setActivePanel((prev) => (prev === 'decision' ? 'none' : prev));
      }
    });

    return () => {
      unsubState();
      unsubResources();
      unsubInterior();
    };
  }, []);

  // Loop de atualização de recursos e checagem de distância em tempo real
  useEffect(() => {
    let lastTime = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (gameState === 'STATE_DOME_MANAGEMENT') {
        gameStateManager.updateBaseInterior(delta);
      } else if (gameState === 'STATE_ROVER_EXPLORATION' || gameState === 'STATE_STORM_DILEMMA') {
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

  const handleTriggerEmergency = useCallback((type: BaseEmergencyType) => {
    gameStateManager.triggerBaseEmergency(type);
  }, []);

  const handleResolveEmergencyChoice = useCallback((choice: 'A' | 'B') => {
    gameStateManager.resolveBaseEmergencyChoice(choice);
    setDomeInteractions({ ...gameStateManager.domeInteractions });
  }, []);

  const handleCalibrateValve = useCallback((valveIndex: 1 | 2) => {
    gameStateManager.calibrateOxygenValve(valveIndex);
    setDomeInteractions({ ...gameStateManager.domeInteractions });
  }, []);

  const handleCycleHologram = useCallback(() => {
    gameStateManager.cycleHologramDiscovery();
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

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black font-sans select-none">
      {/* 1. Viewport 3D Three.js com Post-Processing, Física Avançada e WebVR */}
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
        isVRActive={isVRActive}
        onToggleVR={() => setIsVRActive((prev) => !prev)}
        domeInteractions={domeInteractions}
        resources={resources}
        baseInterior={baseInterior}
        onRedirectEnergy={handleRedirectEnergy}
        onRefillSuitOxygen={handleRefillSuitOxygen}
        onViewBriefing={handleViewBriefing}
        onOpenAirlock={handleOpenAirlock}
        onResolveEmergencyChoice={handleResolveEmergencyChoice}
        onCalibrateValve={handleCalibrateValve}
        onCycleHologram={handleCycleHologram}
        touchDriveInputs={touchDriveInputs}
      />

      {/* Visor periférico do capacete espacial (Ativo no Modo VR) */}
      {isVRActive && (
        <div
          id="helmet-visor"
          className="fixed inset-0 pointer-events-none z-10 transition-opacity duration-500"
          style={{
            background:
              'radial-gradient(ellipse 86% 82% at 50% 50%, transparent 65%, rgba(8, 18, 42, 0.35) 84%, rgba(3, 7, 18, 0.92) 100%)',
            boxShadow: 'inset 0 0 55px rgba(0, 229, 255, 0.2)'
          }}
        />
      )}

      {/* 2. Copiloto IA Welly (Toast único discreto no rodapé que desmonta após 4s) */}
      <WellyCopilot
        currentTrigger={wellyTrigger}
        telemetry={telemetry}
        resources={resources}
        gameState={gameState}
        baseInterior={baseInterior}
      />

      {/* 3. Telas dos 5 Estados de Jogo (UI Minimalista Mobile-First com Estado Exclusivo activePanel) */}
      {gameState === 'STATE_PROLOGUE' && (
        <PrologueScreen onStartMission={handleStartMission} />
      )}

      {gameState === 'STATE_DOME_MANAGEMENT' && (
        <DomeManagementScreen
          resources={resources}
          interactions={domeInteractions}
          baseInterior={baseInterior}
          activePanel={activePanel}
          onChangeActivePanel={setActivePanel}
          isVRActive={isVRActive}
          onToggleVR={() => setIsVRActive((prev) => !prev)}
          onRedirectEnergy={handleRedirectEnergy}
          onRefillSuitOxygen={handleRefillSuitOxygen}
          onViewBriefing={handleViewBriefing}
          onOpenAirlock={handleOpenAirlock}
          onTriggerEmergency={handleTriggerEmergency}
          onResolveEmergencyChoice={handleResolveEmergencyChoice}
          onCalibrateValve={handleCalibrateValve}
          onCycleHologram={handleCycleHologram}
        />
      )}

      {(gameState === 'STATE_ROVER_EXPLORATION' || gameState === 'STATE_STORM_DILEMMA') && (
        <RoverHUD
          telemetry={telemetry}
          resources={resources}
          activePanel={activePanel}
          onChangeActivePanel={setActivePanel}
          onToggleHeadlights={handleToggleHeadlights}
          onToggleCamera={handleToggleCamera}
          onExtractData={isNearLostRover ? handleExtractDataModule : undefined}
          isVRActive={isVRActive}
          onToggleVR={() => setIsVRActive((prev) => !prev)}
          onTouchDriveInputs={setTouchDriveInputs}
        />
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
