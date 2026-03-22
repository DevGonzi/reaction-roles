import type { Snowflake } from 'discord.js';
import { InvalidIdError } from './errors.js';

/**
 * Regular expression for validating Discord snowflake IDs.
 * Discord IDs are 17-19 digit numbers.
 */
const DISCORD_ID_REGEX = /^\d{17,19}$/;

/**
 * Validates that a string is a valid Discord snowflake ID.
 *
 * @param id - The ID to validate
 * @param field - The field name for error reporting
 * @throws {InvalidIdError} If the ID is invalid
 */
export function validateDiscordId(id: string, field: string): asserts id is Snowflake {
	if (!DISCORD_ID_REGEX.test(id)) {
		throw new InvalidIdError(id, field);
	}
}

/**
 * Validates an array of Discord IDs.
 *
 * @param ids - The IDs to validate
 * @param field - The field name for error reporting
 * @throws {InvalidIdError} If any ID is invalid
 */
export function validateDiscordIds(ids: readonly string[], field: string): void {
	for (const id of ids) {
		validateDiscordId(id, field);
	}
}

/**
 * Checks if a string is a valid Discord snowflake ID without throwing.
 *
 * @param id - The ID to check
 * @returns True if the ID is valid
 */
export function isValidDiscordId(id: string): boolean {
	return DISCORD_ID_REGEX.test(id);
}

/**
 * Rate limiter for per-guild-per-user operations.
 * Uses a sliding window approach.
 */
export class RateLimiter {
	private readonly windows = new Map<string, number[]>();
	private readonly windowMs: number;
	private readonly maxRequests: number;

	/**
	 * Creates a new RateLimiter.
	 *
	 * @param windowMs - The time window in milliseconds
	 * @param maxRequests - The maximum number of requests allowed in the window
	 */
	constructor(windowMs: number, maxRequests: number) {
		this.windowMs = windowMs;
		this.maxRequests = maxRequests;
	}

	/**
	 * Generates a unique key for a guild-user pair.
	 *
	 * @param guildId - The guild ID
	 * @param userId - The user ID
	 * @returns The unique key
	 */
	private getKey(guildId: string, userId: string): string {
		return `${guildId}:${userId}`;
	}

	/**
	 * Checks if a user is rate limited.
	 *
	 * @param guildId - The guild ID
	 * @param userId - The user ID
	 * @returns True if the user is rate limited
	 */
	isLimited(guildId: string, userId: string): boolean {
		const key = this.getKey(guildId, userId);
		const now = Date.now();
		const window = this.windows.get(key);

		if (!window) {
			return false;
		}

		// Remove timestamps outside the window
		const valid = window.filter((timestamp) => now - timestamp < this.windowMs);
		this.windows.set(key, valid);

		return valid.length >= this.maxRequests;
	}

	/**
	 * Gets the time in milliseconds until the rate limit resets.
	 *
	 * @param guildId - The guild ID
	 * @param userId - The user ID
	 * @returns The time in milliseconds until the rate limit resets, or 0 if not limited
	 */
	getRetryAfter(guildId: string, userId: string): number {
		const key = this.getKey(guildId, userId);
		const window = this.windows.get(key);

		if (!window || window.length === 0) {
			return 0;
		}

		const now = Date.now();
		const oldest = window[0];
		const retryAfter = this.windowMs - (now - oldest);

		return Math.max(0, retryAfter);
	}

	/**
	 * Records a request attempt.
	 *
	 * @param guildId - The guild ID
	 * @param userId - The user ID
	 */
	record(guildId: string, userId: string): void {
		const key = this.getKey(guildId, userId);
		const now = Date.now();

		const window = this.windows.get(key) ?? [];
		window.push(now);
		this.windows.set(key, window);
	}

	/**
	 * Clears all rate limit windows.
	 */
	clear(): void {
		this.windows.clear();
	}
}

/**
 * Gets the emoji key for a reaction.
 * Handles both unicode emojis and custom emojis.
 *
 * @param emoji - The emoji to get the key for
 * @returns The emoji key
 */
export function getEmojiKey(emoji: { name?: string | null; id?: string | null }): string {
	// Custom emoji
	if (emoji.id) {
		return emoji.id;
	}
	// Unicode emoji
	return emoji.name ?? '';
}
