import { context } from '../common/utils';

if (
  context === 'client' &&
  GetGameName() === 'fivem' &&
  globalThis.GetEntitiesInRadius?.(0, 0, 0, 0, 1, false, []) == null
) {
  const pools = new Map([
    [1, 'CPed'],
    [2, 'CVehicle'],
    [3, 'CObject'],
  ]);

  globalThis.GetEntitiesInRadius = (x, y, z, radius, entityType, sortByDistance, models?: readonly number[]) => {
    const pool = pools.get(entityType);
    if (!pool) return [];

    const allowedModels = models?.length ? new Set(models.map((model) => model)) : undefined;
    const radiusSquared = radius * radius;
    const matches: { handle: number; distanceSquared: number }[] = [];
    const entities: number[] = GetGamePool(pool);

    for (const handle of entities) {
      const [entityX, entityY, entityZ] = GetEntityCoords(handle, false);

      if (entityX === undefined || entityY === undefined || entityZ === undefined) continue;

      const distanceSquared = (entityX - x) ** 2 + (entityY - y) ** 2 + (entityZ - z) ** 2;

      if (distanceSquared < radiusSquared && (!allowedModels || allowedModels.has(GetEntityModel(handle)))) {
        matches.push({ handle, distanceSquared });
      }
    }

    if (sortByDistance) matches.sort((a, b) => a.distanceSquared - b.distanceSquared);

    return matches.map(({ handle }) => handle);
  };
}

export * from '../common';
export * from './addKeybind';
export * from './cache';
export * from './callback';
export * from './dui';
export * from './game/Prop';
export * from './game/Ped';
export * from './game/Vehicle';
export * from './interface';
export * from './points';
export * from './streaming';
export * from './vehicleProperties';

export * as lib from '.';
