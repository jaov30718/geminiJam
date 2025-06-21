
import React from 'react';
import { PermanentUpgradesState, PermanentUpgradeType, ShopItem } from '../types';
import { SHOP_ITEMS } from '../constants';
import { AudioManager } from '../utils/audioManager';

interface ShopScreenProps {
  onNavigateBack: () => void;
  currentPoints: number;
  currentUpgrades: PermanentUpgradesState;
  onPurchase: (cost: number, updatedUpgrades: PermanentUpgradesState) => void;
  audioManager: AudioManager | null;
}

const ShopScreen: React.FC<ShopScreenProps> = ({ 
  onNavigateBack, 
  currentPoints, 
  currentUpgrades, 
  onPurchase,
  audioManager
}) => {

  const calculateCost = (item: ShopItem, currentLevel: number): number => {
    return item.baseCost + item.costIncreasePerLevel * currentLevel;
  };

  const handleBuyItem = (item: ShopItem) => {
    // audioManager?.playSound('ui_click'); // onPurchase in App.tsx plays 'shop_purchase'
    const currentLevel = currentUpgrades[item.id];
    if (currentLevel >= item.maxLevel) {
      // alert("Nível máximo alcançado para este upgrade!"); // Consider a more subtle notification
      return;
    }
    const cost = calculateCost(item, currentLevel);
    if (currentPoints >= cost) {
      const newUpgrades = { ...currentUpgrades, [item.id]: currentLevel + 1 };
      onPurchase(cost, newUpgrades); // Sound played in App.tsx's handler
    } else {
      // alert("Pontos insuficientes!"); // Consider a more subtle notification
    }
  };

  return (
    <div className="flex flex-col items-center p-4 sm:p-8 w-full max-w-3xl">
      <h1 className="text-4xl font-bold text-yellow-400 mb-6 tracking-wider">Loja de Upgrades Permanentes</h1>
      <div className="mb-6 p-3 bg-neutral-800 rounded-lg shadow-md">
        <p className="text-lg text-neutral-200">Seus Pontos: <span className="font-bold text-yellow-400">{currentPoints}</span></p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-8">
        {SHOP_ITEMS.map((item) => {
          const currentLevel = currentUpgrades[item.id];
          const cost = calculateCost(item, currentLevel);
          const isMaxLevel = currentLevel >= item.maxLevel;
          const canAfford = currentPoints >= cost;

          return (
            <div key={item.id} className="bg-neutral-800 p-6 rounded-lg shadow-xl border-2 border-neutral-700 flex flex-col justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-sky-400 mb-2">{item.name}</h2>
                <p className="text-sm text-neutral-300 mb-3">
                  {item.description(currentLevel, item.effectPerLevel)}
                </p>
                <p className="text-sm text-neutral-400">Nível Atual: {currentLevel} / {item.maxLevel}</p>
              </div>
              <div className="mt-4">
                {isMaxLevel ? (
                  <p className="text-lg font-bold text-green-400">NÍVEL MÁXIMO!</p>
                ) : (
                  <>
                    <p className="text-lg font-semibold text-yellow-400 mb-2">Custo: {cost} Pontos</p>
                    <button
                      onClick={() => handleBuyItem(item)}
                      disabled={!canAfford || isMaxLevel}
                      className={`w-full px-6 py-3 font-bold text-lg rounded-md transition-colors duration-150
                        ${isMaxLevel ? 'bg-gray-600 cursor-not-allowed' : 
                          canAfford ? 'bg-green-500 hover:bg-green-400 text-neutral-900' : 'bg-red-700 text-neutral-300 cursor-not-allowed'}`}
                    >
                      {isMaxLevel ? 'Máx.' : (canAfford ? 'Comprar' : 'Insuficiente')}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => {
            // audioManager?.playSound('ui_click'); // App.tsx's handleNavigate plays this
            onNavigateBack();
        }}
        className="px-10 py-3 bg-blue-500 hover:bg-blue-400 text-neutral-900 font-bold text-xl rounded-lg shadow-lg transition-transform duration-150 ease-in-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
      >
        Voltar ao Menu
      </button>
    </div>
  );
};

export default ShopScreen;
