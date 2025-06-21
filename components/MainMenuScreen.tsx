
import React from 'react';
import { ScreenState } from '../types';
import { AudioManager } from '../utils/audioManager';

interface MainMenuScreenProps {
  onNavigate: (screen: ScreenState) => void;
  totalPoints: number;
  audioManager: AudioManager | null;
}

const MainMenuScreen: React.FC<MainMenuScreenProps> = ({ onNavigate, totalPoints, audioManager }) => {
  
  const handleNavigationClick = (screen: ScreenState) => {
    // audioManager?.playSound('ui_click'); // App.tsx's handleNavigate already plays this
    onNavigate(screen);
  };

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 w-full max-w-md">
      <h1 className="text-5xl font-bold text-yellow-400 mb-4 tracking-wider">Sobrevivente Pixelado</h1>
      <p className="text-lg text-neutral-300 mb-10">Use A/D (ou Setas) para mover, Espaço para pular. Mouse para mirar e atirar.</p>
      
      <div className="mb-8 p-4 bg-neutral-800 rounded-lg shadow-md">
        <p className="text-xl text-neutral-200">Total de Pontos: <span className="font-bold text-yellow-400">{totalPoints}</span></p>
      </div>

      <div className="space-y-6 w-full">
        <button
          onClick={() => handleNavigationClick('Playing')}
          className="w-full px-8 py-4 bg-green-500 hover:bg-green-400 text-neutral-900 font-bold text-2xl rounded-lg shadow-lg transition-transform duration-150 ease-in-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300"
        >
          Jogar
        </button>
        <button
          onClick={() => handleNavigationClick('Shop')}
          className="w-full px-8 py-4 bg-blue-500 hover:bg-blue-400 text-neutral-900 font-bold text-2xl rounded-lg shadow-lg transition-transform duration-150 ease-in-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
        >
          Loja
        </button>
        <button
          onClick={() => handleNavigationClick('Options')}
          className="w-full px-8 py-4 bg-gray-500 hover:bg-gray-400 text-neutral-900 font-bold text-2xl rounded-lg shadow-lg transition-transform duration-150 ease-in-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-300"
        >
          Opções
        </button>
      </div>
    </div>
  );
};

export default MainMenuScreen;
