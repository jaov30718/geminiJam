
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';
import { RGBColor } from '../types';

// Helper for lerping colors, if needed for sun/element transitions not covered by global dayFactor alpha
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const lerpRGB = (color1: RGBColor, color2: RGBColor, factor: number): RGBColor => {
  return {
    r: Math.round(lerp(color1.r, color2.r, factor)),
    g: Math.round(lerp(color1.g, color2.g, factor)),
    b: Math.round(lerp(color1.b, color2.b, factor)),
  };
};


// --- Sky Gradient and Sun ---
const DAY_SKY_COLOR_TOP_RGB: RGBColor = { r: 135, g: 206, b: 235 }; // #87CEEB
const DAY_SKY_COLOR_BASE_RGB: RGBColor = { r: 176, g: 224, b: 230 }; // #B0E0E6

const SUN_COLOR_INNER_RGB: RGBColor = { r: 255, g: 255, b: 0 };
const SUN_COLOR_OUTER_RGB: RGBColor = { r: 255, g: 223, b: 186 };


export const drawDaytimeSkyGradientAndSun = (
    ctx: CanvasRenderingContext2D, 
    canvasW: number, 
    canvasH: number, 
    visibilityFactor: number // 0 (invisible) to 1 (fully visible)
) => {
    if (visibilityFactor <= 0.01) return;

    // --- Sky Gradient ---
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvasH);
    skyGradient.addColorStop(0, `rgba(${DAY_SKY_COLOR_TOP_RGB.r}, ${DAY_SKY_COLOR_TOP_RGB.g}, ${DAY_SKY_COLOR_TOP_RGB.b}, ${visibilityFactor})`);
    skyGradient.addColorStop(1, `rgba(${DAY_SKY_COLOR_BASE_RGB.r}, ${DAY_SKY_COLOR_BASE_RGB.g}, ${DAY_SKY_COLOR_BASE_RGB.b}, ${visibilityFactor})`);
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // --- Sun ---
    const sunX = canvasW * 0.85;
    const sunY = canvasH * 0.15;
    const sunRadius = Math.min(canvasW, canvasH) * 0.08;
    
    const sunGradient = ctx.createRadialGradient(sunX, sunY, sunRadius * 0.5, sunX, sunY, sunRadius);
    sunGradient.addColorStop(0, `rgba(${SUN_COLOR_INNER_RGB.r}, ${SUN_COLOR_INNER_RGB.g}, ${SUN_COLOR_INNER_RGB.b}, ${visibilityFactor})`);
    sunGradient.addColorStop(1, `rgba(${SUN_COLOR_OUTER_RGB.r}, ${SUN_COLOR_OUTER_RGB.g}, ${SUN_COLOR_OUTER_RGB.b}, 0)`); // Outer fades to transparent
    
    ctx.fillStyle = sunGradient;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, 2 * Math.PI);
    ctx.fill();
};

// --- Cloud ---
interface CloudPuff {
    offsetX: number;
    offsetY: number;
    radius: number;
}

export class Cloud {
    public x: number;
    public y: number;
    private speed: number;
    private puffs: CloudPuff[];
    private baseSize: number; // Store baseSize for potential dynamic adjustments

    constructor(canvasW: number, canvasH: number) {
        this.x = Math.random() * canvasW;
        this.y = Math.random() * (canvasH / 3); // Clouds higher up
        this.speed = Math.random() * 0.2 + 0.1; // Slow movement
        this.puffs = [];
        this.baseSize = (Math.random() * 30 + 25) * (Math.min(canvasW, canvasH) / 1080); // Scale base size

        const numPuffs = Math.floor(Math.random() * 8) + 8;
        for (let j = 0; j < numPuffs; j++) {
            this.puffs.push({
                offsetX: (Math.random() - 0.5) * this.baseSize * 5,
                offsetY: (Math.random() - 0.5) * this.baseSize * 2,
                radius: (Math.random() * 0.6 + 0.5) * this.baseSize
            });
        }
    }

    update(canvasW: number) {
        this.x += this.speed;
        if (this.x > canvasW + this.baseSize * 5) { // Check against a rough width of the cloud
            this.x = -this.baseSize * 5; // Reappear on the other side
             this.y = Math.random() * (CANVAS_HEIGHT / 3); // Optionally change Y position
        }
    }

    draw(ctx: CanvasRenderingContext2D, visibilityFactor: number) {
        if (visibilityFactor <= 0.01) return;

        this.puffs.forEach(puff => {
            const puffX = this.x + puff.offsetX;
            const puffY = this.y + puff.offsetY;
            const radius = puff.radius;

            const gradient = ctx.createRadialGradient(puffX, puffY, radius * 0.2, puffX, puffY, radius);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${0.8 * visibilityFactor})`);
            gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(puffX, puffY, radius, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}

// --- Bird ---
export class Bird {
    public x: number;
    public y: number;
    private speed: number;
    private wingCycle: number; // For flapping animation
    private scaleFactor: number;

    constructor(canvasW: number, canvasH: number) {
        this.x = Math.random() * canvasW;
        this.y = Math.random() * (canvasH / 2); // Birds in upper half
        this.speed = Math.random() * 2 + 1.5;
        this.wingCycle = Math.random() * Math.PI * 2; // Random start for flapping
        this.scaleFactor = Math.min(canvasW, canvasH) / 1080; // Scale bird size
    }

    update(canvasW: number, canvasH: number) {
        this.x += this.speed;
        this.wingCycle += this.speed * 0.1; // Flap faster with more speed
        
        if (this.x > canvasW + 40 * this.scaleFactor) {
            this.x = -40 * this.scaleFactor;
            this.y = Math.random() * (canvasH / 2);
        }
    }

    draw(ctx: CanvasRenderingContext2D, visibilityFactor: number) {
        if (visibilityFactor <= 0.01) return;

        ctx.save();
        ctx.globalAlpha = visibilityFactor;
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2 * this.scaleFactor;

        const wingOffset = Math.sin(this.wingCycle) * 6 * this.scaleFactor;
        const birdSize = 20 * this.scaleFactor; // Base size for bird parts

        ctx.beginPath();
        // Left wing
        ctx.moveTo(this.x, this.y);
        ctx.quadraticCurveTo(this.x + birdSize/2, this.y - birdSize/2 - wingOffset, this.x + birdSize, this.y);
        // Right wing
        ctx.moveTo(this.x + birdSize, this.y);
        ctx.quadraticCurveTo(this.x + birdSize * 1.5, this.y - birdSize/2 - wingOffset, this.x + birdSize * 2, this.y);
        ctx.stroke();
        ctx.restore();
    }
}

// --- Initialization ---
export interface DaytimeBackgroundElements {
    clouds: Cloud[];
    birds: Bird[];
}

export const initializeDaytimeElements = (canvasW: number, canvasH: number): DaytimeBackgroundElements => {
    const clouds: Cloud[] = [];
    const birds: Bird[] = [];

    const numClouds = Math.max(5, Math.floor(10 * (canvasW / 1920))); // Scale count, min 5
    for (let i = 0; i < numClouds; i++) {
        clouds.push(new Cloud(canvasW, canvasH));
    }

    const numBirds = Math.max(1, Math.floor(2 * (canvasW / 1920))); // Scale count, min 1
    for (let i = 0; i < numBirds; i++) {
        birds.push(new Bird(canvasW, canvasH));
    }

    return { clouds, birds };
};
