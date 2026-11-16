import type { Service } from './types/catalog';

export const NO_CATEGORY = 'Sans catégorie';

export type ServiceGroups = [category: string, services: Service[]][];

/**
 * Services grouped by category, categories in the salon's declared order
 * (then the others), services by their position.
 */
export function groupServices(services: Service[], declared: string[], keepEmpty = true): ServiceGroups {
  const map = new Map<string, Service[]>();
  if (keepEmpty) for (const c of declared) map.set(c, []);
  for (const s of [...services].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name, 'fr'))) {
    const key = s.category?.trim() || NO_CATEGORY;
    map.set(key, [...(map.get(key) ?? []), s]);
  }
  const rank = (c: string) => {
    const i = declared.indexOf(c);
    return i === -1 ? declared.length + (c === NO_CATEGORY ? 1 : 0) : i;
  };
  return [...map.entries()].sort((a, b) => rank(a[0]) - rank(b[0]));
}

export interface OrderChange {
  id: string;
  category: string | null;
  sortOrder: number;
}

/**
 * Moves a service before another one (or at the end of a category) and
 * returns the new groups plus the services whose category or position
 * changed (what has to be saved).
 */
export function moveService(groups: ServiceGroups, serviceId: string, targetCategory: string, beforeId: string | null): { groups: ServiceGroups; changes: OrderChange[] } {
  const moving = groups.flatMap(([, list]) => list).find((s) => s.id === serviceId);
  if (!moving || beforeId === serviceId) return { groups, changes: [] };

  const next: ServiceGroups = groups.map(([category, list]) => [category, list.filter((s) => s.id !== serviceId)]);
  const target = next.find(([category]) => category === targetCategory);
  if (!target) return { groups, changes: [] };
  const category = targetCategory === NO_CATEGORY ? null : targetCategory;
  const moved: Service = { ...moving, category };
  const at = beforeId ? target[1].findIndex((s) => s.id === beforeId) : -1;
  if (at === -1) target[1].push(moved);
  else target[1].splice(at, 0, moved);

  const changes: OrderChange[] = [];
  for (const [cat, list] of next) {
    list.forEach((s, index) => {
      const previous = groups.flatMap(([, l]) => l).find((p) => p.id === s.id);
      const sameCategory = (previous?.category?.trim() || NO_CATEGORY) === cat;
      if (!sameCategory || (previous?.sortOrder ?? -1) !== index) {
        changes.push({ id: s.id, category: cat === NO_CATEGORY ? null : cat, sortOrder: index });
      }
      list[index] = { ...s, sortOrder: index };
    });
  }
  return { groups: next, changes };
}
