import { motion } from 'framer-motion';
import type { PlayoffMatch, SeasonTeam } from '@/types';
import { TeamBadge } from '@/components/Shared/TeamBadge';
import { cn } from '@/utils';

interface PlayoffBracketProps {
  playoffs: PlayoffMatch[];
  teamById: Map<string, SeasonTeam>;
  championId: string;
  userId: string;
  animate?: boolean;
}

export function PlayoffBracket({ playoffs, teamById, championId, userId, animate = false }: PlayoffBracketProps) {
  const byStage = (stage: PlayoffMatch['stage']) => playoffs.find((p) => p.stage === stage)!;

  return (
    <div className="grid gap-3 md:grid-cols-3 md:items-center">
      {/* Round 1 */}
      <div className="space-y-3">
        <BracketMatch match={byStage('QUALIFIER_1')} {...{ teamById, championId, userId, animate }} delay={0} />
        <BracketMatch match={byStage('ELIMINATOR')} {...{ teamById, championId, userId, animate }} delay={0.15} />
      </div>
      {/* Round 2 */}
      <div>
        <BracketMatch match={byStage('QUALIFIER_2')} {...{ teamById, championId, userId, animate }} delay={0.3} />
      </div>
      {/* Final */}
      <div>
        <BracketMatch match={byStage('FINAL')} {...{ teamById, championId, userId, animate }} delay={0.45} isFinal />
      </div>
    </div>
  );
}

interface BracketMatchProps {
  match: PlayoffMatch;
  teamById: Map<string, SeasonTeam>;
  championId: string;
  userId: string;
  animate?: boolean;
  delay?: number;
  isFinal?: boolean;
}

function BracketMatch({ match, teamById, championId, userId, animate, delay = 0, isFinal }: BracketMatchProps) {
  const result = match.result;
  return (
    <motion.div
      initial={animate ? { opacity: 0, scale: 0.9 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: animate ? delay : 0, type: 'spring', stiffness: 260, damping: 22 }}
      className={cn(
        'rounded-xl border p-3',
        isFinal ? 'border-gold/50 bg-gold/[0.07] shadow-glow' : 'border-white/12 bg-pitch-800/70',
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className={cn('text-[10px] font-700 uppercase tracking-[0.2em]', isFinal ? 'text-gold-soft' : 'text-slate-400')}>
          {match.label}
        </span>
        {isFinal && <span className="text-xs">🏆</span>}
      </div>
      <BracketTeam
        teamId={match.teamAId}
        score={result?.homeScore}
        isWinner={result?.winnerId === match.teamAId}
        isChampion={isFinal && championId === match.teamAId}
        isUser={match.teamAId === userId}
        teamById={teamById}
      />
      <div className="my-1 flex items-center gap-2 pl-1 text-[10px] uppercase text-slate-600">
        <span className="h-px flex-1 bg-white/10" />
        vs
        <span className="h-px flex-1 bg-white/10" />
      </div>
      <BracketTeam
        teamId={match.teamBId}
        score={result?.awayScore}
        isWinner={result?.winnerId === match.teamBId}
        isChampion={isFinal && championId === match.teamBId}
        isUser={match.teamBId === userId}
        teamById={teamById}
      />
    </motion.div>
  );
}

function BracketTeam({
  teamId,
  score,
  isWinner,
  isChampion,
  isUser,
  teamById,
}: {
  teamId: string;
  score?: number;
  isWinner?: boolean;
  isChampion?: boolean;
  isUser?: boolean;
  teamById: Map<string, SeasonTeam>;
}) {
  const team = teamById.get(teamId);
  if (!team) return null;
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors',
        isWinner ? 'bg-white/[0.07]' : 'opacity-60',
        isChampion && 'ring-1 ring-gold/60',
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <TeamBadge code={team.code} size="sm" />
        <span className={cn('truncate text-sm font-600', isUser && 'text-gold-soft')}>
          {team.name}
        </span>
        {isChampion && <span className="text-xs">👑</span>}
      </div>
      <span className={cn('font-display text-sm font-700 tabular-nums', isWinner ? 'text-white' : 'text-slate-400')}>
        {score != null ? Math.round(score) : '—'}
      </span>
    </div>
  );
}
