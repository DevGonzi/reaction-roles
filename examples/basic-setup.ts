/**
 * Basic setup example
 * Shows how to initialize the RoleManager with simple bindings
 */

import { Client, GatewayIntentBits } from 'discord.js';
import {
	DiscordRoleManager,
	defineReactionRole,
	defineButtonRole,
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

// Initialize the manager with bindings
const manager = new DiscordRoleManager(client, {
	locale: 'en', // Set language (en, de, fr, es)
	bindings: [
		// Reaction role: Click emoji to get role
		defineReactionRole({
			messageId: '1234567890123456789',
			emoji: '🎮',
			roleId: '9876543210987654321',
		}),

		// Button role: Click button to get role
		defineButtonRole({
			messageId: '1234567890123456789',
			customId: 'get-notifications',
			roleId: '1111111111111111111',
		}),
	],
});

// Start listening for reactions and button clicks
manager.start();

// Clean up on shutdown
client.on('ready', () => {
	console.log(`✅ Logged in as ${client.user?.tag}`);
	console.log(`✅ RoleManager is listening for reactions and buttons`);
});

client.login(process.env.DISCORD_TOKEN);
