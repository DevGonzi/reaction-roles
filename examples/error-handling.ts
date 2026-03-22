/**
 * Error handling example
 * Shows how to handle errors and edge cases
 */

import { Client, GatewayIntentBits } from 'discord.js';
import {
	DiscordRoleManager,
	defineButtonRole,
	InvalidIdError,
	InvalidBindingError,
} from '@devgonzi/reaction-roles';

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.DirectMessages,
	],
});

const manager = new DiscordRoleManager(client, {
	locale: 'en',
	bindings: [
		defineButtonRole({
			messageId: '1234567890123456789',
			customId: 'test-button',
			roleId: '9876543210987654321',
		}),
	],
	// Custom error handler
	onError: async (error, context) => {
		console.error(`❌ Error in ${context.source}:`, error);

		// Log to error channel
		if (context.interaction) {
			try {
				// User gets ephemeral error message
				if (!context.interaction.replied) {
					await context.interaction.reply({
						content: '❌ An error occurred while processing your request.',
						ephemeral: true,
					});
				}
			} catch (err) {
				console.error('Failed to send error message:', err);
			}
		}

		// Send alert to admins
		const guild = client.guilds.cache.get(context.interaction?.guildId || '');
		const adminChannel = guild?.channels.cache.find((ch) =>
			ch.name?.includes('admin'),
		);

		if (adminChannel && adminChannel.isTextBased()) {
			await adminChannel.send(`🚨 Role binding error: ${error}`).catch(() => {});
		}
	},
});

manager.start();

// Example: Validation errors
client.on('ready', async () => {
	console.log(`✅ Logged in as ${client.user?.tag}`);

	// These would throw errors (don't run - just examples):
	try {
		// Invalid Discord ID
		manager.addBindings([
			defineButtonRole({
				messageId: 'not-a-valid-id', // ❌ Will throw InvalidIdError
				customId: 'test',
				roleId: '1234567890123456789',
			}),
		]);
	} catch (error) {
		if (error instanceof InvalidIdError) {
			console.error(`Invalid ID in field: ${error.field}`);
		}
	}

	try {
		// Missing required field
		manager.addBindings([
			defineButtonRole({
				messageId: '1234567890123456789',
				customId: 'test',
				// ❌ roleId is missing - will throw InvalidBindingError
			} as any),
		]);
	} catch (error) {
		if (error instanceof InvalidBindingError) {
			console.error(`Invalid binding: ${error.message}`);
		}
	}
});

client.login(process.env.DISCORD_TOKEN);
