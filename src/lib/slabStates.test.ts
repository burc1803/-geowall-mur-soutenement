import { describe, it, expect } from 'vitest';
import { selectSlabStates } from './analysis';

describe('slabStates : états exclus des efforts du patin et du talon', () => {
  it('exclut les états hors base ET les états en soulèvement (ΣV ≤ 0)', () => {
    const ok = { id: 'ok', outside: null, uplift: false };
    const out = { id: 'out', outside: 'toe', uplift: false };
    const up = { id: 'up', outside: null, uplift: true };
    expect(selectSlabStates([ok, out, up]).map(s => s.id)).toEqual(['ok']);
    expect(selectSlabStates([out, up])).toEqual([]);
  });
});
