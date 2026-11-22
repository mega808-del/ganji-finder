/**
 * 계산 엔진 검증 스크립트 (개발용).
 *
 * manseryeok(한국 만세력 라이브러리)을 정답지로 삼아 24절기 시각과 사주팔자를 대조하고,
 * 음력 변환(평달/윤달)과 역산 결과를 다시 검산한다.
 *
 * 실행: npm run validate
 */
import { calculateFourPillars, getSolarTermsOfYear } from 'manseryeok';
import {
  BRANCHES,
  HOUR_TRADITIONAL_RANGES,
  KST_CORRECTION_MINUTES,
  STEMS,
  ganjiIndex,
  hourBranchOf,
  mod,
  tenGodName,
} from '../src/lib/ganji';
import { solarToLunar } from '../src/lib/lunar';
import { kstParts, pillarsAt, reverseSearch } from '../src/lib/saju';
import { getYearTerms } from '../src/lib/solar-terms';

const KST = 9 * 3_600_000;

/* 1. 24절기 시각 대조 (1900~2030) */
let maxDiffMs = 0;
let worst = '';
let total = 0;
let count = 0;

for (let year = 1900; year <= 2030; year += 1) {
  const mine = getYearTerms(year);
  const reference = getSolarTermsOfYear(year);
  for (let index = 0; index < 24; index += 1) {
    const diff = Math.abs(mine[index] - new Date(reference[index].date).getTime());
    total += diff;
    count += 1;
    if (diff > maxDiffMs) {
      maxDiffMs = diff;
      worst = `${year} ${reference[index].name}`;
    }
  }
}
console.log(
  `[절기] 평균 오차 ${(total / count / 1000).toFixed(1)}초, 최대 ${(maxDiffMs / 1000).toFixed(1)}초 (${worst})`,
);
console.log(`[절기] 2024 입춘(KST): ${new Date(getYearTerms(2024)[2] + KST).toISOString().replace('Z', '')}`);

/* 2. 사주팔자 대조 (1900~2030 샘플) */
const mismatches: string[] = [];
let checked = 0;

function check(year: number, month: number, day: number, hour: number, minute: number) {
  const ms = Date.UTC(year, month - 1, day, hour, minute) - KST;
  const mine = pillarsAt(ms);
  const reference = calculateFourPillars({ year, month, day, hour, minute, dayBoundary: 'midnight' });

  // 시지는 동경 127.5도 기준(-30분 보정)으로 판정하므로,
  // 같은 날짜에서 보정된 시각으로 참조 시주를 구한다(일주는 자정 경계 그대로).
  const corrected = mod(hour * 60 + minute + KST_CORRECTION_MINUTES, 1440);
  const refHour = calculateFourPillars({
    year,
    month,
    day,
    hour: Math.floor(corrected / 60),
    minute: corrected % 60,
    dayBoundary: 'midnight',
  }).hour;

  const mineText = [mine.yearGanji, mine.monthGanji, mine.dayGanji, mine.hourGanji]
    .map((ganji) => `${STEMS[ganji % 10]}${BRANCHES[ganji % 12]}`)
    .join(' ');

  const refText = [reference.year, reference.month, reference.day, refHour]
    .map((pillar) => `${pillar.heavenlyStem}${pillar.earthlyBranch}`)
    .join(' ');

  checked += 1;
  if (mineText !== refText) {
    mismatches.push(`${year}-${month}-${day} ${hour}:${minute} mine=${mineText} ref=${refText}`);
  }
}

// 1900-01-01 ~ 2030-12-31, 17일 간격 + 시간대 순환
let cursor = Date.UTC(1900, 0, 1);
const end = Date.UTC(2030, 11, 31);
let index = 0;
while (cursor <= end) {
  const date = new Date(cursor);
  const hour = [0, 3, 7, 11, 14, 18, 22][index % 7];
  check(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), hour, (index * 13) % 60);
  cursor += 17 * 86_400_000;
  index += 1;
}

// 절입·세수 경계 집중 검증: 매년 주요 절입 전후 ±2일 (정오)
for (let year = 1900; year <= 2030; year += 1) {
  const terms = getYearTerms(year);
  for (const termIndex of [0, 2, 4, 8, 18, 20, 22]) {
    for (const offset of [-2, -1, 0, 1, 2]) {
      const parts = kstParts(terms[termIndex] + offset * 86_400_000);
      check(parts.year, parts.month, parts.day, 12, 0);
    }
  }
}
console.log(`[사주] ${checked}건 대조, 불일치 ${mismatches.length}건`);
for (const line of mismatches.slice(0, 10)) console.log(' ', line);

/* 2-1. 시지 경계 (-30분 보정) 대표 지점 확인 */
const hourBoundaries: [number, number, number][] = [
  [23, 29, 11],
  [23, 30, 0],
  [1, 29, 0],
  [1, 30, 1],
  [3, 29, 1],
  [7, 30, 4],
  [9, 29, 4],
  [9, 30, 5],
  [21, 29, 10],
  [21, 30, 11],
];
const boundaryErrors = hourBoundaries
  .filter(([hour, minute, expected]) => hourBranchOf(hour, minute) !== expected)
  .map(([hour, minute, expected]) =>
    `${hour}:${minute} 기대=${BRANCHES[expected]} 실제=${BRANCHES[hourBranchOf(hour, minute)]}`,
  );
console.log(`[시지] 경계 ${hourBoundaries.length}건 확인, 불일치 ${boundaryErrors.length}건`);
for (const line of boundaryErrors) console.log(' ', line);

/* 2-2. 십신 표기 — 만세력 예시(기유·무진·정축·갑진)와 대조 */
const godSample = [
  ganjiIndex(5, 9), // 기유
  ganjiIndex(4, 4), // 무진
  ganjiIndex(3, 1), // 정축
  ganjiIndex(0, 4), // 갑진
];
const godExpected = ['식신', '상관', '일간', '정인'];
const godActual = godSample.map((ganji, index) =>
  index === 2 ? '일간' : tenGodName(godSample[2] % 10, ganji % 10),
);
const godErrors = godExpected
  .map((expected, index) =>
    expected === godActual[index]
      ? null
      : `${index}번째 기대=${expected} 실제=${godActual[index]}`,
  )
  .filter((line): line is string => line !== null);
console.log(`[십신] ${godExpected.length}자리 확인, 불일치 ${godErrors.length}건`);
for (const line of godErrors) console.log(' ', line);

/* 2-3. 전통 12지지 구간 표기 — 23:00~01:00 부터 21:00~23:00 까지 고정값인지 대조 */
const expectedRanges = [
  '23:00~01:00',
  '01:00~03:00',
  '03:00~05:00',
  '05:00~07:00',
  '07:00~09:00',
  '09:00~11:00',
  '11:00~13:00',
  '13:00~15:00',
  '15:00~17:00',
  '17:00~19:00',
  '19:00~21:00',
  '21:00~23:00',
];
const rangeErrors = expectedRanges
  .map((expected, index) =>
    HOUR_TRADITIONAL_RANGES[index] === expected
      ? null
      : `${BRANCHES[index]}시 기대=${expected} 실제=${HOUR_TRADITIONAL_RANGES[index]}`,
  )
  .filter((line): line is string => line !== null);
console.log(`[구간] 전통 12지지 ${expectedRanges.length}건 확인, 불일치 ${rangeErrors.length}건`);
for (const line of rangeErrors) console.log(' ', line);

/* 3. 음력 변환 (평달 / 윤달) */
const plain = solarToLunar(1990, 5, 15);
const leap = solarToLunar(2023, 3, 25);
console.log(
  `[음력] 1990-05-15 → ${plain?.year}-${plain?.month}-${plain?.day} ${plain?.isLeapMonth ? '윤달' : '평달'}`,
);
console.log(
  `[음력] 2023-03-25 → ${leap?.year}-${leap?.month}-${leap?.day} ${leap?.isLeapMonth ? '윤달' : '평달'}`,
);
const lunarOk =
  plain?.year === 1990 &&
  plain.month === 4 &&
  plain.day === 21 &&
  !plain.isLeapMonth &&
  leap?.year === 2023 &&
  leap.month === 2 &&
  leap.day === 4 &&
  leap.isLeapMonth;

/* 4. 역산 결과 재검증: 찾아낸 날짜의 사주를 다시 계산해 조건과 비교 */
const query = {
  yearPillar: 6,
  monthPillar: 17,
  dayPillar: 16,
  hourPillar: null,
  startYear: 1900,
  endYear: 2030,
};
const hits = reverseSearch(query);
const bad = hits.filter((hit) => {
  const ms = Date.UTC(hit.solar.year, hit.solar.month - 1, hit.solar.day, 12) - KST;
  const pillars = pillarsAt(ms);
  return (
    pillars.yearGanji !== query.yearPillar ||
    pillars.monthGanji !== query.monthPillar ||
    pillars.dayGanji !== query.dayPillar
  );
});
console.log(`[역산] 庚午·辛巳·庚辰(시주 무관) → ${hits.length}건, 재검증 불일치 ${bad.length}건`);
console.log(
  `  예시: ${hits
    .slice(0, 3)
    .map((hit) => `${hit.solar.year}-${hit.solar.month}-${hit.solar.day}`)
    .join(', ')}`,
);

if (
  mismatches.length > 0 ||
  boundaryErrors.length > 0 ||
  godErrors.length > 0 ||
  rangeErrors.length > 0 ||
  bad.length > 0 ||
  !lunarOk ||
  maxDiffMs > 120_000
) {
  console.error('검증 실패');
  process.exit(1);
}
console.log('검증 통과');
