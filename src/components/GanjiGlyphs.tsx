import { BRANCHES_HANJA, STEMS_HANJA, branchElement, mod, stemElement } from '../lib/ganji';

const SIZES = {
  sm: 'h-[25px] w-[23px] rounded-[7px] text-[15px]',
  md: 'h-8 w-7 rounded-[9px] text-[21px]',
} as const;

/**
 * 간지 한 글자(천간·지지)를 각각의 오행 바탕색 타일로 표시한다.
 * 색은 만세력 표기와 동일하게 木 초록 · 火 빨강 · 土 노랑 · 金 흰색 · 水 검정.
 */
export function GanjiGlyphs({ ganji, size = 'md' }: { ganji: number; size?: keyof typeof SIZES }) {
  const stem = mod(ganji, 10);
  const branch = mod(ganji, 12);

  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      <span className={`ganji-tile el-${stemElement(stem)} ${SIZES[size]}`}>{STEMS_HANJA[stem]}</span>
      <span className={`ganji-tile el-${branchElement(branch)} ${SIZES[size]}`}>
        {BRANCHES_HANJA[branch]}
      </span>
    </span>
  );
}
