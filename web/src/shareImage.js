import { toBlob } from 'html-to-image';

// Capture a DOM element as a PNG and share it as a file (mobile share sheet,
// which includes KakaoTalk) or fall back to a download.
export async function shareElementImage(el, { filename = 'image.png', title = '' } = {}) {
  if (!el) return;

  // Hide elements marked data-no-capture (e.g. the share button) in the real
  // DOM before capturing, so the layout reflows (the count lands at the far
  // right) — html-to-image's own filter doesn't trigger a reflow. Restore
  // afterwards.
  const hidden = Array.from(el.querySelectorAll('[data-no-capture]'));
  const prevDisplay = hidden.map((n) => n.style.display);
  hidden.forEach((n) => { n.style.display = 'none'; });

  let blob;
  try {
    blob = await toBlob(el, { pixelRatio: 2, cacheBust: true });
  } finally {
    hidden.forEach((n, i) => { n.style.display = prevDisplay[i]; });
  }
  if (!blob) throw new Error('이미지를 만들지 못했어요');

  const file = new File([blob], filename, { type: 'image/png' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return; // user cancelled
      // fall through to download
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
