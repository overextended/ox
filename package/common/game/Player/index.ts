import { context } from '../..';
import { Ped } from '../Ped';

const isServer = context === 'server';
const players = new Map<number, WeakRef<Player>>();
const registry = new FinalizationRegistry((id: number) => players.delete(id));

type StateChangeHandler<T = any> = (player: Player, key: string, value?: T, old?: T) => void;

const stateChangeHandlers = new Map<
  string,
  {
    cookie: number;
    subscriptions: Set<{ cb: StateChangeHandler }>;
  }
>();

let User: typeof import('../../../server/remote-class').User;
let Character: typeof import('../../../server/remote-class').Character;

if (isServer) {
  (async () => {
    User = await import('../../../server/remote-class').then((m) => m.User);
    Character = await import('../../../server/remote-class').then((m) => m.Character);
  })();
}

/** Dispatches player state changes with the new value and the previous bag value. */
function triggerStateChangeHandlers(bag: string, key: string, value: unknown) {
  if (!bag.startsWith('player:')) return;

  const playerId = GetPlayerFromStateBagName(bag);

  if (isServer ? playerId <= 0 : playerId < 0) return;

  const serverId = isServer ? playerId : GetPlayerServerId(playerId);

  if (serverId <= 0 || bag !== `player:${serverId}`) return;

  const handlers = stateChangeHandlers.get(key);

  if (!handlers) return;

  const player = Player.fromId(serverId);
  const old = GetStateBagValue(bag, key);
  const subscriptions = [...handlers.subscriptions];

  for (const subscription of subscriptions) {
    if (handlers.subscriptions.has(subscription)) subscription.cb(player, key, value, old);
  }
}

export class Player extends Ped {
  readonly type: string = 'Player';
  /** The player's server id. */
  readonly netId: number;

  static readonly Local = (isServer ? null : this.fromId(-1))!;

  /**
   * Returns a cached player instance or creates a new one.
   */
  public static fromId(netId: number) {
    if (netId === -1) netId = isServer ? Number(GetPlayerFromIndex(0)) : GetPlayerServerId(PlayerId());

    let player = players.get(netId)?.deref();

    if (!player) {
      player = new Player(netId);
      const ref = new WeakRef(player);

      players.set(netId, ref);
      registry.register(player, netId, ref);
    }

    return player;
  }

  /** Registers a player state callback and returns a function that unsubscribes it. */
  public static on<T = unknown>(key: string, handler: StateChangeHandler<T>): () => void {
    let handlers = stateChangeHandlers.get(key);

    if (!handlers) {
      handlers = {
        cookie: AddStateBagChangeHandler(key, '', triggerStateChangeHandlers),
        subscriptions: new Set(),
      };
      stateChangeHandlers.set(key, handlers);
    }

    const subscription = { cb: handler };
    handlers.subscriptions.add(subscription);

    return () => {
      if (!handlers.subscriptions.delete(subscription) || handlers.subscriptions.size) return;

      RemoveStateBagChangeHandler(handlers.cookie);
      stateChangeHandlers.delete(key);
    };
  }

  /**
   * @see {@link Player.fromId}
   * @internal
   * Creates a new Player reference from a player's server id. A value of `-1` references the local player or first player on the server.
   */
  private constructor(netId: number) {
    if (netId === -1) netId = isServer ? Number(GetPlayerFromIndex(0)) : GetPlayerServerId(PlayerId());

    super(0);
    this.netId = netId;
    this.setHandle(isServer ? GetPlayerPed(netId) : 0);
  }

  /** The server ID on the server or current player index on the client. */
  public get playerId() {
    return isServer ? this.netId : GetPlayerFromServerId(this.netId);
  }

  /** The player ped's script handle, or 0 while out of scope. */
  public get handle() {
    if (isServer) return super.handle;

    const playerId = this.playerId;
    return playerId >= 0 ? GetPlayerPed(playerId) : 0;
  }

  /** Returns a remote class proxy for the player's user. */
  public getUser() {
    return User?.fromId(this.get('userId')!);
  }

  /** Returns a remote class proxy for the player's current character. */
  public getCharacter() {
    return Character?.fromId(this.get('charId')!);
  }

  /** Streams and applies a model to the local player. Server calls return immediately. */
  public async setModel(model: string | number) {
    if (isServer || this.playerId !== Player.Local.playerId) return;

    const { requestModel } = await import('../../../client/streaming');
    const hash = await requestModel(model);

    SetPlayerModel(this.playerId, hash);
    SetModelAsNoLongerNeeded(hash);
  }

  /** Returns the player's server routing bucket or its client state bag value. */
  public getRoutingBucket() {
    return isServer ? GetPlayerRoutingBucket(this.playerId as unknown as string) : (this.get('bucket') ?? 0);
  }

  /** Sets and replicates the player's routing bucket on the server. */
  public setRoutingBucket(bucket: number) {
    if (!isServer) return;

    SetPlayerRoutingBucket(this.playerId as unknown as string, bucket);
    this.set('bucket', bucket, 1);
  }
}
