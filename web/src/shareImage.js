import { toBlob } from 'html-to-image';

// Capture a DOM element as a PNG and share it as a file (mobile share sheet,
// which includes KakaoTalk) or fall back to a download.
export async function shareElementImage(el, { filename = 'image.png', title = '' } = {}) {
  if (!el) return;

  const blob = await toBlob(el, {
    pixelRatio: 2,
    cacheBust: true,
    // Skip any element marked data-no-capture (e.g. the share button itself).
    filter: (node) => !(node.dataset && node.dataset.noCapture),
  });
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
