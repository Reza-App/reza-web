import { describe, expect, it } from 'vitest';
import { groupServices, moveService } from '@/lib/serviceOrder';
import type { Service } from '@/lib/types/catalog';

const s = (id: string, category: string | null, sortOrder: number) => ({ id, name: id, category, sortOrder, price: 0, duration: 30, tenantId: 't' }) as Service;
const list = [s('a', 'Coiffure', 0), s('b', 'Coiffure', 1), s('c', 'Soins', 0), s('d', null, 0)];

describe('groupServices', () => {
  it('follows the declared category order, empty ones kept, uncategorised last', () => {
    expect(groupServices(list, ['Soins', 'Coiffure', 'Ongles']).map(([c, l]) => [c, l.map((x) => x.id)])).toEqual([
      ['Soins', ['c']],
      ['Coiffure', ['a', 'b']],
      ['Ongles', []],
      ['Sans catégorie', ['d']],
    ]);
  });
});

describe('moveService', () => {
  const groups = groupServices(list, ['Coiffure', 'Soins']);

  it('reorders inside a category and only reports what changed', () => {
    const { groups: next, changes } = moveService(groups, 'b', 'Coiffure', 'a');
    expect(next[0]![1].map((x) => x.id)).toEqual(['b', 'a']);
    expect(changes).toEqual([
      { id: 'b', category: 'Coiffure', sortOrder: 0 },
      { id: 'a', category: 'Coiffure', sortOrder: 1 },
    ]);
  });

  it('moves to another category, at the end', () => {
    const { groups: next, changes } = moveService(groups, 'a', 'Soins', null);
    expect(next.find(([c]) => c === 'Soins')![1].map((x) => x.id)).toEqual(['c', 'a']);
    expect(changes).toContainEqual({ id: 'a', category: 'Soins', sortOrder: 1 });
    expect(changes).toContainEqual({ id: 'b', category: 'Coiffure', sortOrder: 0 });
  });

  it('ignores a drop on itself', () => {
    expect(moveService(groups, 'a', 'Coiffure', 'a').changes).toEqual([]);
  });
});
