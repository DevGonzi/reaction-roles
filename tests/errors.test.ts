import { describe, expect, it } from 'vitest';
import {
	DuplicateBindingError,
	InvalidBindingError,
	InvalidIdError,
	ManagerStateError,
	RateLimitError,
} from '../src/errors.js';

describe('Errors', () => {
	describe('InvalidIdError', () => {
		it('should create error with correct message', () => {
			const error = new InvalidIdError('abc123', 'messageId');
			expect(error.message).toBe(
				'Invalid Discord ID "abc123" in field "messageId". IDs must be 17-19 digits.',
			);
			expect(error.name).toBe('InvalidIdError');
		});

		it('should store the invalid id', () => {
			const error = new InvalidIdError('invalid', 'userId');
			expect(error.id).toBe('invalid');
			expect(error.field).toBe('userId');
		});

		it('should be instanceof Error', () => {
			const error = new InvalidIdError('test', 'field');
			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(InvalidIdError);
		});
	});

	describe('InvalidBindingError', () => {
		it('should create error with custom message', () => {
			const error = new InvalidBindingError('Emoji is required', 'emoji');
			expect(error.message).toBe('Emoji is required');
			expect(error.name).toBe('InvalidBindingError');
		});

		it('should store the field name', () => {
			const error = new InvalidBindingError('Invalid mode', 'mode');
			expect(error.field).toBe('mode');
		});

		it('should be instanceof Error', () => {
			const error = new InvalidBindingError('Test', 'field');
			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(InvalidBindingError);
		});
	});

	describe('DuplicateBindingError', () => {
		it('should create error with correct message', () => {
			const error = new DuplicateBindingError('12345678901234567', '🎉');
			expect(error.message).toBe(
				'Duplicate binding for message "12345678901234567" with key "🎉".',
			);
			expect(error.name).toBe('DuplicateBindingError');
		});

		it('should store messageId and key', () => {
			const error = new DuplicateBindingError('msg-123', 'custom-id');
			expect(error.messageId).toBe('msg-123');
			expect(error.key).toBe('custom-id');
		});

		it('should be instanceof Error', () => {
			const error = new DuplicateBindingError('msg', 'key');
			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(DuplicateBindingError);
		});
	});

	describe('ManagerStateError', () => {
		it('should create error with custom message', () => {
			const error = new ManagerStateError('Manager is already started');
			expect(error.message).toBe('Manager is already started');
			expect(error.name).toBe('ManagerStateError');
		});

		it('should be instanceof Error', () => {
			const error = new ManagerStateError('Test message');
			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(ManagerStateError);
		});
	});

	describe('RateLimitError', () => {
		it('should create error with correct message', () => {
			const error = new RateLimitError('user-123', 'guild-456', 5000);
			expect(error.message).toBe(
				'Rate limit exceeded for user "user-123" in guild "guild-456". Retry after 5000ms.',
			);
			expect(error.name).toBe('RateLimitError');
		});

		it('should store userId, guildId, and retryAfter', () => {
			const error = new RateLimitError('user-1', 'guild-1', 3000);
			expect(error.userId).toBe('user-1');
			expect(error.guildId).toBe('guild-1');
			expect(error.retryAfter).toBe(3000);
		});

		it('should be instanceof Error', () => {
			const error = new RateLimitError('user', 'guild', 1000);
			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(RateLimitError);
		});
	});
});
