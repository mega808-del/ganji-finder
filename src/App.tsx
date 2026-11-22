import { useRef, useState } from 'react';
import { GanjiGlyphs } from './components/GanjiGlyphs';
import { GanjiSheet } from './components/GanjiSheet';
import { InstallButton } from './components/InstallButton';
import { ResultCard } from './components/ResultCard';
import {
  BRANCHES,
  BRANCHES_HANJA,
  HOUR_CLOCK_RANGES,
  HOUR_REPRESENTATIVE_TIMES,
  HOUR_TRADITIONAL_RANGES,
  KST_CORRECTION_MINUTES,
  STEMS,
  STEMS_HANJA,
  WEEKDAYS,
  ganjiHanja,
  ganjiIndex,
  ganjiKorean,
  pad2,
  shiftTimeLabel,
  type Gender,
} from './lib/ganji';
import {
  hourPillarOptions,
  isMonthPillarPossible,
  monthPillarOptions,
  reverseSearch,
  type SearchHit,
} from './lib/saju';

type PillarKey = 'year' | 'month' | 'day' | 'hour';

const PILLARS: { key: PillarKey; label: string; hanja: string }[] = [
  { key: 'year', label: '년주', hanja: '年柱' },
  { key: 'month', label: '월주', hanja: '月柱' },
  { key: 'day', label: '일주', hanja: '日柱' },
  { key: 'hour', label: '시주', hanja: '時柱' },
];

const MIN_YEAR = 1900;
const MAX_YEAR = 2090;
const YEARS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, index) => MIN_YEAR + index);

export default function App() {
  const [startYear, setStartYear] = useState(MIN_YEAR);
  const [endYear, setEndYear] = useState(MAX_YEAR);
  const [selection, setSelection] = useState<Record<PillarKey, number | null>>({
    year: null,
    month: null,
    day: null,
    hour: null,
  });
  const [hourUnknown, setHourUnknown] = useState(false);
  const [gender, setGender] = useState<Gender>('여');
  const [openPillar, setOpenPillar] = useState<PillarKey | null>(null);
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [palza, setPalza] = useState('');
  const [palzaError, setPalzaError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLElement | null>(null);

  const ready = selection.year !== null && selection.month !== null && selection.day !== null;
  const impossibleMonth =
    selection.year !== null &&
    selection.month !== null &&
    !isMonthPillarPossible(selection.year, selection.month);

  // 오호둔(월주)·오서둔(시주) 규칙상 실재하는 간지만 후보로 노출한다
  const monthChoices = selection.year === null ? null : monthPillarOptions(selection.year);
  const hourChoices = selection.day === null ? null : hourPillarOptions(selection.day);

  function allowedFor(key: PillarKey): number[] | undefined {
    if (key === 'month') return monthChoices ?? undefined;
    if (key === 'hour') return hourChoices ?? undefined;
    return undefined;
  }

  /** 간지 확정 — 상위 주가 바뀌면 규칙에 어긋나는 하위 주는 비운다 */
  function confirmPillar(key: PillarKey, ganji: number) {
    setSelection((current) => {
      const next = { ...current, [key]: ganji };
      if (key === 'year') {
        if (next.month !== null && !monthPillarOptions(ganji).includes(next.month)) {
          next.month = null;
        }
      }
      if (key === 'day') {
        if (next.hour !== null && !hourPillarOptions(ganji).includes(next.hour)) {
          next.hour = null;
        }
      }
      return next;
    });
    setOpenPillar(null);
    setPalzaError(null);
  }

  /** 방법 2 — 한글(또는 한자) 8글자 팔자 문자열을 네 주로 변환 */
  function applyPalza() {
    const parsed = parsePalza(palza);
    if (!parsed) {
      setPalzaError('천간·지지 8글자를 정확히 입력해 주세요. 예) 경오신사경진임오');
      return;
    }
    if (!monthPillarOptions(parsed.year).includes(parsed.month)) {
      setPalzaError('년주와 월주가 오호둔(五虎遁) 규칙에 맞지 않습니다.');
      return;
    }
    if (!hourPillarOptions(parsed.day).includes(parsed.hour)) {
      setPalzaError('일주와 시주가 오서둔(五鼠遁) 규칙에 맞지 않습니다.');
      return;
    }

    setSelection(parsed);
    setHourUnknown(false);
    setError(null);
    setPalzaError(null);
    setHits(null);
  }

  function run() {
    if (selection.year === null || selection.month === null || selection.day === null) {
      setError('년주·월주·일주를 모두 선택해 주세요.');
      return;
    }
    if (startYear > endYear) {
      setError('시작 연도가 종료 연도보다 늦습니다.');
      return;
    }

    setError(null);
    setCopied(false);
    setHits(
      reverseSearch({
        yearPillar: selection.year,
        monthPillar: selection.month,
        dayPillar: selection.day,
        hourPillar: hourUnknown ? null : selection.hour,
        startYear,
        endYear,
      }),
    );

    window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  function reset() {
    setSelection({ year: null, month: null, day: null, hour: null });
    setHourUnknown(false);
    setGender('여');
    setPalza('');
    setPalzaError(null);
    setStartYear(MIN_YEAR);
    setEndYear(MAX_YEAR);
    setHits(null);
    setError(null);
    setCopied(false);
    setOpenPillar(null);
  }

  async function copyResults() {
    if (!hits || hits.length === 0) return;
    const ok = await copyToClipboard(
      buildResultText(hits, selection, hourUnknown, gender, startYear, endYear),
    );
    setCopied(ok);
    if (ok) window.setTimeout(() => setCopied(false), 1800);
  }

  const openPillarMeta = PILLARS.find((pillar) => pillar.key === openPillar) ?? null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-40 pt-6">
      {/* 머리말 */}
      <header>
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-b from-[#1b2a47] to-[#0a1120] shadow-[0_8px_18px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.12)]">
            <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden="true">
              <defs>
                <linearGradient id="markGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#FFD98A" />
                  <stop offset="1" stopColor="#D08A12" />
                </linearGradient>
              </defs>
              <circle cx="32" cy="32" r="21" fill="none" stroke="url(#markGold)" strokeWidth="2.4" />
              <g fill="url(#markGold)">
                <rect x="24.5" y="27" width="2" height="10" rx="1" />
                <rect x="28.7" y="23.5" width="2" height="17" rx="1" />
                <rect x="32.9" y="25.5" width="2" height="13" rx="1" />
                <rect x="37.1" y="28.5" width="2" height="7" rx="1" />
              </g>
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.35em] text-amber-300/75">SAJU REVERSE</p>
            <h1 className="text-[26px] font-black leading-tight text-white">사주 역산</h1>
          </div>
          <div className="ml-auto self-start">
            <InstallButton />
          </div>
        </div>
        <p className="mt-3.5 text-[13px] leading-relaxed text-slate-400">
          년·월·일·시의 간지를 넣으면, 그 사주가 성립하는{' '}
          <span className="font-semibold text-slate-200">양력·음력 생년월일시</span>를 찾아냅니다.
        </p>
      </header>

      {/* 01 검색 범위 */}
      <section className="mt-7">
        <SectionHeading step="01" title="검색 범위" hint="양력 연도" />
        <div className="card mt-2.5 p-3.5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <label className="block">
              <span className="sr-only">시작 연도</span>
              <select
                className="field3d px-2 py-3 text-base"
                value={startYear}
                onChange={(event) => setStartYear(Number(event.target.value))}
              >
                {YEARS.map((year) => (
                  <option key={year} value={year}>
                    {year}년
                  </option>
                ))}
              </select>
            </label>
            <span className="px-1 text-sm font-bold text-slate-500">~</span>
            <label className="block">
              <span className="sr-only">종료 연도</span>
              <select
                className="field3d px-2 py-3 text-base"
                value={endYear}
                onChange={(event) => setEndYear(Number(event.target.value))}
              >
                {YEARS.map((year) => (
                  <option key={year} value={year}>
                    {year}년
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-2.5 text-center text-[11px] font-semibold text-slate-500">
            {startYear <= endYear ? endYear - startYear + 1 : 0}년 범위 · 한국 표준시(-30분 보정) 기준
          </p>
        </div>
      </section>

      {/* 02 사주 입력 */}
      <section className="mt-7">
        <SectionHeading step="02" title="사주팔자 입력" hint="방법 1 · 간지 선택" />
        <div className="mt-2.5 flex items-center gap-2">
          <span className="w-9 shrink-0 text-[11px] font-bold text-white/80">성별</span>
          <div className="grid flex-1 grid-cols-2 gap-2">
            {(['여', '남'] as Gender[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setGender(value)}
                aria-pressed={gender === value}
                className={`btn3d btn3d--sm ${gender === value ? '' : 'btn3d--ghost'}`}
              >
                {value}자
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2.5 space-y-2">
          {PILLARS.map(({ key, label, hanja }) => {
            const value = selection[key];
            const muted = key === 'hour' && hourUnknown;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setOpenPillar(key)}
                aria-label={`${label} 간지 선택`}
                className={`btn3d btn3d--row w-full ${muted ? 'btn3d--row-muted' : ''}`}
              >
                <span className="text-left">
                  <span className="block text-[10px] font-bold tracking-[0.24em]">
                    <span className="text-white">{label}</span>
                    <span className="text-white/70"> · </span>
                    <span className="text-amber-300">{hanja}</span>
                  </span>
                  <span className="mt-1 flex items-center gap-2">
                    {muted ? (
                      <span className="text-xl font-black text-white/70">모름</span>
                    ) : value === null ? (
                      <span className="text-xl font-black text-amber-300">선택</span>
                    ) : (
                      <>
                        <GanjiGlyphs ganji={value} size="md" />
                        <span className="text-xs font-bold text-white/85">{ganjiKorean(value)}</span>
                      </>
                    )}
                  </span>
                </span>
                <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-white/35" aria-hidden="true">
                  <path
                    d="M9 5l7 7-7 7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={hourUnknown}
          onClick={() => setHourUnknown((current) => !current)}
          className={`switch3d mt-2 ${hourUnknown ? 'is-on' : ''}`}
        >
          <span className="switch3d__track">
            <span className="switch3d__knob" />
          </span>
          <span className="flex-1 text-left text-[13px] font-extrabold text-white">
            태어난 시간 모름
          </span>
          <span
            className={`text-[11px] font-bold ${hourUnknown ? 'text-amber-300' : 'text-white/85'}`}
          >
            {hourUnknown ? '시주 무관' : '시주 사용'}
          </span>
        </button>

        {/* 방법 2 — 팔자 문자열 직접 입력 */}
        <div className="card mt-3 p-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[10px] font-bold tracking-[0.2em] text-amber-300">
              방법 2 · 팔자 직접 입력
            </p>
            <span className="text-[10px] font-bold text-white/80">한글 8글자</span>
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={palza}
              onChange={(event) => setPalza(event.target.value.replace(/\s+/g, ''))}
              onKeyDown={(event) => {
                if (event.key === 'Enter') applyPalza();
              }}
              placeholder="경오신사경진임오"
              maxLength={8}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="팔자 8글자 입력"
              className="field3d field3d--text h-12 flex-1"
            />
            <button type="button" onClick={applyPalza} className="btn3d btn3d--sm w-20 shrink-0">
              적용
            </button>
          </div>
          {palzaError ? (
            <p className="mt-2 text-[11px] font-bold leading-relaxed text-amber-300">{palzaError}</p>
          ) : (
            <p className="mt-2 text-[11px] font-semibold text-white/70">
              년·월·일·시 순서로 천간+지지 (예: 경오신사경진임오)
            </p>
          )}
        </div>
      </section>

      {error && (
        <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-center text-xs font-bold text-amber-300">
          {error}
        </p>
      )}

      {/* 결과 */}
      {hits && (
        <section ref={resultsRef} className="mt-8 scroll-mt-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white">
                역산 결과{' '}
                <span className={hits.length > 0 ? 'text-amber-400' : 'text-slate-500'}>
                  {hits.length}
                </span>
                <span className="ml-0.5 text-sm font-bold text-slate-500">건</span>
              </h2>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                {gender}자 · {conditionText(selection, hourUnknown)}
              </p>
            </div>
            <button
              type="button"
              onClick={copyResults}
              disabled={hits.length === 0}
              className="btn3d btn3d--sm shrink-0"
            >
              {copied ? '복사됨 ✓' : '결과 복사'}
            </button>
          </div>

          {hits.length === 0 ? (
            <div className="card mt-3 px-4 py-6 text-center">
              <p className="text-sm font-black text-white">조건에 맞는 날짜가 없습니다</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                {impossibleMonth
                  ? '선택한 년주의 천간으로는 그 월주가 성립하지 않습니다. (오호둔 규칙)'
                  : '검색 범위를 넓히거나 다른 간지를 선택해 보세요.'}
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-2.5">
              {hits.map((hit) => (
                <ResultCard
                  key={`${hit.solar.year}-${hit.solar.month}-${hit.solar.day}-${hit.hourBranch ?? 'any'}`}
                  hit={hit}
                  gender={gender}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <p className="mt-8 text-center text-[11px] leading-relaxed text-slate-600">
        24절기 기준 세수·월건 · 한국 표준시(-30분 보정) 적용 · 일주는 자정(00:00) 경계 · 음력은 한국천문연구원 기준
      </p>

      {/* 하단 고정 실행 바 */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.07] bg-[#0b1220]/95 backdrop-blur-md">
        <div className="safe-bottom mx-auto flex w-full max-w-md gap-2 px-4 pt-3">
          <button
            type="button"
            onClick={run}
            disabled={!ready}
            className="btn3d btn3d--primary flex-1 py-4"
          >
            역산 실행
          </button>
          <button type="button" onClick={reset} className="btn3d btn3d--ghost w-24 text-sm">
            초기화
          </button>
        </div>
      </div>

      {openPillarMeta && (
        <GanjiSheet
          label={openPillarMeta.label}
          hanja={openPillarMeta.hanja}
          value={selection[openPillarMeta.key]}
          allowed={allowedFor(openPillarMeta.key)}
          onClose={() => setOpenPillar(null)}
          onConfirm={(ganji) => confirmPillar(openPillarMeta.key, ganji)}
        />
      )}
    </div>
  );
}

function SectionHeading({
  step,
  title,
  hint,
}: {
  step: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="flex items-baseline gap-2 text-[15px] font-black text-white">
        <span className="text-[11px] font-black tracking-[0.2em] text-amber-400/80">{step}</span>
        {title}
      </h2>
      {hint && <span className="text-[11px] font-semibold text-white/75">{hint}</span>}
    </div>
  );
}

/** 팔자 문자열(예: 경오신사경진임오 / 庚午辛巳庚辰壬午) → 네 주의 60갑자 index */
function parsePalza(text: string): Record<PillarKey, number> | null {
  const letters = [...text];
  if (letters.length !== 8) return null;

  const keys: PillarKey[] = ['year', 'month', 'day', 'hour'];
  const parsed: Record<PillarKey, number> = { year: -1, month: -1, day: -1, hour: -1 };

  keys.forEach((key, index) => {
    const stem = findStem(letters[index * 2]);
    const branch = findBranch(letters[index * 2 + 1]);
    if (stem >= 0 && branch >= 0) parsed[key] = ganjiIndex(stem, branch);
  });

  return keys.every((key) => parsed[key] >= 0) ? parsed : null;
}

function findStem(char: string): number {
  const korean = STEMS.indexOf(char as (typeof STEMS)[number]);
  if (korean >= 0) return korean;
  return STEMS_HANJA.indexOf(char as (typeof STEMS_HANJA)[number]);
}

function findBranch(char: string): number {
  const korean = BRANCHES.indexOf(char as (typeof BRANCHES)[number]);
  if (korean >= 0) return korean;
  return BRANCHES_HANJA.indexOf(char as (typeof BRANCHES_HANJA)[number]);
}

function conditionText(selection: Record<PillarKey, number | null>, hourUnknown: boolean): string {
  const parts: string[] = [];
  if (selection.year !== null) parts.push(`${ganjiHanja(selection.year)}年`);
  if (selection.month !== null) parts.push(`${ganjiHanja(selection.month)}月`);
  if (selection.day !== null) parts.push(`${ganjiHanja(selection.day)}日`);
  parts.push(hourUnknown || selection.hour === null ? '시주 무관' : `${ganjiHanja(selection.hour)}時`);
  return parts.join(' · ');
}

function buildResultText(
  hits: SearchHit[],
  selection: Record<PillarKey, number | null>,
  hourUnknown: boolean,
  gender: Gender,
  startYear: number,
  endYear: number,
): string {
  const lines = hits.map((hit, index) => {
    const { solar, lunar, hourBranch } = hit;
    const solarTime = hourBranch === null ? null : HOUR_REPRESENTATIVE_TIMES[hourBranch];
    const correctedTime =
      solarTime === null ? null : shiftTimeLabel(solarTime, KST_CORRECTION_MINUTES);
    const lunarText = lunar
      ? `(음) ${lunar.year}년 ${pad2(lunar.month)}월 ${pad2(lunar.day)}일 (${lunar.isLeapMonth ? '윤달' : '평달'})`
      : '(음) 정보 없음';
    const hourText =
      hourBranch === null
        ? '시주 모름'
        : `${BRANCHES[hourBranch]}시 ${HOUR_TRADITIONAL_RANGES[hourBranch]}`;
    const shiftText =
      hourBranch === null
        ? '시지 미상'
        : `보정 -30분 · 출생 시계 ${HOUR_CLOCK_RANGES[hourBranch]}`;
    return `${index + 1}. ${gender}자 / (양) ${solar.year}년 ${pad2(solar.month)}월 ${pad2(solar.day)}일 (${WEEKDAYS[solar.weekday]}) ${solarTime ?? '모름'} ${hourText} / ${lunarText} / (정) ${correctedTime ?? '—'} · 대한민국(-30분) / ${shiftText}`;
  });

  return [
    `사주 역산 결과 (${startYear}~${endYear}, 한국 표준시 -30분 보정)`,
    `조건: ${gender}자 · ${conditionText(selection, hourUnknown)}`,
    `총 ${hits.length}건`,
    '',
    ...lines,
  ].join('\n');
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 클립보드 권한이 없으면 아래 fallback 사용
  }

  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
