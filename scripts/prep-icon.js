'use strict';

/**
 * electron-builder requires Windows icons to be at least 256×256.
 * Upscale/pad the source PNG to 512×512 (transparent padding) without distorting aspect ratio.
 */

const fs = require('fs');
const path = require('path');

let sharp;
try {
    sharp = require('sharp');
} catch {
    console.error('[prep-icon] Install devDependency: npm install sharp --save-dev');
    process.exit(1);
}

const SIZE = 512;
const root = path.join(__dirname, '..');
const iconPath = path.join(root, 'build', 'icon.png');

async function main() {
    if (!fs.existsSync(iconPath)) {
        console.error('[prep-icon] Missing', iconPath);
        process.exit(1);
    }
    const buf = await sharp(iconPath)
        .resize(SIZE, SIZE, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer();
    fs.writeFileSync(iconPath, buf);
    const meta = await sharp(iconPath).metadata();
    console.log(`[prep-icon] Wrote ${iconPath} (${meta.width}×${meta.height})`);

    const pub = path.join(root, 'web', 'public', 'icon.png');
    fs.mkdirSync(path.dirname(pub), { recursive: true });
    fs.copyFileSync(iconPath, pub);
    console.log(`[prep-icon] Synced ${pub}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
