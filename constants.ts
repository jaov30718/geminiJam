
import { Upgrade, Rarity, PlayerBaseStats, ShopItem, PermanentUpgradeType } from './types';
import { Player } from './gameLogic/entities'; // Full Player class for type hint

export const CANVAS_WIDTH = 1152;
export const CANVAS_HEIGHT = 648;
export const TILE_SIZE = CANVAS_WIDTH / 96; // Should be 12
export const GRAVITY = 0.6;

export const INITIAL_PLAYER_BASE_STATS: PlayerBaseStats = {
    speed: 5,
    jumpPower: 12,
    maxHp: 100,
    attackSpeed: 500, // ms
    projectileDamage: 10,
    critChance: 0.05,
    critDamage: 1.5,
    defense: 0,
    lifesteal: 0,
    maxJumps: 1,
    projectileHits: 1,
};

type UpgradeDefinition = Omit<Upgrade, 'rarity'>; // Rarity is inferred from the category

interface UpgradesList {
  common: UpgradeDefinition[];
  uncommon: UpgradeDefinition[];
  epic: UpgradeDefinition[];
}

export const UPGRADES: UpgradesList = {
    common: [
        { id: 'catalyst', name: 'Catalisador', desc: 'Dano do Projétil +2', apply: (p: Player) => { p.projectileDamage += 2 * p.upgrades.commonEffectiveness; } },
        { id: 'vision', name: 'Visão', desc: 'Chance Crítica +5%', apply: (p: Player) => { p.critChance += 0.05 * p.upgrades.commonEffectiveness; } },
        { id: 'growth', name: 'Crescimento', desc: 'PV Máx. +10', apply: (p: Player) => { const v = 10 * p.upgrades.commonEffectiveness; p.maxHp += v; p.hp += v; } },
        { id: 'boost', name: 'Impulso', desc: 'Altura do Salto +30%', apply: (p: Player) => { p.jumpPower *= (1 + 0.3 * p.upgrades.commonEffectiveness); } }, // Multiplicative, ensure it's handled if re-applied
        { id: 'renew', name: 'Renovar', desc: 'Cura até o máx. de PV', apply: (p: Player) => { p.hp = p.maxHp; } },
        { id: 'resistance', name: 'Resistência', desc: 'Defesa +4%', apply: (p: Player) => { p.defense += 0.04 * p.upgrades.commonEffectiveness; } },
        { id: 'resonance', name: 'Ressonância', desc: 'Velocidade de Ataque +12%', apply: (p: Player) => { p.attackSpeed *= (1 - 0.12 * p.upgrades.commonEffectiveness); } },
        { id: 'souls', name: 'Almas', desc: 'Chance de dropar orbe de alma +1%', apply: (p: Player) => { p.upgrades.soulOrbChance += 0.01 * p.upgrades.commonEffectiveness; } },
        { id: 'stability', name: 'Estabilidade', desc: 'Projétil ganha +1 acerto', apply: (p: Player) => { p.projectileHits += 1 * Math.round(p.upgrades.commonEffectiveness); } },
        { id: 'speed', name: 'Velocidade', desc: 'Velocidade de Movimento +20%', apply: (p: Player) => { p.speed *= (1 + 0.2 * p.upgrades.commonEffectiveness); } },
    ],
    uncommon: [
        { id: 'catalyst2', name: 'Catalisador II', desc: 'Dano do Projétil +4', apply: (p: Player) => { p.projectileDamage += 4; } },
        { id: 'charge', name: 'Carga', desc: 'Tamanho do Projétil +20%', apply: (p: Player) => { p.projectileSize *= 1.2; } },
        { id: 'camouflage', name: 'Camuflagem', desc: 'Invulnerabilidade após dano +10% duração', apply: (p: Player) => { p.upgrades.camouflage += 0.1; } },
        { id: 'fragmentation1', name: 'Fragmentação', desc: 'Inimigos liberam 2 projéteis fracos', apply: (p: Player) => { p.upgrades.fragmentation = Math.max(p.upgrades.fragmentation, 2); } },
        { id: 'friction1', name: 'Atrito', desc: 'A cada metro, lança 1 projétil explosivo', apply: (p: Player) => { p.upgrades.friction = Math.max(p.upgrades.friction, 1); } },
        { id: 'growth2', name: 'Crescimento II', desc: 'PV Máx. +20', apply: (p: Player) => { p.maxHp += 20; p.hp += 20; } },
        { id: 'gush', name: 'Gush', desc: 'Adiciona +1 Pulo', apply: (p: Player) => { p.maxJumps++; } },
        { id: 'leech1', name: 'Sanguessuga', desc: 'Roubo de Vida de 3% do Dano', apply: (p: Player) => { p.lifesteal += 0.03; } },
        { id: 'luck', name: 'Sorte', desc: 'Maior chance de itens raros', apply: (p: Player) => { p.upgrades.luck = (p.upgrades.luck || 0) + 1; } },
        { id: 'orb', name: 'Orbe', desc: 'Inimigos têm 5% de chance de dropar orbe de cura', apply: (p: Player) => { p.upgrades.healOrbChance += 0.05; } },
        { id: 'precision', name: 'Precisão', desc: 'Crítico causa +50% de dano', apply: (p: Player) => { p.critDamage += 0.5; } },
        { id: 'rage', name: 'Fúria', desc: '<50% PV aumenta o dano (até 50%)', apply: (p: Player) => { p.upgrades.rage = true; } },
        { id: 'regeneration', name: 'Regeneração', desc: 'Regenera PV com base nos inimigos vivos', apply: (p: Player) => { p.upgrades.regeneration = true; } },
        { id: 'shrink', name: 'Encolher', desc: 'Torna você 10% menor', apply: (p: Player) => { p.upgrades.shrink *= 0.9; } },
        { id: 'swift', name: 'Swift', desc: 'Velocidade de Movimento +40%', apply: (p: Player) => { p.speed *= 1.4; } },
        { id: 'thunderbolt1', name: 'Raio', desc: 'Invoca 2 raios dos céus', apply: (p: Player) => { p.upgrades.thunderbolt = Math.max(p.upgrades.thunderbolt, 2); } },
    ],
    epic: [
        { id: 'appraisal', name: 'Avaliação', desc: '+1 escolha de item a partir de agora', apply: (p: Player) => { p.upgrades.numLevelUpChoices++; } },
        { id: 'barrier', name: 'Barreira', desc: 'Escudo bloqueia dano (recarrega)', apply: (p: Player) => { p.upgrades.barrier = true; p.upgrades.barrierReady = true; } },
        { id: 'cold', name: 'Frio', desc: 'Inimigos ficam mais lentos ao receber dano', apply: (p: Player) => { p.upgrades.cold = true; } },
        { id: 'fragmentation2', name: 'Fragmentação II', desc: 'Inimigos liberam 6 projéteis fracos', apply: (p: Player) => { p.upgrades.fragmentation = Math.max(p.upgrades.fragmentation, 6); } },
        { id: 'friction2', name: 'Atrito II', desc: 'A cada metro, lança 3 projéteis explosivos', apply: (p: Player) => { p.upgrades.friction = Math.max(p.upgrades.friction, 3); } },
        { id: 'focus', name: 'Foco', desc: 'Ganha vel. de ataque ao ficar parado', apply: (p: Player) => { p.upgrades.focus = true; } },
        { id: 'growth3', name: 'Crescimento III', desc: 'PV Máx. +40', apply: (p: Player) => { p.maxHp += 40; p.hp += 40; } },
        // { id: 'immortal', name: 'Imortal', desc: '+1 Reviver', apply: (p: Player) => { p.upgrades.revives++; } }, // Original code filters this out from choices
        { id: 'leech2', name: 'Sanguessuga II', desc: 'Roubo de Vida de 9% do Dano', apply: (p: Player) => { p.lifesteal += 0.09; } },
        { id: 'superheat', name: 'Superaquecimento', desc: 'Seu corpo causa 40 de dano de contato/s', apply: (p: Player) => { p.upgrades.superheat = true; } },
        { id: 'thunderbolt2', name: 'Raio II', desc: 'Invoca 6 raios dos céus', apply: (p: Player) => { p.upgrades.thunderbolt = Math.max(p.upgrades.thunderbolt, 6); } },
        { id: 'tome', name: 'Tomo', desc: 'Novos itens comuns são 35% mais eficazes', apply: (p: Player) => { p.upgrades.commonEffectiveness += 0.35; } },
        { id: 'wisp', name: 'Fogo-Fátuo', desc: 'Invoca um ajudante que ataca', apply: (p: Player) => { p.upgrades.willowisp = true; } },
        { id: 'wound', name: 'Ferimento', desc: 'Causar dano aplica sangramento', apply: (p: Player) => { p.upgrades.bleed = true; } },
    ]
};

// Add the 'Imortal' upgrade separately for potential direct use if needed, but not for random choice
export const IMMORTAL_UPGRADE: UpgradeDefinition = {
    id: 'immortal', name: 'Imortal', desc: '+1 Reviver', apply: (p: Player) => { p.upgrades.revives++; }
};

export const PLAYER_INITIAL_WIDTH = TILE_SIZE * 2;
export const PLAYER_INITIAL_HEIGHT = TILE_SIZE * 3;

export const ENEMY_PAWN_WIDTH = TILE_SIZE * 2;
export const ENEMY_PAWN_HEIGHT = TILE_SIZE * 2.5;
export const ENEMY_CANNON_WIDTH = TILE_SIZE * 2;
export const ENEMY_CANNON_HEIGHT = TILE_SIZE * 2.5; // Original was just this.height/2 for cannon body, derived from this.


// --- SHOP ITEMS ---
export const SHOP_ITEMS: ShopItem[] = [
    {
        id: PermanentUpgradeType.Vitality,
        name: "Vitalidade Base",
        description: (level, effect) => `+${effect} PV Máx. inicial. (Nível ${level})`,
        baseCost: 100,
        costIncreasePerLevel: 150,
        maxLevel: 10,
        effectPerLevel: 5, // Adds 5 Max HP per level
        statTarget: 'maxHp',
    },
    {
        id: PermanentUpgradeType.Damage,
        name: "Dano de Projétil Base",
        description: (level, effect) => `+${effect} Dano inicial de projétil. (Nível ${level})`,
        baseCost: 150,
        costIncreasePerLevel: 200,
        maxLevel: 10,
        effectPerLevel: 1, // Adds 1 Projectile Damage per level
        statTarget: 'projectileDamage',
    },
    {
        id: PermanentUpgradeType.CritChance,
        name: "Sorte Crítica Inicial",
        description: (level, effect) => `+${(typeof effect === 'number' ? effect * 100 : effect)}% Chance Crítica inicial. (Nível ${level})`,
        baseCost: 200,
        costIncreasePerLevel: 250,
        maxLevel: 5, // e.g. max +2.5%
        effectPerLevel: 0.005, // Adds 0.5% Crit Chance per level
        statTarget: 'critChance',
    },
    {
        id: PermanentUpgradeType.MoveSpeed,
        name: "Agilidade Inicial",
        description: (level, effect) => `+${effect} Velocidade de Movimento inicial. (Nível ${level})`,
        baseCost: 120,
        costIncreasePerLevel: 180,
        maxLevel: 5,
        effectPerLevel: 0.2, // Adds 0.2 Move Speed per level
        statTarget: 'speed',
    },
    {
        id: PermanentUpgradeType.AttackSpeed,
        name: "Preparo Rápido Inicial",
        description: (level, effect) => `-${effect}ms Tempo de Ataque inicial. (Nível ${level})`,
        baseCost: 180,
        costIncreasePerLevel: 220,
        maxLevel: 5, // e.g., max -50ms
        effectPerLevel: 10, // Reduces attackSpeed by 10ms per level
        statTarget: 'attackSpeed',
    },
    {
        id: PermanentUpgradeType.Luck,
        name: "Amuleto da Sorte Rara",
        description: (level, effect) => `+${effect} Sorte para upgrades raros no jogo. (Nível ${level})`,
        baseCost: 300,
        costIncreasePerLevel: 400,
        maxLevel: 3,
        effectPerLevel: 1, // Adds 1 to player.upgrades.luck
        statTarget: 'luck', // Special handling
    },
];
