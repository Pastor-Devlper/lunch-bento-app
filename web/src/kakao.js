const JS_KEY = import.meta.env.VITE_KAKAO_JS_KEY;

export function initKakao() {
  if (!JS_KEY || typeof window.Kakao === 'undefined') return;
  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(JS_KEY);
  }
}

export function shareEvent(event) {
  if (typeof window.Kakao === 'undefined' || !window.Kakao.isInitialized()) {
    alert('카카오톡 공유를 사용할 수 없어요');
    return;
  }

  const url = new URL(window.location.origin);
  url.searchParams.set('event', event.id);
  const shareUrl = url.toString();

  const dateText = event.eventDate ? `\n${event.eventDate}` : '';
  const text = `📋 ${event.title}${dateText}\n참석 ${event.attendingCount} · 미참석 ${event.absentCount} · 미응답 ${event.pendingCount}\n\n아래 링크에서 참석 여부를 알려주세요!`;

  window.Kakao.Share.sendDefault({
    objectType: 'text',
    text,
    link: {
      mobileWebUrl: shareUrl,
      webUrl: shareUrl,
    },
    buttons: [
      {
        title: '참석 여부 입력하기',
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      },
    ],
  });
}
