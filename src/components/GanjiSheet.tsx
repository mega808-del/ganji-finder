import { useEffect, useState } from 'react';
import {
  BRANCHES,
  BRANCHES_HANJA,
  STEMS,
  STEMS_HANJA,
  branchElement,
  ganjiIndex,
  isRealGanji,
  stemElement,
} from '../lib/ganji';

interface GanjiSheetProps {
  label: string;
  hanja: string;
  value: number | null;
  /** 지정 시 이 목록에 있는 간지만 선택 가능 (월주·시주의 오호둔/오서둔 제한) */
  allowed?: number[];
  onClose: () => void;
  onConfirm: (ganji: number) => void;
}

/**
 * 천간(10) + 지지(12)를 3D 키패드로 고르는 바텀 시트.
 * 음양이 맞지 않는 조합(예: 갑축)과, 상위 주 규칙에 없는 간지는 선택할 수 없다.
 */
export function GanjiSheet({ label, hanja, value, allowed, onClose, onConfirm }: GanjiSheetProps) {
  const allowedSet = allowed ? new Set(allowed) : null;
  const allowedStems = allowed ? new Set(allowed.map((ganji) => ganji % 10)) : null;
  const allowedBranches = allowed ? new Set(allowed.map((ganji) => ganji % 12)) : null;

  // 현재 값이 허용 목록에 없으면 첫 후보로 시작한다
  const start = value !== null && (!allowedSet || allowedSet.has(value)) ? value : (allowed?.[0] ?? null);

  const [stem, setStem] = useState(start === null ? 0 : start % 10);
  const [branch, setBranch] = useState(start === null ? 0 : start % 12);

  const valid = allowedSet ? allowedSet.has(ganjiIndex(stem, branch)) : isRealGanji(stem, branch);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
    // 시트는 열릴 때 한 번만 마운트된다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="sheet-backdrop absolute inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${label} 간지 선택`}
        className="sheet-panel no-scrollbar relative mx-auto max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-[26px] border-t border-white/10 bg-[#0c1524] px-4 pt-3 shadow-[0_-24px_70px_rgba(0,0,0,0.75)]"
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-white/15" />

        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold tracking-[0.24em] text-amber-300/70">
              {label} · {hanja}
            </p>
            <p className="mt-1 text-[32px] font-black leading-none tracking-wide text-white">
              {STEMS_HANJA[stem]}
              {BRANCHES_HANJA[branch]}
              <span className="ml-2.5 align-middle text-sm font-bold text-slate-400">
                {STEMS[stem]}
                {BRANCHES[branch]}
              </span>
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn3d btn3d--sm btn3d--ghost">
            닫기
          </button>
        </div>

        <div className="mt-5 flex items-baseline justify-between">
          <p className="text-[11px] font-bold tracking-[0.2em] text-white/40">천간 · 天干</p>
          {allowed && (
            <p className="text-[10px] font-bold tracking-[0.08em] text-amber-300/60">
              이 사주에 맞는 간지만 선택 가능
            </p>
          )}
        </div>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {STEMS_HANJA.map((char, index) => {
            const disabled = allowedStems !== null && !allowedStems.has(index);
            return (
              <button
                key={char}
                type="button"
                aria-pressed={stem === index}
                disabled={disabled}
                onClick={() => setStem(index)}
                className={`key3d el-${stemElement(index)} ${stem === index ? 'is-active' : ''}`}
              >
                <span className="key3d__hanja">{char}</span>
                <span className="key3d__ko">{STEMS[index]}</span>
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-[11px] font-bold tracking-[0.2em] text-white/40">지지 · 地支</p>
        <div className="mt-2 grid grid-cols-6 gap-1.5">
          {BRANCHES_HANJA.map((char, index) => {
            const disabled = allowedBranches !== null && !allowedBranches.has(index);
            return (
              <button
                key={char}
                type="button"
                aria-pressed={branch === index}
                disabled={disabled}
                onClick={() => setBranch(index)}
                className={`key3d el-${branchElement(index)} ${branch === index ? 'is-active' : ''}`}
              >
                <span className="key3d__hanja">{char}</span>
                <span className="key3d__ko">{BRANCHES[index]}</span>
              </button>
            );
          })}
        </div>

        <p
          className={`mt-3 text-center text-xs font-semibold text-amber-400/90 ${
            valid ? 'invisible' : ''
          }`}
        >
          {allowed
            ? '선택한 사주 규칙에 없는 간지입니다.'
            : '천간과 지지의 음양이 맞지 않아 존재하지 않는 간지입니다.'}
        </p>

        <div className="safe-bottom mt-1">
          <button
            type="button"
            disabled={!valid}
            onClick={() => onConfirm(ganjiIndex(stem, branch))}
            className="btn3d btn3d--primary w-full py-4"
          >
            이 간지로 선택
          </button>
        </div>
      </div>
    </div>
  );
}
