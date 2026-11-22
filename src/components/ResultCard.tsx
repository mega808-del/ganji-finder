import {
  BRANCHES,
  HOUR_CLOCK_RANGES,
  HOUR_REPRESENTATIVE_TIMES,
  HOUR_TRADITIONAL_RANGES,
  KST_CORRECTION_MINUTES,
  WEEKDAYS,
  pad2,
  shiftTimeLabel,
  tenGodName,
  type Gender,
} from '../lib/ganji';
import type { SearchHit } from '../lib/saju';
import { GanjiGlyphs } from './GanjiGlyphs';

/**
 * 역산 결과 한 건 — 만세력과 같은 순서로 성별·양력·음력·보정 시각·사주를 표시한다.
 * 시주는 지지 구간의 대표 시각을 쓰므로 (양)이 그 시각, (정)이 -30분 보정 시각이다.
 */
export function ResultCard({ hit, gender }: { hit: SearchHit; gender: Gender }) {
  const { solar, lunar, hourBranch, pillars } = hit;
  const solarTime = hourBranch === null ? null : HOUR_REPRESENTATIVE_TIMES[hourBranch];
  const correctedTime = solarTime === null ? null : shiftTimeLabel(solarTime, KST_CORRECTION_MINUTES);
  const dayStem = pillars.day % 10;
  const gods = [pillars.year, pillars.month, pillars.day, pillars.hour].map((ganji, index) => {
    if (ganji === null) return null;
    return index === 2 ? '일간' : tenGodName(dayStem, ganji % 10);
  });

  return (
    <article className="card px-4 py-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[21px] font-black leading-none tracking-tight text-white">
            {solar.year}. {pad2(solar.month)}. {pad2(solar.day)}
            <span className="ml-1.5 align-baseline text-[13px] font-bold text-slate-400">
              ({WEEKDAYS[solar.weekday]})
            </span>
          </p>
          <p className="mt-1.5 text-[11px] font-bold tracking-[0.06em] text-amber-300/85">
            {gender}자 · 대한민국(-30분)
          </p>
        </div>
        <span className="chip">양력</span>
      </div>

      <dl className="mt-2.5 space-y-1 text-[13px]">
        <div className="flex gap-2">
          <dt className="w-9 shrink-0 font-bold text-slate-500">(양)</dt>
          <dd className="font-semibold text-slate-200">
            {solar.year}년 {pad2(solar.month)}월 {pad2(solar.day)}일
            <span className="ml-1.5 font-black text-amber-200">{solarTime ?? '모름'}</span>
            {hourBranch !== null && (
              <span className="ml-1 text-[11px] font-bold text-slate-400">({BRANCHES[hourBranch]}시)</span>
            )}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-9 shrink-0 font-bold text-slate-500">(음)</dt>
          <dd className="font-semibold text-slate-200">
            {lunar ? (
              <>
                {lunar.year}년 {pad2(lunar.month)}월 {pad2(lunar.day)}일
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
          <dt className="w-9 shrink-0 font-bold text-slate-500">(정)</dt>
          <dd className="font-semibold text-slate-200">
            <span className="font-black text-amber-200">{correctedTime ?? '—'}</span>
            <span className="ml-1.5 text-[11px] font-bold text-slate-400">한국 표준시 -30분</span>
          </dd>
        </div>
      </dl>

      {/* 시지 판정 근거 — 전통 12지지 구간과 -30분 보정 관계를 분리 표기 */}
      <div className="mt-2 space-y-0.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-2 text-[10px] font-semibold leading-relaxed text-slate-400">
        {hourBranch === null ? (
          <p className="text-slate-500">시지 미상 · 시주 판정 없음</p>
        ) : (
          <>
            <p>
              <span className="text-slate-500">시주</span>{' '}
              <span className="font-bold text-amber-200/90">{BRANCHES[hourBranch]}시</span>
              <span className="ml-1 text-slate-500">전통 구간</span>{' '}
              <span className="text-slate-300">{HOUR_TRADITIONAL_RANGES[hourBranch]}</span>
            </p>
            <p>
              <span className="text-slate-500">보정</span> -30분
              <span className="ml-1 text-slate-500">출생 시계 환산</span>{' '}
              <span className="text-slate-300">{HOUR_CLOCK_RANGES[hourBranch]}</span>
            </p>
            <p>
              <span className="text-slate-500">기준 시각</span>{' '}
              <span className="text-slate-300">{solarTime}</span>(보정 전) →{' '}
              <span className="text-slate-300">{correctedTime}</span>(보정 후)
            </p>
          </>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-white/[0.07] pt-2.5">
        <span className="w-8 shrink-0 text-[10px] font-bold tracking-[0.18em] text-white/35">四柱</span>
        <div className="grid flex-1 grid-cols-4 justify-items-center gap-1">
          {gods.map((god, index) => (
            <span key={`god-${index}`} className="text-[10px] font-bold text-slate-400">
              {god ?? '모름'}
            </span>
          ))}
          {[pillars.year, pillars.month, pillars.day, pillars.hour].map((ganji, index) =>
            ganji === null ? (
              <span key={`ganji-${index}`} className="text-[15px] font-black text-white/25">
                ??
              </span>
            ) : (
              <GanjiGlyphs key={`ganji-${index}`} ganji={ganji} size="sm" />
            ),
          )}
        </div>
      </div>
    </article>
  );
}
