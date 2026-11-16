/**
 * 24절기 계산 (한국 표준시 KST = UTC+9 기준).
 *
 * 태양의 겉보기 황경(apparent solar longitude)이 15°의 배수가 되는 순간을
 * 뉴턴 반복법으로 찾는다. 태양 황경은 VSOP87D(지구) 계수로 계산하고,
 * FK5 보정 · 장동(nutation) · 광행차(aberration) 를 적용한다.
 * 시각 스케일은 TT → UT 변환에 ΔT(Espenak & Meeus) 근사식을 사용한다.
 *
 * 계수 테이블은 공식 VSOP87D 데이터셋에서 자동 생성한 vsop87-earth.ts 를 쓴다.
 */
import { EARTH_L, type VsopTerm } from './vsop87-earth';

const RAD = Math.PI / 180;
const ARCSEC = 1 / 3600;
const MS_PER_DAY = 86_400_000;
const J2000 = 2451545;
const JULIAN_UNIX_EPOCH = 2440587.5; // 1970-01-01T00:00Z 의 JD

function series(terms: readonly VsopTerm[], tau: number): number {
  let sum = 0;
  for (let i = 0; i < terms.length; i += 1) {
    const [amplitude, phase, frequency] = terms[i];
    sum += amplitude * Math.cos(phase + frequency * tau);
  }
  return sum;
}

function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** -180°~180° 범위로 정규화 */
function wrap180(deg: number): number {
  let value = norm360(deg);
  if (value > 180) value -= 360;
  return value;
}

/**
 * 태양의 겉보기 황경(도). 인자는 TT 기준 율리우스일(JDE).
 * VSOP87D + FK5 + 장동 + 광행차.
 */
export function apparentSolarLongitude(jde: number): number {
  const tau = (jde - J2000) / 365250;
  const T = tau * 10;

  const heliocentric =
    (series(EARTH_L[0], tau) +
      series(EARTH_L[1], tau) * tau +
      series(EARTH_L[2], tau) * tau ** 2 +
      series(EARTH_L[3], tau) * tau ** 3 +
      series(EARTH_L[4], tau) * tau ** 4 +
      series(EARTH_L[5], tau) * tau ** 5) /
    1e8;

  // 지구 황경 → 태양의 지심 황경
  let lambda = norm360(heliocentric / RAD + 180);

  // FK5 기준계 보정
  lambda -= 0.09033 * ARCSEC;

  // 장동 (Δψ)
  const omega = (125.04452 - 1934.136261 * T + 0.0020708 * T ** 2 + T ** 3 / 450000) * RAD;
  const sunMean = (280.4665 + 36000.7698 * T) * RAD;
  const moonMean = (218.3165 + 481267.8813 * T) * RAD;
  const nutation =
    (-17.2 * Math.sin(omega) -
      1.32 * Math.sin(2 * sunMean) -
      0.23 * Math.sin(2 * moonMean) +
      0.21 * Math.sin(2 * omega)) *
    ARCSEC;

  // 광행차
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T ** 2;
  const M = (357.52911 + 35999.05029 * T - 0.0001537 * T ** 2) * RAD;
  const distance = (1.000001018 * (1 - e * e)) / (1 + e * Math.cos(M));
  const aberration = (-20.4898 / distance) * ARCSEC;

  return norm360(lambda + nutation + aberration);
}

/** TT − UT (초). Espenak & Meeus 다항식 근사. */
function deltaTSeconds(year: number): number {
  if (year < 1900) {
    const t = year - 1860;
    return (
      7.62 +
      0.5737 * t -
      0.251754 * t ** 2 +
      0.01680668 * t ** 3 -
      0.0004473624 * t ** 4 +
      t ** 5 / 233174
    );
  }
  if (year < 1920) {
    const t = year - 1900;
    return -2.79 + 1.494119 * t - 0.0598939 * t ** 2 + 0.0061966 * t ** 3 - 0.000197 * t ** 4;
  }
  if (year < 1941) {
    const t = year - 1920;
    return 21.2 + 0.84493 * t - 0.0761 * t ** 2 + 0.0020936 * t ** 3;
  }
  if (year < 1961) {
    const t = year - 1950;
    return 29.07 + 0.407 * t - t ** 2 / 233 + t ** 3 / 2547;
  }
  if (year < 1986) {
    const t = year - 1975;
    return 45.45 + 1.067 * t - t ** 2 / 260 - t ** 3 / 718;
  }
  if (year < 2005) {
    const t = year - 2000;
    return (
      63.86 +
      0.3345 * t -
      0.060374 * t ** 2 +
      0.0017275 * t ** 3 +
      0.000651814 * t ** 4 +
      0.00002373599 * t ** 5
    );
  }
  if (year < 2050) {
    const t = year - 2000;
    return 62.92 + 0.32217 * t + 0.005589 * t ** 2;
  }
  if (year < 2150) {
    const u = (year - 1820) / 100;
    return -20 + 32 * u * u - 0.5628 * (2150 - year);
  }
  const u = (year - 1820) / 100;
  return -20 + 32 * u * u;
}

function jdFromUnixMs(ms: number): number {
  return ms / MS_PER_DAY + JULIAN_UNIX_EPOCH;
}

function unixMsFromJd(jd: number): number {
  return (jd - JULIAN_UNIX_EPOCH) * MS_PER_DAY;
}

export interface SolarTermDef {
  /** 0 = 소한 … 23 = 동지 (양력 연도 순서) */
  index: number;
  name: string;
  hanja: string;
  /** 태양 겉보기 황경(도) */
  longitude: number;
  /** 대략적인 양력 월·일 (뉴턴 반복의 초기값) */
  month: number;
  day: number;
}

export const SOLAR_TERMS: readonly SolarTermDef[] = [
  { index: 0, name: '소한', hanja: '小寒', longitude: 285, month: 1, day: 5 },
  { index: 1, name: '대한', hanja: '大寒', longitude: 300, month: 1, day: 20 },
  { index: 2, name: '입춘', hanja: '立春', longitude: 315, month: 2, day: 4 },
  { index: 3, name: '우수', hanja: '雨水', longitude: 330, month: 2, day: 19 },
  { index: 4, name: '경칩', hanja: '驚蟄', longitude: 345, month: 3, day: 5 },
  { index: 5, name: '춘분', hanja: '春分', longitude: 0, month: 3, day: 20 },
  { index: 6, name: '청명', hanja: '淸明', longitude: 15, month: 4, day: 4 },
  { index: 7, name: '곡우', hanja: '穀雨', longitude: 30, month: 4, day: 20 },
  { index: 8, name: '입하', hanja: '立夏', longitude: 45, month: 5, day: 5 },
  { index: 9, name: '소만', hanja: '小滿', longitude: 60, month: 5, day: 21 },
  { index: 10, name: '망종', hanja: '芒種', longitude: 75, month: 6, day: 5 },
  { index: 11, name: '하지', hanja: '夏至', longitude: 90, month: 6, day: 21 },
  { index: 12, name: '소서', hanja: '小暑', longitude: 105, month: 7, day: 7 },
  { index: 13, name: '대서', hanja: '大暑', longitude: 120, month: 7, day: 22 },
  { index: 14, name: '입추', hanja: '立秋', longitude: 135, month: 8, day: 7 },
  { index: 15, name: '처서', hanja: '處暑', longitude: 150, month: 8, day: 23 },
  { index: 16, name: '백로', hanja: '白露', longitude: 165, month: 9, day: 7 },
  { index: 17, name: '추분', hanja: '秋分', longitude: 180, month: 9, day: 23 },
  { index: 18, name: '한로', hanja: '寒露', longitude: 195, month: 10, day: 8 },
  { index: 19, name: '상강', hanja: '霜降', longitude: 210, month: 10, day: 23 },
  { index: 20, name: '입동', hanja: '立冬', longitude: 225, month: 11, day: 7 },
  { index: 21, name: '소설', hanja: '小雪', longitude: 240, month: 11, day: 22 },
  { index: 22, name: '대설', hanja: '大雪', longitude: 255, month: 12, day: 7 },
  { index: 23, name: '동지', hanja: '冬至', longitude: 270, month: 12, day: 21 },
];

/**
 * 특정 양력 연도의 절기 하나가 드는 순간(UTC epoch ms).
 * 예) solarTermInstant(2024, 2) → 2024-02-04 08:27 UTC (= 17:27 KST)
 */
export function solarTermInstant(year: number, index: number): number {
  const def = SOLAR_TERMS[index];

  // 초기 추정값: 해당 절기의 평균 날짜 (UTC 06시)
  let jde = jdFromUnixMs(Date.UTC(year, def.month - 1, def.day, 6));

  // 태양 황경은 하루 약 0.9856° 씩 증가 → 뉴턴 반복으로 수렴
  for (let i = 0; i < 12; i += 1) {
    const diff = wrap180(def.longitude - apparentSolarLongitude(jde));
    if (Math.abs(diff) < 1e-7) break;
    jde += diff / 0.9856473;
  }

  const utJulianDay = jde - deltaTSeconds(year) / 86400;
  return unixMsFromJd(utJulianDay);
}

const termCache = new Map<number, number[]>();

/** 양력 연도의 24절기 시각(UTC epoch ms) 24개. index 0 = 소한 */
export function getYearTerms(year: number): number[] {
  const cached = termCache.get(year);
  if (cached) return cached;

  const terms = SOLAR_TERMS.map((term) => solarTermInstant(year, term.index));
  termCache.set(year, terms);
  return terms;
}
