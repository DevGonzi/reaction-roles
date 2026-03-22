/**
 * Error thrown when an invalid Discord ID is provided.
 */
export class InvalidIdError extends Error {
	/**
	 * The invalid ID that was provided.
	 */
	readonly id: string;

	/**
	 * The field name that contained the invalid ID.
	 */
	readonly field: string;

	/**
	 * Creates a new InvalidIdError.
	 *
	 * @param id - The invalid ID that was provided
	 * @param field - The field name that contained the invalid ID
	 */
	constructor(id: string, field: string) {
		super(`Invalid Discord ID "${id}" in field "${field}". IDs must be 17-19 digits.`);
		this.name = 'InvalidIdError';
		this.id = id;
		this.field = field;
	}
}

/**
 * Error thrown when invalid binding options are provided.
 */
export class InvalidBindingError extends Error {
	/**
	 * The field that had invalid options.
	 */
	readonly field: string;

	/**
	 * Creates a new InvalidBindingError.
	 *
	 * @param message - The error message
	 * @param field - The field that had invalid options
	 */
	constructor(message: string, field: string) {
		super(message);
		this.name = 'InvalidBindingError';
		this.field = field;
	}
}

/**
 * Error thrown when a duplicate binding is detected.
 */
export class DuplicateBindingError extends Error {
	/**
	 * The message ID where the duplicate was found.
	 */
	readonly messageId: string;

	/**
	 * The emoji or custom ID that was duplicated.
	 */
	readonly key: string;

	/**
	 * Creates a new DuplicateBindingError.
	 *
	 * @param messageId - The message ID where the duplicate was found
	 * @param key - The emoji or custom ID that was duplicated
	 */
	constructor(messageId: string, key: string) {
		super(`Duplicate binding for message "${messageId}" with key "${key}".`);
		this.name = 'DuplicateBindingError';
		this.messageId = messageId;
		this.key = key;
	}
}

/**
 * Error thrown when the manager is in an invalid state.
 */
export class ManagerStateError extends Error {
	/**
	 * Creates a new ManagerStateError.
	 *
	 * @param message - The error message
	 */
	constructor(message: string) {
		super(message);
		this.name = 'ManagerStateError';
	}
}

/**
 * Error thrown when a rate limit is exceeded.
 */
export class RateLimitError extends Error {
	/**
	 * The user ID that was rate limited.
	 */
	readonly userId: string;

	/**
	 * The guild ID where the rate limit occurred.
	 */
	readonly guildId: string;

	/**
	 * The time in milliseconds until the rate limit resets.
	 */
	readonly retryAfter: number;

	/**
	 * Creates a new RateLimitError.
	 *
	 * @param userId - The user ID that was rate limited
	 * @param guildId - The guild ID where the rate limit occurred
	 * @param retryAfter - The time in milliseconds until the rate limit resets
	 */
	constructor(userId: string, guildId: string, retryAfter: number) {
		super(
			`Rate limit exceeded for user "${userId}" in guild "${guildId}". Retry after ${retryAfter}ms.`,
		);
		this.name = 'RateLimitError';
		this.userId = userId;
		this.guildId = guildId;
		this.retryAfter = retryAfter;
	}
}
