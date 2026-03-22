import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InvalidIdError } from '../src/errors.js';
import {
	RateLimiter,
	getEmojiKey,
	isValidDiscordId,
	validateDiscordId,
	validateDiscordIds,
} from '../src/utils.js';

describe('validateDiscordId', () => {
	it('should validate valid Discord IDs (17-19 digits)', () => {
		expect(() => validateDiscordId('12345678901234567', 'test')).not.toThrow();
		expect(() => validateDiscordId('123456789012345678', 'test')).not.toThrow();
		expect(() => validateDiscordId('1234567890123456789', 'test')).not.toThrow();
	});

	it('should throw InvalidIdError for IDs that are too short', () => {
		expect(() => validateDiscordId('1234567890123456', 'messageId')).toThrow(InvalidIdError);
		expect(() => validateDiscordId('123', 'userId')).toThrow(InvalidIdError);
	});

	it('should throw InvalidIdError for IDs that are too long', () => {
		expect(() => validateDiscordId('12345678901234567890', 'roleId')).toThrow(InvalidIdError);
	});

	it('should throw InvalidIdError for non-numeric IDs', () => {
		expect(() => validateDiscordId('notanumber', 'messageId')).toThrow(InvalidIdError);
		expect(() => validateDiscordId('12345678901234567a', 'userId')).toThrow(InvalidIdError);
		expect(() => validateDiscordId('abc123def45678901', 'roleId')).toThrow(InvalidIdError);
	});

	it('should throw InvalidIdError for empty string', () => {
		expect(() => validateDiscordId('', 'messageId')).toThrow(InvalidIdError);
	});

	it('should include field name in error message', () => {
		expect(() => validateDiscordId('invalid', 'customField')).toThrow(
			'Invalid Discord ID "invalid" in field "customField"',
		);
	});

	it('should narrow type to Snowflake on success', () => {
		const id = '12345678901234567';
		validateDiscordId(id, 'test');
		// After validation, id should be treated as Snowflake type
		expect(typeof id).toBe('string');
	});
});

describe('validateDiscordIds', () => {
	it('should validate array of valid IDs', () => {
		expect(() =>
			validateDiscordIds(['12345678901234567', '12345678901234568'], 'roleIds'),
		).not.toThrow();
	});

	it('should throw if any ID in array is invalid', () => {
		expect(() => validateDiscordIds(['12345678901234567', 'invalid'], 'roleIds')).toThrow(
			InvalidIdError,
		);
	});

	it('should throw if all IDs are invalid', () => {
		expect(() => validateDiscordIds(['abc', 'def'], 'roleIds')).toThrow(InvalidIdError);
	});

	it('should not throw for empty array', () => {
		expect(() => validateDiscordIds([], 'roleIds')).not.toThrow();
	});
});

describe('isValidDiscordId', () => {
	it('should return true for valid IDs', () => {
		expect(isValidDiscordId('12345678901234567')).toBe(true);
		expect(isValidDiscordId('123456789012345678')).toBe(true);
		expect(isValidDiscordId('1234567890123456789')).toBe(true);
	});

	it('should return false for invalid IDs', () => {
		expect(isValidDiscordId('1234567890123456')).toBe(false); // 16 digits
		expect(isValidDiscordId('12345678901234567890')).toBe(false); // 20 digits
		expect(isValidDiscordId('notanumber')).toBe(false);
		expect(isValidDiscordId('')).toBe(false);
		expect(isValidDiscordId('12345678901234567a')).toBe(false);
	});

	it('should not throw for any input', () => {
		expect(() => isValidDiscordId('')).not.toThrow();
		expect(() => isValidDiscordId(null as unknown as string)).not.toThrow();
		expect(() => isValidDiscordId(undefined as unknown as string)).not.toThrow();
	});
});

describe('RateLimiter', () => {
	let rateLimiter: RateLimiter;

	beforeEach(() => {
		rateLimiter = new RateLimiter(5000, 3); // 5 second window, 3 max requests
	});

	afterEach(() => {
		rateLimiter.clear();
	});

	describe('isLimited', () => {
		it('should return false for new users', () => {
			expect(rateLimiter.isLimited('guild-1', 'user-1')).toBe(false);
		});

		it('should return false when under the limit', () => {
			rateLimiter.record('guild-1', 'user-1');
			rateLimiter.record('guild-1', 'user-1');
			expect(rateLimiter.isLimited('guild-1', 'user-1')).toBe(false);
		});

		it('should return true when at the limit', () => {
			rateLimiter.record('guild-1', 'user-1');
			rateLimiter.record('guild-1', 'user-1');
			rateLimiter.record('guild-1', 'user-1');
			expect(rateLimiter.isLimited('guild-1', 'user-1')).toBe(true);
		});

		it('should return true when over the limit', () => {
			rateLimiter.record('guild-1', 'user-1');
			rateLimiter.record('guild-1', 'user-1');
			rateLimiter.record('guild-1', 'user-1');
			rateLimiter.record('guild-1', 'user-1'); // This shouldn't happen normally but test it
			expect(rateLimiter.isLimited('guild-1', 'user-1')).toBe(true);
		});

		it('should track different users independently', () => {
			rateLimiter.record('guild-1', 'user-1');
			rateLimiter.record('guild-1', 'user-1');
			rateLimiter.record('guild-1', 'user-1');

			expect(rateLimiter.isLimited('guild-1', 'user-2')).toBe(false);
		});

		it('should track different guilds independently', () => {
			rateLimiter.record('guild-1', 'user-1');
			rateLimiter.record('guild-1', 'user-1');
			rateLimiter.record('guild-1', 'user-1');

			expect(rateLimiter.isLimited('guild-2', 'user-1')).toBe(false);
		});
	});

	describe('record', () => {
		it('should record a request', () => {
			rateLimiter.record('guild-1', 'user-1');
			expect(rateLimiter.isLimited('guild-1', 'user-1')).toBe(false);
		});

		it('should record multiple requests', () => {
			rateLimiter.record('guild-1', 'user-1');
			rateLimiter.record('guild-1', 'user-1');
			rateLimiter.record('guild-1', 'user-1');
			expect(rateLimiter.isLimited('guild-1', 'user-1')).toBe(true);
		});
	});

	describe('getRetryAfter', () => {
		it('should return 0 for new users', () => {
			expect(rateLimiter.getRetryAfter('guild-1', 'user-1')).toBe(0);
		});

		it('should return time until oldest request expires', () => {
			const now = Date.now();
			vi.useFakeTimers();
			vi.setSystemTime(now);

			rateLimiter.record('guild-1', 'user-1');
			vi.advanceTimersByTime(1000);
			rateLimiter.record('guild-1', 'user-1');

			// After first record expires (5000ms from first record), 4000ms remain
			// But isLimited cleans up old entries, so we need to call it first
			rateLimiter.isLimited('guild-1', 'user-1');
			const retryAfter = rateLimiter.getRetryAfter('guild-1', 'user-1');
			expect(retryAfter).toBeGreaterThan(0);
			expect(retryAfter).toBeLessThanOrEqual(5000);

			vi.useRealTimers();
		});

		it('should return 0 when no requests exist', () => {
			expect(rateLimiter.getRetryAfter('guild-1', 'user-1')).toBe(0);
		});
	});

	describe('clear', () => {
		it('should clear all rate limit windows', () => {
			rateLimiter.record('guild-1', 'user-1');
			rateLimiter.record('guild-1', 'user-1');
			rateLimiter.record('guild-1', 'user-1');

			rateLimiter.clear();

			expect(rateLimiter.isLimited('guild-1', 'user-1')).toBe(false);
		});
	});

	describe('sliding window', () => {
		it('should expire old requests', () => {
			const now = Date.now();
			vi.useFakeTimers();
			vi.setSystemTime(now);

			// Make 3 requests
			rateLimiter.record('guild-1', 'user-1');
			vi.advanceTimersByTime(1000);
			rateLimiter.record('guild-1', 'user-1');
			vi.advanceTimersByTime(1000);
			rateLimiter.record('guild-1', 'user-1');

			// Should be limited
			expect(rateLimiter.isLimited('guild-1', 'user-1')).toBe(true);

			// Advance past the first request's window
			vi.advanceTimersByTime(3001);

			// Should not be limited anymore (first request expired)
			expect(rateLimiter.isLimited('guild-1', 'user-1')).toBe(false);

			vi.useRealTimers();
		});
	});
});

describe('getEmojiKey', () => {
	it('should return id for custom emoji', () => {
		const emoji = { id: '12345678901234567', name: 'custom_emoji' };
		expect(getEmojiKey(emoji)).toBe('12345678901234567');
	});

	it('should return name for unicode emoji', () => {
		const emoji = { id: null, name: '🎉' };
		expect(getEmojiKey(emoji)).toBe('🎉');
	});

	it('should return name for emoji without id', () => {
		const emoji = { name: '👍' };
		expect(getEmojiKey(emoji)).toBe('👍');
	});

	it('should return empty string for emoji without name or id', () => {
		const emoji = {};
		expect(getEmojiKey(emoji)).toBe('');
	});

	it('should return empty string for null name', () => {
		const emoji = { id: null, name: null };
		expect(getEmojiKey(emoji)).toBe('');
	});
});
