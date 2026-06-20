import { useRef, useState } from 'react';
import type { SquadSlot } from '@/types';
import { buildChallengeUrl, encodeSquad } from '@/utils/shareCode';

interface ChallengeButtonProps {
  squad: SquadSlot[];
  captainId: number | null;
  teamName: string;
}

type Status = 'idle' | 'copied' | 'shared' | 'error';

/**
 * Copies (or shares) a #/vs/<code> link to the current XI so a friend can draft
 * their own side and play a head-to-head series against it.
 */
export function ChallengeButton({ squad, captainId, teamName }: ChallengeButtonProps) {
  const [status, setStatus] = useState<Status>('idle');
  const timer = useRef<number | null>(null);

  const flash = (s: Status) => {
    setStatus(s);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus('idle'), 2200);
  };

  const copyText = async (url: string): Promise<boolean> => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        return true;
      }
    } catch {
      /* fall through to legacy copy */
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  const handle = async () => {
    // XI is positions 0..10; bench is excluded by encodeSquad.
    if (squad.filter((s) => s.position < 11).length !== 11) return;
    const url = buildChallengeUrl(encodeSquad(squad, captainId, teamName));

    // Mobile share sheet first (best UX). Note: pass ONLY the url — some targets
    // concatenate `text`+`url` into one string, which would corrupt the link.
    if (navigator.share) {
      try {
        await navigator.share({ url });
        flash('shared');
        return;
      } catch {
        /* user dismissed or unsupported — fall back to copy */
      }
    }

    if (await copyText(url)) flash('copied');
    else {
      window.prompt('Copy your challenge link:', url); // last-resort guarantee
      flash('copied');
    }
  };

  const label =
    status === 'copied'
      ? 'Link Copied!'
      : status === 'shared'
        ? 'Shared!'
        : status === 'error'
          ? 'Copy Failed'
          : 'Challenge a Friend';

  return (
    <button onClick={handle} className="btn-ghost px-6">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M4 12v.01M12 5v.01M20 12v.01M7 9l10-3M7 15l10 3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="4" cy="12" r="2" /><circle cx="20" cy="12" r="2" /><circle cx="12" cy="5" r="2" />
      </svg>
      {label}
    </button>
  );
}
