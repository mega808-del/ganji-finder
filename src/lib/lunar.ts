/**
 * 양력 → 한국 음력 변환 (평달/윤달 구분 포함).
 *
 * 한국천문연구원 음력 데이터를 담고 있는 korean-lunar-calendar 를 사용한다.
 * 중국 음력과 윤달 배치가 다른 해(예: 1988년 등)도 한국 기준으로 변환된다.
 */
import KoreanLunarCalendar from 'korean-lunar-calendar';

export interface LunarDate {
  year: number;
  month: number;
  day: number;
  /** 윤달 여부 */
  isLeapMonth: boolean;
}

// 라이브러리 인스턴스는 내부 상태를 setSolarDate 로 초기화하므로 재사용해도 안전하다
let calendar: KoreanLunarCalendar | null = null;

/** 번들러의 CJS interop(default 중첩)을 방어적으로 처리 */
function resolveConstructor(): new () => KoreanLunarCalendar {
  const candidate = KoreanLunarCalendar as unknown as (new () => KoreanLunarCalendar) & {
    default?: new () => KoreanLunarCalendar;
  };
  return candidate.default ?? candidate;
}

function getCalendar(): KoreanLunarCalendar {
  if (!calendar) calendar = new (resolveConstructor())();
  return calendar;
}

/** 양력 날짜 → 음력. 지원 범위를 벗어나면 null */
export function solarToLunar(year: number, month: number, day: number): LunarDate | null {
  try {
    const instance = getCalendar();
    if (!instance.setSolarDate(year, month, day)) return null;
    const lunar = instance.getLunarCalendar();
    return {
      year: lunar.year,
      month: lunar.month,
      day: lunar.day,
      isLeapMonth: Boolean(lunar.intercalation),
    };
  } catch {
    return null;
  }
}
