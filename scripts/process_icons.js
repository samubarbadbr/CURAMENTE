import fs from 'fs';
import path from 'path';

const srcImg = path.join(process.cwd(), 'src/assets/images/pwa_brain_icon_1786609741238.jpg');
const pubDir = path.join(process.cwd(), 'public');

if (!fs.existsSync(pubDir)) {
  fs.mkdirSync(pubDir, { recursive: true });
}

let processed = false;

try {
  const sharp = (await import('sharp')).default;
  await sharp(srcImg).resize(192, 192).toFile(path.join(pubDir, 'icon-192.png'));
  await sharp(srcImg).resize(512, 512).toFile(path.join(pubDir, 'icon-512.png'));
  await sharp(srcImg).resize(512, 512).toFile(path.join(pubDir, 'icon.png'));
  console.log('Sharp successfully resized icons!');
  processed = true;
} catch (e) {
  console.log('Sharp not available:', e.message);
}

if (!processed && fs.existsSync(srcImg)) {
  fs.copyFileSync(srcImg, path.join(pubDir, 'icon.png'));
  fs.copyFileSync(srcImg, path.join(pubDir, 'icon-192.png'));
  fs.copyFileSync(srcImg, path.join(pubDir, 'icon-512.png'));
  console.log('Copied generated brain image to icon.png, icon-192.png, icon-512.png in public dir!');
}

// Generate crisp SVG brain favicon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <rect width="512" height="512" rx="120" fill="#EBF0EC"/>
  <rect width="470" height="470" x="21" y="21" rx="100" fill="#5B67CA"/>
  <!-- Stylized Brain Icon -->
  <g fill="none" stroke="#EBF0EC" stroke-linecap="round" stroke-linejoin="round">
    <!-- Left Hemisphere -->
    <path d="M236 130 C180 130 140 160 130 210 C110 220 100 250 110 280 C100 305 110 335 135 355 C160 375 200 375 220 355 C235 360 246 350 246 330" stroke-width="22"/>
    <path d="M165 195 C190 215 215 205 236 220" stroke-width="18"/>
    <path d="M145 260 C180 260 190 280 236 280" stroke-width="18"/>
    <path d="M170 320 C195 305 215 325 236 310" stroke-width="18"/>
    
    <!-- Right Hemisphere -->
    <path d="M276 130 C332 130 372 160 382 210 C402 220 412 250 402 280 C412 305 401 335 377 355 C352 375 312 375 292 355 C277 360 266 350 266 330" stroke-width="22"/>
    <path d="M347 195 C322 215 297 205 276 220" stroke-width="18"/>
    <path d="M367 260 C332 260 322 280 276 280" stroke-width="18"/>
    <path d="M342 320 C317 305 297 325 276 310" stroke-width="18"/>
  </g>
  <!-- Synapse Glow Nodes -->
  <circle cx="256" cy="180" r="14" fill="#EBF0EC"/>
  <circle cx="256" cy="256" r="16" fill="#EBF0EC"/>
  <circle cx="256" cy="330" r="14" fill="#EBF0EC"/>
  <circle cx="185" cy="205" r="9" fill="#EBF0EC"/>
  <circle cx="327" cy="205" r="9" fill="#EBF0EC"/>
  <circle cx="175" cy="315" r="9" fill="#EBF0EC"/>
  <circle cx="337" cy="315" r="9" fill="#EBF0EC"/>
</svg>`;

fs.writeFileSync(path.join(pubDir, 'favicon.svg'), svgContent, 'utf-8');
console.log('favicon.svg generated successfully!');
