/**
 * 사주팔자 역산 엔진.
 *
 * 기준
 *  - 시각: 한국 표준시(KST, UTC+9) 에 동경 127.5도 기준 -30분 보정
 *  - 세수(年柱): 입춘 절입 시각에 바뀐다
 *  - 월건(月柱): 12절(입춘·경칩·청명·입하·망종·소서·입추·백로·한로·입동·대설·소한)에 바뀐다
 *  - 일주(日柱): 자정(00:00)에 바뀐다 (야자시설)
 *  - 시주(時柱): 2시간 단위 12시지(-30분 보정), 자시는 23:30~01:29
 */
import { firstMonthStem, ganjiIndex, hourBranchOf, hourPillarIndex, mod } from './ganji';
import { getYearTerms } from './solar-terms';
import { solarToLunar, type LunarDate } from './lunar';

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
export const KST_OFFSET_MS = 9 * HOUR_MS;

export interface KstParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
}

/** epoch ms → KST 달력 정보 */
export function kstParts(timestamp: number): KstParts {
  const date = new Date(timestamp + KST_OFFSET_MS);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    weekday: date.getUTCDay(),
  };
}

/** 그레고리력 날짜 → 율리우스일 번호(정수) */
export function gregorianToJdn(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/** 1949-10-01 은 갑자일(甲子日) — 일주 순환의 기준점 */
const DAY_PILLAR_ANCHOR_JDN = gregorianToJdn(1949, 10, 1);

/** 월건이 바뀌는 12절의 절기 index (寅월부터 순서대로) */
const MONTH_SLOT_TERMS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 0] as const;
/** 위 12절에 대응하는 월지: 인·묘·진·사·오·미·신·유·술·해·자·축 */
const MONTH_SLOT_BRANCHES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1] as const;

const monthStartCache = new Map<number, number[]>();

/**
 * 사주년(입춘~다음 입춘)의 월건 시작 시각 13개.
 * 0~11 은 각 월건의 시작, 12 는 다음 해 입춘(종료 경계).
 */
function monthStarts(sajuYear: number): number[] {
  const cached = monthStartCache.get(sajuYear);
  if (cached) return cached;

  const current = getYearTerms(sajuYear);
  const next = getYearTerms(sajuYear + 1);
  const starts = MONTH_SLOT_TERMS.map((termIndex, slot) =>
    slot === 11 ? next[0] : current[termIndex],
  );
  starts.push(next[2]); // 다음 해 입춘
  monthStartCache.set(sajuYear, starts);
  return starts;
}

/** 주어진 순간의 사주년(입춘 기준 연도) */
function sajuYearOf(timestamp: number, calendarYear: number): number {
  const lichun = getYearTerms(calendarYear)[2];
  return timestamp >= lichun ? calendarYear : calendarYear - 1;
}

export interface FourPillars {
  year: number;
  month: number;
  day: number;
  hour: number;
  /** 60갑자 index 0~59 */
  yearGanji: number;
  monthGanji: number;
  dayGanji: number;
  hourGanji: number;
  /** 0 = 인월 … 11 = 축월 */
  monthSlot: number;
  hourBranch: number;
}

/** 특정 순간(KST)의 사주팔자 */
export function pillarsAt(timestamp: number): FourPillars {
  const parts = kstParts(timestamp);

  const sajuYear = sajuYearOf(timestamp, parts.year);
  const yearGanji = mod(sajuYear - 4, 60);

  const starts = monthStarts(sajuYear);
  let monthSlot = 0;
  for (let slot = 11; slot >= 0; slot -= 1) {
    if (timestamp >= starts[slot]) {
      monthSlot = slot;
      break;
    }
  }

  const monthBranch = MONTH_SLOT_BRANCHES[monthSlot];
  const monthStem = mod(firstMonthStem(yearGanji % 10) + monthSlot, 10);
  const monthGanji = ganjiIndex(monthStem, monthBranch);

  const jdn = gregorianToJdn(parts.year, parts.month, parts.day);
  const dayGanji = mod(jdn - DAY_PILLAR_ANCHOR_JDN, 60);

  const hourBranch = hourBranchOf(parts.hour, parts.minute);
  const hourGanji = hourPillarIndex(dayGanji % 10, hourBranch);

  return {
    year: yearGanji,
    month: monthGanji,
    day: dayGanji,
    hour: hourGanji,
    yearGanji,
    monthGanji,
    dayGanji,
    hourGanji,
    monthSlot,
    hourBranch,
  };
}

export interface SearchQuery {
  yearPillar: number;
  monthPillar: number;
  dayPillar: number;
  /** null 이면 시주 '모름' */
  hourPillar: number | null;
  startYear: number;
  endYear: number;
}

export interface SearchHit {
  solar: { year: number; month: number; day: number; weekday: number };
  lunar: LunarDate | null;
  /** null 이면 시간 무관 */
  hourBranch: number | null;
  hourGanji: number | null;
  pillars: { year: number; month: number; day: number; hour: number | null };
}

/**
 * 년·월·일(·시) 간지가 모두 일치하는 양력 날짜를 [startYear, endYear] 에서 찾는다.
 *
 * 하루 단위로 순회하며 입춘·절입 시각까지 비교하므로, 절입 직후/직전 출생도
 * 정확히 해당 월건으로 분류된다. 시주를 모르면 그 날짜 전체를 결과로 돌려준다.
 */
export function reverseSearch(query: SearchQuery): SearchHit[] {
  const { yearPillar, monthPillar, dayPillar, hourPillar } = query;
  const hits: SearchHit[] = [];

  // KST 기준 시작일 00:00 ~ 종료일 00:00
  const startMs = Date.UTC(query.startYear, 0, 1) - KST_OFFSET_MS;
  const endMs = Date.UTC(query.endYear, 11, 31) - KST_OFFSET_MS;

  for (let dayStart = startMs; dayStart <= endMs; dayStart += DAY_MS) {
    // 정오 기준으로 사주를 계산해 자정/절입 경계에서의 모호함을 피한다
    const noon = dayStart + 12 * HOUR_MS;
    const pillars = pillarsAt(noon);

    if (pillars.yearGanji !== yearPillar) continue;
    if (pillars.monthGanji !== monthPillar) continue;
    if (pillars.dayGanji !== dayPillar) continue;

    const parts = kstParts(dayStart);
    const dayStem = pillars.dayGanji % 10;

    // 시주가 주어졌으면 그 시지 하나만, 모르면 하루 전체
    let branches: (number | null)[] = [null];
    if (hourPillar !== null) {
      const targetBranch = hourPillar % 12;
      const targetStem = hourPillar % 10;
      const matches = mod(dayStem * 2 + targetBranch, 10) === targetStem;
      branches = matches ? [targetBranch] : [];
    }

    for (const branch of branches) {
      hits.push({
        solar: {
          year: parts.year,
          month: parts.month,
          day: parts.day,
          weekday: parts.weekday,
        },
        lunar: solarToLunar(parts.year, parts.month, parts.day),
        hourBranch: branch,
        hourGanji: branch === null ? null : hourPillarIndex(dayStem, branch),
        pillars: {
          year: pillars.yearGanji,
          month: pillars.monthGanji,
          day: pillars.dayGanji,
          hour: branch === null ? null : hourPillarIndex(dayStem, branch),
        },
      });
    }
  }

  return hits;
}

/**
 * 선택한 년주로 성립 가능한 12개 월주 (오호둔) — 인월·묘월 … 축월 순서.
 * 참고 만세력의 월주 선택 목록과 같은 규칙이다.
 */
export function monthPillarOptions(yearPillar: number): number[] {
  return MONTH_SLOT_BRANCHES.map((branch, slot) =>
    ganjiIndex(mod(firstMonthStem(yearPillar % 10) + slot, 10), branch),
  );
}

/**
 * 선택한 일주로 성립 가능한 12개 시주 (오서둔) — 자시·축시 … 해시 순서.
 */
export function hourPillarOptions(dayPillar: number): number[] {
  return Array.from({ length: 12 }, (_, branch) => hourPillarIndex(dayPillar % 10, branch));
}

/**
 * 선택한 년주·월주가 오호둔(五虎遁) 규칙상 함께 성립할 수 있는지.
 * 성립하지 않으면 검색 범위 전체에서 결과가 0건이 된다.
 */
export function isMonthPillarPossible(yearPillar: number, monthPillar: number): boolean {
  const slot = MONTH_SLOT_BRANCHES.indexOf((monthPillar % 12) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11);
  if (slot < 0) return false;
  const expectedStem = mod(firstMonthStem(yearPillar % 10) + slot, 10);
  return expectedStem === monthPillar % 10;
}

