
import { Vector, GameObject, PlayerBaseStats, PlayerUpgrades, OrbType, ProjectileOwner, RGBColor, PermanentUpgradesState, PermanentUpgradeType, EnemyUpdateResult, EnemyDamageTakenEvent, DamageType } from '../types';
import { GRAVITY, TILE_SIZE, INITIAL_PLAYER_BASE_STATS, PLAYER_INITIAL_HEIGHT, PLAYER_INITIAL_WIDTH, CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';
import { checkCollision, distance, findClosestEnemy, createBurst } from '../utils/gameHelpers';

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const lerpColorsForEntities = (color1: RGBColor, color2: RGBColor, factor: number): string => {
  const r = Math.round(lerp(color1.r, color2.r, factor));
  const g = Math.round(lerp(color1.g, color2.g, factor));
  const b = Math.round(lerp(color1.b, color2.b, factor));
  return `rgb(${r},${g},${b})`;
};

const BLACK_RGB: RGBColor = { r: 0, g: 0, b: 0 };
const WHITE_RGB: RGBColor = { r: 255, g: 255, b: 255 };
const HEALTH_BAR_RED_RGB: RGBColor = { r: 220, g: 38, b: 38 }; // Tailwind red-600
const HEALTH_BAR_DARK_RED_RGB: RGBColor = { r: 127, g: 29, b: 29 }; // Tailwind red-800

export class Player implements GameObject {
    public position: Vector;
    public velocity: Vector;
    public width: number;
    public height: number;

    public baseStats: PlayerBaseStats;
    public upgrades: PlayerUpgrades;

    public speed: number;
    public jumpPower: number;
    public maxHp: number;
    public hp: number;
    public attackSpeed: number;
    public projectileDamage: number;
    public critChance: number;
    public critDamage: number;
    public defense: number;
    public lifesteal: number;
    public maxJumps: number;
    public jumpsLeft: number;
    public projectileSize: number;
    public projectileHits: number;
    
    public level: number;
    public exp: number;
    public expToNextLevel: number;
    
    public invincibilityTimer: number;
    public invincibilityDuration: number;
    
    public fireCooldown: number;
    public distanceWalked: number;

    constructor(initialX: number, initialY: number, permanentUpgrades?: PermanentUpgradesState) {
        this.position = { x: initialX, y: initialY };
        this.velocity = { x: 0, y: 0 };
        this.width = PLAYER_INITIAL_WIDTH;
        this.height = PLAYER_INITIAL_HEIGHT;
        
        this.baseStats = { ...INITIAL_PLAYER_BASE_STATS };
        if (permanentUpgrades) {
            this.applyPermanentUpgradesToBaseStats(permanentUpgrades);
        }
        
        this.upgrades = this.getInitialUpgrades(permanentUpgrades);
        this.initStats();

        this.level = 1;
        this.exp = 0;
        this.expToNextLevel = 10;
        this.invincibilityTimer = 0;
        this.invincibilityDuration = 0.5;
        this.fireCooldown = 0;
        this.distanceWalked = 0;
    }

    private applyPermanentUpgradesToBaseStats(permUpgrades: PermanentUpgradesState): void {
        this.baseStats.maxHp += permUpgrades[PermanentUpgradeType.Vitality] * 5; // Example: 5 HP per level
        this.baseStats.projectileDamage += permUpgrades[PermanentUpgradeType.Damage] * 1; // Example: 1 Dmg per level
        this.baseStats.critChance += permUpgrades[PermanentUpgradeType.CritChance] * 0.005; // Example: 0.5% Crit per level
        this.baseStats.speed += permUpgrades[PermanentUpgradeType.MoveSpeed] * 0.2; // Example: 0.2 Speed per level
        this.baseStats.attackSpeed -= permUpgrades[PermanentUpgradeType.AttackSpeed] * 10; // Example: -10ms Attack Speed per level
        this.baseStats.attackSpeed = Math.max(50, this.baseStats.attackSpeed); // Ensure attack speed doesn't become too low
    }

    private getInitialUpgrades(permanentUpgrades?: PermanentUpgradesState): PlayerUpgrades {
        const initialLuck = permanentUpgrades ? permanentUpgrades[PermanentUpgradeType.Luck] * 1 : 0; // Example: 1 luck per level
        return {
            revives: 0,
            numLevelUpChoices: 3,
            commonEffectiveness: 1.0,
            rage: false,
            fragmentation: 0,
            friction: 0,
            thunderbolt: 0,
            thunderboltCooldown: 0,
            willowisp: false,
            wisp: null,
            bleed: false,
            superheat: false,
            barrier: false,
            barrierCooldown: 0,
            barrierReady: false,
            cold: false,
            regeneration: false,
            shrink: 1.0,
            camouflage: 1.0,
            soulOrbChance: 0.0,
            healOrbChance: 0.0,
            focus: false,
            focusBonus: 0,
            focusTimer: 0,
            luck: initialLuck,
        };
    }
    
    public initStats(): void {
        this.speed = this.baseStats.speed;
        this.jumpPower = this.baseStats.jumpPower;
        this.maxHp = this.baseStats.maxHp;
        this.hp = this.maxHp; 
        this.attackSpeed = this.baseStats.attackSpeed;
        this.projectileDamage = this.baseStats.projectileDamage;
        this.critChance = this.baseStats.critChance;
        this.critDamage = this.baseStats.critDamage;
        this.defense = this.baseStats.defense;
        this.lifesteal = this.baseStats.lifesteal;
        this.maxJumps = this.baseStats.maxJumps;
        this.jumpsLeft = this.maxJumps;
        this.projectileSize = TILE_SIZE / 2;
        this.projectileHits = this.baseStats.projectileHits;
    }

    public resetForNewGame(permanentUpgrades?: PermanentUpgradesState): void {
        this.position = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - this.height - TILE_SIZE * 2 };
        this.velocity = { x: 0, y: 0 };
        
        this.baseStats = { ...INITIAL_PLAYER_BASE_STATS }; // Reset to true initial before applying perm
        if (permanentUpgrades) {
            this.applyPermanentUpgradesToBaseStats(permanentUpgrades);
        }
        
        this.upgrades = this.getInitialUpgrades(permanentUpgrades);
        this.initStats(); 

        this.level = 1;
        this.exp = 0;
        this.expToNextLevel = 10;
        this.invincibilityTimer = 0;
        this.fireCooldown = 0;
        this.distanceWalked = 0;
        if (this.upgrades.wisp) this.upgrades.wisp = null; 
        if (this.upgrades.willowisp) this.upgrades.willowisp = false; 
    }


    draw(ctx: CanvasRenderingContext2D, mouseGamePos: Vector, outlineBlacknessFactor: number): void {
        const currentOutlineColor = lerpColorsForEntities(WHITE_RGB, BLACK_RGB, outlineBlacknessFactor);
        
        ctx.save();
        ctx.translate(this.position.x, this.position.y);

        if (this.invincibilityTimer > 0 && Math.floor(this.invincibilityTimer * 10) % 2 === 0) {
             ctx.globalAlpha = 0.5;
        }
        
        ctx.scale(this.upgrades.shrink, this.upgrades.shrink);

        ctx.strokeStyle = currentOutlineColor;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(0, -this.height / 2); 
        ctx.lineTo(this.width / 2, -this.height / 4); 
        ctx.lineTo(-this.width / 2, -this.height / 4); 
        ctx.closePath();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(-this.width / 3, -this.height / 4); 
        ctx.lineTo(-this.width/3, this.height/2); 
        ctx.lineTo(this.width/3, this.height/2);  
        ctx.lineTo(this.width/3, -this.height/4);
        ctx.stroke();

        const angle = Math.atan2(mouseGamePos.y - this.position.y, mouseGamePos.x - this.position.x);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(this.width / 4, 0); 
        ctx.lineTo(this.width, 0);   
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(this.width, 0, TILE_SIZE / 4, 0, Math.PI * 2); 
        ctx.fillStyle = 'cyan'; 
        ctx.fill();

        ctx.restore(); 

        if (this.upgrades.barrier && this.upgrades.barrierReady) {
            ctx.beginPath();
            ctx.arc(this.position.x, this.position.y, (this.height / 2 * this.upgrades.shrink) + 5, 0, Math.PI * 2);
            const barrierBaseColor = {r: 100, g: 150, b: 255}; 
            const barrierFinalColor = lerpColorsForEntities(barrierBaseColor, BLACK_RGB, outlineBlacknessFactor);
            ctx.strokeStyle = `rgba(${parseInt(barrierFinalColor.slice(4,7))}, ${parseInt(barrierFinalColor.slice(8,11))}, ${parseInt(barrierFinalColor.slice(12,15))}, ${outlineBlacknessFactor < 0.9 ? 0.8 : 0.6})`;
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        if (this.upgrades.wisp && this.upgrades.wisp) {
            this.upgrades.wisp.draw(ctx, outlineBlacknessFactor);
        }
    }

    update(
        deltaTime: number, 
        keysPressed: { [key: string]: boolean }, 
        mouseState: { x: number, y: number, down: boolean }, 
        terrainData: number[],
        enemies: Enemy[] 
    ): { leveledUp?: boolean, gameOver?: boolean, newProjectiles?: Projectile[], newParticles?: (Particle | Lightning | Orb)[] } {
        let newProjectiles: Projectile[] = [];
        let newParticles: (Particle | Lightning | Orb)[] = [];
        let moved = false;

        if ((keysPressed['KeyA'] || keysPressed['ArrowLeft']) && this.position.x > (this.width / 2 * this.upgrades.shrink)) {
            this.velocity.x = -this.speed;
            if(!keysPressed['KeyD'] && !keysPressed['ArrowRight']) { 
                this.distanceWalked += this.speed * deltaTime;
                 moved = true;
            }
        } else if ((keysPressed['KeyD'] || keysPressed['ArrowRight']) && this.position.x < CANVAS_WIDTH - (this.width / 2 * this.upgrades.shrink)) {
            this.velocity.x = this.speed;
            if(!keysPressed['KeyA'] && !keysPressed['ArrowLeft']) {
                 this.distanceWalked += this.speed * deltaTime;
                 moved = true;
            }
        } else {
            this.velocity.x = 0;
        }
        
        if (this.upgrades.focus) {
            if (!moved) {
                this.upgrades.focusTimer += deltaTime;
                this.upgrades.focusBonus = Math.min(1, this.upgrades.focusTimer / 2); 
            } else {
                this.upgrades.focusTimer = 0;
                this.upgrades.focusBonus = 0;
            }
        }

        this.position.x += this.velocity.x * deltaTime * 60; 
        this.velocity.y += GRAVITY;
        this.position.y += this.velocity.y;

        const groundY = terrainData[Math.floor(this.position.x)] ?? CANVAS_HEIGHT;
        const playerBottom = this.position.y + (this.height / 2 * this.upgrades.shrink);
        if (playerBottom > groundY) {
            this.position.y = groundY - (this.height / 2 * this.upgrades.shrink);
            this.velocity.y = 0;
            if (this.jumpsLeft < this.maxJumps) { 
                 this.jumpsLeft = this.maxJumps;
            }
        }
        if (this.position.x < 0) this.position.x = 0;
        if (this.position.x >= CANVAS_WIDTH) this.position.x = CANVAS_WIDTH -1;


        if (this.invincibilityTimer > 0) {
            this.invincibilityTimer -= deltaTime;
        }
        
        this.fireCooldown -= deltaTime * 1000;
        let currentAttackSpeed = this.attackSpeed * (1 - this.upgrades.focusBonus * 0.5); 
        if (mouseState.down && this.fireCooldown <= 0) {
            const angle = Math.atan2(mouseState.y - this.position.y, mouseState.x - this.position.x);
            let damage = this.projectileDamage;
            if (this.upgrades.rage && this.hp < this.maxHp / 2) {
                const rageBonus = 1 + (1 - this.hp / (this.maxHp / 2)) * 0.5;
                damage *= rageBonus;
            }

            const isCrit = Math.random() < this.critChance;
            if (isCrit) {
                damage *= this.critDamage;
            }

            newProjectiles.push(new Projectile(
                this.position.x, this.position.y, 
                angle, 
                15, 
                damage, 
                'player', 
                this.projectileSize, 
                isCrit, 
                this.projectileHits,
                this.upgrades.cold,
                this.upgrades.bleed
            ));
            this.fireCooldown = currentAttackSpeed;
        }
        
        const upgradeEffects = this.handleActiveUpgrades(deltaTime, enemies);
        if(upgradeEffects.newProjectiles) newProjectiles.push(...upgradeEffects.newProjectiles);
        if(upgradeEffects.newParticles) newParticles.push(...upgradeEffects.newParticles);


        let result: { leveledUp?: boolean, gameOver?: boolean, newProjectiles?: Projectile[], newParticles?: (Particle | Lightning | Orb)[] } = {};
        if (newProjectiles.length > 0) result.newProjectiles = newProjectiles;
        if (newParticles.length > 0) result.newParticles = newParticles;

        if (this.exp >= this.expToNextLevel) {
            this.level++;
            this.exp -= this.expToNextLevel;
            this.expToNextLevel = Math.floor(this.expToNextLevel * 1.5 + this.level * 5); 
            this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.25); 
            result.leveledUp = true;
        }
        
        if (this.hp <= 0) { 
             // Defer game over to takeDamage to handle revives
        }

        return result;
    }

    private handleActiveUpgrades(deltaTime: number, enemies: Enemy[]): { newProjectiles?: Projectile[], newParticles?: (Particle | Lightning | Orb)[] } {
        const newProjectiles: Projectile[] = [];
        const newParticles: (Particle | Lightning | Orb)[] = [];

        if (this.upgrades.friction > 0 && this.distanceWalked >= 100) { 
            for (let i = 0; i < this.upgrades.friction; i++) {
                newProjectiles.push(new Projectile(
                    this.position.x, this.position.y, -Math.PI/2 + (Math.random() - 0.5) * 0.5,
                    10, this.projectileDamage / 2, 'player', this.projectileSize, false, 1, false, false, true
                ));
            }
            this.distanceWalked = 0;
        }
        
        if (this.upgrades.thunderbolt > 0) {
            this.upgrades.thunderboltCooldown -= deltaTime;
            if (this.upgrades.thunderboltCooldown <= 0) {
                for (let i = 0; i < this.upgrades.thunderbolt; i++) {
                    const target = enemies.length > 0 ? enemies[Math.floor(Math.random() * enemies.length)] : null;
                    if (target) {
                        newParticles.push(new Lightning(target.position.x, this.projectileDamage * 2, CANVAS_WIDTH, CANVAS_HEIGHT));
                    } else { 
                        newParticles.push(new Lightning(Math.random() * CANVAS_WIDTH, this.projectileDamage * 2, CANVAS_WIDTH, CANVAS_HEIGHT));
                    }
                }
                this.upgrades.thunderboltCooldown = 5; 
            }
        }

        if (this.upgrades.willowisp && !this.upgrades.wisp) {
            this.upgrades.wisp = new Wisp(this);
        }
        if(this.upgrades.wisp) {
            const wispProjectiles = this.upgrades.wisp.update(deltaTime, enemies);
            if(wispProjectiles) newProjectiles.push(...wispProjectiles);
        }

        if (this.upgrades.barrier && !this.upgrades.barrierReady) {
            this.upgrades.barrierCooldown -= deltaTime;
            if (this.upgrades.barrierCooldown <= 0) {
                this.upgrades.barrierReady = true;
            }
        }
        
        if (this.upgrades.regeneration && enemies.length > 0) {
            const healAmount = (this.maxHp * 0.001 * enemies.length) * deltaTime;
            this.hp = Math.min(this.maxHp, this.hp + healAmount);
        }
        return { newProjectiles, newParticles };
    }
    
    public attemptJump(terrainData: number[]): void {
        if (this.jumpsLeft > 0 && (this.velocity.y >= 0 || this.jumpsLeft === this.maxJumps) ) {
            const groundY = (typeof terrainData !== "undefined" && terrainData[Math.floor(this.position.x)] !== undefined) ? terrainData[Math.floor(this.position.x)] : CANVAS_HEIGHT;
            const playerBottom = this.position.y + (this.height / 2 * this.upgrades.shrink);
            if (playerBottom >= groundY - 5 || (this.maxJumps > 1 && this.jumpsLeft > 0 && this.velocity.y > -this.jumpPower * 0.5) ) {
                 this.velocity.y = -this.jumpPower;
                 this.jumpsLeft--;
            }
        }
    }

    public takeDamage(amount: number): { isDead: boolean, usedRevive: boolean, barrierBroken: boolean, newParticles?: Particle[] } {
        if (this.invincibilityTimer > 0) return { isDead: false, usedRevive: false, barrierBroken: false };
        let barrierBroken = false;
        let newParticles: Particle[] = [];

        if (this.upgrades.barrier && this.upgrades.barrierReady) {
            this.upgrades.barrierReady = false;
            this.upgrades.barrierCooldown = 15; 
            this.invincibilityTimer = this.invincibilityDuration * this.upgrades.camouflage;
            newParticles.push(...createBurst(this.position.x, this.position.y, 20, 'rgba(100, 150, 255, 0.8)', CANVAS_WIDTH, CANVAS_HEIGHT));
            barrierBroken = true;
            return { isDead: false, usedRevive: false, barrierBroken, newParticles };
        }

        const finalDamage = Math.max(1, amount * (1 - this.defense));
        this.hp -= finalDamage;
        this.invincibilityTimer = this.invincibilityDuration * this.upgrades.camouflage;

        if (this.hp <= 0) {
            if (this.upgrades.revives > 0) {
                this.upgrades.revives--;
                this.hp = this.maxHp / 2;
                this.invincibilityTimer = 3; 
                newParticles.push(...createBurst(this.position.x, this.position.y, 100, 'yellow', CANVAS_WIDTH, CANVAS_HEIGHT));
                return { isDead: false, usedRevive: true, barrierBroken, newParticles }; 
            } else {
                this.hp = 0;
                return { isDead: true, usedRevive: false, barrierBroken, newParticles }; 
            }
        }
        return { isDead: false, usedRevive: false, barrierBroken, newParticles };
    }
        
    public gainExp(amount: number): void {
        this.exp += amount;
    }

    public applyUpgrade(upgradeApplyFn: (player: Player) => void): void {
        upgradeApplyFn(this);
        if (this.hp > this.maxHp) this.hp = this.maxHp; 
        if (this.jumpsLeft > this.maxJumps) this.jumpsLeft = this.maxJumps;
    }
}


// --- ENEMY CLASS ---
export class Enemy implements GameObject {
    public position: Vector;
    public velocity: Vector;
    public width: number;
    public height: number;
    public type: number; // 0: Pawn, 1: Cannon, 2: Spiker, 3: Bruiser
    public maxHp: number;
    public hp: number;
    public speed: number;
    public value: number; // EXP given
    public shootCooldown: number;
    public slowFactor: number;
    public bleedStacks: number;
    public bleedTimer: number;

    constructor(x: number, y: number, type: number, health: number, speed: number, value: number, initialShootCooldown: number) {
        this.position = { x, y };
        this.velocity = { x: 0, y: 0 };
        this.type = type;
        this.maxHp = health;
        this.hp = health;
        this.speed = speed;
        this.value = value;
        this.shootCooldown = initialShootCooldown; 
        this.slowFactor = 1.0;
        this.bleedStacks = 0;
        this.bleedTimer = 0; // seconds

        switch(type) {
            case 0: 
            case 1: 
                this.width = TILE_SIZE * 2;
                this.height = TILE_SIZE * 2.5;
                break;
            case 2: 
                this.width = TILE_SIZE * 1.5;
                this.height = TILE_SIZE * 2;
                break;
            case 3: 
                this.width = TILE_SIZE * 2.5;
                this.height = TILE_SIZE * 2.2;
                break;
            default:
                this.width = TILE_SIZE * 2;
                this.height = TILE_SIZE * 2.5;
                break;
        }
    }

    private drawHealthBar(ctx: CanvasRenderingContext2D, outlineBlacknessFactor: number): void {
        const barWidth = this.width * 0.8;
        const barHeight = TILE_SIZE / 2.5;
        const barX = this.position.x - barWidth / 2;
        const barY = this.position.y - this.height / 2 - barHeight - TILE_SIZE / 4; // Position above the enemy

        const hpRatio = Math.max(0, this.hp / this.maxHp);

        // Background
        const bgColor = lerpColorsForEntities(HEALTH_BAR_DARK_RED_RGB, BLACK_RGB, outlineBlacknessFactor * 0.5); // Darker red, more affected by night
        ctx.fillStyle = bgColor;
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Foreground (current health)
        const fgColor = lerpColorsForEntities(HEALTH_BAR_RED_RGB, BLACK_RGB, outlineBlacknessFactor * 0.3); // Brighter red
        ctx.fillStyle = fgColor;
        ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

        // Outline
        const outlineColor = lerpColorsForEntities(WHITE_RGB, BLACK_RGB, outlineBlacknessFactor);
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }

    draw(ctx: CanvasRenderingContext2D, player: Player, outlineBlacknessFactor: number): void {
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        
        const healthRatio = Math.max(0, Math.min(1, this.hp / this.maxHp));
        const colorVal = Math.floor(255 * healthRatio);
        
        const originalColorRGB: RGBColor = { r: 255, g: colorVal, b: colorVal };
        const finalStrokeColor = lerpColorsForEntities(originalColorRGB, BLACK_RGB, outlineBlacknessFactor);
        
        ctx.strokeStyle = finalStrokeColor;
        ctx.lineWidth = 2;

        const angleToPlayer = Math.atan2(player.position.y - this.position.y, player.position.x - this.position.x);

        if (this.type === 0) { 
            ctx.beginPath();
            ctx.moveTo(0, -this.height/2); 
            ctx.arc(0, -this.height/4, this.width/4, Math.PI, 0, false); 
            ctx.lineTo(this.width/4, -this.height/4); 
            ctx.lineTo(this.width/2, this.height/2);  
            ctx.lineTo(-this.width/2, this.height/2); 
            ctx.lineTo(-this.width/4, -this.height/4); 
            ctx.closePath();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-this.width/2, this.height/3);
            ctx.lineTo(-this.width/4, this.height/5);
            ctx.lineTo(0, this.height/3);
            ctx.lineTo(this.width/4, this.height/5);
            ctx.lineTo(this.width/2, this.height/3);
            ctx.stroke();
        } else if (this.type === 1) { 
            ctx.rotate(angleToPlayer);
            ctx.beginPath();
            ctx.rect(-this.width/2, -this.height/4, this.width, this.height/2); 
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(this.width/2, 0); 
            ctx.lineTo(this.width/2 + TILE_SIZE, 0); 
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(-this.width/2, 0, this.height/3, -Math.PI/2, Math.PI/2); 
            ctx.stroke();
        } else if (this.type === 2) { 
            ctx.rotate(angleToPlayer);
            ctx.beginPath();
            ctx.moveTo(0, -this.height / 2); 
            ctx.lineTo(this.width / 2, 0);   
            ctx.lineTo(0, this.height / 2);  
            ctx.lineTo(-this.width / 2, 0);  
            ctx.closePath();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(this.width / 2, 0);
            ctx.lineTo(this.width / 2 + TILE_SIZE * 0.75, 0);
            ctx.lineWidth = 3; 
            ctx.stroke();
        } else if (this.type === 3) { 
            ctx.rotate(angleToPlayer);
            ctx.beginPath();
            ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
            ctx.stroke();

            ctx.beginPath();
            ctx.rect(this.width / 2, -TILE_SIZE / 3, TILE_SIZE * 0.8, TILE_SIZE * 0.66);
            const barrelOriginalColorRGB: RGBColor = {r: 200, g: colorVal*0.8, b: colorVal*0.8}; 
            ctx.fillStyle = lerpColorsForEntities(barrelOriginalColorRGB, BLACK_RGB, outlineBlacknessFactor);
            ctx.fill();
            ctx.strokeStyle = finalStrokeColor; 
            ctx.stroke();
        }
        ctx.restore(); // Restore before drawing health bar so it's not rotated/translated with enemy body
        
        // Draw health bar (not affected by enemy rotation)
        this.drawHealthBar(ctx, outlineBlacknessFactor);
        
        if (this.bleedStacks > 0) {
             const bleedBaseColor = {r: 153, g: 27, b: 27}; 
             const bleedDayColor = {r: 68, g:0, b:0}; 
             const currentBleedTextColor = lerpColorsForEntities(bleedBaseColor, bleedDayColor, outlineBlacknessFactor);
             ctx.fillStyle = currentBleedTextColor;
             ctx.font = `${TILE_SIZE}px Courier New`;
             ctx.textAlign = 'left';
             ctx.fillText(`🩸${this.bleedStacks}`, this.position.x + this.width / 2 + 5, this.position.y);
        }
    }

    update(deltaTime: number, player: Player): EnemyUpdateResult {
        const result: EnemyUpdateResult = { damageTakenEvents: [] };
        
        const angleToPlayer = Math.atan2(player.position.y - this.position.y, player.position.x - this.position.x);
        const targetSpeed = this.speed * this.slowFactor;
        
        const accelerationFactor = 0.1; 
        this.velocity.x += (Math.cos(angleToPlayer) * targetSpeed - this.velocity.x) * accelerationFactor;
        this.velocity.y += (Math.sin(angleToPlayer) * targetSpeed - this.velocity.y) * accelerationFactor;

        this.position.x += this.velocity.x * deltaTime * 60; 
        this.position.y += this.velocity.y * deltaTime * 60;


        this.shootCooldown -= deltaTime;
        if (this.shootCooldown <= 0) {
            const gameTimeApproximation = player.level * 30; 
            let enemyDamage = 10 * (1 + gameTimeApproximation / 300); 
            
            if(this.type === 2) enemyDamage *= 0.7; 
            if(this.type === 3) enemyDamage *= 1.3; 

            result.newProjectiles = result.newProjectiles || [];
            result.newProjectiles.push(new Projectile(
                this.position.x, this.position.y, 
                angleToPlayer, 8, enemyDamage, 'enemy', TILE_SIZE / 2.5
            ));
             switch(this.type) {
                case 0: this.shootCooldown = 2 + Math.random() * 2; break;
                case 1: this.shootCooldown = 3 + Math.random() * 2; break;
                case 2: this.shootCooldown = 0.8 + Math.random() * 0.7; break; 
                case 3: this.shootCooldown = 3.5 + Math.random() * 2.5; break; 
                default: this.shootCooldown = 2 + Math.random() * 2; break;
            }
        }
        
        if (this.bleedStacks > 0) {
            this.bleedTimer -= deltaTime;
            if (this.bleedTimer <= 0) {
                const bleedDmg = this.bleedStacks * 0.5; 
                this.hp -= bleedDmg; 
                result.damageTakenEvents?.push({ amount: bleedDmg, type: 'bleed' });
                this.bleedTimer = 1.0; 
            }
        }
        
        if (player.upgrades.superheat && checkCollision(
            this, 
            { position: player.position, width: player.width * player.upgrades.shrink, height: player.height * player.upgrades.shrink }
        )) {
            const superheatDmg = 40 * deltaTime;
            this.hp -= superheatDmg;
            result.damageTakenEvents?.push({ amount: superheatDmg, type: 'superheat' });
        }

        if (this.hp <= 0) {
            result.died = true;
            result.value = this.value;
            result.newParticles = createBurst(this.position.x, this.position.y, 15, 'orange', CANVAS_WIDTH, CANVAS_HEIGHT);
            result.orbs = [];

            if (player.upgrades.fragmentation > 0) {
                result.newProjectiles = result.newProjectiles || [];
                for (let i = 0; i < player.upgrades.fragmentation; i++) {
                    result.newProjectiles.push(new Projectile(
                        this.position.x, this.position.y, Math.random() * Math.PI * 2,
                        8, player.projectileDamage / 4, 'player', player.projectileSize / 2, false, 1
                    ));
                }
            }
            
            if (Math.random() < player.upgrades.healOrbChance) {
                result.orbs.push(new Orb(this.position.x, this.position.y, 'heal', CANVAS_WIDTH, CANVAS_HEIGHT));
            }
            if (Math.random() < player.upgrades.soulOrbChance) {
                result.orbs.push(new Orb(this.position.x, this.position.y, 'soul', CANVAS_WIDTH, CANVAS_HEIGHT));
            }
        }
        return result;
    }

    public takeDamageFromProjectile(amount: number, isCold: boolean, isBleed: boolean): void {
        // Actual damage application. Indicator creation will be triggered by GameCanvas
        this.hp -= amount;
        if (isCold) {
            this.slowFactor = Math.max(0.2, this.slowFactor * 0.99); 
        }
        if (isBleed) {
            this.bleedStacks++;
            this.bleedTimer = 3.0; 
        }
    }
}

// --- PROJECTILE CLASS ---
export class Projectile implements GameObject {
    public position: Vector;
    public velocity: Vector;
    public size: number;
    public damage: number;
    public owner: ProjectileOwner;
    public isCrit: boolean;
    public hitsLeft: number;
    public applyCold: boolean;
    public applyBleed: boolean;
    public isExplosive: boolean; 

    constructor(
        x: number, y: number, angle: number, speed: number, damage: number, owner: ProjectileOwner,
        size: number, isCrit: boolean = false, hits: number = 1, cold: boolean = false, bleed: boolean = false, isExplosive: boolean = false
    ) {
        this.position = { x, y };
        this.velocity = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
        this.size = size;
        this.damage = damage;
        this.owner = owner;
        this.isCrit = isCrit;
        this.hitsLeft = hits;
        this.applyCold = cold;
        this.applyBleed = bleed;
        this.isExplosive = isExplosive;
    }

    draw(ctx: CanvasRenderingContext2D, outlineBlacknessFactor?: number): void {
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.size, 0, Math.PI * 2);
        if (this.owner === 'player') {
            ctx.fillStyle = this.isCrit ? '#facc15' : '#22d3ee'; 
        } else {
            ctx.fillStyle = '#ef4444'; 
        }
        if (this.isExplosive) ctx.fillStyle = '#a855f7'; 
        ctx.fill();

        if (this.owner === 'player' && typeof outlineBlacknessFactor === 'number' && outlineBlacknessFactor > 0) {
            ctx.strokeStyle = `rgba(0,0,0, ${outlineBlacknessFactor})`; 
            ctx.lineWidth = 1 + outlineBlacknessFactor; 
            ctx.stroke();
        }
    }

    update(deltaTime: number): void {
        this.position.x += this.velocity.x * deltaTime * 60; 
        this.position.y += this.velocity.y * deltaTime * 60;
        if (this.isExplosive) {
            this.velocity.y += GRAVITY * 0.5 * deltaTime * 60; 
        }
    }

    onHit(): void {
        this.hitsLeft--;
    }
}

// --- PARTICLE CLASS ---
export class Particle implements GameObject {
    public position: Vector;
    public velocity: Vector;
    public size: number;
    public color: string;
    public life: number; 
    private initialLife: number;

    constructor(x: number, y: number, velX: number, velY: number, size: number, color: string, life: number, protected canvasWidth: number, protected canvasHeight: number) {
        this.position = { x, y };
        this.velocity = { x: velX, y: velY };
        this.size = size;
        this.color = color;
        this.life = life;
        this.initialLife = life;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life / this.initialLife);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.position.x - this.size / 2, this.position.y - this.size / 2, this.size, this.size);
        ctx.restore();
    }

    update(deltaTime: number, ...args: any[]): void {
        this.position.x += this.velocity.x * deltaTime * 60; 
        this.position.y += this.velocity.y * deltaTime * 60;
        this.life -= deltaTime;
    }
}

// --- LIGHTNING CLASS ---
export class Lightning extends Particle {
    private damage: number;
    private points: Vector[];
    private hit: boolean;

    constructor(x: number, damage: number, canvasWidth: number, canvasHeight: number) {
        super(x, 0, 0, 0, 0, 'yellow', 0.5, canvasWidth, canvasHeight); 
        this.damage = damage;
        this.points = [];
        this.generatePoints();
        this.hit = false; 
    }

    private generatePoints(): void {
        this.points.push({ x: this.position.x, y: 0 }); 
        let currentY = 0;
        while (currentY < this.canvasHeight) {
            const lastPoint = this.points[this.points.length - 1];
            const newX = lastPoint.x + (Math.random() - 0.5) * TILE_SIZE * 3; 
            const newY = lastPoint.y + Math.random() * TILE_SIZE * 4 + TILE_SIZE * 1.5; 
            this.points.push({ x: newX, y: newY });
            currentY = newY;
        }
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 0, ${Math.max(0, this.life / 0.5)})`; 
        ctx.lineWidth = TILE_SIZE / 3;
        ctx.beginPath();
        if (this.points.length > 0) {
            ctx.moveTo(this.points[0].x, this.points[0].y);
            for (let i = 1; i < this.points.length; i++) {
                ctx.lineTo(this.points[i].x, this.points[i].y);
            }
        }
        ctx.stroke();
        ctx.restore();
    }
    
    update(deltaTime: number, enemies?: Enemy[], ...args: any[]): { damagedEnemies?: Enemy[] } {
        super.update(deltaTime); 
        if (!this.hit && this.life > 0 && enemies) { 
            const newlyDamagedEnemies: Enemy[] = [];
            enemies.forEach(enemy => {
                for (const point of this.points) {
                    // Check if enemy is within horizontal range of a lightning segment point and below it (lightning strikes from above)
                    // Consider a wider hit area for lightning
                    if (Math.abs(enemy.position.x - point.x) < enemy.width / 2 + TILE_SIZE * 1.5 && 
                        enemy.position.y > point.y - TILE_SIZE * 2 && // enemy below the start of a segment somewhat
                        enemy.position.y < point.y + enemy.height /2 + TILE_SIZE*4) { // and not too far below a segment end
                        // A more robust check might involve line-segment intersection or checking enemy's bounding box against multiple points
                        enemy.takeDamageFromProjectile(this.damage, false, false); 
                        newlyDamagedEnemies.push(enemy);
                        // TODO: Trigger damage indicator for lightning hit from GameCanvas
                        break; 
                    }
                }
            });
            this.hit = true; 
            if (newlyDamagedEnemies.length > 0) return { damagedEnemies: newlyDamagedEnemies };
        }
        return {};
    }
}

// --- ORB CLASS ---
export class Orb extends Particle {
    public type: OrbType;
    public collected: boolean = false;

    constructor(x: number, y: number, type: OrbType, canvasWidth: number, canvasHeight: number) {
        super(x, y, (Math.random() - 0.5) * 2, -Math.random() * 3, TILE_SIZE, type === 'heal' ? '#84cc16' : '#a855f7', 10, canvasWidth, canvasHeight); 
        this.type = type;
    }

    draw(ctx: CanvasRenderingContext2D, outlineBlacknessFactor?: number): void { 
        const finalOutlineColor = typeof outlineBlacknessFactor === 'number' 
            ? lerpColorsForEntities(WHITE_RGB, BLACK_RGB, outlineBlacknessFactor)
            : 'white'; 

        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life / 10);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.size/2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = finalOutlineColor;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }

    update(deltaTime: number, player?: Player, ...args: any[]): { collected?: boolean, type?: OrbType } {
        if (this.collected) return {};
        this.velocity.y += GRAVITY * 0.5 * deltaTime * 60; 
        
        if (player) {
            const distToPlayer = distance(this.position, player.position);
            if (distToPlayer < TILE_SIZE * 10) { 
                const angleToPlayer = Math.atan2(player.position.y - this.position.y, player.position.x - this.position.x);
                this.velocity.x += Math.cos(angleToPlayer) * 0.5; 
                this.velocity.y += Math.sin(angleToPlayer) * 0.5;
            }
        }
        
        const maxSpeed = 5;
        this.velocity.x = Math.max(-maxSpeed, Math.min(maxSpeed, this.velocity.x));
        this.velocity.y = Math.max(-maxSpeed, Math.min(maxSpeed, this.velocity.y));

        super.update(deltaTime); 

        if (player && checkCollision(
            this, 
            { position: player.position, width: player.width * player.upgrades.shrink, height: player.height * player.upgrades.shrink }
        )) {
            this.collected = true;
            this.life = 0; 
            return { collected: true, type: this.type };
        }
        return {};
    }
}


// --- WISP CLASS ---
export class Wisp implements GameObject {
    public playerRef: Player; 
    public position: Vector;
    private fireCooldown: number; 
    private orbitAngle: number = 0;

    constructor(player: Player) {
        this.playerRef = player;
        this.position = { x: player.position.x, y: player.position.y - 50 };
        this.fireCooldown = 0;
    }

    draw(ctx: CanvasRenderingContext2D, outlineBlacknessFactor: number): void {
        const finalOutlineColor = lerpColorsForEntities(WHITE_RGB, BLACK_RGB, outlineBlacknessFactor);
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, TILE_SIZE * 0.75, 0, Math.PI * 2); 
        ctx.fillStyle = 'rgba(255, 165, 0, 0.7)'; 
        ctx.fill();
        ctx.strokeStyle = finalOutlineColor;
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    update(deltaTime: number, enemies?: Enemy[], ...args: any[]): Projectile[] | null { 
        const orbitRadius = TILE_SIZE * 5;
        const orbitSpeed = 2; 
        this.orbitAngle += orbitSpeed * deltaTime;
        this.position.x = this.playerRef.position.x + Math.cos(this.orbitAngle) * orbitRadius;
        this.position.y = this.playerRef.position.y - TILE_SIZE * 2.5 + Math.sin(this.orbitAngle) * orbitRadius; 

        this.fireCooldown -= deltaTime * 1000;
        if (this.fireCooldown <= 0 && enemies && enemies.length > 0) {
            const closestEnemy = findClosestEnemy(this.position, enemies);
            if (closestEnemy) {
                const angle = Math.atan2(closestEnemy.position.y - this.position.y, closestEnemy.position.x - this.position.x);
                const projectile = new Projectile(
                    this.position.x, this.position.y, angle, 12,
                    this.playerRef.projectileDamage / 2, 
                    'player', 
                    this.playerRef.projectileSize / 1.5, 
                    false, 1, this.playerRef.upgrades.cold, this.playerRef.upgrades.bleed 
                );
                this.fireCooldown = this.playerRef.attackSpeed * 2; 
                return [projectile];
            }
        }
        return null;
    }
}