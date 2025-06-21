
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT, TILE_SIZE, GRAVITY, UPGRADES, INITIAL_PLAYER_BASE_STATS, PLAYER_INITIAL_HEIGHT } from '../constants';
import { Player, Enemy, Projectile, Particle, Lightning, Orb } from '../gameLogic/entities';
import { generateTerrainData, drawTerrain } from '../utils/terrain';
import { checkCollision, generateUpgradeChoices, createBurst } from '../utils/gameHelpers';
import { UpgradeChoice, KeysState, MouseState, Vector, RGBColor, PermanentUpgradesState, WaveState, DamageIndicatorInfo, DamageType, EnemyDamageTakenEvent } from '../types';
import LevelUpModal from './LevelUpModal';
import GameOverModal from './GameOverModal';
import { 
    initializeCosmicBackgroundElements, 
    CosmicBackgroundElements,
    BasicCosmicStar, 
    Galaxy, 
    Planet, 
    BlackHole, 
    ShootingStar,
    NeutronStar 
} from '../utils/cosmicBackground';
import {
    initializeDaytimeElements,
    drawDaytimeSkyGradientAndSun,
    Cloud as DaytimeCloud, // Renamed to avoid conflict if any other 'Cloud' type exists
    Bird as DaytimeBird,
    DaytimeBackgroundElements
} from '../utils/daytimeBackground';
import { AudioManager } from '../utils/audioManager';


const DAY_NIGHT_CYCLE_DURATION_SECONDS = 180; 
const BASE_NIGHT_SKY_COLOR_RGB: RGBColor = { r: 5, g: 5, b: 16}; 

// Daytime sky colors (base is for solid fill, gradient drawn on top)
const DAY_SKY_BASE_FILL_RGB: RGBColor = { r: 176, g: 224, b: 230 }; // #B0E0E6 (Powder Blue - bottom of gradient)
// DAY_SKY_COLOR_TOP_RGB defined in daytimeBackground.ts is #87CEEB (Sky Blue - top of gradient)


const DAY_PHASE_DURATION = 60 / DAY_NIGHT_CYCLE_DURATION_SECONDS; 
const DUSK_PHASE_DURATION = 30 / DAY_NIGHT_CYCLE_DURATION_SECONDS; 
const NIGHT_PHASE_DURATION = 60 / DAY_NIGHT_CYCLE_DURATION_SECONDS; 

const DAY_PHASE_END = DAY_PHASE_DURATION;
const DUSK_PHASE_END = DAY_PHASE_END + DUSK_PHASE_DURATION; 
const NIGHT_PHASE_END = DUSK_PHASE_END + NIGHT_PHASE_DURATION; 

// Colors for canvas fill transitions
const DUSK_START_COLOR_CANVAS: RGBColor = DAY_SKY_BASE_FILL_RGB;
const DUSK_END_COLOR_CANVAS_TARGET: RGBColor = BASE_NIGHT_SKY_COLOR_RGB; 
const DAWN_START_COLOR_CANVAS: RGBColor = BASE_NIGHT_SKY_COLOR_RGB;
const DAWN_END_COLOR_CANVAS_TARGET: RGBColor = DAY_SKY_BASE_FILL_RGB; 

const INTERMISSION_DURATION_SECONDS = 5;
const SPAWN_BATCH_DELAY_SECONDS = 0.75;

const DAMAGE_INDICATOR_DURATION = 0.75; // seconds
const DAMAGE_INDICATOR_FLOAT_SPEED = -50; // pixels per second (negative for upwards)


const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const lerpColor = (color1: RGBColor, color2: RGBColor, factor: number): string => {
  const r = Math.round(lerp(color1.r, color2.r, factor));
  const g = Math.round(lerp(color1.g, color2.g, factor));
  const b = Math.round(lerp(color1.b, color2.b, factor));
  return `rgb(${r},${g},${b})`;
};

const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;

// RGB color constants for UI elements, matching `drawUI` needs
const WHITE_RGB_GC: RGBColor = { r: 255, g: 255, b: 255 };
const BLACK_RGB_GC: RGBColor = { r: 0, g: 0, b: 0 };
const UI_TEXT_NIGHT_RGB: RGBColor = { r: 255, g: 255, b: 255 }; // white
const UI_TEXT_DAY_RGB: RGBColor = { r: 221, g: 221, b: 221 }; // #DDDDDD
const UI_HP_BG_NIGHT_RGB: RGBColor = { r: 127, g: 29, b: 29 }; // #7f1d1d
const UI_HP_BG_DAY_RGB: RGBColor = { r: 68, g: 0, b: 0 }; // #440000
const UI_EXP_BG_NIGHT_RGB: RGBColor = { r: 6, g: 95, b: 70 }; // #065f46
const UI_EXP_BG_DAY_RGB: RGBColor = { r: 0, g: 51, b: 0 }; // #003300
const DAMAGE_INDICATOR_TEXT_NIGHT_RGB: RGBColor = { r: 255, g: 255, b: 255 };
const DAMAGE_INDICATOR_TEXT_DAY_RGB: RGBColor = { r: 50, g: 50, b: 50 };
const UI_INTERMISSION_HIGHLIGHT_RGB: RGBColor = {r: 250, g: 204, b: 21}; // #facc15 (yellow-400)


interface GameCanvasProps {
  onGameOverSignal: (finalScore: number) => void;
  onExitToMainMenu: () => void;
  initialPermanentUpgrades: PermanentUpgradesState;
  audioManager: AudioManager | null;
}

interface WaveConfig {
    enemyCount: number;
    enemyTypes: { type: number; weight: number }[]; 
    enemyHealthMultiplier: number;
    enemySpeedMultiplier: number;
    enemyValueMultiplier: number;
    spawnBatchSize: number;
}


const GameCanvas: React.FC<GameCanvasProps> = ({ onGameOverSignal, onExitToMainMenu, initialPermanentUpgrades, audioManager }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameIdRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());

  // For offscreen cosmic background rendering
  const cosmicCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cosmicCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  const playerRef = useRef<Player>(new Player(CANVAS_WIDTH / 2, CANVAS_HEIGHT - PLAYER_INITIAL_HEIGHT / 2 - TILE_SIZE * 2, initialPermanentUpgrades));
  
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<(Particle | Lightning | Orb)[]>([]);
  const damageIndicatorsRef = useRef<DamageIndicatorInfo[]>([]);
  
  // Cosmic background refs
  const cosmicStarsRef = useRef<BasicCosmicStar[]>([]);
  const galaxiesRef = useRef<Galaxy[]>([]);
  const planetsRef = useRef<Planet[]>([]);
  const blackHolesRef = useRef<BlackHole[]>([]);
  const shootingStarsRef = useRef<ShootingStar[]>([]);
  const neutronStarsRef = useRef<NeutronStar[]>([]);

  // Daytime background refs
  const daytimeCloudsRef = useRef<DaytimeCloud[]>([]);
  const daytimeBirdsRef = useRef<DaytimeBird[]>([]);


  const terrainDataRef = useRef<number[]>(generateTerrainData());

  const keysPressedRef = useRef<KeysState>({ a: false, d: false, space: false });
  const mouseStateRef = useRef<MouseState>({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, down: false });

  const [isGameOver, setIsGameOver] = useState(false);
  const [isPausedForLevelUp, setIsPausedForLevelUp] = useState(false);
  
  const scoreRef = useRef<number>(0); 
  const [scoreState, setScoreState] = useState<number>(0); 
  
  const gameTimeRef = useRef<number>(0); 
  
  const [levelUpChoices, setLevelUpChoices] = useState<UpgradeChoice[]>([]);
  
  const [currentPlayerHp, setCurrentPlayerHp] = useState(playerRef.current.hp);
  const [currentPlayerMaxHp, setCurrentPlayerMaxHp] = useState(playerRef.current.maxHp);
  const [currentPlayerExp, setCurrentPlayerExp] = useState(playerRef.current.exp);
  const [currentPlayerExpToNextLevel, setCurrentPlayerExpToNextLevel] = useState(playerRef.current.expToNextLevel);
  const [currentPlayerLevel, setCurrentPlayerLevel] = useState(playerRef.current.level);

  const currentWaveNumberRef = useRef<number>(0);
  const waveStateRef = useRef<WaveState>('Inactive'); 
  const enemiesToSpawnThisWaveRef = useRef<number>(0);
  const enemiesSpawnedThisWaveCountRef = useRef<number>(0);
  const enemiesDefeatedThisWaveCountRef = useRef<number>(0);
  const intermissionTimerRef = useRef<number>(0);
  const spawnBatchDelayTimerRef = useRef<number>(0);
  const currentWaveConfigRef = useRef<WaveConfig | null>(null);


  useEffect(() => {
    if (!cosmicCanvasRef.current) {
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = CANVAS_WIDTH;
        offscreenCanvas.height = CANVAS_HEIGHT;
        cosmicCanvasRef.current = offscreenCanvas;
        cosmicCtxRef.current = offscreenCanvas.getContext('2d');
    }
  }, []);

  const getWaveConfig = (waveNumber: number): WaveConfig => {
    const baseEnemyCount = 5;
    const enemyCountPerWave = 2;
    const healthMultiplier = 1 + (waveNumber - 1) * 0.1;
    const speedMultiplier = 1 + (waveNumber - 1) * 0.05;
    const valueMultiplier = 1 + (waveNumber - 1) * 0.15;
    
    let enemyTypes: { type: number; weight: number }[] = [{ type: 0, weight: 1 }]; 
    if (waveNumber >= 2) {
        enemyTypes = [{ type: 0, weight: 0.6 }, { type: 1, weight: 0.4 }];
    }
    if (waveNumber >= 4) {
        enemyTypes = [{ type: 0, weight: 0.4 }, { type: 1, weight: 0.3 }, { type: 2, weight: 0.3 }];
    }
    if (waveNumber >= 6) {
        enemyTypes = [{ type: 0, weight: 0.3 }, { type: 1, weight: 0.25 }, { type: 2, weight: 0.25 }, {type: 3, weight: 0.2}];
    }

    return {
        enemyCount: baseEnemyCount + (waveNumber -1) * enemyCountPerWave,
        enemyTypes,
        enemyHealthMultiplier: healthMultiplier,
        enemySpeedMultiplier: speedMultiplier,
        enemyValueMultiplier: valueMultiplier,
        spawnBatchSize: Math.max(1, Math.min(3, Math.floor(waveNumber / 2))),
    };
  };

  const startNextWave = useCallback(() => {
    currentWaveNumberRef.current++;
    currentWaveConfigRef.current = getWaveConfig(currentWaveNumberRef.current);
    
    enemiesToSpawnThisWaveRef.current = currentWaveConfigRef.current.enemyCount;
    enemiesSpawnedThisWaveCountRef.current = 0;
    enemiesDefeatedThisWaveCountRef.current = 0;
    
    waveStateRef.current = 'Spawning';
    spawnBatchDelayTimerRef.current = SPAWN_BATCH_DELAY_SECONDS; 
    intermissionTimerRef.current = 0;
  }, []);


  const resetGame = useCallback(() => {
    playerRef.current.resetForNewGame(initialPermanentUpgrades); 
    enemiesRef.current = [];
    projectilesRef.current = [];
    particlesRef.current = [];
    damageIndicatorsRef.current = [];
    
    const cosmicElements = initializeCosmicBackgroundElements(CANVAS_WIDTH, CANVAS_HEIGHT);
    cosmicStarsRef.current = cosmicElements.stars;
    galaxiesRef.current = cosmicElements.galaxies;
    planetsRef.current = cosmicElements.planets;
    blackHolesRef.current = cosmicElements.blackHoles;
    shootingStarsRef.current = cosmicElements.shootingStars; 
    neutronStarsRef.current = cosmicElements.neutronStars;

    const daytimeElements = initializeDaytimeElements(CANVAS_WIDTH, CANVAS_HEIGHT);
    daytimeCloudsRef.current = daytimeElements.clouds;
    daytimeBirdsRef.current = daytimeElements.birds;
    
    setIsGameOver(false);
    setIsPausedForLevelUp(false);
    
    scoreRef.current = 0;
    setScoreState(0);
    
    gameTimeRef.current = DUSK_PHASE_END * DAY_NIGHT_CYCLE_DURATION_SECONDS; 

    setLevelUpChoices([]);
    lastTimeRef.current = performance.now();

    setCurrentPlayerHp(playerRef.current.hp);
    setCurrentPlayerMaxHp(playerRef.current.maxHp);
    setCurrentPlayerExp(playerRef.current.exp);
    setCurrentPlayerExpToNextLevel(playerRef.current.expToNextLevel);
    setCurrentPlayerLevel(playerRef.current.level);

    currentWaveNumberRef.current = 0; 
    startNextWave();

  }, [initialPermanentUpgrades, startNextWave]);

  useEffect(() => { 
    resetGame();
  }, [resetGame]);

  const createDamageIndicator = (text: string, x: number, y: number, type: DamageType, dayFactor: number) => {
    let colorString = 'white';
    let fontSize = TILE_SIZE * 1.2;
    switch(type) {
        case 'crit': 
            colorString = 'yellow'; 
            fontSize = TILE_SIZE * 1.5;
            break;
        case 'bleed': 
            colorString = 'darkred'; 
            fontSize = TILE_SIZE * 0.9;
            break;
        case 'superheat':
            colorString = 'orange';
            fontSize = TILE_SIZE * 1.1;
            break;
        case 'normal':
        default:
            const lerpedNormalHitBase = lerpColor(DAMAGE_INDICATOR_TEXT_NIGHT_RGB, DAMAGE_INDICATOR_TEXT_DAY_RGB, dayFactor);
            colorString = `rgba(${lerpedNormalHitBase.substring(4, lerpedNormalHitBase.length-1)}, 0.9)`;
            break;
    }

    damageIndicatorsRef.current.push({
        id: performance.now().toString() + Math.random(),
        text,
        x: x + (Math.random() - 0.5) * TILE_SIZE,
        y: y - TILE_SIZE,
        startTime: gameTimeRef.current, 
        duration: DAMAGE_INDICATOR_DURATION,
        color: colorString,
        type,
        vy: DAMAGE_INDICATOR_FLOAT_SPEED,
    });
  };


  useEffect(() => {
    const gameLoop = (timestamp: number) => {
      const deltaTime = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1); 
      lastTimeRef.current = timestamp;
      
      const mainCtx = canvasRef.current?.getContext('2d');
      const cosmicCtx = cosmicCtxRef.current;
      if (!mainCtx || !cosmicCtx) return;


      const cachedGameTimeForFrame = gameTimeRef.current; 

      const normalizedTimeInCycle = (cachedGameTimeForFrame % DAY_NIGHT_CYCLE_DURATION_SECONDS) / DAY_NIGHT_CYCLE_DURATION_SECONDS;
      let canvasFillColorSolid = ''; 
      let globalStarVisibilityFactor = 0; 
      let dayFactor = 0; // 0 for night, 1 for day. Used for entity outlines, terrain, UI, and daytime elements.
      let daytimeElementsVisibilityFactor = 0; // Specifically for sun, clouds, birds opacity

      if (normalizedTimeInCycle < DAY_PHASE_END) { // Day
        canvasFillColorSolid = `rgb(${DAY_SKY_BASE_FILL_RGB.r},${DAY_SKY_BASE_FILL_RGB.g},${DAY_SKY_BASE_FILL_RGB.b})`;
        globalStarVisibilityFactor = 0;
        dayFactor = 1.0; 
        daytimeElementsVisibilityFactor = 1.0;
      } else if (normalizedTimeInCycle < DUSK_PHASE_END) { // Dusk
        const duskProgress = (normalizedTimeInCycle - DAY_PHASE_END) / (DUSK_PHASE_END - DAY_PHASE_END);
        const easedDuskProgress = easeInOutSine(duskProgress);
        canvasFillColorSolid = lerpColor(DUSK_START_COLOR_CANVAS, DUSK_END_COLOR_CANVAS_TARGET, easedDuskProgress);
        globalStarVisibilityFactor = lerp(0, 1, easedDuskProgress);
        dayFactor = 1.0 - easedDuskProgress; 
        daytimeElementsVisibilityFactor = 1.0 - easedDuskProgress;
      } else if (normalizedTimeInCycle < NIGHT_PHASE_END) { // Night
        canvasFillColorSolid = `rgb(${BASE_NIGHT_SKY_COLOR_RGB.r},${BASE_NIGHT_SKY_COLOR_RGB.g},${BASE_NIGHT_SKY_COLOR_RGB.b})`;
        globalStarVisibilityFactor = 1;
        dayFactor = 0.0; 
        daytimeElementsVisibilityFactor = 0.0;
      } else { // Dawn
        const dawnProgress = (normalizedTimeInCycle - NIGHT_PHASE_END) / (1.0 - NIGHT_PHASE_END);
        const easedDawnProgress = easeInOutSine(dawnProgress);
        canvasFillColorSolid = lerpColor(DAWN_START_COLOR_CANVAS, DAWN_END_COLOR_CANVAS_TARGET, easedDawnProgress);
        globalStarVisibilityFactor = lerp(1, 0, easedDawnProgress);
        dayFactor = easedDawnProgress;
        daytimeElementsVisibilityFactor = easedDawnProgress;
      }

      if (!isGameOver && !isPausedForLevelUp) {
        gameTimeRef.current += deltaTime; 
        
        const playerResult = playerRef.current.update(deltaTime, keysPressedRef.current, mouseStateRef.current, terrainDataRef.current, enemiesRef.current);
        if (playerResult.newProjectiles) {
            projectilesRef.current.push(...playerResult.newProjectiles);
            if (playerResult.newProjectiles.some(p => p.owner === 'player')) { 
                audioManager?.playSound('player_shoot', { volume: 0.6, playbackRate: 1 + Math.random() * 0.1});
            }
        }
        if (playerResult.newParticles) particlesRef.current.push(...playerResult.newParticles);

        if (playerResult.leveledUp) {
          setIsPausedForLevelUp(true);
          const choices = generateUpgradeChoices(playerRef.current.upgrades.numLevelUpChoices, playerRef.current.upgrades.luck);
          setLevelUpChoices(choices);
          audioManager?.playSound('level_up', { volume: 0.8 });
        }
        
        if (waveStateRef.current === 'Spawning') {
            spawnBatchDelayTimerRef.current -= deltaTime;
            if (spawnBatchDelayTimerRef.current <= 0 && enemiesSpawnedThisWaveCountRef.current < enemiesToSpawnThisWaveRef.current) {
                spawnEnemiesBatch();
                enemiesSpawnedThisWaveCountRef.current += currentWaveConfigRef.current?.spawnBatchSize || 1;
                spawnBatchDelayTimerRef.current = SPAWN_BATCH_DELAY_SECONDS;
            }
            if (enemiesSpawnedThisWaveCountRef.current >= enemiesToSpawnThisWaveRef.current) {
                waveStateRef.current = 'WaitingForClear';
            }
        } else if (waveStateRef.current === 'Intermission') {
            intermissionTimerRef.current -= deltaTime;
            if (intermissionTimerRef.current <= 0) {
                startNextWave();
            }
        }

        const newEnemyProjectiles: Projectile[] = [];
        for (let enemyIdx = enemiesRef.current.length - 1; enemyIdx >=0; enemyIdx--) {
          const enemy = enemiesRef.current[enemyIdx];
          const enemyResult = enemy.update(deltaTime, playerRef.current);

          if (enemyResult.damageTakenEvents) {
            enemyResult.damageTakenEvents.forEach(event => {
                createDamageIndicator(
                    Math.max(1, Math.floor(event.amount)).toString(), 
                    enemy.position.x, 
                    enemy.position.y - enemy.height / 2, 
                    event.type,
                    dayFactor 
                );
            });
          }

          if (enemyResult.newProjectiles) {
            newEnemyProjectiles.push(...enemyResult.newProjectiles);
            audioManager?.playSound('enemy_shoot', { volume: 0.4, playbackRate: 0.9 + Math.random() * 0.2 });
          }
          if (enemyResult.died) {
            enemiesDefeatedThisWaveCountRef.current++;
            if (enemyResult.value && currentWaveConfigRef.current) {
                const waveScaledValue = Math.floor(enemyResult.value * currentWaveConfigRef.current.enemyValueMultiplier);
                playerRef.current.gainExp(waveScaledValue);
                const newScore = scoreRef.current + waveScaledValue * 10;
                scoreRef.current = newScore;
                setScoreState(newScore); 
            }
            if (enemyResult.newParticles) particlesRef.current.push(...enemyResult.newParticles);
            if (enemyResult.orbs) particlesRef.current.push(...enemyResult.orbs); 
            enemiesRef.current.splice(enemyIdx, 1);
            audioManager?.playSound('enemy_death', { volume: 0.5, playbackRate: 0.8 + Math.random() * 0.4 });


            if (waveStateRef.current === 'WaitingForClear' && 
                enemiesDefeatedThisWaveCountRef.current >= enemiesToSpawnThisWaveRef.current &&
                enemiesRef.current.length === 0) {
                waveStateRef.current = 'Intermission';
                intermissionTimerRef.current = INTERMISSION_DURATION_SECONDS;
                gameTimeRef.current += DAY_NIGHT_CYCLE_DURATION_SECONDS / 3; 
                audioManager?.playSound('level_up', {volume: 0.7, playbackRate: 0.8});
            }
          }
        }
        projectilesRef.current.push(...newEnemyProjectiles);

        for (let projIndex = projectilesRef.current.length - 1; projIndex >= 0; projIndex--) {
            const proj = projectilesRef.current[projIndex];
            if (!proj) continue; 
            
            proj.update(deltaTime);
            let projectileRemovedThisFrame = false;

            if (proj.owner === 'player') {
                let hitAnEnemy = false;
                enemiesRef.current.forEach((enemy) => { 
                    if (checkCollision(proj, enemy)) { 
                        const damageDealt = proj.damage;
                        enemy.takeDamageFromProjectile(damageDealt, proj.applyCold, proj.applyBleed);
                        createDamageIndicator(
                            Math.max(1, Math.floor(damageDealt)).toString(),
                            enemy.position.x, 
                            enemy.position.y - enemy.height / 2, 
                            proj.isCrit ? 'crit' : 'normal',
                            dayFactor
                        );
                        hitAnEnemy = true;
                        if (playerRef.current.lifesteal > 0) {
                            playerRef.current.hp = Math.min(playerRef.current.maxHp, playerRef.current.hp + damageDealt * playerRef.current.lifesteal);
                        }
                        proj.onHit(); 
                    }
                });
                 if(hitAnEnemy) audioManager?.playSound('enemy_hit', { volume: 0.5, playbackRate: 1.0 + Math.random()*0.2 });

                if (proj.hitsLeft <= 0) {
                    if (proj.isExplosive) {
                        particlesRef.current.push(...createBurst(proj.position.x, proj.position.y, 10, '#a855f7', CANVAS_WIDTH, CANVAS_HEIGHT)); 
                        audioManager?.playSound('explosion', { volume: 0.6 });
                    }
                    projectilesRef.current.splice(projIndex, 1);
                    projectileRemovedThisFrame = true;
                }
            } else { 
                if (checkCollision(
                    proj, 
                    { position: playerRef.current.position, width: playerRef.current.width * playerRef.current.upgrades.shrink, height: playerRef.current.height * playerRef.current.upgrades.shrink }
                )) {
                    particlesRef.current.push(...createBurst(proj.position.x, proj.position.y, 8, '#FF4500', CANVAS_WIDTH, CANVAS_HEIGHT)); 
                    const damageResult = playerRef.current.takeDamage(proj.damage);
                    audioManager?.playSound('player_hit', { volume: 0.7 });
                    if(damageResult.barrierBroken) audioManager?.playSound('barrier_break', {volume: 0.8});
                    if(damageResult.newParticles) particlesRef.current.push(...damageResult.newParticles);
                    if (damageResult.isDead) {
                        setIsGameOver(true);
                        onGameOverSignal(scoreRef.current); 
                    } else if (damageResult.usedRevive) {
                        enemiesRef.current.forEach(e => e.hp = 0); 
                        audioManager?.playSound('level_up', { volume: 1.0, playbackRate: 0.7 }); 
                    }
                    projectilesRef.current.splice(projIndex, 1);
                    projectileRemovedThisFrame = true;
                }

                if (!projectileRemovedThisFrame) {
                    const groundY = terrainDataRef.current[Math.floor(proj.position.x)] ?? CANVAS_HEIGHT;
                    if (proj.position.y + proj.size / 2 >= groundY && proj.position.y < CANVAS_HEIGHT ) { 
                        particlesRef.current.push(...createBurst(proj.position.x, proj.position.y, 5, '#8B4513', CANVAS_WIDTH, CANVAS_HEIGHT)); 
                        projectilesRef.current.splice(projIndex, 1);
                        projectileRemovedThisFrame = true;
                    }
                }
            }

            if (!projectileRemovedThisFrame) {
                if (proj.position.x < -TILE_SIZE * 2 || proj.position.x > CANVAS_WIDTH + TILE_SIZE * 2 || proj.position.y < -TILE_SIZE * 2 || proj.position.y > CANVAS_HEIGHT + TILE_SIZE * 2 || proj.hitsLeft <=0) {
                    projectilesRef.current.splice(projIndex, 1);
                }
            }
        }

        for (let pIndex = particlesRef.current.length - 1; pIndex >= 0; pIndex--) {
          const p = particlesRef.current[pIndex];
          if (p instanceof Lightning) {
             const lightningHitResult = p.update(deltaTime, enemiesRef.current);
             if (lightningHitResult.damagedEnemies) {
                lightningHitResult.damagedEnemies.forEach(hitEnemy => {
                    createDamageIndicator(
                        Math.floor(p['damage']).toString(), 
                        hitEnemy.position.x,
                        hitEnemy.position.y - hitEnemy.height / 2,
                        'normal', 
                        dayFactor
                    );
                });
             }
          } else if (p instanceof Orb) {
            const orbResult = p.update(deltaTime, playerRef.current);
            if (orbResult.collected) {
                if (orbResult.type === 'heal') {
                    playerRef.current.hp = Math.min(playerRef.current.maxHp, playerRef.current.hp + playerRef.current.maxHp * 0.1);
                } else if (orbResult.type === 'soul') {
                    playerRef.current.gainExp(playerRef.current.expToNextLevel * 0.1);
                }
                audioManager?.playSound('orb_collect', {volume: 0.6, playbackRate: 1.0 + Math.random()*0.3});
            }
          } else { 
            p.update(deltaTime);
          }
          if (p.life <= 0) {
            particlesRef.current.splice(pIndex, 1);
          }
        }

        for (let i = damageIndicatorsRef.current.length - 1; i >= 0; i--) {
            const indicator = damageIndicatorsRef.current[i];
            indicator.y += indicator.vy * deltaTime;
            if (cachedGameTimeForFrame - indicator.startTime >= indicator.duration) { 
                damageIndicatorsRef.current.splice(i, 1);
            }
        }

        // Update cosmic background elements' internal states
        if (globalStarVisibilityFactor > 0.01) {
            cosmicStarsRef.current.forEach(s => s.update());
            galaxiesRef.current.forEach(g => g.update());
            planetsRef.current.forEach(p => p.update());
            blackHolesRef.current.forEach(b => b.update());
            shootingStarsRef.current.forEach(ss => ss.update());
            neutronStarsRef.current.forEach(ns => ns.update());

            if (Math.random() < 0.01 * deltaTime * 60) shootingStarsRef.current.push(new ShootingStar(CANVAS_WIDTH, CANVAS_HEIGHT));
            if (Math.random() < 0.0005 * deltaTime * 60 && cosmicStarsRef.current.length > 0) {
                const starToCollapse = cosmicStarsRef.current[Math.floor(Math.random() * cosmicStarsRef.current.length)];
                neutronStarsRef.current.push(new NeutronStar(starToCollapse.x, starToCollapse.y, CANVAS_WIDTH));
            }
            shootingStarsRef.current = shootingStarsRef.current.filter(ss => ss.active);
            neutronStarsRef.current = neutronStarsRef.current.filter(ns => ns.active);
        }

        // Update daytime background elements
        if (daytimeElementsVisibilityFactor > 0.01) {
            daytimeCloudsRef.current.forEach(c => c.update(CANVAS_WIDTH));
            daytimeBirdsRef.current.forEach(b => b.update(CANVAS_WIDTH, CANVAS_HEIGHT));
        }


        setCurrentPlayerHp(playerRef.current.hp);
        setCurrentPlayerMaxHp(playerRef.current.maxHp);
        setCurrentPlayerExp(playerRef.current.exp);
        setCurrentPlayerExpToNextLevel(playerRef.current.expToNextLevel);
        setCurrentPlayerLevel(playerRef.current.level);

        if (playerRef.current.hp <= 0 && !playerRef.current.upgrades.revives && playerRef.current.invincibilityTimer <= 0) {
            setIsGameOver(true);
            onGameOverSignal(scoreRef.current); 
        }
      } 
      
      // --- Drawing ---

      // --- Cosmic Background (on offscreen canvas, with trails) ---
      if (globalStarVisibilityFactor > 0.01) {
          cosmicCtx.fillStyle = `rgba(${BASE_NIGHT_SKY_COLOR_RGB.r}, ${BASE_NIGHT_SKY_COLOR_RGB.g}, ${BASE_NIGHT_SKY_COLOR_RGB.b}, ${0.2 * globalStarVisibilityFactor})`;
          cosmicCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

          cosmicStarsRef.current.forEach(s => s.draw(cosmicCtx));
          galaxiesRef.current.forEach(g => g.draw(cosmicCtx));
          planetsRef.current.forEach(p => p.draw(cosmicCtx));
          blackHolesRef.current.forEach(b => b.draw(cosmicCtx));
          shootingStarsRef.current.forEach(ss => ss.draw(cosmicCtx));
          neutronStarsRef.current.forEach(ns => ns.draw(cosmicCtx));
      } else {
          cosmicCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      // --- Main Game Scene (on primary canvas) ---
      mainCtx.fillStyle = canvasFillColorSolid; 
      mainCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw Daytime Sky (Gradient, Sun) if visible
      if (daytimeElementsVisibilityFactor > 0.01) {
          drawDaytimeSkyGradientAndSun(mainCtx, CANVAS_WIDTH, CANVAS_HEIGHT, daytimeElementsVisibilityFactor);
      }
      
      // Draw Cosmic Background from offscreen canvas if visible
      if (cosmicCanvasRef.current && globalStarVisibilityFactor > 0.01) {
          mainCtx.globalAlpha = globalStarVisibilityFactor; 
          mainCtx.drawImage(cosmicCanvasRef.current, 0, 0);
          mainCtx.globalAlpha = 1; 
      }

      // Draw Daytime Elements (Clouds, Birds) on top of sky/cosmic, if visible
      if (daytimeElementsVisibilityFactor > 0.01) {
          daytimeCloudsRef.current.forEach(c => c.draw(mainCtx, daytimeElementsVisibilityFactor));
          daytimeBirdsRef.current.forEach(b => b.draw(mainCtx, daytimeElementsVisibilityFactor));
      }
      
      // Draw game entities (crisp)
      drawTerrain(mainCtx, terrainDataRef.current, dayFactor); 
      particlesRef.current.forEach(p => {
        if (p instanceof Orb) { p.draw(mainCtx, dayFactor); } 
        else { p.draw(mainCtx); }
      }); 
      enemiesRef.current.forEach(e => e.draw(mainCtx, playerRef.current, dayFactor));
      projectilesRef.current.forEach(p => p.draw(mainCtx, dayFactor)); 
      playerRef.current.draw(mainCtx, mouseStateRef.current, dayFactor); 
      
      damageIndicatorsRef.current.forEach(indicator => {
          const elapsedTime = cachedGameTimeForFrame - indicator.startTime; 
          const alpha = Math.max(0, 1 - (elapsedTime / indicator.duration));
          
          let fontSize = TILE_SIZE * 1.2;
          if (indicator.type === 'crit') fontSize = TILE_SIZE * 1.5;
          else if (indicator.type === 'bleed') fontSize = TILE_SIZE * 0.9;
          else if (indicator.type === 'superheat') fontSize = TILE_SIZE * 1.1;

          mainCtx.font = `bold ${fontSize}px Courier New`;
          if (indicator.color.startsWith('rgba')) {
            mainCtx.fillStyle = indicator.color.replace(/,\s*\d?\.?\d*\)$/, `, ${alpha.toFixed(2)})`);
          } else { 
             const tempColor = indicator.color.startsWith('#') ? hexToRgb(indicator.color) : indicator.color; 
             if (tempColor.includes(',')) { 
                mainCtx.fillStyle = `rgba(${tempColor}, ${alpha.toFixed(2)})`;
             } else { 
                mainCtx.save();
                mainCtx.globalAlpha = alpha;
                mainCtx.fillStyle = tempColor;
             }
          }
          mainCtx.textAlign = 'center';
          mainCtx.fillText(indicator.text, indicator.x, indicator.y);
          if (!indicator.color.startsWith('rgba') && !indicator.color.includes(',')) {
            mainCtx.restore(); 
          }
      });

      drawUI(
        mainCtx, 
        dayFactor, 
        cachedGameTimeForFrame, 
        playerRef.current.hp,
        playerRef.current.maxHp,
        playerRef.current.exp,
        playerRef.current.expToNextLevel,
        playerRef.current.level,
        scoreRef.current,
        currentWaveNumberRef.current,
        waveStateRef.current,
        enemiesToSpawnThisWaveRef.current,
        enemiesDefeatedThisWaveCountRef.current,
        intermissionTimerRef.current,
        enemiesRef.current.length
      ); 
      
      animationFrameIdRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameIdRef.current = requestAnimationFrame(gameLoop);
    return () => {
      cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, [isGameOver, isPausedForLevelUp, resetGame, onGameOverSignal, startNextWave, audioManager]);

  const hexToRgb = (hex: string): string => {
    if (hex.startsWith('rgb')) return hex.substring(hex.indexOf('(') + 1, hex.lastIndexOf(')'));
    let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255,255,255';
  };


  const spawnEnemiesBatch = () => {
    if (!currentWaveConfigRef.current) return;
    const config = currentWaveConfigRef.current;
    const batchSize = Math.min(config.spawnBatchSize, enemiesToSpawnThisWaveRef.current - enemiesSpawnedThisWaveCountRef.current);

    for (let i = 0; i < batchSize; i++) {
        const x = Math.random() < 0.5 ? -TILE_SIZE * 3 : CANVAS_WIDTH + TILE_SIZE * 3; 
        const y = Math.random() * CANVAS_HEIGHT * 0.7 + TILE_SIZE * 2; 
        
        let chosenType = 0;
        const typeRoll = Math.random();
        let cumulativeWeight = 0;
        for (const typeOption of config.enemyTypes) {
            cumulativeWeight += typeOption.weight;
            if (typeRoll <= cumulativeWeight) {
                chosenType = typeOption.type;
                break;
            }
        }
        
        const baseStats = {
            pawn: { health: 30, speed: 1.6, value: 2, shootCooldownBase: 2.0, shootCooldownRand: 1.5 },
            cannon: { health: 55, speed: 1.0, value: 3, shootCooldownBase: 2.5, shootCooldownRand: 2.0 },
            spiker: { health: 20, speed: 2.3, value: 2, shootCooldownBase: 0.8, shootCooldownRand: 0.7 },
            bruiser: { health: 120, speed: 0.65, value: 5, shootCooldownBase: 3.5, shootCooldownRand: 2.0 },
        };

        let enemyStatPreset;
        switch (chosenType) {
            case 0: enemyStatPreset = baseStats.pawn; break;
            case 1: enemyStatPreset = baseStats.cannon; break;
            case 2: enemyStatPreset = baseStats.spiker; break;
            case 3: enemyStatPreset = baseStats.bruiser; break;
            default: enemyStatPreset = baseStats.pawn; break;
        }

        const health = Math.floor(enemyStatPreset.health * config.enemyHealthMultiplier);
        const speed = parseFloat((enemyStatPreset.speed * config.enemySpeedMultiplier).toFixed(2));
        const value = Math.floor(enemyStatPreset.value); 
        const initialShootCooldown = enemyStatPreset.shootCooldownBase + Math.random() * enemyStatPreset.shootCooldownRand;
        
        enemiesRef.current.push(new Enemy(x, y, chosenType, health, speed, value, initialShootCooldown));
    }
  };

  const drawUI = (
      ctx: CanvasRenderingContext2D, 
      dayFactor: number, // 0 for night, 1 for day
      currentTimeParam: number,
      hpParam: number, maxHpParam: number, 
      expParam: number, expToNextLevelParam: number, levelParam: number,
      scoreParam: number,
      waveNumParam: number, waveStateParam: WaveState, 
      enemiesToSpawnParam: number, enemiesDefeatedParam: number, 
      intermissionTimeParam: number, activeEnemiesParam: number
    ) => {
      const uiOutlineColor = lerpColor(WHITE_RGB_GC, BLACK_RGB_GC, dayFactor);
      const uiTextColor = lerpColor(UI_TEXT_NIGHT_RGB, UI_TEXT_DAY_RGB, dayFactor);
      
      const hpBarWidth = 300;
      ctx.fillStyle = lerpColor(UI_HP_BG_NIGHT_RGB, UI_HP_BG_DAY_RGB, dayFactor);
      ctx.fillRect(10, 10, hpBarWidth, 20);
      ctx.fillStyle = '#ef4444'; 
      const currentHpNormalized = Math.max(0, hpParam / maxHpParam);
      ctx.fillRect(10, 10, hpBarWidth * currentHpNormalized, 20);
      ctx.strokeStyle = uiOutlineColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, hpBarWidth, 20);
      
      ctx.font = '16px Courier New';
      ctx.textAlign = 'center';
      
      const hpText = `${Math.ceil(hpParam)} / ${Math.ceil(maxHpParam)}`;
      ctx.strokeStyle = `rgba(0,0,0,${dayFactor})`; // Black stroke, fades in with day
      ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
      if (dayFactor > 0.01) ctx.strokeText(hpText, 10 + hpBarWidth / 2, 26);
      ctx.fillStyle = uiTextColor;
      ctx.fillText(hpText, 10 + hpBarWidth / 2, 26);
      
      const expBarWidth = 300;
      ctx.fillStyle = lerpColor(UI_EXP_BG_NIGHT_RGB, UI_EXP_BG_DAY_RGB, dayFactor);
      ctx.fillRect(10, 35, expBarWidth, 15);
      ctx.fillStyle = '#34d399'; 
      const currentExpNormalized = Math.max(0, expParam / expToNextLevelParam);
      ctx.fillRect(10, 35, expBarWidth * currentExpNormalized, 15);
      ctx.strokeStyle = uiOutlineColor;
      ctx.strokeRect(10, 35, expBarWidth, 15);
      
      const lvlText = `LVL ${levelParam}`;
      ctx.strokeStyle = `rgba(0,0,0,${dayFactor})`;
      if (dayFactor > 0.01) ctx.strokeText(lvlText, 10 + expBarWidth / 2, 48);
      ctx.fillStyle = uiTextColor;
      ctx.fillText(lvlText, 10 + expBarWidth / 2, 48);
      
      const minutes = Math.floor(currentTimeParam / 60);
      const seconds = Math.floor(currentTimeParam % 60);
      ctx.textAlign = 'right';
      const scoreText = `Pontos: ${scoreParam}`;
      const timeText = `Tempo: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      
      ctx.strokeStyle = `rgba(0,0,0,${dayFactor * 0.8})`; 
      ctx.lineWidth = 3; ctx.lineJoin = 'round'; 
      if (dayFactor > 0.01) {
          ctx.strokeText(scoreText, CANVAS_WIDTH - 20, 30);
          ctx.strokeText(timeText, CANVAS_WIDTH - 20, 50);
      }
      ctx.fillStyle = uiTextColor;
      ctx.fillText(scoreText, CANVAS_WIDTH - 20, 30);
      ctx.fillText(timeText, CANVAS_WIDTH - 20, 50);

      ctx.textAlign = 'center';
      const waveNumberText = `Wave: ${waveNumParam}`;
      ctx.strokeStyle = `rgba(0,0,0,${dayFactor})`;
      if (dayFactor > 0.01) ctx.strokeText(waveNumberText, CANVAS_WIDTH / 2, 30);
      ctx.fillStyle = uiTextColor;
      ctx.fillText(waveNumberText, CANVAS_WIDTH / 2, 30);


      let waveStatusText = "";
      if (waveStateParam === 'Spawning' || waveStateParam === 'WaitingForClear') {
        const enemiesLeft = enemiesToSpawnParam - enemiesDefeatedParam;
        waveStatusText = `Ativos: ${activeEnemiesParam} / Faltam: ${enemiesLeft > 0 ? enemiesLeft : 0}`;
      } else if (waveStateParam === 'Intermission') {
        ctx.font = 'bold 20px Courier New';
        const intermissionMainText = `Wave ${waveNumParam} Concluída!`;
        const intermissionSubText = `Próxima wave em ${Math.ceil(intermissionTimeParam)}s...`;
        
        ctx.strokeStyle = `rgba(0,0,0,${dayFactor * 1.2})`; 
        ctx.lineWidth = 3.5; ctx.lineJoin = 'round';
        if (dayFactor > 0.01) ctx.strokeText(intermissionMainText, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
        ctx.fillStyle = lerpColor(UI_INTERMISSION_HIGHLIGHT_RGB, BLACK_RGB_GC, dayFactor * 0.5); 
        ctx.fillText(intermissionMainText, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
            
        ctx.font = '16px Courier New';
        ctx.strokeStyle = `rgba(0,0,0,${dayFactor})`; 
        ctx.lineWidth = 3; ctx.lineJoin = 'round';
        if (dayFactor > 0.01) ctx.strokeText(intermissionSubText, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
        ctx.fillStyle = uiTextColor; 
        ctx.fillText(intermissionSubText, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
      }
      if(waveStatusText) {
         ctx.font = '16px Courier New';
         ctx.strokeStyle = `rgba(0,0,0,${dayFactor})`;
         if (dayFactor > 0.01) ctx.strokeText(waveStatusText, CANVAS_WIDTH / 2, 50);
         ctx.fillStyle = uiTextColor; 
         ctx.fillText(waveStatusText, CANVAS_WIDTH / 2, 50);
      }
      ctx.textAlign = 'left'; 
  };

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      keysPressedRef.current[event.code] = true;
      if (event.code === 'Space' && !isGameOver && !isPausedForLevelUp) {
        playerRef.current.attemptJump(terrainDataRef.current);
        audioManager?.playSound('player_jump', { volume: 0.5 });
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => { keysPressedRef.current[event.code] = false; };
    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseStateRef.current.x = event.clientX - rect.left;
      mouseStateRef.current.y = event.clientY - rect.top;
    };
    const handleMouseDown = (event: MouseEvent) => { 
        if (isPausedForLevelUp) {
            // Click handled by modal
        } else if (!isGameOver) {
            mouseStateRef.current.down = true; 
        }
    };
    const handleMouseUp = () => { mouseStateRef.current.down = false; };
    window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove); canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp); 
    return () => {
      window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('mousemove', handleMouseMove); canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isGameOver, isPausedForLevelUp, audioManager]);

  const handleSelectUpgrade = (upgrade: UpgradeChoice) => {
    playerRef.current.applyUpgrade(upgrade.apply);
    setIsPausedForLevelUp(false);
    setLevelUpChoices([]);
    lastTimeRef.current = performance.now(); 
    setCurrentPlayerHp(playerRef.current.hp);
    setCurrentPlayerMaxHp(playerRef.current.maxHp);
    audioManager?.playSound('ui_click', { volume: 0.8 });
  };

  const handleRestartGame = () => {
    audioManager?.playSound('ui_click');
    resetGame();
  }

  const handleGoToMainMenu = () => {
    audioManager?.playSound('ui_click');
    onExitToMainMenu();
  }

  return (
    <div className="relative">
       <div className="absolute top-0 left-0 p-2 text-xs text-neutral-400 z-10" aria-hidden="true">
        <span>A/D/Setas: Mover</span> | <span>Espaço: Pular</span> | <span>Mouse: Mirar/Atirar</span>
      </div>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-2 border-neutral-700 shadow-2xl rounded-lg"
        style={{ cursor: 'crosshair' }}
        aria-label="Game Area"
      />
      {isPausedForLevelUp && levelUpChoices.length > 0 && (
        <LevelUpModal choices={levelUpChoices} onSelectUpgrade={handleSelectUpgrade} audioManager={audioManager} />
      )}
      {isGameOver && (
        <GameOverModal score={scoreState} onRestart={handleRestartGame} onGoToMainMenu={handleGoToMainMenu} audioManager={audioManager}/>
      )}
    </div>
  );
};

export default GameCanvas;
