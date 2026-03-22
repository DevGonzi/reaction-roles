import {
	type ButtonInteraction,
	Events,
	type GuildMember,
	type MessageReaction,
	type User,
} from 'discord.js';
import type { PartialMessageReaction, PartialUser, Snowflake } from 'discord.js';
import { DuplicateBindingError, InvalidBindingError, ManagerStateError } from './errors.js';
import { type Locale, createI18n } from './i18n.js';
import type {
	BaseNormalizedRoleBinding,
	ButtonRoleBindingInput,
	DiscordRoleClient,
	NormalizedButtonRoleBinding,
	NormalizedReactionRoleBinding,
	NormalizedRoleBinding,
	ReactionRoleBindingInput,
	RoleBindingExecutionContext,
	RoleBindingInput,
	RoleManagerErrorContext,
	RoleManagerErrorHandler,
	RoleManagerOptions,
	RoleMutationPlan,
	TriggerSource,
} from './types.js';
import { ROLE_ACTION_MODES } from './types.js';
import { RateLimiter, getEmojiKey, validateDiscordId, validateDiscordIds } from './utils.js';

/**
 * Default rate limit window in milliseconds (5 seconds).
 */
const DEFAULT_RATE_LIMIT_WINDOW = 5000;

/**
 * Default maximum requests per window.
 */
const DEFAULT_RATE_LIMIT_MAX = 3;

/**
 * Manages reaction role and button role bindings for an existing Discord.js client.
 */
export class DiscordRoleManager {
	private readonly client: DiscordRoleClient;
	private readonly onError: RoleManagerErrorHandler;
	private readonly bindings = new Map<string, NormalizedRoleBinding>();
	private readonly buttonBindings = new Map<string, NormalizedButtonRoleBinding>();
	private readonly reactionBindings = new Map<string, NormalizedReactionRoleBinding>();
	private started = false;
	private readonly rateLimiter: RateLimiter;
	private readonly locale: Locale;

	/**
	 * Creates a new role manager and optionally registers an initial binding list.
	 *
	 * @param client - The Discord.js client that should receive the listeners
	 * @param options - Additional manager configuration
	 */
	constructor(client: DiscordRoleClient, options: RoleManagerOptions = {}) {
		this.client = client;
		this.onError = options.onError ?? this.defaultErrorHandler.bind(this);
		this.locale = options.locale ?? 'en';
		this.rateLimiter = new RateLimiter(DEFAULT_RATE_LIMIT_WINDOW, DEFAULT_RATE_LIMIT_MAX);

		if (options.bindings) {
			this.setBindings(options.bindings);
		}
	}

	/**
	 * Default error handler that logs errors to console.
	 *
	 * @param error - The error that occurred
	 * @param context - The context of the error
	 */
	private async defaultErrorHandler(
		error: unknown,
		context: RoleManagerErrorContext,
	): Promise<void> {
		console.error(`[DiscordRoleManager] Error in ${context.source}:`, error);
	}

	/**
	 * Generates a unique key for a binding.
	 *
	 * @param messageId - The message ID
	 * @param key - The emoji or custom ID
	 * @returns The unique key
	 */
	private getBindingKey(messageId: Snowflake, key: string): string {
		return `${messageId}:${key}`;
	}

	/**
	 * Normalizes a binding input into a normalized binding.
	 *
	 * @param input - The binding input
	 * @returns The normalized binding
	 */
	private normalizeBinding(input: RoleBindingInput): NormalizedRoleBinding {
		// Validate message ID
		validateDiscordId(input.messageId, 'messageId');

		// Validate and normalize role IDs
		const roleIds: Snowflake[] = [];
		if (input.roleId) {
			validateDiscordId(input.roleId, 'roleId');
			roleIds.push(input.roleId);
		}
		if (input.roleIds) {
			validateDiscordIds(input.roleIds, 'roleIds');
			roleIds.push(...input.roleIds);
		}

		if (roleIds.length === 0) {
			throw new InvalidBindingError(
				'At least one roleId or roleIds must be provided',
				'roleId/roleIds',
			);
		}

		// Validate mode
		const mode = input.mode ?? 'toggle';
		if (!ROLE_ACTION_MODES.includes(mode)) {
			throw new InvalidBindingError(
				`Invalid mode "${mode}". Must be one of: ${ROLE_ACTION_MODES.join(', ')}`,
				'mode',
			);
		}

		const base: BaseNormalizedRoleBinding = {
			messageId: input.messageId,
			roleIds,
			mode,
			onAdd: input.onAdd,
			onRemove: input.onRemove,
		};

		if (input.type === 'reaction') {
			if (!input.emoji) {
				throw new InvalidBindingError('Emoji is required for reaction bindings', 'emoji');
			}
			const binding: NormalizedReactionRoleBinding = {
				...base,
				type: 'reaction',
				emoji: input.emoji,
			};
			return binding;
		}

		if (input.type === 'button') {
			if (!input.customId) {
				throw new InvalidBindingError('Custom ID is required for button bindings', 'customId');
			}
			const binding: NormalizedButtonRoleBinding = {
				...base,
				type: 'button',
				customId: input.customId,
			};
			return binding;
		}

		throw new InvalidBindingError('Invalid binding type', 'type');
	}

	/**
	 * Checks for duplicate bindings and throws if found.
	 *
	 * @param bindings - The bindings to check
	 */
	private checkForDuplicates(bindings: NormalizedRoleBinding[]): void {
		const seen = new Set<string>();

		for (const binding of bindings) {
			const key =
				binding.type === 'reaction'
					? this.getBindingKey(binding.messageId, binding.emoji)
					: this.getBindingKey(binding.messageId, binding.customId);

			if (seen.has(key)) {
				throw new DuplicateBindingError(
					binding.messageId,
					binding.type === 'reaction' ? binding.emoji : binding.customId,
				);
			}
			seen.add(key);
		}
	}

	/**
	 * Attaches the manager's event listeners to the Discord.js client.
	 *
	 * @returns The current manager instance
	 * @throws {ManagerStateError} If the manager is already started
	 */
	start(): this {
		if (this.started) {
			throw new ManagerStateError('Manager is already started');
		}

		this.client.on(Events.MessageReactionAdd, this.handleReactionAdd);
		this.client.on(Events.MessageReactionRemove, this.handleReactionRemove);
		this.client.on(Events.InteractionCreate, this.handleInteractionCreate);

		this.started = true;
		return this;
	}

	/**
	 * Detaches the manager's event listeners from the Discord.js client.
	 *
	 * @returns The current manager instance
	 * @throws {ManagerStateError} If the manager is not started
	 */
	stop(): this {
		if (!this.started) {
			throw new ManagerStateError('Manager is not started');
		}

		this.client.off(Events.MessageReactionAdd, this.handleReactionAdd);
		this.client.off(Events.MessageReactionRemove, this.handleReactionRemove);
		this.client.off(Events.InteractionCreate, this.handleInteractionCreate);

		this.started = false;
		return this;
	}

	/**
	 * Replaces the entire binding set with a new validated list.
	 *
	 * @param bindings - The new public binding inputs
	 * @returns The current manager instance
	 * @throws {InvalidIdError} If any ID is invalid
	 * @throws {InvalidBindingError} If any binding is invalid
	 * @throws {DuplicateBindingError} If duplicate bindings are found
	 */
	setBindings(bindings: readonly RoleBindingInput[]): this {
		// Clear existing bindings
		this.bindings.clear();
		this.buttonBindings.clear();
		this.reactionBindings.clear();

		if (bindings.length === 0) {
			return this;
		}

		// Normalize all bindings
		const normalized = bindings.map((b) => this.normalizeBinding(b));

		// Check for duplicates
		this.checkForDuplicates(normalized);

		// Store bindings
		for (const binding of normalized) {
			this.storeBinding(binding);
		}

		return this;
	}

	/**
	 * Appends new bindings to the current set and re-validates the final configuration.
	 *
	 * @param bindings - Additional bindings to append
	 * @returns The current manager instance
	 * @throws {InvalidIdError} If any ID is invalid
	 * @throws {InvalidBindingError} If any binding is invalid
	 * @throws {DuplicateBindingError} If duplicate bindings are found
	 */
	addBindings(bindings: readonly RoleBindingInput[]): this {
		if (bindings.length === 0) {
			return this;
		}

		// Normalize new bindings
		const normalized = bindings.map((b) => this.normalizeBinding(b));

		// Combine with existing bindings for duplicate check
		const allBindings = [...this.getBindings(), ...normalized];
		this.checkForDuplicates(allBindings);

		// Store new bindings
		for (const binding of normalized) {
			this.storeBinding(binding);
		}

		return this;
	}

	/**
	 * Stores a normalized binding in the appropriate map.
	 *
	 * @param binding - The normalized binding to store
	 */
	private storeBinding(binding: NormalizedRoleBinding): void {
		if (binding.type === 'reaction') {
			const key = this.getBindingKey(binding.messageId, binding.emoji);
			this.bindings.set(key, binding);
			this.reactionBindings.set(key, binding);
		} else {
			const key = this.getBindingKey(binding.messageId, binding.customId);
			this.bindings.set(key, binding);
			this.buttonBindings.set(key, binding);
		}
	}

	/**
	 * Returns a copy of the normalized binding list.
	 *
	 * @returns The current normalized bindings
	 */
	getBindings(): NormalizedRoleBinding[] {
		return Array.from(this.bindings.values()).map((binding) => ({ ...binding }));
	}

	/**
	 * Removes all bindings assigned to one message.
	 *
	 * @param messageId - The message whose bindings should be removed
	 * @returns The normalized bindings that were removed
	 */
	removeBindingsForMessage(messageId: Snowflake): NormalizedRoleBinding[] {
		validateDiscordId(messageId, 'messageId');

		const removed: NormalizedRoleBinding[] = [];

		// Remove from all maps
		for (const [key, binding] of this.bindings) {
			if (binding.messageId === messageId) {
				removed.push({ ...binding });
				this.bindings.delete(key);

				if (binding.type === 'reaction') {
					this.reactionBindings.delete(key);
				} else {
					this.buttonBindings.delete(key);
				}
			}
		}

		return removed;
	}

	/**
	 * Stops the manager and clears all bindings.
	 */
	destroy(): void {
		if (this.started) {
			this.stop();
		}
		this.bindings.clear();
		this.buttonBindings.clear();
		this.reactionBindings.clear();
		this.rateLimiter.clear();
	}

	/**
	 * Handles the messageReactionAdd event.
	 */
	private readonly handleReactionAdd = async (
		reaction: MessageReaction | PartialMessageReaction,
		user: User | PartialUser,
	): Promise<void> => {
		// Ignore bot reactions
		if (user.bot) return;

		await this.processReactionEvent(reaction, user, 'reaction-add');
	};

	/**
	 * Handles the messageReactionRemove event.
	 */
	private readonly handleReactionRemove = async (
		reaction: MessageReaction | PartialMessageReaction,
		user: User | PartialUser,
	): Promise<void> => {
		// Ignore bot reactions
		if (user.bot) return;

		await this.processReactionEvent(reaction, user, 'reaction-remove');
	};

	/**
	 * Handles the interactionCreate event for button interactions.
	 */
	private readonly handleInteractionCreate = async (
		interaction: import('discord.js').Interaction,
	): Promise<void> => {
		if (!interaction.isButton()) return;

		await this.processInteraction(interaction);
	};

	/**
	 * Processes a reaction event.
	 *
	 * @param reaction - The reaction
	 * @param user - The user who reacted
	 * @param source - The trigger source
	 */
	private async processReactionEvent(
		reaction: MessageReaction | PartialMessageReaction,
		user: User | PartialUser,
		source: TriggerSource,
	): Promise<void> {
		try {
			// Fetch partial reaction if needed
			const fullReaction = reaction.partial ? await reaction.fetch() : reaction;

			// Fetch partial user if needed
			const fullUser = user.partial ? await user.fetch() : user;

			const messageId = fullReaction.message.id;
			const emojiKey = getEmojiKey(fullReaction.emoji);
			const binding = this.findReactionBinding(messageId, emojiKey);

			if (!binding) return;

			// Check rate limit
			if (fullReaction.message.guild) {
				if (this.rateLimiter.isLimited(fullReaction.message.guild.id, fullUser.id)) {
					return;
				}
				this.rateLimiter.record(fullReaction.message.guild.id, fullUser.id);
			}

			// Fetch member
			const member = await this.fetchGuildMember(fullReaction, fullUser.id);
			if (!member) return;

			// Create execution plan
			const plan = this.createPlan(binding, member, source);

			// Apply the plan
			await this.applyPlan(plan, binding, member, source, fullReaction);
		} catch (error) {
			await this.onError(error, {
				source,
				binding:
					this.findReactionBinding(reaction.message.id, getEmojiKey(reaction.emoji)) ?? undefined,
				reaction,
				user,
			});
		}
	}

	/**
	 * Processes a button interaction.
	 *
	 * @param interaction - The button interaction
	 */
	private async processInteraction(interaction: ButtonInteraction): Promise<void> {
		try {
			const messageId = interaction.message.id;
			const customId = interaction.customId;

			// Validate customId format to prevent injection
			if (typeof customId !== 'string' || customId.length > 100) {
				return;
			}

			const binding = this.findButtonBinding(messageId, customId);

			if (!binding) return;

			// Check rate limit
			if (interaction.guild) {
				if (this.rateLimiter.isLimited(interaction.guild.id, interaction.user.id)) {
					await this.replyWithRateLimit(interaction);
					return;
				}
				this.rateLimiter.record(interaction.guild.id, interaction.user.id);
			}

			// Defer the interaction
			await this.deferInteraction(interaction);

			// Fetch member
			const member = interaction.guild?.members.cache.get(interaction.user.id);
			if (!member) {
				await this.replyWithInteractionError(interaction, 'Member not found');
				return;
			}

			// Create execution plan
			const plan = this.createPlan(binding, member, 'button');

			// Apply the plan
			await this.applyPlan(plan, binding, member, 'button', undefined, interaction);
		} catch (error) {
			await this.onError(error, {
				source: 'button',
				binding: this.findButtonBinding(interaction.message.id, interaction.customId) ?? undefined,
				interaction,
				user: interaction.user,
			});

			// Try to reply with error if not already replied
			if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
				await this.replyWithInteractionError(interaction, 'An error occurred');
			}
		}
	}

	/**
	 * Creates an execution plan for a binding.
	 *
	 * @param binding - The binding
	 * @param member - The guild member
	 * @param source - The trigger source
	 * @returns The execution plan
	 */
	private createPlan(
		binding: NormalizedRoleBinding,
		member: GuildMember,
		source: TriggerSource,
	): RoleMutationPlan {
		const currentRoles = member.roles.cache;
		const targetRoles = binding.roleIds;
		const hasAllRoles = targetRoles.every((id) => currentRoles.has(id));

		switch (binding.mode) {
			case 'toggle': {
				if (hasAllRoles) {
					return {
						operation: 'remove',
						roleIds: targetRoles,
						callback: 'onRemove',
						shouldPruneReaction: source === 'reaction-add',
					};
				}
				return {
					operation: 'add',
					roleIds: targetRoles,
					callback: 'onAdd',
					shouldPruneReaction: false,
				};
			}

			case 'add': {
				if (hasAllRoles) {
					return {
						operation: 'none',
						roleIds: [],
						callback: null,
						reason: 'already_has',
						shouldPruneReaction: source === 'reaction-add',
					};
				}
				return {
					operation: 'add',
					roleIds: targetRoles,
					callback: 'onAdd',
					shouldPruneReaction: false,
				};
			}

			case 'remove': {
				if (!hasAllRoles) {
					return {
						operation: 'none',
						roleIds: [],
						callback: null,
						reason: 'missing',
						shouldPruneReaction: source === 'reaction-add',
					};
				}
				return {
					operation: 'remove',
					roleIds: targetRoles,
					callback: 'onRemove',
					shouldPruneReaction: source === 'reaction-add',
				};
			}

			case 'once': {
				// "once" only adds roles, never removes them
				if (hasAllRoles) {
					return {
						operation: 'none',
						roleIds: [],
						callback: null,
						reason: 'already_has',
						shouldPruneReaction: source === 'reaction-add',
					};
				}
				return {
					operation: 'add',
					roleIds: targetRoles,
					callback: 'onAdd',
					shouldPruneReaction: false,
				};
			}

			default:
				return {
					operation: 'none',
					roleIds: [],
					callback: null,
					shouldPruneReaction: false,
				};
		}
	}

	/**
	 * Applies a role mutation plan.
	 *
	 * @param plan - The execution plan
	 * @param binding - The binding
	 * @param member - The guild member
	 * @param source - The trigger source
	 * @param reaction - The reaction, if applicable
	 * @param interaction - The button interaction, if applicable
	 */
	private async applyPlan(
		plan: RoleMutationPlan,
		binding: NormalizedRoleBinding,
		member: GuildMember,
		source: TriggerSource,
		reaction?: MessageReaction | PartialMessageReaction,
		interaction?: ButtonInteraction,
	): Promise<void> {
		const i18n = createI18n(this.locale);

		if (plan.operation === 'none') {
			// Prune reaction if needed
			if (plan.shouldPruneReaction && reaction) {
				await reaction.users.remove(member.id).catch(() => {
					// Ignore errors removing reactions
				});
			}

			// Send feedback message for button interactions
			if (interaction) {
				let content: string | undefined;
				if (plan.reason === 'already_has') {
					const key =
						plan.roleIds.length === 1
							? 'interaction.alreadyHasRole'
							: 'interaction.alreadyHasRoles';
					content = i18n.t(key as 'interaction.alreadyHasRole');
				} else if (plan.reason === 'missing') {
					content = i18n.t('interaction.roleNotFound');
				}

				if (content) {
					await interaction.reply({ content, ephemeral: true }).catch(() => {
						// Ignore reply errors
					});
				}
			}
			return;
		}

		// Apply role changes
		const auditReason = this.buildAuditReason(source);

		try {
			if (plan.operation === 'add') {
				await member.roles.add(plan.roleIds, auditReason);
			} else {
				await member.roles.remove(plan.roleIds, auditReason);
			}
		} catch {
			// Role assignment failed - might be hierarchy issue
			if (interaction) {
				await this.replyWithInteractionError(interaction, i18n.t('interaction.error'));
			}
			return;
		}

		// Prune reaction if needed
		if (plan.shouldPruneReaction && reaction) {
			await reaction.users.remove(member.id).catch(() => {
				// Ignore errors removing reactions
			});
		}

		// Execute callback if defined
		if (plan.callback && (plan.callback === 'onAdd' || plan.callback === 'onRemove')) {
			const callback = binding[plan.callback];
			if (callback) {
				const context: RoleBindingExecutionContext = {
					binding,
					member,
					source,
					userId: member.id,
					reaction,
					interaction,
				};
				try {
					await callback(context);
				} catch (callbackError) {
					// Callback errors shouldn't break the flow
					await this.onError(callbackError, {
						source,
						binding,
						reaction,
						interaction,
						user: member.user,
					});
				}
			}
		}

		// Reply to interaction if applicable
		if (interaction) {
			const count = plan.roleIds.length;
			const key =
				plan.operation === 'add'
					? count === 1
						? 'interaction.roleAdded'
						: 'interaction.rolesAdded'
					: count === 1
						? 'interaction.roleRemoved'
						: 'interaction.rolesRemoved';

			const content = i18n.t(key, { count: String(count) });

			if (interaction.deferred) {
				await interaction.editReply({ content }).catch(() => {
					// Ignore edit errors
				});
			} else {
				await interaction.reply({ content, ephemeral: true }).catch(() => {
					// Ignore reply errors
				});
			}
		}
	}

	/**
	 * Fetches a guild member from a reaction.
	 *
	 * @param reaction - The reaction
	 * @param userId - The user ID
	 * @returns The guild member, or null if not found
	 */
	private async fetchGuildMember(
		reaction: MessageReaction,
		userId: Snowflake,
	): Promise<GuildMember | null> {
		const guild = reaction.message.guild;
		if (!guild) return null;

		try {
			// Try cache first
			const cached = guild.members.cache.get(userId);
			if (cached) return cached;

			// Fetch from API
			return await guild.members.fetch(userId);
		} catch {
			return null;
		}
	}

	/**
	 * Finds a button binding by message ID and custom ID.
	 *
	 * @param messageId - The message ID
	 * @param customId - The custom ID
	 * @returns The binding, or undefined if not found
	 */
	private findButtonBinding(
		messageId: Snowflake,
		customId: string,
	): NormalizedButtonRoleBinding | undefined {
		const key = this.getBindingKey(messageId, customId);
		return this.buttonBindings.get(key);
	}

	/**
	 * Finds a reaction binding by message ID and emoji.
	 *
	 * @param messageId - The message ID
	 * @param emoji - The emoji
	 * @returns The binding, or undefined if not found
	 */
	private findReactionBinding(
		messageId: Snowflake,
		emoji: string,
	): NormalizedReactionRoleBinding | undefined {
		// Try exact match first (for custom emoji IDs)
		const exactKey = this.getBindingKey(messageId, emoji);
		const exact = this.reactionBindings.get(exactKey);
		if (exact) return exact;

		// Try matching by emoji name (for unicode emojis)
		for (const [_key, binding] of this.reactionBindings) {
			if (binding.messageId === messageId) {
				// Check if the emoji matches (either by ID or by name)
				if (binding.emoji === emoji) {
					return binding;
				}
			}
		}

		return undefined;
	}

	/**
	 * Builds an audit log reason string.
	 *
	 * @param source - The trigger source
	 * @returns The audit log reason
	 */
	private buildAuditReason(source: TriggerSource): string {
		const i18n = createI18n(this.locale);
		return i18n.getSourceName(source);
	}

	/**
	 * Defers a button interaction.
	 *
	 * @param interaction - The button interaction
	 */
	private async deferInteraction(interaction: ButtonInteraction): Promise<void> {
		try {
			await interaction.deferReply({ ephemeral: true });
		} catch {
			// Ignore defer errors
		}
	}

	/**
	 * Replies to an interaction with an error message.
	 *
	 * @param interaction - The button interaction
	 * @param message - The error message
	 */
	private async replyWithInteractionError(
		interaction: ButtonInteraction,
		message: string,
	): Promise<void> {
		try {
			if (interaction.deferred) {
				await interaction.editReply({ content: message });
			} else {
				await interaction.reply({ content: message, ephemeral: true });
			}
		} catch {
			// Ignore reply errors
		}
	}

	/**
	 * Replies to an interaction with a rate limit message.
	 *
	 * @param interaction - The button interaction
	 */
	private async replyWithRateLimit(interaction: ButtonInteraction): Promise<void> {
		const i18n = createI18n(this.locale);
		await this.replyWithInteractionError(interaction, i18n.t('interaction.rateLimited'));
	}
}

/**
 * Defines a reaction binding with improved type inference.
 *
 * @param binding - The reaction binding input to return unchanged
 * @returns The same reaction binding input with type set
 */
export function defineReactionRole(
	binding: Omit<ReactionRoleBindingInput, 'type'>,
): ReactionRoleBindingInput {
	return {
		...binding,
		type: 'reaction',
	};
}

/**
 * Defines a button binding with improved type inference.
 *
 * @param binding - The button binding input to return unchanged
 * @returns The same button binding input with type set
 */
export function defineButtonRole(
	binding: Omit<ButtonRoleBindingInput, 'type'>,
): ButtonRoleBindingInput {
	return {
		...binding,
		type: 'button',
	};
}
