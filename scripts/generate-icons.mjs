/**
 * 앱 아이콘(PNG) 생성 스크립트.
 * `npm run icons` 로 실행하면 public/icons 아래에 필요한 크기가 만들어진다.
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, 'public', 'icons');
await mkdir(outDir, { recursive: true });

/** @param {number} size @param {number} scale */
function artwork(size, scale) {
  const s = size;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1B2A47" />
        <stop offset="1" stop-color="#0A1120" />
      </linearGradient>
      <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FFD98A" />
        <stop offset="1" stop-color="#D08A12" />
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="42%" r="58%">
        <stop offset="0" stop-color="#FFB020" stop-opacity="0.32" />
        <stop offset="1" stop-color="#FFB020" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="512" height="512" fill="url(#bg)" />
    <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
      <circle cx="256" cy="256" r="240" fill="url(#glow)" />
      <circle cx="256" cy="256" r="150" fill="none" stroke="url(#gold)" stroke-width="16" stroke-linecap="round" />
      <g fill="url(#gold)">
        <rect x="203" y="214" width="15" height="84" rx="7.5" />
        <rect x="232" y="192" width="15" height="128" rx="7.5" />
        <rect x="261" y="203" width="15" height="106" rx="7.5" />
        <rect x="290" y="224" width="15" height="64" rx="7.5" />
      </g>
    </g>
  </svg>`;
}

const jobs = [
  { file: 'icon-192.png', size: 192, scale: 1 },
  { file: 'icon-512.png', size: 512, scale: 1 },
  { file: 'maskable-512.png', size: 512, scale: 0.78 },
  { file: 'apple-touch-icon.png', size: 180, scale: 0.9 },
];

for (const job of jobs) {
  const svg = Buffer.from(artwork(job.size, job.scale));
  await sharp(svg)
    .resize(job.size, job.size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, job.file));
  console.log('generated', job.file);
}
