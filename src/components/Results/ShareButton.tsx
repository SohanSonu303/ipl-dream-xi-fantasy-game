import { useRef, useState } from 'react';
import { generateShareImage, type ShareImageInput } from '@/utils/shareImage';

interface ShareButtonProps {
  image: ShareImageInput;
  /** Caption used when falling back to the native share sheet. */
  caption: string;
  fileBaseName?: string;
}

type Status = 'idle' | 'busy' | 'copied' | 'shared' | 'saved' | 'error';

const LABELS: Record<Status, string> = {
  idle: 'Share Result',
  busy: 'Rendering…',
  copied: 'Image Copied!',
  shared: 'Shared!',
  saved: 'Image Saved!',
  error: 'Try Again',
};

/**
 * Renders the team card to a PNG and copies it to the clipboard as an image.
 * Falls back to the native share sheet (mobile) or a download when copying an
 * image to the clipboard isn't supported.
 */
export function ShareButton({ image, caption, fileBaseName = 'ipl-dream-xi' }: ShareButtonProps) {
  const [status, setStatus] = useState<Status>('idle');
  const timer = useRef<number | null>(null);

  const flash = (s: Status) => {
    setStatus(s);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus('idle'), 2200);
  };

  const handleShare = async () => {
    if (status === 'busy') return;
    setStatus('busy');

    // Preferred path: copy the PNG straight to the clipboard. Passing the blob
    // promise to ClipboardItem keeps the user-gesture alive while it renders.
    try {
      if (navigator.clipboard && 'write' in navigator.clipboard && 'ClipboardItem' in window) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': generateShareImage(image) }),
        ]);
        flash('copied');
        return;
      }
    } catch {
      /* fall through to share / download */
    }

    // Fallbacks need the blob in hand.
    try {
      const blob = await generateShareImage(image);
      const file = new File([blob], `${fileBaseName}.png`, { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: 'IPL Dream XI', text: caption });
        flash('shared');
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
      flash('saved');
    } catch {
      flash('error');
    }
  };

  const done = status === 'copied' || status === 'shared' || status === 'saved';

  return (
    <button onClick={handleShare} disabled={status === 'busy'} className="btn-ghost px-6">
      {status === 'busy' ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : done ? (
        <svg viewBox="0 0 20 20" className="h-4 w-4 text-emerald-300" fill="none" stroke="currentColor" strokeWidth={2.4}>
          <path d="M4 10l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M8 8l4-4 4 4M12 4v12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {LABELS[status]}
    </button>
  );
}
