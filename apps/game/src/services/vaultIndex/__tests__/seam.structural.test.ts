// @vitest-environment node
// D3/A2 extraction-seam tripwires: the vault_index bounded context imports
// nothing from game feature code (components/store/Prisma), and no AGNTC
// coupling exists anywhere in it (Global Constraint 2). Mirrors the chain's
// structural-sweep style: a FUTURE file in this directory is swept
// automatically.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const dir = path.join(__dirname, '..');
const files = readdirSync(dir).filter((f) => f.endsWith('.ts'));

describe('vault_index extraction seam', () => {
  it('never imports game feature code or the ORM', () => {
    for (const f of files) {
      const raw = readFileSync(path.join(dir, f), 'utf8');
      // Strip comments before scanning: types.ts's own header documents this
      // exact rule and literally names the banned paths as prose — a real
      // violation is an `import ... from '@/components/...'` statement, not
      // a doc-comment describing why that import is forbidden.
      const src = raw.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
      for (const banned of ['@/components', '@/store', '@/generated/prisma', '@/lib/prisma', '@prisma/']) {
        expect(src, `${f} imports ${banned}`).not.toContain(banned);
      }
    }
  });

  it('never references AGNTC/airdrop machinery (no coupling in either direction)', () => {
    for (const f of files) {
      const src = readFileSync(path.join(dir, f), 'utf8').toLowerCase();
      // "no agntc coupling" prose in comments is fine; symbols are not — so
      // strip comments before scanning.
      const code = src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
      expect(code, `${f} references agntc`).not.toContain('agntc');
      expect(code, `${f} references airdrop`).not.toContain('airdrop');
    }
  });

  it('search/fetch/write surfaces expose no transfer-shaped tool', () => {
    const src = readFileSync(path.join(dir, 'mcpTools.ts'), 'utf8');
    for (const banned of ['transfer', 'swap', 'trade(', 'buy(', 'sell(']) {
      expect(src.toLowerCase()).not.toContain(banned);
    }
  });
});
