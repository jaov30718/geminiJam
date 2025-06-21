
import React, { useState, useEffect, useCallback, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import MainMenuScreen from './components/MainMenuScreen';
import ShopScreen from './components/ShopScreen';
import OptionsScreen from './components/OptionsScreen';
import { ScreenState, PermanentUpgradesState, AudioSettings } from './types';
import { 
  loadTotalPoints, saveTotalPoints, 
  loadPermanentUpgrades, savePermanentUpgrades, getInitialPermanentUpgrades,
  loadAudioSettings, saveAudioSettings, getInitialAudioSettings
} from './utils/persistentData';
import { AudioManager } from './utils/audioManager';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('MainMenu');
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [permanentUpgrades, setPermanentUpgrades] = useState<PermanentUpgradesState>(getInitialPermanentUpgrades());
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(getInitialAudioSettings());
  
  const audioManagerRef = useRef<AudioManager | null>(null);
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);

  useEffect(() => {
    if (!audioManagerRef.current) {
      audioManagerRef.current = new AudioManager();
    }
    // Audio settings loaded once
    const loadedAudioSettings = loadAudioSettings();
    setAudioSettings(loadedAudioSettings);
    // Apply loaded settings to AudioManager if it's already initialized (or will be soon)
    // This is more for subsequent loads after the first initialization attempt
    if (audioManagerRef.current.getIsInitialized()) {
        audioManagerRef.current.setMasterVolume(loadedAudioSettings.masterVolume);
        audioManagerRef.current.setMusicVolume(loadedAudioSettings.musicVolume);
        audioManagerRef.current.setSfxVolume(loadedAudioSettings.sfxVolume);
        audioManagerRef.current.toggleMute(loadedAudioSettings.muted);
    }


    setTotalPoints(loadTotalPoints());
    setPermanentUpgrades(loadPermanentUpgrades());
  }, []);


  const initializeAudioAndPlayMusic = useCallback(async (screen: ScreenState) => {
    if (!audioManagerRef.current) return;
    
    if (!audioManagerRef.current.getIsInitialized()) {
      await audioManagerRef.current.initialize();
      // Apply loaded settings after initialization
      const currentLoadedSettings = loadAudioSettings(); // Re-load to ensure freshness
      audioManagerRef.current.setMasterVolume(currentLoadedSettings.masterVolume);
      audioManagerRef.current.setMusicVolume(currentLoadedSettings.musicVolume);
      audioManagerRef.current.setSfxVolume(currentLoadedSettings.sfxVolume);
      audioManagerRef.current.toggleMute(currentLoadedSettings.muted);
      setIsAudioInitialized(true); 
    }
    audioManagerRef.current.resumeContext();

    if (screen === 'Playing') {
      audioManagerRef.current.stopAllMusic(0.5);
      audioManagerRef.current.playMusic('gameplay', { loop: true, fadeInDuration: 1 });
    } else if (screen === 'MainMenu' || screen === 'Shop' || screen === 'Options') {
      audioManagerRef.current.stopAllMusic(0.5);
      audioManagerRef.current.playMusic('main_menu', { loop: true, fadeInDuration: 1 });
    }
  }, []);

  useEffect(() => {
    // Play main menu music on initial load if audio gets initialized
    if(isAudioInitialized && currentScreen === 'MainMenu' && audioManagerRef.current){
        audioManagerRef.current.playMusic('main_menu', { loop: true, fadeInDuration: 1 });
    }
  }, [isAudioInitialized, currentScreen]);


  const handleNavigate = useCallback(async (screen: ScreenState) => {
    if (audioManagerRef.current) {
        audioManagerRef.current.playSound('ui_click');
    }
    await initializeAudioAndPlayMusic(screen); // Ensure audio is ready and play music
    setCurrentScreen(screen);
  }, [initializeAudioAndPlayMusic]);

  const handleGameOver = useCallback((scoreFromGame: number) => {
    const newTotalPoints = totalPoints + scoreFromGame;
    setTotalPoints(newTotalPoints);
    saveTotalPoints(newTotalPoints);
    if(audioManagerRef.current) {
      audioManagerRef.current.playSound('game_over');
      audioManagerRef.current.stopAllMusic(1); // Stop gameplay music
      audioManagerRef.current.playMusic('main_menu', { loop: true, fadeInDuration: 1.5});
    }
    setCurrentScreen('MainMenu');
  }, [totalPoints]);

  const handlePurchaseUpgrade = useCallback((cost: number, updatedUpgrades: PermanentUpgradesState) => {
    const newTotalPoints = totalPoints - cost;
    setTotalPoints(newTotalPoints);
    saveTotalPoints(newTotalPoints);
    setPermanentUpgrades(updatedUpgrades);
    savePermanentUpgrades(updatedUpgrades);
    if(audioManagerRef.current) {
        audioManagerRef.current.playSound('shop_purchase');
    }
  }, [totalPoints]);

  const handleAudioSettingsChange = useCallback((newSettings: AudioSettings) => {
    setAudioSettings(newSettings);
    saveAudioSettings(newSettings);
    if (audioManagerRef.current && audioManagerRef.current.getIsInitialized()) {
      audioManagerRef.current.setMasterVolume(newSettings.masterVolume);
      audioManagerRef.current.setMusicVolume(newSettings.musicVolume);
      audioManagerRef.current.setSfxVolume(newSettings.sfxVolume);
      audioManagerRef.current.toggleMute(newSettings.muted);
    }
  }, []);


  const renderScreen = () => {
    const audioProps = { audioManager: audioManagerRef.current };
    switch (currentScreen) {
      case 'MainMenu':
        return <MainMenuScreen onNavigate={handleNavigate} totalPoints={totalPoints} audioManager={audioManagerRef.current} />;
      case 'Playing':
        return <GameCanvas 
                  onGameOverSignal={handleGameOver} 
                  onExitToMainMenu={() => handleNavigate('MainMenu')} 
                  initialPermanentUpgrades={permanentUpgrades} 
                  audioManager={audioManagerRef.current}
                />;
      case 'Shop':
        return <ShopScreen 
                  onNavigateBack={() => handleNavigate('MainMenu')} 
                  currentPoints={totalPoints}
                  currentUpgrades={permanentUpgrades}
                  onPurchase={handlePurchaseUpgrade}
                  audioManager={audioManagerRef.current}
                />;
      case 'Options':
        return <OptionsScreen 
                  onNavigateBack={() => handleNavigate('MainMenu')} 
                  audioSettings={audioSettings}
                  onAudioSettingsChange={handleAudioSettingsChange}
                  audioManager={audioManagerRef.current}
                />;
      default:
        return <MainMenuScreen onNavigate={handleNavigate} totalPoints={totalPoints} audioManager={audioManagerRef.current} />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-900 text-white font-mono p-4">
      {renderScreen()}
    </div>
  );
};

export default App;
