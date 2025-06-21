import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';

// --- Interfaces & Helper Types ---
interface CosmicDrawable {
  update: (deltaTime?: number) => void;
  draw: (ctx: CanvasRenderingContext2D) => void;
  active?: boolean; // For elements that can expire
}

// --- Class Definitions from the user's provided script, adapted to TypeScript ---

class DustParticle implements CosmicDrawable {
    private galaxy: Galaxy;
    private palette: string[];
    private angle: number;
    private radius: number;
    private speed: number;
    private growth: number;
    public size: number;
    private opacity: number;
    private decay: number;

    constructor(galaxy: Galaxy) {
        this.galaxy = galaxy;
        this.palette = this.galaxy.dustPalette;
        this.angle = 0;
        this.radius = 0;
        this.speed = 0;
        this.growth = 0;
        this.size = 0;
        this.opacity = 0;
        this.decay = 0;
        this.reset();
    }
    reset() {
        this.angle = Math.random() * Math.PI * 2;
        this.radius = Math.random() * this.galaxy.coreRadius;
        this.speed = Math.random() * 0.02 + 0.01;
        this.growth = Math.random() * 0.25 + 0.1;
        this.size = Math.random() * 2 + 1;
        this.opacity = 1;
        this.decay = Math.random() * 0.01 + 0.005;
    }
    update() {
        this.angle += this.speed;
        this.radius += this.growth;
        this.opacity -= this.decay;
        if (this.opacity <= 0) {
            this.reset();
        }
    }
    draw(ctx: CanvasRenderingContext2D) {
        const x = this.galaxy.x + Math.cos(this.angle) * this.radius;
        const y = this.galaxy.y + Math.sin(this.angle) * this.radius;
        
        const progress = Math.min(this.radius / (this.galaxy.maxDustRadius), 1);
        const colorIndex = Math.floor(progress * (this.palette.length - 1));
        const color = this.palette[colorIndex];
        
        const alphaHex = Math.round(this.opacity * 255).toString(16).padStart(2, '0');
        ctx.fillStyle = `${color}${alphaHex}`;
        
        ctx.fillRect(x - this.size / 2, y - this.size / 2, this.size, this.size);
    }
}

export class Galaxy implements CosmicDrawable {
    public x: number;
    public y: number;
    private particles: DustParticle[];
    private particleCount: number;
    public coreRadius: number;
    public maxDustRadius: number;
    private coreColor: string;
    public dustPalette: string[];

    constructor(x: number, y: number, canvasW: number) {
        this.x = x;
        this.y = y;
        this.particles = [];
        // Scale particle count with canvas width, but cap it. Original: 1575 for 1920px.
        this.particleCount = Math.min(1500, Math.floor((1575 * canvasW / 1920) * 0.5)); // Reduced for performance
        this.coreRadius = 87.5 * (canvasW / 1920);
        this.maxDustRadius = 700 * (canvasW / 1920);
        this.coreColor = 'rgba(255, 200, 150, 0.9)';
        this.dustPalette = ['#FFFFFF', '#FFECCC', '#FFD28F', '#FFB54D'];

        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push(new DustParticle(this));
        }
    }
    update() {
        this.particles.forEach(p => p.update());
    }
    draw(ctx: CanvasRenderingContext2D) {
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.coreRadius);
        grad.addColorStop(0, this.coreColor);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.coreRadius, 0, Math.PI * 2);
        ctx.fill();
        this.particles.forEach(p => p.draw(ctx));
    }
}

export class Planet implements CosmicDrawable {
    private x: number;
    private y: number;
    private radius: number;
    private vx: number;
    private vy: number;
    private palette: string[];
    private hasRings: boolean;
    private w: number; // canvas width
    private h: number; // canvas height

    constructor(canvasW: number, canvasH: number) {
        this.w = canvasW;
        this.h = canvasH;
        this.x = Math.random() * this.w;
        this.y = Math.random() * this.h;
        this.radius = (Math.random() * 50 + 20) * (this.w / 1920); // Scale radius
        this.vx = (Math.random() - 0.5) * 0.1;
        this.vy = (Math.random() - 0.5) * 0.1;
        const colors = [
            ['#5D4E6D', '#B18FCF', '#866BB2'], // Purple
            ['#BF6A7A', '#F29CA4', '#D97C8C'], // Pink/Red
            ['#3E6D8C', '#68A0BF', '#5282A6']  // Blue
        ];
        this.palette = colors[Math.floor(Math.random() * colors.length)];
        this.hasRings = Math.random() > 0.6;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        if(this.x + this.radius < 0) this.x = this.w + this.radius;
        if(this.x - this.radius > this.w) this.x = -this.radius;
        if(this.y + this.radius < 0) this.y = this.h + this.radius;
        if(this.y - this.radius > this.h) this.y = -this.radius;
    }
    draw(ctx: CanvasRenderingContext2D) {
        if (this.hasRings) {
            ctx.strokeStyle = this.palette[1] + '80'; // Add alpha to ring color
            ctx.lineWidth = 3 * (this.w / 1920); // Scale line width
            ctx.beginPath();
            ctx.ellipse(this.x, this.y, this.radius * 1.8, this.radius * 0.6, Math.PI / 4, 0, Math.PI * 2);
            ctx.stroke();
        }
        const grad = ctx.createRadialGradient(this.x - this.radius/2, this.y - this.radius/2, 0, this.x, this.y, this.radius);
        grad.addColorStop(0, this.palette[1]);
        grad.addColorStop(0.5, this.palette[0]);
        grad.addColorStop(1, this.palette[2]);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

export class BlackHole implements CosmicDrawable {
    private x: number;
    private y: number;
    private radius: number;
    private pulse: number;
    private pulseSpeed: number;
    private w: number; // canvas width

    constructor(canvasW: number, canvasH: number) {
        this.w = canvasW;
        this.x = Math.random() * canvasW;
        this.y = Math.random() * canvasH;
        this.radius = (Math.random() * 15 + 10) * (this.w / 1920); // Scale radius
        this.pulse = 0;
        this.pulseSpeed = Math.random() * 0.05 + 0.01;
    }
    update() { this.pulse += this.pulseSpeed; }
    draw(ctx: CanvasRenderingContext2D) {
        const ringRadius = this.radius + (Math.sin(this.pulse) * 3 + 3) * (this.w / 1920); // Scale pulse effect
        const grad = ctx.createRadialGradient(this.x, this.y, this.radius, this.x, this.y, ringRadius + 5);
        grad.addColorStop(0, 'rgba(255, 100, 200, 0.8)');
        grad.addColorStop(0.8, 'rgba(100, 200, 255, 0.5)');
        grad.addColorStop(1, 'transparent');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2 * (this.w / 1920); // Scale line width
        ctx.beginPath(); ctx.arc(this.x, this.y, ringRadius, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
    }
}

export class ShootingStar implements CosmicDrawable {
    public x: number;
    public y: number;
    private len: number;
    private speed: number;
    public size: number;
    public active: boolean;
    private w: number; // canvas width
    private h: number; // canvas height

    constructor(canvasW: number, canvasH: number) {
        this.w = canvasW;
        this.h = canvasH;
        this.x = 0; this.y = 0; this.len = 0; this.speed = 0; this.size = 0; this.active = false;
        this.reset();
    }
    reset() {
        this.x = Math.random() * this.w; this.y = 0;
        this.len = (Math.random() * 80 + 10) * (this.w / 1920); // Scale length
        this.speed = (Math.random() * 10 + 6); // Speed can remain similar
        this.size = (Math.random() * 1 + 0.5) * (this.w / 1920); // Scale size
        this.active = true;
    }
    update() {
        this.x -= this.speed; 
        this.y += this.speed; // Moves diagonally towards bottom-left
        if (this.x < -this.len || this.y > this.h + this.len) { this.active = false; }
    }
    draw(ctx: CanvasRenderingContext2D) {
        if (!this.active) return;
        ctx.strokeStyle = `rgba(255, 255, 224, ${Math.random() * 0.8 + 0.2})`; // Original was just Math.random()
        ctx.lineWidth = this.size;
        ctx.beginPath(); 
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.len, this.y - this.len); // Tail points towards top-right
        ctx.stroke();
    }
}

class JetParticle implements CosmicDrawable {
    public x: number;
    public y: number;
    private angle: number;
    private speed: number;
    private vx: number;
    private vy: number;
    private size: number;
    private life: number;
    private maxLife: number;
    public active: boolean;

    constructor(x: number, y: number, angle: number) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = Math.random() * 2 + 2;
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
        this.size = Math.random() * 2 + 1;
        this.life = 150; 
        this.maxLife = this.life;
        this.active = true;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        if (this.life <= 0) {
            this.active = false;
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (!this.active) return;
        const opacity = this.life / this.maxLife;
        ctx.fillStyle = `rgba(200, 240, 255, ${opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

export class NeutronStar implements CosmicDrawable {
    public x: number;
    public y: number;
    private coreRadius: number;
    private rotation: number;
    private rotationSpeed: number;
    private life: number;
    public active: boolean;
    private opacity: number;
    private jetParticles: JetParticle[];
    private nebulaRadius: number;
    private maxNebulaRadius: number;
    private w: number; // canvas width

    constructor(x: number, y: number, canvasW: number) {
        this.w = canvasW;
        this.x = x;
        this.y = y;
        this.coreRadius = 7 * (this.w / 1920); // Scale core radius
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = Math.random() * 0.02 + 0.01;
        this.life = 900; 
        this.active = true;
        this.opacity = 0;
        this.jetParticles = [];
        this.nebulaRadius = 0;
        this.maxNebulaRadius = (Math.random() * 80 + 60) * (this.w / 1920); // Scale nebula radius
    }
    
    update() {
        this.rotation += this.rotationSpeed;
        this.life--;

        if(this.life > 800) { // Fade-in phase
            this.opacity = Math.min(1, this.opacity + 0.02);
            this.nebulaRadius = Math.min(this.maxNebulaRadius, this.nebulaRadius + (1 * (this.w / 1920))); // Scale expansion
        }
        if(this.life < 150) { // Fade-out phase
            this.opacity -= 0.01;
        }

        if (this.life <= 0 || this.opacity <= 0) {
            this.active = false;
        }

        if(this.active && this.opacity > 0.1 && Math.random() < 0.5) { // Throttle particle creation
            this.jetParticles.push(new JetParticle(this.x, this.y, this.rotation));
            this.jetParticles.push(new JetParticle(this.x, this.y, this.rotation + Math.PI));
        }

        this.jetParticles.forEach(p => p.update());
        this.jetParticles = this.jetParticles.filter(p => p.active);
    }
    
    draw(ctx: CanvasRenderingContext2D) {
        if (!this.active) return;
        ctx.save();
        ctx.globalAlpha = this.opacity;
        
        const nebulaGrad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.nebulaRadius);
        nebulaGrad.addColorStop(0, `rgba(173, 216, 230, ${0.6 * this.opacity})`); // LightBlue
        nebulaGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = nebulaGrad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.nebulaRadius, 0, Math.PI * 2);
        ctx.fill();

        this.jetParticles.forEach(p => p.draw(ctx));
        
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'cyan';
        ctx.shadowBlur = 20 * (this.w / 1920); // Scale shadow blur
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.coreRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

export class BasicCosmicStar implements CosmicDrawable {
    public x: number;
    public y: number;
    public radius: number;
    private velocity: number;
    private w: number; // canvas width
    private h: number; // canvas height
    private currentAlpha: number; // For twinkling

    constructor(canvasW: number, canvasH: number) {
        this.w = canvasW;
        this.h = canvasH;
        this.x = Math.random() * this.w;
        this.y = Math.random() * this.h;
        this.radius = Math.random() * 1.5 * (this.w / 1920); // Scale radius
        this.velocity = (Math.random() * 0.1 + 0.05); // Speed can remain similar
        this.currentAlpha = Math.random() * 0.5 + 0.1; // Initial random alpha
    }
    update() {
        this.y += this.velocity;
        if (this.y > this.h) {
            this.y = 0;
            this.x = Math.random() * this.w;
        }
        // Twinkle effect: slightly change alpha randomly for the next frame
        if (Math.random() < 0.1) { // Adjust frequency of twinkle change
             this.currentAlpha = Math.random() * 0.7 + 0.1; // Range of twinkle alpha
        }
    }
    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.currentAlpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}


export interface CosmicBackgroundElements {
    stars: BasicCosmicStar[];
    galaxies: Galaxy[];
    planets: Planet[];
    blackHoles: BlackHole[];
    shootingStars: ShootingStar[];
    neutronStars: NeutronStar[];
}

const STAR_COUNT_BASE = 200; // Adjusted for game canvas size and performance

export const initializeCosmicBackgroundElements = (width: number, height: number): CosmicBackgroundElements => {
    const elements: CosmicBackgroundElements = {
        stars: [],
        galaxies: [],
        planets: [],
        blackHoles: [],
        shootingStars: [],
        neutronStars: [],
    };

    const starCount = Math.floor(STAR_COUNT_BASE * (width / CANVAS_WIDTH));
    for (let i = 0; i < starCount; i++) {
        elements.stars.push(new BasicCosmicStar(width, height));
    }
    
    // Scale counts based on canvas area, but with caps
    const areaFactor = (width * height) / (1920 * 1080);

    const galaxyCount = Math.max(1, Math.min(2, Math.floor( (width / 1200) * areaFactor * 0.5 ))); 
    for (let i = 0; i < galaxyCount; i++) {
        elements.galaxies.push(new Galaxy(Math.random() * width, Math.random() * height * 0.7 + height * 0.15, width));
    }

    const planetCount = Math.max(1, Math.min(3, Math.floor( (width / 700) * areaFactor * 0.7 )));
    for (let i = 0; i < planetCount; i++) {
        elements.planets.push(new Planet(width, height));
    }
    
    const blackHoleCount = Math.max(0, Math.min(1, Math.floor( (width / 900) * areaFactor * 0.4 - 0.5)));
     for (let i = 0; i < blackHoleCount; i++) {
        elements.blackHoles.push(new BlackHole(width, height));
    }
    return elements;
};
