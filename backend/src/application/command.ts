import { recomputeProjections, type RecomputePorts } from './recompute.ts';

/** L'utilisateur qui exécute une commande, et l'organisation où il agit. */
export interface Actor {
  readonly userId: string;
  readonly organizationId: string;
}

/** Donne l'heure : date d'une clôture (ADR 0013), date du journal. */
export interface Clock {
  now(): Date;
}

/** Dit si un utilisateur est admin d'une organisation (ADR 0008). */
export interface MembershipRepository {
  isAdmin(organizationId: string, userId: string): Promise<boolean>;
}

/** Ce qu'une commande change d'une édition, hors faits de jeu. */
export interface EditionState {
  readonly version: number;
  /** Date ISO de la clôture, ou null si l'édition n'est pas clôturée (ADR 0013). */
  readonly closedAt: string | null;
}

/** Lit et écrit une édition d'une organisation, avec sa version (ADR 0005). */
export interface EditionRepository {
  /** L'édition de cette organisation, ou `undefined` si elle n'y est pas. */
  find(organizationId: string, editionId: string): Promise<EditionState | undefined>;
  /**
   * La clôture, si l'édition est encore à la version `version`. Rend la
   * nouvelle version ; refuse par un conflit si la version a changé.
   */
  close(
    organizationId: string,
    editionId: string,
    closedAt: string,
    version: number,
  ): Promise<number>;
}

/** Une ligne du journal des commandes (ADR 0009). */
export interface CommandLogEntry {
  readonly organizationId: string;
  readonly command: string;
  readonly actorUserId: string;
  readonly input: unknown;
  readonly outcome: unknown;
  readonly createdAt: string;
}

/** Ajoute une ligne au journal des commandes, en ajout seul (ADR 0009). */
export interface CommandLog {
  append(entry: CommandLogEntry): Promise<void>;
}

/** Les entrepôts des faits qu'une commande modifie. Pas les projections : seul le recalcul les écrit. */
export interface Repositories {
  readonly editions: EditionRepository;
}

/** Tout ce qu'une transaction donne : les entrepôts, les adhésions, le journal et le recalcul. */
export interface TransactionPorts extends Repositories, RecomputePorts {
  readonly memberships: MembershipRepository;
  readonly commandLog: CommandLog;
}

/**
 * Ouvre une transaction pour une organisation, avec son verrou (ADR 0009) :
 * tout ce que `work` écrit est validé ensemble, ou annulé si elle échoue.
 */
export interface UnitOfWork {
  run<T>(organizationId: string, work: (ports: TransactionPorts) => Promise<T>): Promise<T>;
}

/** Ce dont `executeCommand` a besoin. */
export interface CommandServices {
  readonly unitOfWork: UnitOfWork;
  readonly clock: Clock;
}

/** Ce que la commande sait de son exécution. */
export interface CommandContext {
  readonly organizationId: string;
  /** L'heure de la commande, en ISO, la même pour tout ce qu'elle écrit. */
  readonly now: string;
}

/**
 * Une commande : un nom métier (ADR 0005) et ce qu'elle fait de son entrée,
 * déjà validée. Ce qu'elle rend est son résultat, recopié au journal.
 */
export interface Command<Input, Outcome> {
  readonly name: string;
  run(repositories: Repositories, context: CommandContext, input: Input): Promise<Outcome>;
}

/** Pourquoi une commande est refusée. L'adaptateur HTTP en tire son code (403, 404, 409). */
export type RejectionReason = 'forbidden' | 'not_found' | 'conflict' | 'already_closed';

/** Une commande refusée pour une raison métier. Rien n'est écrit. */
export class CommandRejected extends Error {
  constructor(
    readonly reason: RejectionReason,
    message: string,
  ) {
    super(message);
    this.name = 'CommandRejected';
  }
}

/**
 * Le seul chemin d'une commande (ADR 0023), dans une seule transaction :
 * autorisation, commande, journal, recalcul. Une erreur annule tout.
 */
export function executeCommand<Input, Outcome>(
  { unitOfWork, clock }: CommandServices,
  actor: Actor,
  command: Command<Input, Outcome>,
  input: Input,
): Promise<Outcome> {
  const { organizationId, userId } = actor;
  return unitOfWork.run(organizationId, async (ports) => {
    if (!(await ports.memberships.isAdmin(organizationId, userId))) {
      throw new CommandRejected('forbidden', 'Seul un admin de l’organisation peut le faire.');
    }
    const now = clock.now().toISOString();
    const outcome = await command.run(ports, { organizationId, now }, input);
    await ports.commandLog.append({
      organizationId,
      command: command.name,
      actorUserId: userId,
      input,
      outcome,
      createdAt: now,
    });
    await recomputeProjections(ports, organizationId);
    return outcome;
  });
}
