// Canvas text helpers for the signs and displays that sit inside the 3D scenes.
export function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
export const FONT = '"Inter", "Segoe UI", system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif';
// Draw centred text, shrinking the size until it fits maxW.
export function fitText(c: CanvasRenderingContext2D, text: string, cx: number, cy: number, maxW: number, size: number, weight = 800, fill: string | CanvasGradient = '#fff') {
  let s = size;
  c.font = `${weight} ${s}px ${FONT}`;
  while (c.measureText(text).width > maxW && s > 8) { s -= 2; c.font = `${weight} ${s}px ${FONT}`; }
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = fill;
  c.fillText(text, cx, cy);
}
