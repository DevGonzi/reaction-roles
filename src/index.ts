// Main class and helpers
export { DiscordRoleManager, defineButtonRole, defineReactionRole } from './RoleManager.js';

// Types
export {
	ROLE_ACTION_MODES,
	type BaseNormalizedRoleBinding,
	type BaseRoleBindingInput,
	type ButtonRoleBindingInput,
	type DiscordRoleClient,
	type MaybePromise,
	type NormalizedButtonRoleBinding,
	type NormalizedReactionRoleBinding,
	type NormalizedRoleBinding,
	type ReactionRoleBindingInput,
	type RoleActionMode,
	type RoleBindingCallback,
	type RoleBindingExecutionContext,
	type RoleBindingInput,
	type RoleManagerErrorContext,
	type RoleManagerErrorHandler,
	type RoleManagerOptions,
	type RoleMutationPlan,
	type TriggerSource,
} from './types.js';

// Errors
export {
	DuplicateBindingError,
	InvalidBindingError,
	InvalidIdError,
	ManagerStateError,
	RateLimitError,
} from './errors.js';

// i18n
export { createI18n, t, type Locale } from './i18n.js';

// Utilities
export {
	getEmojiKey,
	RateLimiter,
	isValidDiscordId,
	validateDiscordId,
	validateDiscordIds,
} from './utils.js';
