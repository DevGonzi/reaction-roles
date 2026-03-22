/**
 * Advanced modes example
 * Demonstrates different role assignment modes (toggle, add, remove, once)
 */

import { Client, GatewayIntentBits } from 'discord.js';
import { DiscordRoleManager, defineButtonRole } from '@devgonzi/reaction-roles';

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
		// Mode: toggle (default)
		// Click once = add role, click again = remove role
		defineButtonRole({
			messageId: '1234567890123456789',
			customId: 'toggle-notifications',
			roleId: '1111111111111111111',
			mode: 'toggle', // User can toggle on/off
		}),

		// Mode: add (always adds, never removes)
		// User can click multiple times, role stays
		defineButtonRole({
			messageId: '1234567890123456789',
			customId: 'get-member-role',
			roleId: '2222222222222222222',
			mode: 'add', // User gets role once, can't remove via button
		}),

		// Mode: remove (always removes, never adds)
		// Useful for opt-out buttons
		defineButtonRole({
			messageId: '1234567890123456789',
			customId: 'leave-announcements',
			roleId: '3333333333333333333',
			mode: 'remove', // User can remove role
		}),

		// Mode: once (add role once, permanent)
		// User can click once to get role, button becomes inactive for them
		defineButtonRole({
			messageId: '1234567890123456789',
			customId: 'verify-user',
			roleId: '4444444444444444444',
			mode: 'once', // User gets role once, can't remove
		}),

		// Multiple roles at once
		defineButtonRole({
			messageId: '1234567890123456789',
			customId: 'get-gamer-package',
			roleIds: ['5555555555555555555', '6666666666666666666'], // 2 roles!
			mode: 'add',
		}),
	],
});

manager.start();

client.on('ready', () => {
	console.log(`✅ Logged in as ${client.user?.tag}`);
	console.log('✅ Available modes:');
	console.log('   toggle: add/remove on each click');
	console.log('   add: always gives role');
	console.log('   remove: removes role');
	console.log('   once: gives role once (permanent)');
});

client.login(process.env.DISCORD_TOKEN);
