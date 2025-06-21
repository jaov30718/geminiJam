
import React from 'react';
import { AudioManager } from '../utils/audioManager';

interface GameOverModalProps {
  score: number;
  onRestart: () => void;
  onGoToMainMenu: () => void;
  audioManager: AudioManager | null;
}

const GameOverModal: React.FC<GameOverModalProps> = ({ score, onRestart, onGoToMainMenu, audioManager }) => {
  
  const handleRestartClick = () => {
    // audioManager?.playSound('ui_click'); // GameCanvas handles this
    onRestart();
  };

  const handleMainMenuClick = () => {
    // audioManager?.playSound('ui_click'); // GameCanvas handles this
    onGoToMainMenu();
  };

  return (
    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 p-4 text-center">
      <h2 className="text-7xl font-bold text-red-600 mb-6 animate-pulse">FIM DE JOGO</h2>
      <p className="text-4xl text-gray-100 mb-10">
        Pontuação Final: <span className="text-yellow-400 font-bold">{score}</span>
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleRestartClick}
          className="px-8 py-4 bg-green-500 hover:bg-green-400 text-neutral-900 font-bold text-xl rounded-lg shadow-lg transition-transform duration-150 ease-in-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300"
        >
          Tentar Novamente
        </button>
        <button
          onClick={handleMainMenuClick}
          className="px-8 py-4 bg-blue-500 hover:bg-blue-400 text-neutral-900 font-bold text-xl rounded-lg shadow-lg transition-transform duration-150 ease-in-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
        >
          Voltar ao Menu
        </button>
      </div>
      <p className="mt-8 text-gray-400 text-sm">
        Pontos ganhos são adicionados ao seu total.
      </p>
    </div>
  );
};

export default GameOverModal;
