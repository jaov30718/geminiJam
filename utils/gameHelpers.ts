
import { Vector, GameObject, Upgrade, UpgradeChoice, Rarity, Collidable } from '../types';
import { UPGRADES } from '../constants';
import { Enemy, Particle } from '../gameLogic/entities';

export const checkCollision = (rect1: Collidable, rect2: Collidable): boolean => {
    const r1Width = rect1.width || rect1.size || 0;
    const r1Height = rect1.height || rect1.size || 0;
    const r2Width = rect2.width || rect2.size || 0;
    const r2Height = rect2.height || rect2.size || 0;

    // Assuming position is top-left for rects, center for objects with size
    const r1x = rect1.width ? rect1.position.x : rect1.position.x - r1Width / 2;
    const r1y = rect1.height ? rect1.position.y : rect1.position.y - r1Height / 2;
    const r2x = rect2.width ? rect2.position.x : rect2.position.x - r2Width / 2;
    const r2y = rect2.height ? rect2.position.y : rect2.position.y - r2Height / 2;
    
    // Check for player-like objects (center pivot) vs others
    // For simplicity, let's use a common AABB check assuming rect1 and rect2 positions are their centers
    // This was how original likely worked with player position and height/width.
    // Let's assume positions are centers for simplicity in collision logic.
    // If rect1.width and rect1.height exist, assume position is center.
    // rect1.position.x is center, rect1.position.y is center

    const rect1Left = rect1.position.x - r1Width / 2;
    const rect1Right = rect1.position.x + r1Width / 2;
    const rect1Top = rect1.position.y - r1Height / 2;
    const rect1Bottom = rect1.position.y + r1Height / 2;

    const rect2Left = rect2.position.x - r2Width / 2;
    const rect2Right = rect2.position.x + r2Width / 2;
    const rect2Top = rect2.position.y - r2Height / 2;
    const rect2Bottom = rect2.position.y + r2Height / 2;
    
    return (
        rect1Left < rect2Right &&
        rect1Right > rect2Left &&
        rect1Top < rect2Bottom &&
        rect1Bottom > rect2Top
    );
};


export const distance = (pos1: Vector, pos2: Vector): number => {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
};

export const findClosestEnemy = (position: Vector, enemies: Enemy[]): Enemy | null => {
    let closest: Enemy | null = null;
    let minDist = Infinity;
    enemies.forEach(enemy => {
        if (!enemy) return;
        const dist = distance(position, enemy.position);
        if (dist < minDist) {
            minDist = dist;
            closest = enemy;
        }
    });
    return closest;
};

export const createBurst = (x: number, y: number, count: number, color: string, canvasWidth: number, canvasHeight: number): Particle[] => {
    const burstParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        const life = Math.random() * 0.5 + 0.3;
        burstParticles.push(new Particle(
            x, y,
            Math.cos(angle) * speed, Math.sin(angle) * speed,
            Math.random() * 3 + 1,
            color,
            life,
            canvasWidth, canvasHeight
        ));
    }
    return burstParticles;
};

export const generateUpgradeChoices = (count: number, currentLuck: number = 0): UpgradeChoice[] => {
    const choices: UpgradeChoice[] = [];
    const usedIds = new Set<string>();
    
    const epicUpgrades = UPGRADES.epic.filter(u => u.id !== 'immortal'); // Original filters 'immortal'

    for (let i = 0; i < count; i++) {
        let choiceData: Upgrade;
        let choiceRarity: Rarity;
        
        do {
            const roll = Math.random() * 100;
            let pool: Upgrade[];
            
            if (roll < 5 + currentLuck * 2) { 
                choiceRarity = Rarity.Epic;
                pool = epicUpgrades;
            } else if (roll < 25 + currentLuck * 5) { 
                choiceRarity = Rarity.Uncommon;
                pool = UPGRADES.uncommon;
            } else {
                choiceRarity = Rarity.Common;
                pool = UPGRADES.common;
            }

            if (pool.length === 0) { // Fallback if a rarity pool is empty
                pool = UPGRADES.common;
                choiceRarity = Rarity.Common;
            }
            
            choiceData = pool[Math.floor(Math.random() * pool.length)];

        } while (usedIds.has(choiceData.id) && usedIds.size < (UPGRADES.common.length + UPGRADES.uncommon.length + epicUpgrades.length)); // Ensure we don't loop forever if all upgrades of a type are used
        
        if (!usedIds.has(choiceData.id)) { // Only add if not already picked (in this set of choices) and available
            usedIds.add(choiceData.id);
            choices.push({ ...choiceData, rarity: choiceRarity });
        } else if (choices.length < count) { // If we picked a duplicate and need more choices, try to pick another one
          i--; // Decrement i to retry picking for this slot
          continue;
        }

    }
    // If not enough unique choices were found (e.g. small pool and high count requested), fill with random common ones
    while (choices.length < count && UPGRADES.common.length > 0) {
        let fallbackChoice: Upgrade;
        let fallbackRarity = Rarity.Common;
        do {
            fallbackChoice = UPGRADES.common[Math.floor(Math.random() * UPGRADES.common.length)];
        } while (usedIds.has(fallbackChoice.id) && usedIds.size < UPGRADES.common.length);

        if (!usedIds.has(fallbackChoice.id)) {
            usedIds.add(fallbackChoice.id);
            choices.push({ ...fallbackChoice, rarity: fallbackRarity });
        } else {
            break; // Cannot find more unique common items
        }
    }
    return choices;
};
