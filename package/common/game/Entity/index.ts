import { Vector3 } from '../../vector';
import { context } from '../..';
import { uuid } from '../../uuid';

const isServer = context === 'server';
const allowStateBagReplication = isServer || !GetConvarBool('sv_stateBagStrictMode', false);

type EntityCache = Map<number, WeakRef<GameEntity>>;

const instancesByClass = new WeakMap<object, EntityCache>();
const instanceRegistry = new FinalizationRegistry<{ instances: EntityCache; handle: number; ref: WeakRef<GameEntity> }>(
  ({ instances, handle, ref }) => {
    if (instances.get(handle) === ref) instances.delete(handle);
  },
);

enum StateBagReplication {
  /** The value is replicated to the server and all relevant clients. */
  REPLICATED = 1,
  /** The value is synced between the server and entity owner. Player only. */
  SYNCED = 2,
}

export abstract class GameEntity {
  #handle: number = 0;
  #identity: string | number | undefined;
  readonly type: string = '';
  /** The entity's network id. */
  readonly netId: number = 0;
  protected statebag: string = '';

  /** Returns a cached wrapper for an existing entity handle. */
  public static fromHandle<T extends GameEntity>(this: new (handle: number) => T, handle: number): T {
    let instances = instancesByClass.get(this);

    if (!instances) {
      instances = new Map();
      instancesByClass.set(this, instances);
    }

    const cached = instances.get(handle)?.deref();

    if (cached instanceof this && cached.handle === handle && cached.isValid()) return cached;

    instances.delete(handle);

    const entity = new this(handle);
    const ref = new WeakRef(entity);

    instances.set(handle, ref);
    instanceRegistry.register(entity, { instances, handle, ref });

    return entity;
  }

  /** Writes entity state, requesting server validation for synced values and strict client replication. */
  public async set(key: string, value: unknown, mode?: StateBagReplication): Promise<boolean> {
    if (mode && !this.netId) mode = undefined;

    if ((mode === 1 && !allowStateBagReplication) || mode === 2) {
      if (mode === 2 && this.type !== 'Player') {
        throw new Error('Setting synced-states is not supported for non-player entities.');
      }

      if (!isServer) {
        const ok = await import('../../../client/callback').then(
          (m) =>
            m.triggerServerCallback(
              'ox_lib:requestSetStateBag',
              null,
              this.statebag,
              key,
              value,
              mode,
            ) as Promise<boolean>,
        );

        return ok ? this.set(key, value) : false;
      }

      emitNet('ox_lib:setStateBagValue', this.netId, key, value);
    }

    // @ts-ignore
    const packed = msgpack_pack(value);
    SetStateBagValue(this.statebag, key, packed, packed.length, mode === 1);

    return true;
  }

  /** Writes replicated entity state, requesting server validation for clients in strict mode. */
  public async setr(key: string, value: unknown) {
    return this.set(key, value, 1);
  }

  /** Writes a synced value to the entity's state. Client-set values are validated by the server. */
  public async sets(key: string, value: unknown) {
    return this.set(key, value, 2);
  }

  /** Returns a value from the entity's state. */
  public get<T = unknown>(key: string): T | undefined {
    return GetStateBagValue(this.statebag, key);
  }

  /** Returns if a key exists in the entity's state. */
  public has(key: string) {
    return !!StateBagHasKey(this.statebag, key);
  }

  /** Returns an array of all keys in the entity's state. */
  public keys(): string[] {
    return GetStateBagKeys(this.statebag);
  }

  /** The entity's script handle */
  public get handle() {
    return this.#handle;
  }

  /** Updates the script handle, network id, and state bag used by this wrapper. */
  protected setHandle(handle: number) {
    this.#handle = handle;

    if (this.type === 'Player') {
      this.statebag = `player:${this.netId}`;
      this.#identity = this.get<number>('userId');
      return;
    }

    // @ts-expect-error
    this.netId = NetworkGetNetworkIdFromEntity(handle);
    this.statebag = this.netId ? `entity:${this.netId}` : `localEntity:${handle}`;

    if (!this.netId || isServer) {
      EnsureEntityStateBag(handle);
    }

    let identity = this.get<string>('ox_entity_identity');

    if (!identity) {
      identity = uuid.generate();
      this.set('ox_entity_identity', identity);
    }

    this.#identity = identity;
  }

  /** Returns whether the original bound entity still exists at this handle. */
  public isValid() {
    const handle = this.handle;

    if (!handle || !DoesEntityExist(handle)) return false;

    const isPlayer = this.type === 'Player';

    if (!isPlayer) {
      const netId = isServer || NetworkGetEntityIsNetworked(handle) ? NetworkGetNetworkIdFromEntity(handle) : 0;

      if (netId !== this.netId) return false;
    }

    const identity = this.get<string | number>(isPlayer ? 'userId' : 'ox_entity_identity');

    return identity === this.#identity;
  }

  /** Returns the entity's world coordinates. */
  public getCoords() {
    return Vector3.fromArray(GetEntityCoords(this.handle));
  }

  /** Moves the entity to world coordinates with the supplied placement flags. */
  public setCoords(x: number, y: number, z: number, deadFlag = false, ragdollFlag = false, clearArea = false) {
    SetEntityCoords(this.handle, x, y, z, true, deadFlag, ragdollFlag, clearArea);
  }

  /** Returns the entity's model hash. */
  public getModel() {
    return GetEntityModel(this.handle);
  }

  /** Returns the entity's heading in degrees. */
  public getHeading() {
    return GetEntityHeading(this.handle);
  }

  /** Sets the entity's heading in degrees. */
  public setHeading(heading: number) {
    SetEntityHeading(this.handle, heading);
  }

  /** Returns the server routing bucket or its client state bag value, defaulting to zero. */
  public getRoutingBucket() {
    return isServer ? GetEntityRoutingBucket(this.handle) : (this.get('bucket') ?? 0);
  }

  /** Sets and replicates the entity's routing bucket on the server. */
  public setRoutingBucket(bucket: number) {
    if (!isServer) return;

    SetEntityRoutingBucket(this.handle, bucket);
    this.set('bucket', bucket, 1);
  }
}
