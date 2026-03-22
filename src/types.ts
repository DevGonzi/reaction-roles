import type {
	ButtonInteraction,
	GuildMember,
	MessageReaction,
	PartialMessageReaction,
	PartialUser,
	Snowflake,
	User,
} from 'discord.js';
import type { Locale } from './i18n.js';

/**
 * Supported role mutation modes.
 */
export const ROLE_ACTION_MODES = ['toggle', 'add', 'remove', 'once'] as const;

/**
 * A synchronous or asynchronous value.
 */
export type MaybePromise<T> = T | Promise<T>;

/**
 * Supported ways a binding can change roles.
 */
export type RoleActionMode = (typeof ROLE_ACTION_MODES)[number];

/**
 * The kind of interaction that triggered a role update.
 */
export type TriggerSource = 'reaction-add' | 'reaction-remove' | 'button';

/**
 * Callback executed after a binding changed roles.
 */
export type RoleBindingCallback = (context: RoleBindingExecutionContext) => MaybePromise<void>;

/**
 * Error handler invoked for asynchronous listener failures.
 */
export type RoleManagerErrorHandler = (
	error: unknown,
	context: RoleManagerErrorContext,
) => MaybePromise<void>;

/**
 * Input shared by both reaction and button bindings.
 */
export interface BaseRoleBindingInput {
	/**
	 * The target Discord message ID.
	 */
	messageId: Snowflake;

	/**
	 * A single role to add or remove.
	 */
	roleId?: Snowflake;

	/**
	 * Multiple roles to add or remove together.
	 */
	roleIds?: readonly Snowflake[];

	/**
	 * The mutation mode to apply when the binding is triggered.
	 *
	 * @defaultValue `"toggle"`
	 */
	mode?: RoleActionMode;

	/**
	 * Callback executed after roles were added.
	 */
	onAdd?: RoleBindingCallback;

	/**
	 * Callback executed after roles were removed.
	 */
	onRemove?: RoleBindingCallback;
}

/**
 * A reaction-based role binding.
 */
export interface ReactionRoleBindingInput extends BaseRoleBindingInput {
	/**
	 * The binding type discriminator.
	 */
	type: 'reaction';

	/**
	 * The emoji to match. This can be a unicode emoji, custom emoji ID, or custom emoji name.
	 */
	emoji: string;
}

/**
 * A button-based role binding.
 */
export interface ButtonRoleBindingInput extends BaseRoleBindingInput {
	/**
	 * The binding type discriminator.
	 */
	type: 'button';

	/**
	 * The button custom ID to match.
	 */
	customId: string;
}

/**
 * Any public binding input accepted by the manager.
 */
export type RoleBindingInput = ReactionRoleBindingInput | ButtonRoleBindingInput;

/**
 * Shared shape of normalized bindings used internally and returned by `getBindings()`.
 */
export interface BaseNormalizedRoleBinding {
	/**
	 * The target Discord message ID.
	 */
	messageId: Snowflake;

	/**
	 * The normalized list of target roles.
	 */
	roleIds: Snowflake[];

	/**
	 * The normalized mutation mode.
	 */
	mode: RoleActionMode;

	/**
	 * Callback executed after roles were added.
	 */
	onAdd?: RoleBindingCallback;

	/**
	 * Callback executed after roles were removed.
	 */
	onRemove?: RoleBindingCallback;
}

/**
 * A normalized reaction binding.
 */
export interface NormalizedReactionRoleBinding extends BaseNormalizedRoleBinding {
	/**
	 * The binding type discriminator.
	 */
	type: 'reaction';

	/**
	 * The configured emoji key.
	 */
	emoji: string;
}

/**
 * A normalized button binding.
 */
export interface NormalizedButtonRoleBinding extends BaseNormalizedRoleBinding {
	/**
	 * The binding type discriminator.
	 */
	type: 'button';

	/**
	 * The configured button custom ID.
	 */
	customId: string;
}

/**
 * Any normalized binding stored by the manager.
 */
export type NormalizedRoleBinding = NormalizedReactionRoleBinding | NormalizedButtonRoleBinding;

/**
 * Context provided to binding callbacks.
 */
export interface RoleBindingExecutionContext {
	/**
	 * The normalized binding that was executed.
	 */
	binding: NormalizedRoleBinding;

	/**
	 * The guild member whose roles changed.
	 */
	member: GuildMember;

	/**
	 * The event source that triggered the change.
	 */
	source: TriggerSource;

	/**
	 * The user ID that caused the change.
	 */
	userId: Snowflake;

	/**
	 * The matched reaction, when the binding came from a reaction event.
	 */
	reaction?: MessageReaction | PartialMessageReaction;

	/**
	 * The matched button interaction, when the binding came from a button click.
	 */
	interaction?: ButtonInteraction;
}

/**
 * Details about a manager error.
 */
export interface RoleManagerErrorContext {
	/**
	 * The event source where the error happened.
	 */
	source: TriggerSource;

	/**
	 * The matched binding, when available.
	 */
	binding?: NormalizedRoleBinding;

	/**
	 * The reaction involved in the failure.
	 */
	reaction?: MessageReaction | PartialMessageReaction;

	/**
	 * The button interaction involved in the failure.
	 */
	interaction?: ButtonInteraction;

	/**
	 * The user involved in the failure, when available.
	 */
	user?: User | PartialUser;
}

/**
 * Options for creating a `DiscordRoleManager`.
 */
export interface RoleManagerOptions {
	/**
	 * The initial binding list to register.
	 */
	bindings?: readonly RoleBindingInput[];

	/**
	 * Optional error handler for listener failures.
	 */
	onError?: RoleManagerErrorHandler;

	/**
	 * The locale/language for user messages and audit logs.
	 *
	 * @defaultValue `"en"`
	 */
	locale?: Locale;
}

/**
 * A plan describing what role mutation should happen for one event.
 */
export interface RoleMutationPlan {
	/**
	 * The mutation operation to perform.
	 */
	operation: 'add' | 'remove' | 'none';

	/**
	 * The roles affected by the mutation.
	 */
	roleIds: Snowflake[];

	/**
	 * The callback to execute after the mutation completes.
	 */
	callback: 'onAdd' | 'onRemove' | null;

	/**
	 * Whether the user's reaction should be removed after handling.
	 */
	shouldPruneReaction: boolean;

	/**
	 * Reason why operation is 'none' (for feedback messages).
	 */
	reason?: 'already_has' | 'missing';
}

/**
 * Convenience signature for a Discord.js client used by this package.
 */
export type DiscordRoleClient = import('discord.js').Client;
