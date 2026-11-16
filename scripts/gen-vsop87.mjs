/**
 * VSOP87D 지구 황경(L) 계수 테이블 생성 스크립트 (개발용).
 *
 * astronomia 패키지에 포함된 공식 VSOP87D 데이터에서 L0~L5 계수를 추출해
 * src/lib/vsop87-earth.ts 로 출력한다. 손으로 옮겨 적는 오류를 없애기 위한 것.
 *
 * 실행: node scripts/gen-vsop87.mjs
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const candidates = [
  path.join(root, 'node_modules/astronomia/data/vsop87Dearth.js'),
  path.join(root, 'node_modules/astronomia/lib/data/vsop87Dearth.cjs'),
];

let earth;
for (const candidate of candidates) {
  try {
    earth = (await import(pathToFileURL(candidate).href)).default;
    break;
  } catch {
    // 다음 후보 경로 시도
  }
}
if (!earth) throw new Error('VSOP87D 지구 데이터를 찾지 못했습니다. astronomia 설치를 확인하세요.');

// 진폭 2e-8 rad(약 0.004") 미만 항은 생략 — 절입 시각 오차 0.1초 미만
const THRESHOLD = 2e-8;
const series = ['0', '1', '2', '3', '4', '5'];

const lines = [
  '/**',
  ' * VSOP87D 지구 황경(L) 계수 — 단위 1e-8 rad, τ = 율리우스 천년.',
  ' * 공식 VSOP87D 데이터셋에서 자동 생성한 파일이다 (scripts/gen-vsop87.mjs).',
  ' * 진폭 2e-8 rad 미만 항은 생략했다.',
  ' */',
  'export type VsopTerm = readonly [amplitude: number, phase: number, frequency: number];',
  '',
];

const counts = {};
series.forEach((key, index) => {
  const terms = (earth.L[key] ?? []).filter((term) => Math.abs(term[0]) >= THRESHOLD);
  counts[`L${index}`] = terms.length;
  lines.push(`export const L${index}: readonly VsopTerm[] = [`);
  for (const [amplitude, phase, frequency] of terms) {
    lines.push(
      `  [${Math.round(amplitude * 1e8)}, ${phase.toFixed(7)}, ${frequency.toFixed(7)}],`,
    );
  }
  lines.push('];', '');
});

lines.push('export const EARTH_L: Record<number, readonly VsopTerm[]> = {');
series.forEach((_, index) => {
  lines.push(`  ${index}: L${index},`);
});
lines.push('};', '');

await writeFile(path.join(root, 'src', 'lib', 'vsop87-earth.ts'), lines.join('\n'), 'utf8');
console.log('generated src/lib/vsop87-earth.ts', counts);
