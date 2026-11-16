/**
 * 육십갑자(六十甲子) 기본 상수와 변환 유틸리티.
 *
 * 0 = 갑자(甲子) … 59 = 계해(癸亥)
 * 천간 index = ganji % 10, 지지 index = ganji % 12 로 복원된다.
 */

export const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
export const STEMS_HANJA = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;

export const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'] as const;
export const BRANCHES_HANJA = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

/** 12지지의 시각 구간 (KST, 자정 기준 일주 경계) */
export const HOUR_RANGES = [
  '23:00~00:59',
  '01:00~02:59',
  '03:00~04:59',
  '05:00~06:59',
  '07:00~08:59',
  '09:00~10:59',
  '11:00~12:59',
  '13:00~14:59',
  '15:00~16:59',
  '17:00~18:59',
  '19:00~20:59',
  '21:00~22:59',
] as const;

export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** 오행 — 만세력 표기와 동일하게 木 초록 · 火 빨강 · 土 노랑 · 金 흰색 · 水 검정 */
export type Element = 'mok' | 'hwa' | 'to' | 'geum' | 'su';

export const ELEMENT_NAMES: Record<Element, string> = {
  mok: '목',
  hwa: '화',
  to: '토',
  geum: '금',
  su: '수',
};

/** 천간 오행: 갑을=목, 병정=화, 무기=토, 경신=금, 임계=수 */
export function stemElement(stem: number): Element {
  return (['mok', 'mok', 'hwa', 'hwa', 'to', 'to', 'geum', 'geum', 'su', 'su'] as const)[mod(stem, 10)];
}

/** 지지 오행: 인묘=목, 사오=화, 진술축미=토, 신유=금, 해자=수 */
export function branchElement(branch: number): Element {
  return (
    ['su', 'to', 'mok', 'mok', 'to', 'hwa', 'hwa', 'to', 'geum', 'geum', 'to', 'su'] as const
  )[mod(branch, 12)];
}

/** 음수에서도 0 이상의 나머지를 반환 */
export function mod(value: number, base: number): number {
  return ((value % base) + base) % base;
}

/**
 * 천간·지지 index → 60갑자 index.
 * 60갑자는 천간(10)과 지지(12)가 함께 순환하므로 홀짝이 같은 조합만 실재한다.
 * 실재하지 않는 조합(예: 갑축)은 -1 을 반환한다.
 */
export function ganjiIndex(stem: number, branch: number): number {
  if (stem % 2 !== branch % 2) return -1;
  let index = mod(stem, 10);
  while (index % 12 !== mod(branch, 12)) index += 10;
  return mod(index, 60);
}

export function isRealGanji(stem: number, branch: number): boolean {
  return ganjiIndex(stem, branch) >= 0;
}

export function ganjiHanja(ganji: number): string {
  return `${STEMS_HANJA[mod(ganji, 10)]}${BRANCHES_HANJA[mod(ganji, 12)]}`;
}

export function ganjiKorean(ganji: number): string {
  return `${STEMS[mod(ganji, 10)]}${BRANCHES[mod(ganji, 12)]}`;
}

export function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/**
 * 태어난 시각(hour, 0~23) → 시지(時支) index.
 * 자시(子時)는 23:00~00:59 이며, 일주 경계는 자정(00:00) 기준이다.
 */
export function hourBranchOf(hour: number): number {
  return mod(Math.floor((hour + 1) / 2), 12);
}

/** 일간(日干)과 시지(時支) → 시주(時柱) 60갑자 index */
export function hourPillarIndex(dayStem: number, hourBranch: number): number {
  return ganjiIndex(mod(dayStem * 2 + hourBranch, 10), hourBranch);
}

/** 년간(年干)으로부터 寅월의 월간(月干)을 구한다 (五虎遁) */
export function firstMonthStem(yearStem: number): number {
  return mod((yearStem % 5) * 2 + 2, 10);
}
