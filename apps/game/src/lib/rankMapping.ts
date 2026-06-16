export interface RankInput {
  id: string;
  /** Activity proxy (higher = more central). From stakedCpu (+secures) until the chain serves real activity. */
  activity: number;
  isSingularity?: boolean;
}

/** Map agents to phyllotaxis rank k (1 = innermost). Singularity → k=0. Deterministic + stable. */
export function assignRanks(agents: readonly RankInput[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const s of agents) if (s.isSingularity) out.set(s.id, 0);
  agents
    .filter((x) => !x.isSingularity)
    .slice()
    .sort((x, y) => y.activity - x.activity || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0))
    .forEach((p, i) => out.set(p.id, i + 1));
  return out;
}
