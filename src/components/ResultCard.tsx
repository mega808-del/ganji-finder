import { BRANCHES, HOUR_RANGES, WEEKDAYS, pad2 } from '../lib/ganji';
import type { SearchHit } from '../lib/saju';
import { GanjiGlyphs } from './GanjiGlyphs';

/** 역산 결과 한 건 — 양력·음력·윤달·시주 시간대 */
export function ResultCard({ hit }: { hit: SearchHit }) {
  const { solar, lunar, hourBranch, pillars } = hit;

  return (
    <article className="card px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[21px] font-black leading-none tracking-tight text-white">
          {solar.year}. {pad2(solar.month)}. {pad2(solar.day)}
          <span className="ml-1.5 align-baseline text-[13px] font-bold text-slate-400">
            ({WEEKDAYS[solar.weekday]})
          </span>
        </p>
        <span className="chip">양력</span>
      </div>

      <dl className="mt-3 space-y-1.5 text-[13px]">
        <div className="flex gap-2">
          <dt className="w-8 shrink-0 font-bold text-slate-500">음력</dt>
          <dd className="font-semibold text-slate-200">
            {lunar ? (
              <>
                {lunar.year}. {pad2(lunar.month)}. {pad2(lunar.day)}
                <span className="ml-1.5 text-[11px] font-bold text-slate-400">
                  ({lunar.isLeapMonth ? `윤${lunar.month}월` : '평달'})
                </span>
              </>
            ) : (
              <span className="text-slate-500">변환 범위 밖</span>
            )}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-8 shrink-0 font-bold text-slate-500">시주</dt>
          <dd className="font-semibold text-slate-200">
            {hourBranch === null ? (
              <span className="text-slate-400">모름 · 00:00~23:59 중 아무 때</span>
            ) : (
              <>
                {BRANCHES[hourBranch]}시
                <span className="ml-1.5 text-[11px] font-bold text-slate-400">
                  {HOUR_RANGES[hourBranch]}
                </span>
              </>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex items-center gap-2 border-t border-white/[0.07] pt-2.5">
        <span className="text-[10px] font-bold tracking-[0.18em] text-white/35">四柱</span>
        <span className="flex items-center gap-2 text-[15px] font-black tracking-wide">
          {[pillars.year, pillars.month, pillars.day, pillars.hour].map((ganji, index) =>
            ganji === null ? (
              <span key={index} className="text-white/25">
                ??
              </span>
            ) : (
              <GanjiGlyphs key={index} ganji={ganji} size="sm" />
            ),
          )}
        </span>
      </div>
    </article>
  );
}
