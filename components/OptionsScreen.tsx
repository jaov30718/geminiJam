
import React, { useState, useEffect } from 'react';
import { AudioSettings } from '../types';
import { AudioManager } from '../utils/audioManager';

interface OptionsScreenProps {
  onNavigateBack: () => void;
  audioSettings: AudioSettings;
  onAudioSettingsChange: (settings: AudioSettings) => void;
  audioManager: AudioManager | null;
}

const OptionsScreen: React.FC<OptionsScreenProps> = ({ 
  onNavigateBack, 
  audioSettings, 
  onAudioSettingsChange,
  audioManager
}) => {
  const [masterVolume, setMasterVolume] = useState(audioSettings.masterVolume);
  const [musicVolume, setMusicVolume] = useState(audioSettings.musicVolume);
  const [sfxVolume, setSfxVolume] = useState(audioSettings.sfxVolume);
  const [muted, setMuted] = useState(audioSettings.muted);

  useEffect(() => {
    setMasterVolume(audioSettings.masterVolume);
    setMusicVolume(audioSettings.musicVolume);
    setSfxVolume(audioSettings.sfxVolume);
    setMuted(audioSettings.muted);
  }, [audioSettings]);

  const handleMasterVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setMasterVolume(newVolume);
    onAudioSettingsChange({ ...audioSettings, masterVolume: newVolume });
  };

  const handleMusicVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setMusicVolume(newVolume);
    onAudioSettingsChange({ ...audioSettings, musicVolume: newVolume });
  };

  const handleSfxVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setSfxVolume(newVolume);
    onAudioSettingsChange({ ...audioSettings, sfxVolume: newVolume });
  };

  const handleMuteToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMutedState = e.target.checked;
    setMuted(newMutedState);
    onAudioSettingsChange({ ...audioSettings, muted: newMutedState });
  };
  
  const playClickSound = () => {
    audioManager?.playSound('ui_click');
  }

  return (
    <div className="flex flex-col items-center p-4 sm:p-8 w-full max-w-lg bg-neutral-800 rounded-xl shadow-2xl border border-neutral-700">
      <h1 className="text-4xl font-bold text-yellow-400 mb-8 tracking-wider">Opções</h1>
      
      <div className="space-y-6 w-full mb-8">
        {/* Master Volume */}
        <div>
          <label htmlFor="masterVolume" className="block text-lg text-sky-300 mb-1">Volume Geral: {Math.round(masterVolume * 100)}%</label>
          <input
            type="range"
            id="masterVolume"
            min="0"
            max="1"
            step="0.01"
            value={masterVolume}
            onChange={handleMasterVolumeChange}
            className="w-full h-3 bg-neutral-700 rounded-lg appearance-none cursor-pointer range-lg accent-yellow-400"
          />
        </div>

        {/* Music Volume */}
        <div>
          <label htmlFor="musicVolume" className="block text-lg text-sky-300 mb-1">Volume da Música: {Math.round(musicVolume * 100)}%</label>
          <input
            type="range"
            id="musicVolume"
            min="0"
            max="1"
            step="0.01"
            value={musicVolume}
            onChange={handleMusicVolumeChange}
            className="w-full h-3 bg-neutral-700 rounded-lg appearance-none cursor-pointer range-lg accent-green-400"
          />
        </div>

        {/* SFX Volume */}
        <div>
          <label htmlFor="sfxVolume" className="block text-lg text-sky-300 mb-1">Volume dos Efeitos: {Math.round(sfxVolume * 100)}%</label>
          <input
            type="range"
            id="sfxVolume"
            min="0"
            max="1"
            step="0.01"
            value={sfxVolume}
            onChange={handleSfxVolumeChange}
            className="w-full h-3 bg-neutral-700 rounded-lg appearance-none cursor-pointer range-lg accent-purple-400"
          />
        </div>

        {/* Mute Toggle */}
        <div className="flex items-center justify-start pt-2">
          <label htmlFor="muteToggle" className="text-lg text-sky-300 mr-4">Mudo:</label>
          <input
            type="checkbox"
            id="muteToggle"
            checked={muted}
            onChange={handleMuteToggle}
            className="form-checkbox h-6 w-6 text-red-500 bg-neutral-700 border-neutral-600 rounded focus:ring-red-400 focus:ring-offset-0 cursor-pointer accent-red-500"
          />
        </div>
      </div>

      <button
        onClick={() => {
            playClickSound();
            onNavigateBack();
        }}
        className="px-10 py-3 bg-blue-500 hover:bg-blue-400 text-neutral-900 font-bold text-xl rounded-lg shadow-lg transition-transform duration-150 ease-in-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
      >
        Voltar ao Menu
      </button>
    </div>
  );
};

export default OptionsScreen;
