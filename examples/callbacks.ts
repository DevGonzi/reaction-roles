/**
 * Callbacks example
 * Shows how to run custom logic when roles are added/removed
 */

import { Client, GatewayIntentBits, ChannelType } from 'discord.js';
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
		// Callback: Send welcome message when role is added
		defineButtonRole({
			messageId: '1234567890123456789',
			customId: 'join-developers',
			roleId: '1111111111111111111',
			mode: 'add',
			onAdd: async (context) => {
				// context contains: binding, member, source, userId, reaction, interaction
				const { member, interaction } = context;

				try {
					// Send DM to user
					await member.user.send(
						`🎉 Welcome to the Developer role, ${member.user.username}!`,
					);

					// Log to mod-channel
					const modChannel = member.guild?.channels.cache.find(
						(ch) => ch.name === 'mod-logs' && ch.type === ChannelType.GuildText,
					);
					if (modChannel && modChannel.isTextBased()) {
						await modChannel.send(
							`✅ ${member.user} joined Developers via button click`,
						);
					}
				} catch (error) {
					console.error('Callback error:', error);
				}
			},
		}),

		// Callback: Notify when role is removed
		defineButtonRole({
			messageId: '1234567890123456789',
			customId: 'leave-announcements',
			roleId: '2222222222222222222',
			mode: 'remove',
			onRemove: async (context) => {
				const { member } = context;

				try {
					const logChannel = member.guild?.channels.cache.find(
						(ch) =>
							ch.name === 'role-changes' && ch.type === ChannelType.GuildText,
					);

					if (logChannel && logChannel.isTextBased()) {
						await logChannel.send(
							`⬜ ${member.user} left Announcements role`,
						);
					}
				} catch (error) {
					console.error('Callback error:', error);
				}
			},
		}),

		// Both callbacks
		defineButtonRole({
			messageId: '1234567890123456789',
			customId: 'toggle-gaming',
			roleId: '3333333333333333333',
			mode: 'toggle',
			onAdd: async (context) => {
				const { member } = context;
				await member.user.send('🎮 You joined the Gaming role!').catch(() => {});
			},
			onRemove: async (context) => {
				const { member } = context;
				await member.user.send('🎮 You left the Gaming role').catch(() => {});
			},
		}),
	],
});

manager.start();

client.on('ready', () => {
	console.log(`✅ Logged in as ${client.user?.tag}`);
	console.log('✅ Callbacks are active - users will receive DMs on role changes');
});

client.login(process.env.DISCORD_TOKEN);
