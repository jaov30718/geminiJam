
import { Player, Enemy, Projectile, Particle, Wisp, Lightning, Orb } from './gameLogic/entities';

export interface Vector {
  x: number;
  y: number;
}

export interface GameObject {
  position: Vector;
  velocity?: Vector;
  width?: number;
  height?: number;
  size?: number; // For circular objects like projectiles/particles
  draw: (ctx: CanvasRenderingContext2D, ...args: any[]) => void;
  update: (deltaTime: number, ...args: any[]) => any;
}

export interface Collidable {
  position: Vector;
  width?: number;
  height?: number;
  size?: number;
}

export type GameEntityType = Player | Enemy | Projectile | Particle | Wisp | Lightning | Orb;


export interface Upgrade {
  id: string;
  name: string;
  desc: string;
  apply: (player: Player) => void; // Player type from entities
  rarity?: Rarity; // Optional because base UPGRADES structure has rarity implicitly by category
}

export interface UpgradeChoice extends Upgrade {
  rarity: Rarity;
}

export enum Rarity {
  Common = 'common',
  Uncommon = 'uncommon',
  Epic = 'epic',
}

export interface KeysState {
  a: boolean;
  d: boolean;
  space: boolean;
  [key: string]: boolean; // For extensibility
}

export interface MouseState {
  x: number;
  y: number;
  down: boolean;
}

export interface PlayerBaseStats {
  speed: number;
  jumpPower: number;
  maxHp: number;
  attackSpeed: number; // ms
  projectileDamage: number;
  critChance: number;
  critDamage: number;
  defense: number;
  lifesteal: number;
  maxJumps: number;
  projectileHits: number; // Stability
}

export interface PlayerUpgrades {
  revives: number;
  numLevelUpChoices: number;
  commonEffectiveness: number;
  rage: boolean;
  fragmentation: number;
  friction: number;
  thunderbolt: number;
  thunderboltCooldown: number;
  willowisp: boolean;
  wisp: Wisp | null;
  bleed: boolean;
  superheat: boolean;
  barrier: boolean;
  barrierCooldown: number;
  barrierReady: boolean;
  cold: boolean;
  regeneration: boolean;
  shrink: number;
  camouflage: number; // Invincibility duration multiplier
  soulOrbChance: number;
  healOrbChance: number;
  focus: boolean;
  focusBonus: number;
  focusTimer: number;
  luck?: number; // For upgrade rarity
}

export type OrbType = 'heal' | 'soul';
export type ProjectileOwner = 'player' | 'enemy';

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

// --- Main Menu and Shop System Types ---
export type ScreenState = 'MainMenu' | 'Playing' | 'Shop' | 'Options';

export enum PermanentUpgradeType {
  Vitality = 'vitality',          // Increases base Max HP
  Damage = 'damage',              // Increases base Projectile Damage
  CritChance = 'critChance',      // Increases base Crit Chance
  MoveSpeed = 'moveSpeed',        // Increases base Movement Speed
  AttackSpeed = 'attackSpeed',    // Decreases base Attack Speed (ms)
  Luck = 'luck',                  // Increases base luck for in-game upgrade rarity
}

export interface PermanentUpgradesState {
  [PermanentUpgradeType.Vitality]: number;
  [PermanentUpgradeType.Damage]: number;
  [PermanentUpgradeType.CritChance]: number;
  [PermanentUpgradeType.MoveSpeed]: number;
  [PermanentUpgradeType.AttackSpeed]: number;
  [PermanentUpgradeType.Luck]: number;
}

export interface ShopItem {
  id: PermanentUpgradeType;
  name: string;
  description: (level: number, effectPerLevel: number | string) => string;
  baseCost: number;
  costIncreasePerLevel: number;
  maxLevel: number;
  effectPerLevel: number | string; // Can be number for direct addition, or string for percentage/description
  statTarget: keyof PlayerBaseStats | 'luck'; // 'luck' is special, handled in PlayerUpgrades
}

// --- Wave System Types ---
export type WaveState = 'Spawning' | 'WaitingForClear' | 'Intermission' | 'Inactive';

// --- Audio System Types ---
export interface AudioSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
}

export type SoundEffectType =
  | 'player_shoot'
  | 'player_jump'
  | 'player_hit'
  | 'level_up'
  | 'enemy_hit'
  | 'enemy_shoot'
  | 'enemy_death'
  | 'explosion'
  | 'ui_click'
  | 'barrier_break'
  | 'orb_collect'
  | 'shop_purchase'
  | 'game_over';

export type MusicTrackType =
  | 'main_menu'
  | 'gameplay';

export interface PlaySoundOptions {
    loop?: boolean;
    volume?: number; // 0.0 to 1.0, relative to SFX gain
    playbackRate?: number;
}

export interface PlayMusicOptions {
    loop?: boolean;
    volume?: number; // 0.0 to 1.0, relative to Music gain
    fadeInDuration?: number; // in seconds
    fadeOutDuration?: number; // in seconds
}

// --- Game Feedback Types ---
export type DamageType = 'normal' | 'crit' | 'bleed' | 'superheat';

export interface DamageIndicatorInfo {
  id: string;
  text: string;
  x: number;
  y: number;
  startTime: number;
  duration: number;
  color: string;
  type: DamageType;
  vy: number; // Vertical velocity for floating effect
}

export interface EnemyDamageTakenEvent {
    amount: number;
    type: DamageType; // e.g., 'bleed', 'superheat' for internally generated damage
}

export interface EnemyUpdateResult {
  newProjectiles?: Projectile[];
  died?: boolean;
  value?: number;
  newParticles?: Particle[];
  orbs?: Orb[];
  damageTakenEvents?: EnemyDamageTakenEvent[];
}