/**
 * i18n (Internationalization) example
 * Shows how to use different languages for user messages
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

// English server
const enManager = new DiscordRoleManager(client, {
	locale: 'en', // English messages
	bindings: [
		defineButtonRole({
			messageId: '1234567890123456789',
			customId: 'get-role',
			roleId: '1111111111111111111',
		}),
	],
});

// German server
const deManager = new DiscordRoleManager(client, {
	locale: 'de', // Deutsch
	bindings: [
		defineButtonRole({
			messageId: '9876543210987654321',
			customId: 'rolle-erhalten',
			roleId: '2222222222222222222',
		}),
	],
});

// French server
const frManager = new DiscordRoleManager(client, {
	locale: 'fr', // Français
	bindings: [
		defineButtonRole({
			messageId: '5555555555555555555',
			customId: 'obtenir-role',
			roleId: '3333333333333333333',
		}),
	],
});

// Spanish server
const esManager = new DiscordRoleManager(client, {
	locale: 'es', // Español
	bindings: [
		defineButtonRole({
			messageId: '7777777777777777777',
			customId: 'obtener-rol',
			roleId: '4444444444444444444',
		}),
	],
});

// Start all managers
enManager.start();
deManager.start();
frManager.start();
esManager.start();

client.on('ready', () => {
	console.log(`✅ Logged in as ${client.user?.tag}`);
	console.log('🌍 Supported languages:');
	console.log('   en - English');
	console.log('   de - Deutsch');
	console.log('   fr - Français');
	console.log('   es - Español');
	console.log(
		'\nUser messages will be in the configured language for each manager!',
	);
});

client.login(process.env.DISCORD_TOKEN);
