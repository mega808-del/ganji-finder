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

/**
 * 한국 표준시 보정값 — 동경 127.5도 기준(일반 만세력과 동일하게 -30분).
 * 시지 경계를 30분씩 늦춰 계산한다.
 */
export const KST_CORRECTION_MINUTES = -30;

/**
 * 12지지의 전통 시간 구간 — 화면 표기용 고정값이며 절대 이동시키지 않는다.
 * 시지 판정은 이 전통 구간을 -30분 보정한 시각으로 하되, 표기는 전통 구간 그대로 보여준다.
 */
export const HOUR_TRADITIONAL_RANGES = [
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
] as const;

/**
 * 전통 구간에 -30분 보정을 적용한 '출생 시계 시간' 환산 구간(보정 전 시계 기준).
 * 예) 진시 전통 07:00~09:00 → 보정 시각 06:30~08:59 → 출생 시계 07:30~09:29
 * 전통 구간 문자열은 그대로 두고, 이 환산 구간만 별도 항목으로 병기한다.
 */
export const HOUR_CLOCK_RANGES = [
  '23:30~01:29',
  '01:30~03:29',
  '03:30~05:29',
  '05:30~07:29',
  '07:30~09:29',
  '09:30~11:29',
  '11:30~13:29',
  '13:30~15:29',
  '15:30~17:29',
  '17:30~19:29',
  '19:30~21:29',
  '21:30~23:29',
] as const;

/**
 * 시지 구간의 중간값 — 역산 결과에서 '보정 전(출생 시계) 기준 시각'으로 표시한다.
 * 보정 후 시각은 여기서 -30분 한 값이다. (진시 07:30~09:29 → 08:30, 보정 후 08:00)
 */
export const HOUR_REPRESENTATIVE_TIMES = [
  '00:30',
  '02:30',
  '04:30',
  '06:30',
  '08:30',
  '10:30',
  '12:30',
  '14:30',
  '16:30',
  '18:30',
  '20:30',
  '22:30',
] as const;

export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** 성별 — 만세력 표기와 같이 '여자' · '남자' 로 보여준다 */
export type Gender = '여' | '남';

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

/** 'HH:MM' 시각에 분 단위 보정값을 더한 'HH:MM' — 하루를 넘어가면 순환한다 */
export function shiftTimeLabel(time: string, minutes: number): string {
  const [hour, minute] = time.split(':').map(Number);
  const total = mod(hour * 60 + minute + minutes, 1440);
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
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
 * 태어난 시각(한국 표준시 hour·minute) → 시지(時支) index.
 * 동경 127.5도 기준으로 -30분 보정한 시각으로 판정한다. (예: 출생 09:20 → 보정 08:50 → 진시)
 * 전통 12지지 구간 자체는 고정(HOUR_TRADITIONAL_RANGES)이고, 일주 경계는 자정(00:00) 기준이다.
 */
export function hourBranchOf(hour: number, minute = 0): number {
  const corrected = hour * 60 + minute + KST_CORRECTION_MINUTES;
  return mod(Math.floor((corrected + 60) / 120), 12);
}

/**
 * 십신(十神) — 일간 기준 다른 천간과의 관계.
 * [같은 음양, 다른 음양] 순서로 비겁·식상·재성·관성·인성을 나눈다.
 */
const TEN_GODS = [
  ['비견', '겁재'],
  ['식신', '상관'],
  ['편재', '정재'],
  ['편관', '정관'],
  ['편인', '정인'],
] as const;

/** 천간 오행 index: 목 0 · 화 1 · 토 2 · 금 3 · 수 4 */
function stemElementIndex(stem: number): number {
  return Math.floor(mod(stem, 10) / 2);
}

/** 일간(dayStem)을 기준으로 본 천간(stem)의 십신 이름 (만세력 표기와 동일) */
export function tenGodName(dayStem: number, stem: number): string {
  const relation = mod(stemElementIndex(stem) - stemElementIndex(dayStem), 5);
  const samePolarity = mod(dayStem, 2) === mod(stem, 2);
  return TEN_GODS[relation][samePolarity ? 0 : 1];
}

/** 역산 카드용 시지 표기 — 예: '진시 (07:00~09:00)' (전통 구간 고정) */
export function hourRangeLabel(branch: number): string {
  const index = mod(branch, 12);
  return `${BRANCHES[index]}시 (${HOUR_TRADITIONAL_RANGES[index]})`;
}

/** 일간(日干)과 시지(時支) → 시주(時柱) 60갑자 index */
export function hourPillarIndex(dayStem: number, hourBranch: number): number {
  return ganjiIndex(mod(dayStem * 2 + hourBranch, 10), hourBranch);
}

/** 년간(年干)으로부터 寅월의 월간(月干)을 구한다 (五虎遁) */
export function firstMonthStem(yearStem: number): number {
  return mod((yearStem % 5) * 2 + 2, 10);
}
