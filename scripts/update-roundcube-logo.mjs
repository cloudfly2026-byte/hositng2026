import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const webLogoPath = path.resolve(root, 'apps/web/public/velupi-logo.png');
const roundcubeImgDir = path.resolve(root, 'roundcube/skins/velupi/images');
const targetPngPath = path.resolve(roundcubeImgDir, 'velupi-logo.png');
const targetSvgPath = path.resolve(roundcubeImgDir, 'logo.svg');

// 1. Copy the authoritative complete logo from apps/web/public/velupi-logo.png
const pngBuffer = fs.readFileSync(webLogoPath);
fs.writeFileSync(targetPngPath, pngBuffer);
console.log('Copied velupi-logo.png:', pngBuffer.length, 'bytes');

// 2. Generate logo.svg embedding the complete logo (1774x887)
const b64 = pngBuffer.toString('base64');
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1774 887" role="img" aria-label="Velupi"><title>Velupi</title><image width="1774" height="887" href="data:image/png;base64,${b64}"/></svg>\n`;

fs.writeFileSync(targetSvgPath, svgContent);
console.log('Generated logo.svg with complete logo:', svgContent.length, 'bytes');
