
import { TILE_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';
import { RGBColor } from '../types'; // Assuming RGBColor is in types.ts

// Helper functions (can be moved to a shared utility if used elsewhere)
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const lerpColor = (color1: RGBColor, color2: RGBColor, factor: number): string => {
  const r = Math.round(lerp(color1.r, color2.r, factor));
  const g = Math.round(lerp(color1.g, color2.g, factor));
  const b = Math.round(lerp(color1.b, color2.b, factor));
  return `rgb(${r},${g},${b})`;
};

// Color constants for terrain
const WHITE_RGB: RGBColor = { r: 255, g: 255, b: 255 };
// const BLACK_RGB: RGBColor = { r: 0, g: 0, b: 0 }; // Ground is filled black, so stroke can fade to transparent
const NIGHT_TERRAIN_DETAIL_COLOR_RGB: RGBColor = { r: 68, g: 68, b: 68 }; // #444444
const DAY_TERRAIN_DETAIL_COLOR_RGB: RGBColor = { r: 26, g: 26, b: 26 };   // #1A1A1A

export const generateTerrainData = (): number[] => {
    const terrainPoints: number[] = [];
    for (let i = 0; i < CANVAS_WIDTH; i++) {
        let y = CANVAS_HEIGHT - TILE_SIZE * 2;
        if (i > TILE_SIZE * 15 && i < TILE_SIZE * 25) y = CANVAS_HEIGHT - TILE_SIZE * 5;
        if (i >= TILE_SIZE * 25 && i < TILE_SIZE * 35) y = CANVAS_HEIGHT - TILE_SIZE * 4;
        if (i >= TILE_SIZE * 35 && i < TILE_SIZE * 58) y = CANVAS_HEIGHT - TILE_SIZE * 2;
        if (i >= TILE_SIZE * 58 && i < TILE_SIZE * 62) y = CANVAS_HEIGHT - TILE_SIZE * 3;
        if (i >= TILE_SIZE * 62 && i < TILE_SIZE * 66) y = CANVAS_HEIGHT - TILE_SIZE * 4;
        if (i >= TILE_SIZE * 66 && i < TILE_SIZE * 78) y = CANVAS_HEIGHT - TILE_SIZE * 2;
        if (i >= TILE_SIZE * 78 && i < TILE_SIZE * 82) y = CANVAS_HEIGHT - TILE_SIZE * 3;
        if (i >= TILE_SIZE * 82 && i < TILE_SIZE * 86) y = CANVAS_HEIGHT - TILE_SIZE * 4;
        if (i >= TILE_SIZE * 86 && i < TILE_SIZE * 90) y = CANVAS_HEIGHT - TILE_SIZE * 5;
        if (i >= TILE_SIZE * 90) y = CANVAS_HEIGHT - TILE_SIZE * 6;
        terrainPoints[i] = y;
    }
    return terrainPoints;
};

export const drawTerrain = (ctx: CanvasRenderingContext2D, terrainData: number[], dayFactor: number): void => {
    // dayFactor: 0 for full night, 1 for full day

    // ALWAYS fill the ground black first
    ctx.fillStyle = 'black';
    ctx.beginPath();
    if (terrainData.length > 0 && terrainData[0] !== undefined) {
        ctx.moveTo(0, terrainData[0]);
    } else {
        ctx.moveTo(0, CANVAS_HEIGHT - TILE_SIZE * 2); // Fallback
    }

    for (let i = 1; i < CANVAS_WIDTH; i++) {
        if (terrainData[i] !== undefined) {
             ctx.lineTo(i, terrainData[i]);
        } else {
            ctx.lineTo(i, CANVAS_HEIGHT - TILE_SIZE * 2); 
        }
    }
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT); 
    ctx.lineTo(0, CANVAS_HEIGHT);       
    ctx.closePath();
    ctx.fill();

    // THEN, draw the top outline (fades out during day)
    const topStrokeAlpha = Math.max(0, 1 - dayFactor);
    if (topStrokeAlpha > 0.01) { // Only draw if somewhat visible
        ctx.strokeStyle = `rgba(${WHITE_RGB.r}, ${WHITE_RGB.g}, ${WHITE_RGB.b}, ${topStrokeAlpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (terrainData.length > 0 && terrainData[0] !== undefined) {
            ctx.moveTo(0, terrainData[0]);
        } else {
            ctx.moveTo(0, CANVAS_HEIGHT - TILE_SIZE * 2); 
        }
        for (let i = 1; i < CANVAS_WIDTH; i++) {
            if (terrainData[i] !== undefined) {
                 ctx.lineTo(i, terrainData[i]);
            } else {
                ctx.lineTo(i, CANVAS_HEIGHT - TILE_SIZE * 2); 
            }
        }
        ctx.stroke();
    }
    
    // Draw details with smoothly transitioning color
    const detailColor = lerpColor(NIGHT_TERRAIN_DETAIL_COLOR_RGB, DAY_TERRAIN_DETAIL_COLOR_RGB, dayFactor);
    ctx.fillStyle = detailColor;
    for (let i = 0; i < CANVAS_WIDTH; i += TILE_SIZE / 2) {
         if (Math.random() < 0.3) {
            const groundY = terrainData[Math.floor(i)];
            if (groundY !== undefined) {
                ctx.fillRect(i, groundY + 2, TILE_SIZE/4, TILE_SIZE/4);
            }
         }
    }
};
