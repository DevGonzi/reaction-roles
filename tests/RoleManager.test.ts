import { Events } from 'discord.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DiscordRoleManager, defineButtonRole, defineReactionRole } from '../src/RoleManager.js';
import {
	DuplicateBindingError,
	InvalidBindingError,
	InvalidIdError,
	ManagerStateError,
} from '../src/errors.js';

// Mock discord.js Events
vi.mock('discord.js', async () => {
	const actual = await vi.importActual('discord.js');
	return {
		...actual,
		Events: {
			MessageReactionAdd: 'messageReactionAdd',
			MessageReactionRemove: 'messageReactionRemove',
			InteractionCreate: 'interactionCreate',
		},
	};
});

// Helper to create mock member
function createMockMember(overrides = {}) {
	const roleCache = new Map();
	return {
		id: '12345678901234569',
		user: { id: '12345678901234569' },
		roles: {
			cache: roleCache,
			add: vi.fn().mockResolvedValue(undefined),
			remove: vi.fn().mockResolvedValue(undefined),
		},
		...overrides,
	};
}

// Helper to create mock reaction
function createMockReaction(overrides = {}) {
	return {
		partial: false,
		emoji: { name: '🎉', id: null },
		message: {
			id: '12345678901234567',
			guild: {
				id: '12345678901234568',
				members: {
					cache: new Map(),
					fetch: vi.fn(),
				},
			},
		},
		users: {
			remove: vi.fn().mockResolvedValue(undefined),
		},
		...overrides,
	};
}

// Helper to create mock user
function createMockUser(overrides = {}) {
	return {
		id: '12345678901234569',
		bot: false,
		partial: false,
		fetch: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};
}

// Helper to create mock button interaction with proper deferred state handling
function createMockButtonInteraction(overrides = {}) {
	const interaction: {
		isButton: ReturnType<typeof vi.fn>;
		isRepliable: ReturnType<typeof vi.fn>;
		customId: string;
		message: { id: string };
		user: { id: string };
		guild: { id: string; members: { cache: Map<string, unknown> } } | null;
		deferred: boolean;
		replied: boolean;
		deferReply: ReturnType<typeof vi.fn>;
		reply: ReturnType<typeof vi.fn>;
		editReply: ReturnType<typeof vi.fn>;
	} = {
		isButton: vi.fn().mockReturnValue(true),
		isRepliable: vi.fn().mockReturnValue(true),
		customId: 'role-btn-1',
		message: { id: '12345678901234567' },
		user: { id: '12345678901234569' },
		guild: {
			id: '12345678901234568',
			members: {
				cache: new Map(),
			},
		},
		deferred: false,
		replied: false,
		deferReply: vi.fn().mockImplementation(async () => {
			interaction.deferred = true;
		}),
		reply: vi.fn().mockResolvedValue(undefined),
		editReply: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};

	return interaction;
}

describe('DiscordRoleManager', () => {
	let mockClient: {
		on: ReturnType<typeof vi.fn>;
		off: ReturnType<typeof vi.fn>;
	};
	let manager: DiscordRoleManager;

	beforeEach(() => {
		mockClient = {
			on: vi.fn(),
			off: vi.fn(),
		};
		manager = new DiscordRoleManager(mockClient as unknown as import('discord.js').Client);
	});

	afterEach(() => {
		manager.destroy();
		vi.clearAllMocks();
	});

	describe('constructor', () => {
		it('should create manager with client', () => {
			expect(manager).toBeInstanceOf(DiscordRoleManager);
		});

		it('should accept bindings in options', () => {
			const bindings = [
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234568',
				},
			];
			const managerWithBindings = new DiscordRoleManager(
				mockClient as unknown as import('discord.js').Client,
				{ bindings },
			);
			expect(managerWithBindings.getBindings()).toHaveLength(1);
		});

		it('should accept custom error handler', () => {
			const errorHandler = vi.fn();
			const managerWithHandler = new DiscordRoleManager(
				mockClient as unknown as import('discord.js').Client,
				{ onError: errorHandler },
			);
			expect(managerWithHandler).toBeInstanceOf(DiscordRoleManager);
		});

		it('should use default error handler when not provided', () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const managerWithDefault = new DiscordRoleManager(
				mockClient as unknown as import('discord.js').Client,
			);
			// The default handler is bound internally, we can verify it exists
			expect(managerWithDefault).toBeInstanceOf(DiscordRoleManager);
			consoleSpy.mockRestore();
		});
	});

	describe('start()', () => {
		it('should attach event listeners', () => {
			manager.start();
			expect(mockClient.on).toHaveBeenCalledTimes(3);
			expect(mockClient.on).toHaveBeenCalledWith('messageReactionAdd', expect.any(Function));
			expect(mockClient.on).toHaveBeenCalledWith('messageReactionRemove', expect.any(Function));
			expect(mockClient.on).toHaveBeenCalledWith('interactionCreate', expect.any(Function));
		});

		it('should return this for chaining', () => {
			expect(manager.start()).toBe(manager);
		});

		it('should throw if already started', () => {
			manager.start();
			expect(() => manager.start()).toThrow(ManagerStateError);
			expect(() => manager.start()).toThrow('Manager is already started');
		});
	});

	describe('stop()', () => {
		it('should detach event listeners', () => {
			manager.start();
			manager.stop();
			expect(mockClient.off).toHaveBeenCalledTimes(3);
			expect(mockClient.off).toHaveBeenCalledWith('messageReactionAdd', expect.any(Function));
			expect(mockClient.off).toHaveBeenCalledWith('messageReactionRemove', expect.any(Function));
			expect(mockClient.off).toHaveBeenCalledWith('interactionCreate', expect.any(Function));
		});

		it('should return this for chaining', () => {
			manager.start();
			expect(manager.stop()).toBe(manager);
		});

		it('should throw if not started', () => {
			expect(() => manager.stop()).toThrow(ManagerStateError);
			expect(() => manager.stop()).toThrow('Manager is not started');
		});
	});

	describe('setBindings()', () => {
		it('should set reaction bindings', () => {
			const bindings = [
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234568',
				},
			];
			manager.setBindings(bindings);
			expect(manager.getBindings()).toHaveLength(1);
		});

		it('should set button bindings', () => {
			const bindings = [
				{
					type: 'button' as const,
					messageId: '12345678901234567',
					customId: 'role-btn-1',
					roleId: '12345678901234568',
				},
			];
			manager.setBindings(bindings);
			expect(manager.getBindings()).toHaveLength(1);
		});

		it('should clear existing bindings', () => {
			manager.setBindings([
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234568',
				},
			]);
			manager.setBindings([
				{
					type: 'button' as const,
					messageId: '12345678901234569',
					customId: 'btn-1',
					roleId: '12345678901234570',
				},
			]);
			expect(manager.getBindings()).toHaveLength(1);
		});

		it('should throw for duplicate bindings', () => {
			const bindings = [
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234568',
				},
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234569',
				},
			];
			expect(() => manager.setBindings(bindings)).toThrow(DuplicateBindingError);
		});

		it('should throw for invalid messageId', () => {
			const bindings = [
				{
					type: 'reaction' as const,
					messageId: 'invalid',
					emoji: '🎉',
					roleId: '12345678901234568',
				},
			];
			expect(() => manager.setBindings(bindings)).toThrow(InvalidIdError);
		});

		it('should throw for missing emoji in reaction binding', () => {
			const bindings = [
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					roleId: '12345678901234568',
				} as { type: 'reaction'; messageId: string; emoji: string; roleId: string },
			];
			bindings[0].emoji = '' as string;
			expect(() => manager.setBindings(bindings)).toThrow(InvalidBindingError);
		});

		it('should throw for missing customId in button binding', () => {
			const bindings = [
				{
					type: 'button' as const,
					messageId: '12345678901234567',
					roleId: '12345678901234568',
				} as { type: 'button'; messageId: string; customId: string; roleId: string },
			];
			bindings[0].customId = '' as string;
			expect(() => manager.setBindings(bindings)).toThrow(InvalidBindingError);
		});

		it('should throw for missing roleId and roleIds', () => {
			const bindings = [
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
				},
			];
			expect(() => manager.setBindings(bindings)).toThrow(InvalidBindingError);
			expect(() => manager.setBindings(bindings)).toThrow(
				'At least one roleId or roleIds must be provided',
			);
		});

		it('should throw for invalid mode', () => {
			const bindings = [
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234568',
					mode: 'invalid' as unknown as 'toggle',
				},
			];
			expect(() => manager.setBindings(bindings)).toThrow(InvalidBindingError);
		});

		it('should return this for chaining', () => {
			const result = manager.setBindings([]);
			expect(result).toBe(manager);
		});

		it('should normalize roleIds from single roleId', () => {
			manager.setBindings([
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234568',
				},
			]);
			const bindings = manager.getBindings();
			expect(bindings[0].roleIds).toEqual(['12345678901234568']);
		});

		it('should normalize roleIds from roleIds array', () => {
			manager.setBindings([
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleIds: ['12345678901234568', '12345678901234569'],
				},
			]);
			const bindings = manager.getBindings();
			expect(bindings[0].roleIds).toEqual(['12345678901234568', '12345678901234569']);
		});

		it('should combine roleId and roleIds', () => {
			manager.setBindings([
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234568',
					roleIds: ['12345678901234569', '12345678901234570'],
				},
			]);
			const bindings = manager.getBindings();
			expect(bindings[0].roleIds).toEqual([
				'12345678901234568',
				'12345678901234569',
				'12345678901234570',
			]);
		});

		it('should default mode to toggle', () => {
			manager.setBindings([
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234568',
				},
			]);
			const bindings = manager.getBindings();
			expect(bindings[0].mode).toBe('toggle');
		});
	});

	describe('addBindings()', () => {
		it('should add bindings to existing set', () => {
			manager.setBindings([
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234568',
				},
			]);
			manager.addBindings([
				{
					type: 'button' as const,
					messageId: '12345678901234569',
					customId: 'btn-1',
					roleId: '12345678901234570',
				},
			]);
			expect(manager.getBindings()).toHaveLength(2);
		});

		it('should throw for duplicates with existing bindings', () => {
			manager.setBindings([
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234568',
				},
			]);
			expect(() =>
				manager.addBindings([
					{
						type: 'reaction' as const,
						messageId: '12345678901234567',
						emoji: '🎉',
						roleId: '12345678901234569',
					},
				]),
			).toThrow(DuplicateBindingError);
		});

		it('should throw for duplicates within new bindings', () => {
			expect(() =>
				manager.addBindings([
					{
						type: 'reaction' as const,
						messageId: '12345678901234567',
						emoji: '🎉',
						roleId: '12345678901234568',
					},
					{
						type: 'reaction' as const,
						messageId: '12345678901234567',
						emoji: '🎉',
						roleId: '12345678901234569',
					},
				]),
			).toThrow(DuplicateBindingError);
		});

		it('should return this for chaining', () => {
			const result = manager.addBindings([]);
			expect(result).toBe(manager);
		});

		it('should do nothing for empty array', () => {
			manager.setBindings([
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234568',
				},
			]);
			manager.addBindings([]);
			expect(manager.getBindings()).toHaveLength(1);
		});
	});

	describe('getBindings()', () => {
		it('should return copy of bindings', () => {
			manager.setBindings([
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234568',
				},
			]);
			const bindings = manager.getBindings();
			bindings[0].mode = 'add' as never;
			expect(manager.getBindings()[0].mode).toBe('toggle');
		});
	});

	describe('removeBindingsForMessage()', () => {
		it('should remove all bindings for a message', () => {
			manager.setBindings([
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234568',
				},
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '👍',
					roleId: '12345678901234569',
				},
				{
					type: 'button' as const,
					messageId: '12345678901234570',
					customId: 'btn-1',
					roleId: '12345678901234571',
				},
			]);
			const removed = manager.removeBindingsForMessage('12345678901234567');
			expect(removed).toHaveLength(2);
			expect(manager.getBindings()).toHaveLength(1);
		});

		it('should return empty array if no bindings found', () => {
			const removed = manager.removeBindingsForMessage('12345678901234567');
			expect(removed).toEqual([]);
		});

		it('should throw for invalid messageId', () => {
			expect(() => manager.removeBindingsForMessage('invalid')).toThrow(InvalidIdError);
		});

		it('should return normalized bindings', () => {
			manager.setBindings([
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234568',
				},
			]);
			const removed = manager.removeBindingsForMessage('12345678901234567');
			expect(removed[0]).toHaveProperty('type', 'reaction');
			expect(removed[0]).toHaveProperty('emoji', '🎉');
		});
	});

	describe('destroy()', () => {
		it('should stop manager if started', () => {
			manager.start();
			manager.destroy();
			expect(mockClient.off).toHaveBeenCalledTimes(3);
		});

		it('should clear all bindings', () => {
			manager.setBindings([
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234568',
				},
			]);
			manager.destroy();
			expect(manager.getBindings()).toHaveLength(0);
		});

		it('should work if not started', () => {
			expect(() => manager.destroy()).not.toThrow();
		});
	});
});

describe('defineReactionRole', () => {
	it('should create reaction role binding', () => {
		const binding = defineReactionRole({
			messageId: '12345678901234567',
			emoji: '🎉',
			roleId: '12345678901234568',
		});
		expect(binding).toEqual({
			type: 'reaction',
			messageId: '12345678901234567',
			emoji: '🎉',
			roleId: '12345678901234568',
		});
	});

	it('should include optional properties', () => {
		const binding = defineReactionRole({
			messageId: '12345678901234567',
			emoji: '🎉',
			roleIds: ['12345678901234568', '12345678901234569'],
			mode: 'add',
		});
		expect(binding.type).toBe('reaction');
		expect(binding.mode).toBe('add');
		expect(binding.roleIds).toEqual(['12345678901234568', '12345678901234569']);
	});
});

describe('defineButtonRole', () => {
	it('should create button role binding', () => {
		const binding = defineButtonRole({
			messageId: '12345678901234567',
			customId: 'role-btn-1',
			roleId: '12345678901234568',
		});
		expect(binding).toEqual({
			type: 'button',
			messageId: '12345678901234567',
			customId: 'role-btn-1',
			roleId: '12345678901234568',
		});
	});

	it('should include optional properties', () => {
		const binding = defineButtonRole({
			messageId: '12345678901234567',
			customId: 'role-btn-1',
			roleIds: ['12345678901234568', '12345678901234569'],
			mode: 'remove',
		});
		expect(binding.type).toBe('button');
		expect(binding.mode).toBe('remove');
		expect(binding.customId).toBe('role-btn-1');
	});
});

describe('DiscordRoleManager - Button Handling', () => {
	let mockClient: {
		on: ReturnType<typeof vi.fn>;
		off: ReturnType<typeof vi.fn>;
	};
	let manager: DiscordRoleManager;
	let interactionHandler: ((...args: unknown[]) => Promise<void>) | undefined;

	beforeEach(() => {
		mockClient = {
			on: vi.fn((event, handler) => {
				if (event === Events.InteractionCreate) {
					interactionHandler = handler;
				}
			}),
			off: vi.fn(),
		};
		manager = new DiscordRoleManager(mockClient as unknown as import('discord.js').Client);
	});

	afterEach(() => {
		manager.destroy();
		vi.clearAllMocks();
		vi.useRealTimers();
	});

	describe('handleButtonInteraction', () => {
		it('should ignore non-button interactions', async () => {
			manager.start();

			const interaction = {
				isButton: vi.fn().mockReturnValue(false),
			};

			await interactionHandler(interaction);
			// Should return early
			expect(interaction.isButton).toHaveBeenCalled();
		});

		it('should process button click for toggle mode (add roles)', async () => {
			const member = createMockMember();

			manager.setBindings([
				{
					type: 'button' as const,
					messageId: '12345678901234567',
					customId: 'role-btn-1',
					roleId: '12345678901234570',
					mode: 'toggle',
				},
			]);
			manager.start();

			const interaction = createMockButtonInteraction({
				guild: {
					id: '12345678901234568',
					members: {
						cache: new Map([['12345678901234569', member]]),
					},
				},
			});

			await interactionHandler(interaction);

			expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
			expect(member.roles.add).toHaveBeenCalledWith(['12345678901234570'], expect.any(String));
			expect(interaction.editReply).toHaveBeenCalled();
		});

		it('should process button click for toggle mode (remove roles)', async () => {
			const member = createMockMember();
			// User already has the role
			member.roles.cache.set('12345678901234570', {} as never);

			manager.setBindings([
				{
					type: 'button' as const,
					messageId: '12345678901234567',
					customId: 'role-btn-1',
					roleId: '12345678901234570',
					mode: 'toggle',
				},
			]);
			manager.start();

			const interaction = createMockButtonInteraction({
				guild: {
					id: '12345678901234568',
					members: {
						cache: new Map([['12345678901234569', member]]),
					},
				},
			});

			await interactionHandler(interaction);

			expect(member.roles.remove).toHaveBeenCalledWith(['12345678901234570'], expect.any(String));
			expect(interaction.editReply).toHaveBeenCalled();
		});

		it('should process button click for add mode', async () => {
			const member = createMockMember();

			manager.setBindings([
				{
					type: 'button' as const,
					messageId: '12345678901234567',
					customId: 'role-btn-1',
					roleId: '12345678901234570',
					mode: 'add',
				},
			]);
			manager.start();

			const interaction = createMockButtonInteraction({
				guild: {
					id: '12345678901234568',
					members: {
						cache: new Map([['12345678901234569', member]]),
					},
				},
			});

			await interactionHandler(interaction);

			expect(member.roles.add).toHaveBeenCalledWith(['12345678901234570'], expect.any(String));
		});

		it('should process button click for remove mode', async () => {
			const member = createMockMember();
			member.roles.cache.set('12345678901234570', {} as never);

			manager.setBindings([
				{
					type: 'button' as const,
					messageId: '12345678901234567',
					customId: 'role-btn-1',
					roleId: '12345678901234570',
					mode: 'remove',
				},
			]);
			manager.start();

			const interaction = createMockButtonInteraction({
				guild: {
					id: '12345678901234568',
					members: {
						cache: new Map([['12345678901234569', member]]),
					},
				},
			});

			await interactionHandler(interaction);

			expect(member.roles.remove).toHaveBeenCalledWith(['12345678901234570'], expect.any(String));
		});

		it('should process button click for once mode', async () => {
			const member = createMockMember();

			manager.setBindings([
				{
					type: 'button' as const,
					messageId: '12345678901234567',
					customId: 'role-btn-1',
					roleId: '12345678901234570',
					mode: 'once',
				},
			]);
			manager.start();

			const interaction = createMockButtonInteraction({
				guild: {
					id: '12345678901234568',
					members: {
						cache: new Map([['12345678901234569', member]]),
					},
				},
			});

			await interactionHandler(interaction);

			expect(member.roles.add).toHaveBeenCalledWith(['12345678901234570'], expect.any(String));
		});

		it('should handle multiple roles', async () => {
			const member = createMockMember();

			manager.setBindings([
				{
					type: 'button' as const,
					messageId: '12345678901234567',
					customId: 'role-btn-1',
					roleIds: ['12345678901234570', '12345678901234571'],
					mode: 'toggle',
				},
			]);
			manager.start();

			const interaction = createMockButtonInteraction({
				guild: {
					id: '12345678901234568',
					members: {
						cache: new Map([['12345678901234569', member]]),
					},
				},
			});

			await interactionHandler(interaction);

			expect(member.roles.add).toHaveBeenCalledWith(
				['12345678901234570', '12345678901234571'],
				expect.any(String),
			);
			expect(interaction.editReply).toHaveBeenCalled();
		});

		it('should not process unknown button interactions', async () => {
			manager.setBindings([
				{
					type: 'button' as const,
					messageId: '12345678901234567',
					customId: 'role-btn-1',
					roleId: '12345678901234570',
				},
			]);
			manager.start();

			const interaction = createMockButtonInteraction({
				customId: 'unknown-btn',
				guild: {
					id: '12345678901234568',
					members: {
						cache: new Map(),
					},
				},
			});

			await interactionHandler(interaction);

			// Should not defer or reply for unknown buttons
			expect(interaction.deferReply).not.toHaveBeenCalled();
		});

		it('should handle missing member', async () => {
			manager.setBindings([
				{
					type: 'button' as const,
					messageId: '12345678901234567',
					customId: 'role-btn-1',
					roleId: '12345678901234570',
				},
			]);
			manager.start();

			const interaction = createMockButtonInteraction({
				guild: {
					id: '12345678901234568',
					members: {
						cache: new Map(), // Empty cache
					},
				},
			});

			await interactionHandler(interaction);

			// Should reply with error
			expect(interaction.deferReply).toHaveBeenCalled();
			expect(interaction.editReply).toHaveBeenCalledWith(
				expect.objectContaining({
					content: expect.stringContaining('Member not found'),
				}),
			);
		});

		it('should handle member not in guild', async () => {
			manager.setBindings([
				{
					type: 'button' as const,
					messageId: '12345678901234567',
					customId: 'role-btn-1',
					roleId: '12345678901234570',
				},
			]);
			manager.start();

			const interaction = createMockButtonInteraction({
				guild: null, // No guild
			});

			await interactionHandler(interaction);

			expect(interaction.deferReply).toHaveBeenCalled();
			expect(interaction.editReply).toHaveBeenCalledWith(
				expect.objectContaining({
					content: expect.stringContaining('Member not found'),
				}),
			);
		});

		it('should call onAdd callback after adding roles', async () => {
			const onAdd = vi.fn().mockResolvedValue(undefined);
			const member = createMockMember();

			manager.setBindings([
				{
					type: 'button' as const,
					messageId: '12345678901234567',
					customId: 'role-btn-1',
					roleId: '12345678901234570',
					onAdd,
				},
			]);
			manager.start();

			const interaction = createMockButtonInteraction({
				guild: {
					id: '12345678901234568',
					members: {
						cache: new Map([['12345678901234569', member]]),
					},
				},
			});

			await interactionHandler(interaction);

			expect(onAdd).toHaveBeenCalledWith(
				expect.objectContaining({
					binding: expect.objectContaining({ customId: 'role-btn-1' }),
					member,
					source: 'button',
					userId: '12345678901234569',
					interaction,
				}),
			);
		});

		it('should call onRemove callback after removing roles', async () => {
			const onRemove = vi.fn().mockResolvedValue(undefined);
			const member = createMockMember();
			member.roles.cache.set('12345678901234570', {} as never);

			manager.setBindings([
				{
					type: 'button' as const,
					messageId: '12345678901234567',
					customId: 'role-btn-1',
					roleId: '12345678901234570',
					onRemove,
				},
			]);
			manager.start();

			const interaction = createMockButtonInteraction({
				guild: {
					id: '12345678901234568',
					members: {
						cache: new Map([['12345678901234569', member]]),
					},
				},
			});

			await interactionHandler(interaction);

			expect(onRemove).toHaveBeenCalledWith(
				expect.objectContaining({
					binding: expect.objectContaining({ customId: 'role-btn-1' }),
					member,
					source: 'button',
					userId: '12345678901234569',
					interaction,
				}),
			);
		});
	});
});

describe('DiscordRoleManager - Reaction Handling', () => {
	let mockClient: {
		on: ReturnType<typeof vi.fn>;
		off: ReturnType<typeof vi.fn>;
	};
	let manager: DiscordRoleManager;
	let reactionAddHandler: ((...args: unknown[]) => Promise<void>) | undefined;
	let reactionRemoveHandler: ((...args: unknown[]) => Promise<void>) | undefined;

	beforeEach(() => {
		mockClient = {
			on: vi.fn((event, handler) => {
				if (event === Events.MessageReactionAdd) {
					reactionAddHandler = handler;
				}
				if (event === Events.MessageReactionRemove) {
					reactionRemoveHandler = handler;
				}
			}),
			off: vi.fn(),
		};
		manager = new DiscordRoleManager(mockClient as unknown as import('discord.js').Client);
	});

	afterEach(() => {
		manager.destroy();
		vi.clearAllMocks();
		vi.useRealTimers();
	});

	describe('handleReactionAdd', () => {
		it('should ignore bot reactions', async () => {
			manager.start();
			const botUser = createMockUser({ bot: true });
			const reaction = createMockReaction();

			await reactionAddHandler(reaction, botUser);
			// Should not throw and should return early
			expect(reaction.message.guild.members.fetch).not.toHaveBeenCalled();
		});

		it('should process reaction-add for toggle mode (add roles)', async () => {
			manager.setBindings([
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234570',
					mode: 'toggle',
				},
			]);
			manager.start();

			const member = createMockMember();
			const reaction = createMockReaction({
				message: {
					id: '12345678901234567',
					guild: {
						id: '12345678901234568',
						members: {
							cache: new Map(),
							fetch: vi.fn().mockResolvedValue(member),
						},
					},
				},
			});
			const user = createMockUser();

			await reactionAddHandler(reaction, user);

			// Should add the role
			expect(member.roles.add).toHaveBeenCalledWith(['12345678901234570'], expect.any(String));
		});

		it('should process reaction-add for toggle mode (remove roles)', async () => {
			manager.setBindings([
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234570',
					mode: 'toggle',
				},
			]);
			manager.start();

			const member = createMockMember();
			// User already has the role
			member.roles.cache.set('12345678901234570', {} as never);

			const reaction = createMockReaction({
				message: {
					id: '12345678901234567',
					guild: {
						id: '12345678901234568',
						members: {
							cache: new Map(),
							fetch: vi.fn().mockResolvedValue(member),
						},
					},
				},
			});
			const user = createMockUser();

			await reactionAddHandler(reaction, user);

			// Should remove the role
			expect(member.roles.remove).toHaveBeenCalledWith(['12345678901234570'], expect.any(String));
		});

		it('should process reaction-add for add mode', async () => {
			manager.setBindings([
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234570',
					mode: 'add',
				},
			]);
			manager.start();

			const member = createMockMember();
			const reaction = createMockReaction({
				message: {
					id: '12345678901234567',
					guild: {
						id: '12345678901234568',
						members: {
							cache: new Map(),
							fetch: vi.fn().mockResolvedValue(member),
						},
					},
				},
			});
			const user = createMockUser();

			await reactionAddHandler(reaction, user);

			expect(member.roles.add).toHaveBeenCalledWith(['12345678901234570'], expect.any(String));
		});

		it('should process reaction-add for remove mode', async () => {
			manager.setBindings([
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234570',
					mode: 'remove',
				},
			]);
			manager.start();

			const member = createMockMember();
			// User has the role
			member.roles.cache.set('12345678901234570', {} as never);

			const reaction = createMockReaction({
				message: {
					id: '12345678901234567',
					guild: {
						id: '12345678901234568',
						members: {
							cache: new Map(),
							fetch: vi.fn().mockResolvedValue(member),
						},
					},
				},
			});
			const user = createMockUser();

			await reactionAddHandler(reaction, user);

			expect(member.roles.remove).toHaveBeenCalledWith(['12345678901234570'], expect.any(String));
		});

		it('should process reaction-add for once mode', async () => {
			manager.setBindings([
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234570',
					mode: 'once',
				},
			]);
			manager.start();

			const member = createMockMember();
			const reaction = createMockReaction({
				message: {
					id: '12345678901234567',
					guild: {
						id: '12345678901234568',
						members: {
							cache: new Map(),
							fetch: vi.fn().mockResolvedValue(member),
						},
					},
				},
			});
			const user = createMockUser();

			await reactionAddHandler(reaction, user);

			expect(member.roles.add).toHaveBeenCalledWith(['12345678901234570'], expect.any(String));
		});

		it('should prune reaction when user already has role in add mode', async () => {
			manager.setBindings([
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234570',
					mode: 'add',
				},
			]);
			manager.start();

			const member = createMockMember();
			// User already has the role
			member.roles.cache.set('12345678901234570', {} as never);

			const usersRemove = vi.fn().mockResolvedValue(undefined);
			const reaction = createMockReaction({
				users: { remove: usersRemove },
				message: {
					id: '12345678901234567',
					guild: {
						id: '12345678901234568',
						members: {
							cache: new Map(),
							fetch: vi.fn().mockResolvedValue(member),
						},
					},
				},
			});
			const user = createMockUser();

			await reactionAddHandler(reaction, user);

			// Should remove the reaction
			expect(usersRemove).toHaveBeenCalledWith('12345678901234569');
		});

		it('should prune reaction when user does not have role in remove mode', async () => {
			manager.setBindings([
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234570',
					mode: 'remove',
				},
			]);
			manager.start();

			const member = createMockMember();
			// User does NOT have the role

			const usersRemove = vi.fn().mockResolvedValue(undefined);
			const reaction = createMockReaction({
				users: { remove: usersRemove },
				message: {
					id: '12345678901234567',
					guild: {
						id: '12345678901234568',
						members: {
							cache: new Map(),
							fetch: vi.fn().mockResolvedValue(member),
						},
					},
				},
			});
			const user = createMockUser();

			await reactionAddHandler(reaction, user);

			// Should remove the reaction
			expect(usersRemove).toHaveBeenCalledWith('12345678901234569');
		});

		it('should not process reactions for unknown bindings', async () => {
			manager.setBindings([
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234570',
				},
			]);
			manager.start();

			const fetchMock = vi.fn();
			const reaction = createMockReaction({
				emoji: { name: '👍', id: null }, // Different emoji
				message: {
					id: '12345678901234567',
					guild: {
						id: '12345678901234568',
						members: {
							cache: new Map(),
							fetch: fetchMock,
						},
					},
				},
			});
			const user = createMockUser();

			await reactionAddHandler(reaction, user);

			// Should not fetch member for unknown binding
			expect(fetchMock).not.toHaveBeenCalled();
		});

		it('should handle partial reactions', async () => {
			manager.setBindings([
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234570',
				},
			]);
			manager.start();

			const fullReaction = createMockReaction({
				message: {
					id: '12345678901234567',
					guild: {
						id: '12345678901234568',
						members: {
							cache: new Map(),
							fetch: vi.fn(),
						},
					},
				},
			});

			const partialReaction = {
				partial: true,
				fetch: vi.fn().mockResolvedValue(fullReaction),
				emoji: { name: '🎉', id: null },
				message: {
					id: '12345678901234567',
					guild: {
						id: '12345678901234568',
						members: {
							cache: new Map(),
							fetch: vi.fn(),
						},
					},
				},
			};

			const user = createMockUser();

			await reactionAddHandler(partialReaction, user);

			expect(partialReaction.fetch).toHaveBeenCalled();
		});

		it('should handle partial users', async () => {
			manager.setBindings([
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234570',
				},
			]);
			manager.start();

			const fullUser = createMockUser();
			const partialUser = {
				partial: true,
				fetch: vi.fn().mockResolvedValue(fullUser),
				bot: false,
			};

			const reaction = createMockReaction({
				message: {
					id: '12345678901234567',
					guild: {
						id: '12345678901234568',
						members: {
							cache: new Map(),
							fetch: vi.fn(),
						},
					},
				},
			});

			await reactionAddHandler(reaction, partialUser);

			expect(partialUser.fetch).toHaveBeenCalled();
		});
	});

	describe('handleReactionRemove', () => {
		it('should ignore bot reactions', async () => {
			manager.start();
			const botUser = createMockUser({ bot: true });
			const reaction = createMockReaction();

			await reactionRemoveHandler(reaction, botUser);
			expect(reaction.message.guild.members.fetch).not.toHaveBeenCalled();
		});

		it('should process reaction-remove (typically does nothing for most modes)', async () => {
			manager.setBindings([
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234570',
					mode: 'toggle',
				},
			]);
			manager.start();

			const member = createMockMember();
			const reaction = createMockReaction({
				message: {
					id: '12345678901234567',
					guild: {
						id: '12345678901234568',
						members: {
							cache: new Map(),
							fetch: vi.fn().mockResolvedValue(member),
						},
					},
				},
			});
			const user = createMockUser();

			await reactionRemoveHandler(reaction, user);

			// For reaction-remove, toggle mode adds roles if not present
			expect(member.roles.add).toHaveBeenCalledWith(['12345678901234570'], expect.any(String));
		});
	});
});

describe('DiscordRoleManager - Security Tests', () => {
	let mockClient: {
		on: ReturnType<typeof vi.fn>;
		off: ReturnType<typeof vi.fn>;
	};
	let manager: DiscordRoleManager;
	let reactionAddHandler: ((...args: unknown[]) => Promise<void>) | undefined;
	let interactionHandler: ((...args: unknown[]) => Promise<void>) | undefined;
	let errorHandler: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		errorHandler = vi.fn().mockResolvedValue(undefined);
		mockClient = {
			on: vi.fn((event, handler) => {
				if (event === Events.MessageReactionAdd) {
					reactionAddHandler = handler;
				}
				if (event === Events.InteractionCreate) {
					interactionHandler = handler;
				}
			}),
			off: vi.fn(),
		};
		manager = new DiscordRoleManager(mockClient as unknown as import('discord.js').Client, {
			onError: errorHandler,
		});
	});

	afterEach(() => {
		manager.destroy();
		vi.clearAllMocks();
		vi.useRealTimers();
	});

	describe('Role Hierarchy Escalation Protection', () => {
		it('should handle role assignment failure due to hierarchy (reaction)', async () => {
			manager.setBindings([
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234570',
				},
			]);
			manager.start();

			const member = createMockMember();
			// Simulate hierarchy error when adding role
			const hierarchyError = new Error('Missing Permissions');
			(member.roles.add as ReturnType<typeof vi.fn>).mockRejectedValue(hierarchyError);

			const reaction = createMockReaction({
				message: {
					id: '12345678901234567',
					guild: {
						id: '12345678901234568',
						members: {
							cache: new Map(),
							fetch: vi.fn().mockResolvedValue(member),
						},
					},
				},
			});
			const user = createMockUser();

			await reactionAddHandler(reaction, user);

			// Should attempt to add the role
			expect(member.roles.add).toHaveBeenCalledWith(['12345678901234570'], expect.any(String));
			// Note: For reactions, role assignment errors are silently handled (no error handler called)
			// This is different from buttons which show an error message
		});

		it('should handle role assignment failure due to hierarchy (button)', async () => {
			manager.setBindings([
				{
					type: 'button' as const,
					messageId: '12345678901234567',
					customId: 'role-btn-1',
					roleId: '12345678901234570',
				},
			]);
			manager.start();

			const member = createMockMember();
			// Simulate hierarchy error
			const hierarchyError = new Error('Missing Permissions');
			(member.roles.add as ReturnType<typeof vi.fn>).mockRejectedValue(hierarchyError);

			const interaction = createMockButtonInteraction({
				guild: {
					id: '12345678901234568',
					members: {
						cache: new Map([['12345678901234569', member]]),
					},
				},
			});

			await interactionHandler(interaction);

			// Should attempt to add the role
			expect(member.roles.add).toHaveBeenCalledWith(['12345678901234570'], expect.any(String));
			// Should reply with error message
			expect(interaction.editReply).toHaveBeenCalledWith(
				expect.objectContaining({
					content: expect.stringContaining('error'),
				}),
			);
		});
	});

	describe('Deleted Entities Handling', () => {
		it('should handle deleted message gracefully', async () => {
			manager.setBindings([
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234570',
				},
			]);
			manager.start();

			const member = createMockMember();
			const reaction = createMockReaction({
				message: {
					id: '12345678901234567',
					// No guild property - simulating deleted/unavailable message
					guild: null,
				},
			});
			const user = createMockUser();

			// Should not throw
			await expect(reactionAddHandler(reaction, user)).resolves.not.toThrow();

			// Should not attempt to fetch member or modify roles
			expect(member.roles.add).not.toHaveBeenCalled();
		});
	});

	describe('Invalid Role IDs', () => {
		it('should reject bindings with invalid role IDs in single roleId', () => {
			expect(() =>
				manager.setBindings([
					{
						type: 'reaction' as const,
						messageId: '12345678901234567',
						emoji: '🎉',
						roleId: 'invalid-role-id',
					},
				]),
			).toThrow();
		});

		it('should reject bindings with invalid role IDs in roleIds array', () => {
			expect(() =>
				manager.setBindings([
					{
						type: 'reaction' as const,
						messageId: '12345678901234567',
						emoji: '🎉',
						roleIds: ['12345678901234568', 'invalid'],
					},
				]),
			).toThrow();
		});
	});
});

describe('DiscordRoleManager - Rate Limiting', () => {
	let mockClient: {
		on: ReturnType<typeof vi.fn>;
		off: ReturnType<typeof vi.fn>;
	};
	let manager: DiscordRoleManager;
	let reactionAddHandler: ((...args: unknown[]) => Promise<void>) | undefined;
	let interactionHandler: ((...args: unknown[]) => Promise<void>) | undefined;

	beforeEach(() => {
		mockClient = {
			on: vi.fn((event, handler) => {
				if (event === Events.MessageReactionAdd) {
					reactionAddHandler = handler;
				}
				if (event === Events.InteractionCreate) {
					interactionHandler = handler;
				}
			}),
			off: vi.fn(),
		};
		manager = new DiscordRoleManager(mockClient as unknown as import('discord.js').Client);
	});

	afterEach(() => {
		manager.destroy();
		vi.clearAllMocks();
		vi.useRealTimers();
	});

	describe('reaction rate limiting', () => {
		it('should apply rate limits for reactions', async () => {
			manager.setBindings([
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234570',
				},
			]);
			manager.start();

			// Mock timer to control rate limiting
			const now = Date.now();
			vi.useFakeTimers();
			vi.setSystemTime(now);

			const members: ReturnType<typeof createMockMember>[] = [];

			// Simulate 5 rapid reactions from the same user
			for (let i = 0; i < 5; i++) {
				const member = createMockMember();
				members.push(member);

				const reaction = createMockReaction({
					message: {
						id: '12345678901234567',
						guild: {
							id: '12345678901234568',
							members: {
								cache: new Map(),
								fetch: vi.fn().mockResolvedValue(member),
							},
						},
					},
				});
				const user = createMockUser();

				await reactionAddHandler(reaction, user);

				// Advance time slightly
				vi.advanceTimersByTime(100);
			}

			// First 3 should process (default limit is 3)
			expect(members[0].roles.add).toHaveBeenCalledTimes(1);
			expect(members[1].roles.add).toHaveBeenCalledTimes(1);
			expect(members[2].roles.add).toHaveBeenCalledTimes(1);

			// 4th and 5th should be rate limited (no role changes)
			expect(members[3].roles.add).not.toHaveBeenCalled();
			expect(members[4].roles.add).not.toHaveBeenCalled();

			vi.useRealTimers();
		});
	});

	describe('button rate limiting', () => {
		it('should apply rate limits for buttons and reply with rate limit message', async () => {
			manager.setBindings([
				{
					type: 'button' as const,
					messageId: '12345678901234567',
					customId: 'role-btn-1',
					roleId: '12345678901234570',
				},
			]);
			manager.start();

			const now = Date.now();
			vi.useFakeTimers();
			vi.setSystemTime(now);

			const interactions: {
				deferReply: ReturnType<typeof vi.fn>;
				reply: ReturnType<typeof vi.fn>;
			}[] = [];

			// Simulate 5 rapid button clicks from the same user
			for (let i = 0; i < 5; i++) {
				const member = createMockMember();
				const interaction = createMockButtonInteraction({
					guild: {
						id: '12345678901234568',
						members: {
							cache: new Map([['12345678901234569', member]]),
						},
					},
				});
				interactions.push({ deferReply: interaction.deferReply, reply: interaction.reply });

				await interactionHandler(interaction);
				vi.advanceTimersByTime(100);
			}

			// First 3 should defer and process
			expect(interactions[0].deferReply).toHaveBeenCalled();
			expect(interactions[1].deferReply).toHaveBeenCalled();
			expect(interactions[2].deferReply).toHaveBeenCalled();

			// 4th should reply with rate limit message (not defer)
			expect(interactions[3].deferReply).not.toHaveBeenCalled();
			expect(interactions[3].reply).toHaveBeenCalledWith(
				expect.objectContaining({
					content: expect.stringContaining('wait'),
					ephemeral: true,
				}),
			);

			// 5th should also be rate limited
			expect(interactions[4].deferReply).not.toHaveBeenCalled();

			vi.useRealTimers();
		});
	});
});

describe('DiscordRoleManager - Edge Cases', () => {
	let mockClient: {
		on: ReturnType<typeof vi.fn>;
		off: ReturnType<typeof vi.fn>;
	};
	let manager: DiscordRoleManager;
	let _reactionAddHandler: ((...args: unknown[]) => Promise<void>) | undefined;
	let _reactionRemoveHandler: ((...args: unknown[]) => Promise<void>) | undefined;
	let _interactionHandler: ((...args: unknown[]) => Promise<void>) | undefined;
	let errorHandler: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		errorHandler = vi.fn().mockResolvedValue(undefined);
		mockClient = {
			on: vi.fn((event, handler) => {
				if (event === Events.MessageReactionAdd) {
					_reactionAddHandler = handler;
				}
				if (event === Events.MessageReactionRemove) {
					_reactionRemoveHandler = handler;
				}
				if (event === Events.InteractionCreate) {
					_interactionHandler = handler;
				}
			}),
			off: vi.fn(),
		};
		manager = new DiscordRoleManager(mockClient as unknown as import('discord.js').Client, {
			onError: errorHandler,
		});
	});

	afterEach(() => {
		manager.destroy();
		vi.clearAllMocks();
		vi.useRealTimers();
	});

	describe('Empty Bindings', () => {
		it('should handle empty bindings array in constructor', () => {
			const emptyManager = new DiscordRoleManager(
				mockClient as unknown as import('discord.js').Client,
				{ bindings: [] },
			);
			expect(emptyManager.getBindings()).toHaveLength(0);
			emptyManager.destroy();
		});

		it('should handle empty bindings in setBindings', () => {
			manager.setBindings([
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234568',
				},
			]);
			manager.setBindings([]);
			expect(manager.getBindings()).toHaveLength(0);
		});

		it('should handle empty bindings in addBindings', () => {
			manager.setBindings([
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234568',
				},
			]);
			manager.addBindings([]);
			expect(manager.getBindings()).toHaveLength(1);
		});
	});

	describe('Very Large Binding Lists', () => {
		it('should handle 1000 reaction bindings', () => {
			const bindings = Array.from({ length: 1000 }, (_, i) => ({
				type: 'reaction' as const,
				messageId: `1234567890123456${(i % 10).toString()}`,
				emoji: `emoji-${i}`,
				roleId: `1234567890123456${(i % 10).toString()}`,
			}));

			manager.setBindings(bindings);
			expect(manager.getBindings()).toHaveLength(1000);
		});

		it('should detect duplicates in large binding lists', () => {
			const bindings = Array.from({ length: 1000 }, (_, i) => ({
				type: 'reaction' as const,
				messageId: '12345678901234567',
				emoji: `emoji-${i}`,
				roleId: '12345678901234568',
			}));

			// Add a duplicate at the end
			bindings.push({
				type: 'reaction' as const,
				messageId: '12345678901234567',
				emoji: 'emoji-0',
				roleId: '12345678901234569',
			});

			expect(() => manager.setBindings(bindings)).toThrow(DuplicateBindingError);
		});
	});

	describe('Unicode Emoji Handling', () => {
		it('should handle basic unicode emojis', () => {
			const emojis = ['🎉', '👍', '🔥', '💯', '✨', '🚀', '💪', '🎮', '🎲', '🎯'];

			const bindings = emojis.map((emoji, i) => ({
				type: 'reaction' as const,
				messageId: '12345678901234567',
				emoji,
				roleId: `123456789012345${i.toString().padStart(2, '0')}`,
			}));

			expect(() => manager.setBindings(bindings)).not.toThrow();
			expect(manager.getBindings()).toHaveLength(emojis.length);
		});

		it('should treat same unicode emoji on different messages as different bindings', () => {
			manager.setBindings([
				{
					type: 'reaction',
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234570',
				},
				{
					type: 'reaction',
					messageId: '12345678901234568',
					emoji: '🎉',
					roleId: '12345678901234571',
				},
			]);

			expect(manager.getBindings()).toHaveLength(2);
		});
	});

	describe('Memory Cleanup on Destroy', () => {
		it('should clear all bindings on destroy', () => {
			manager.setBindings([
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234568',
				},
				{
					type: 'button' as const,
					messageId: '12345678901234569',
					customId: 'btn-1',
					roleId: '12345678901234570',
				},
			]);

			expect(manager.getBindings()).toHaveLength(2);
			manager.destroy();
			expect(manager.getBindings()).toHaveLength(0);
		});

		it('should handle destroy when not started', () => {
			manager.setBindings([
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234568',
				},
			]);

			// Should not throw when manager was never started
			expect(() => manager.destroy()).not.toThrow();
			expect(manager.getBindings()).toHaveLength(0);
		});

		it('should handle multiple destroy calls', () => {
			manager.start();
			manager.setBindings([
				{
					type: 'reaction' as const,
					messageId: '12345678901234567',
					emoji: '🎉',
					roleId: '12345678901234568',
				},
			]);

			// Multiple destroys should not throw
			expect(() => {
				manager.destroy();
				manager.destroy();
				manager.destroy();
			}).not.toThrow();
		});
	});
});
