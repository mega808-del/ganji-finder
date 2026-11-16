import { useEffect, useState } from 'react';

/** Chrome/Edge/Android 계열이 설치 가능 상태에서 발생시키는 이벤트 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

const IOS_GUIDE = {
  platform: 'ios' as const,
  title: '아이폰 · 아이패드 (Safari)',
  steps: [
    '1. 사파리 하단의 공유 버튼(네모 위 화살표)을 누릅니다.',
    '2. 목록에서 “홈 화면에 추가”를 선택합니다.',
    '3. 오른쪽 위 “추가”를 누르면 아이콘이 생깁니다.',
  ],
};

const ANDROID_GUIDE = {
  platform: 'android' as const,
  title: '갤럭시 · 안드로이드 (Chrome)',
  steps: [
    '1. 오른쪽 위 메뉴(⋮)를 누릅니다.',
    '2. “앱 설치” 또는 “홈 화면에 추가”를 선택합니다.',
    '3. “설치”를 누르면 아이콘이 생깁니다.',
  ],
};

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (navigator as NavigatorWithStandalone).standalone === true
  );
}

function detectIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ 는 Mac 으로 보고하므로 터치 지원 여부로 함께 판별
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document);
}

/**
 * 화면 우측 상단의 작은 설치 버튼.
 *
 * - Android/Chrome: 설치 프롬프트를 바로 띄운다.
 * - iOS/Safari(설치 프롬프트 없음) 등: 홈 화면에 추가하는 방법을 안내한다.
 * - 이미 앱(홈 화면 아이콘)으로 실행 중이면 버튼을 숨긴다.
 */
export function InstallButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(() => detectStandalone());
  const [guideOpen, setGuideOpen] = useState(false);
  const [ios, setIos] = useState(() => detectIos());

  useEffect(() => {
    setIos(detectIos());
    setStandalone(detectStandalone());

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setPromptEvent(null);
      setStandalone(true);
      setGuideOpen(false);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    // 홈 화면 아이콘으로 실행하면 display-mode 가 standalone 으로 바뀐다
    const media = window.matchMedia('(display-mode: standalone)');
    const onChange = () => setStandalone(detectStandalone());
    media.addEventListener?.('change', onChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      media.removeEventListener?.('change', onChange);
    };
  }, []);

  useEffect(() => {
    if (!guideOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setGuideOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [guideOpen]);

  if (standalone) return null;

  async function install() {
    if (promptEvent) {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      setPromptEvent(null);
      if (outcome === 'accepted') setStandalone(true);
      return;
    }
    setGuideOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={install}
        aria-label="홈 화면에 앱으로 설치"
        title="홈 화면에 앱으로 설치"
        className="btn3d btn3d--install shrink-0"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path
            d="M12 3.5v9m0 0 3.2-3.2M12 12.5 8.8 9.3M5 15.5v2.6A1.9 1.9 0 0 0 6.9 20h10.2a1.9 1.9 0 0 0 1.9-1.9v-2.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        설치
      </button>

      {guideOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setGuideOpen(false)}
            className="sheet-backdrop absolute inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-[2px]"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="홈 화면에 추가하는 방법"
            className="sheet-panel relative mx-auto w-full max-w-md rounded-t-[26px] border-t border-white/10 bg-[#0c1524] px-4 pt-3 shadow-[0_-24px_70px_rgba(0,0,0,0.75)]"
          >
            <div className="mx-auto h-1.5 w-12 rounded-full bg-white/15" />

            <div className="mt-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold tracking-[0.24em] text-amber-300/70">설치 안내</p>
                <p className="mt-1 text-[22px] font-black leading-tight text-white">
                  홈 화면에 앱으로 추가
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                className="btn3d btn3d--sm btn3d--ghost"
              >
                닫기
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              {(ios ? [IOS_GUIDE, ANDROID_GUIDE] : [ANDROID_GUIDE, IOS_GUIDE]).map((guide) => (
                <div key={guide.platform} className="card px-3.5 py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[11px] font-bold tracking-[0.2em] text-amber-300/70">
                      {guide.title}
                    </p>
                    {guide.platform === (ios ? 'ios' : 'android') && (
                      <span className="chip">현재 기기</span>
                    )}
                  </div>
                  <ol className="mt-1.5 space-y-1 text-[13px] font-semibold leading-relaxed text-slate-200">
                    {guide.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>

            <p className="mt-3 text-center text-[11px] font-semibold leading-relaxed text-slate-500">
              홈 화면 아이콘으로 열면 주소창 없는 앱 화면으로 실행되고,{'\n'}인터넷이 없어도 열립니다.
            </p>

            <div className="safe-bottom mt-3">
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                className="btn3d btn3d--primary w-full py-3.5"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
