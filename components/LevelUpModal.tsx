
import React from 'react';
import { UpgradeChoice, Rarity } from '../types';
import { AudioManager } from '../utils/audioManager';

interface LevelUpModalProps {
  choices: UpgradeChoice[];
  onSelectUpgrade: (upgrade: UpgradeChoice) => void;
  audioManager: AudioManager | null;
}

const getRarityColorClasses = (rarity: Rarity): string => {
  switch (rarity) {
    case Rarity.Common:
      return 'border-gray-300 hover:border-gray-100 text-gray-100 hover:bg-gray-700';
    case Rarity.Uncommon:
      return 'border-cyan-400 hover:border-cyan-200 text-cyan-200 hover:bg-cyan-700/50';
    case Rarity.Epic:
      return 'border-purple-500 hover:border-purple-300 text-purple-300 hover:bg-purple-700/50';
    default:
      return 'border-gray-300 hover:border-gray-100 text-gray-100 hover:bg-gray-700';
  }
};

const getRarityTextColor = (rarity: Rarity): string => {
    switch (rarity) {
        case Rarity.Common: return 'text-gray-200';
        case Rarity.Uncommon: return 'text-cyan-400';
        case Rarity.Epic: return 'text-purple-400';
        default: return 'text-gray-200';
    }
}

const LevelUpModal: React.FC<LevelUpModalProps> = ({ choices, onSelectUpgrade, audioManager }) => {
  
  const handleSelection = (choice: UpgradeChoice) => {
    // audioManager?.playSound('ui_click'); // GameCanvas handles this in its onSelectUpgrade
    onSelectUpgrade(choice);
  };

  return (
    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 p-4">
      <h2 className="text-4xl font-bold text-yellow-400 mb-8 tracking-wider">NÍVEL ALCANÇADO!</h2>
      <p className="text-xl text-gray-200 mb-10">Escolha um upgrade:</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
        {choices.map((choice, index) => (
          <button
            key={index}
            onClick={() => handleSelection(choice)}
            className={`p-6 rounded-lg shadow-xl transition-all duration-200 ease-in-out transform hover:scale-105 border-4 ${getRarityColorClasses(choice.rarity)} bg-neutral-800/80 min-h-[180px] flex flex-col justify-between items-center text-center`}
          >
            <div>
              <h3 className={`text-2xl font-semibold mb-2 ${getRarityTextColor(choice.rarity)}`}>{choice.name}</h3>
              <p className="text-sm text-gray-300 mb-3">{choice.desc}</p>
            </div>
            <p className={`text-xs font-bold uppercase tracking-wider ${getRarityTextColor(choice.rarity)}`}>{choice.rarity}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default LevelUpModal;
