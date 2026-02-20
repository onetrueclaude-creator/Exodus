import { Graphics } from 'pixi.js';

export function createGridBackground(width: number, height: number, cellSize: number = 60): Graphics {
  const grid = new Graphics();
  const lineColor = 0xffffff;
  const lineAlpha = 0.03;

  grid.setStrokeStyle({ width: 1, color: lineColor, alpha: lineAlpha });

  for (let x = -width; x <= width; x += cellSize) {
    grid.moveTo(x, -height);
    grid.lineTo(x, height);
  }
  for (let y = -height; y <= height; y += cellSize) {
    grid.moveTo(-width, y);
    grid.lineTo(width, y);
  }
  grid.stroke();

  return grid;
}
