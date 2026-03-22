import type { TriggerSource } from './types.js';

/**
 * Supported locales for internationalization.
 */
export type Locale = 'en' | 'de' | 'fr' | 'es';

/**
 * Translation keys for the reaction roles package.
 */
interface TranslationKeys {
	// Error messages
	'errors.invalidId': string;
	'errors.invalidBinding': string;
	'errors.duplicateBinding': string;
	'errors.managerNotStarted': string;
	'errors.managerAlreadyStarted': string;
	'errors.rateLimited': string;
	'errors.memberNotFound': string;
	'errors.guildNotFound': string;
	'errors.noRoleConfigured': string;
	'errors.invalidMode': string;

	// Audit log reasons
	'audit.roleAdded': string;
	'audit.roleRemoved': string;
	'audit.roleToggled': string;

	// Interaction responses
	'interaction.roleAdded': string;
	'interaction.roleRemoved': string;
	'interaction.rolesAdded': string;
	'interaction.rolesRemoved': string;
	'interaction.error': string;
	'interaction.rateLimited': string;
	'interaction.alreadyHasRole': string;
	'interaction.alreadyHasRoles': string;
	'interaction.roleNotFound': string;
}

/**
 * Default English translations.
 */
const en: TranslationKeys = {
	'errors.invalidId': 'Invalid ID provided.',
	'errors.invalidBinding': 'Invalid binding configuration.',
	'errors.duplicateBinding': 'Duplicate binding detected.',
	'errors.managerNotStarted': 'Manager is not started.',
	'errors.managerAlreadyStarted': 'Manager is already started.',
	'errors.rateLimited': 'You are being rate limited. Please try again later.',
	'errors.memberNotFound': 'Member not found in guild.',
	'errors.guildNotFound': 'Guild not found.',
	'errors.noRoleConfigured': 'No role configured for this binding.',
	'errors.invalidMode': 'Invalid action mode.',

	'audit.roleAdded': 'Role added via {{source}}',
	'audit.roleRemoved': 'Role removed via {{source}}',
	'audit.roleToggled': 'Role toggled via {{source}}',

	'interaction.roleAdded': 'Role added successfully.',
	'interaction.roleRemoved': 'Role removed successfully.',
	'interaction.rolesAdded': '{{count}} roles added successfully.',
	'interaction.rolesRemoved': '{{count}} roles removed successfully.',
	'interaction.error': 'An error occurred. Please try again later.',
	'interaction.rateLimited': 'Please wait before trying again.',
	'interaction.alreadyHasRole': 'You already have this role.',
	'interaction.alreadyHasRoles': 'You already have these roles.',
	'interaction.roleNotFound': 'You do not have this role.',
};

/**
 * German translations.
 */
const de: TranslationKeys = {
	'errors.invalidId': 'Ungültige ID angegeben.',
	'errors.invalidBinding': 'Ungültige Bindungskonfiguration.',
	'errors.duplicateBinding': 'Doppelte Bindung erkannt.',
	'errors.managerNotStarted': 'Manager ist nicht gestartet.',
	'errors.managerAlreadyStarted': 'Manager ist bereits gestartet.',
	'errors.rateLimited': 'Du wirst begrenzt. Bitte versuche es später erneut.',
	'errors.memberNotFound': 'Mitglied nicht im Server gefunden.',
	'errors.guildNotFound': 'Server nicht gefunden.',
	'errors.noRoleConfigured': 'Keine Rolle für diese Bindung konfiguriert.',
	'errors.invalidMode': 'Ungültiger Aktionsmodus.',

	'audit.roleAdded': 'Rolle hinzugefügt über {{source}}',
	'audit.roleRemoved': 'Rolle entfernt über {{source}}',
	'audit.roleToggled': 'Rolle getoggelt über {{source}}',

	'interaction.roleAdded': 'Rolle erfolgreich hinzugefügt.',
	'interaction.roleRemoved': 'Rolle erfolgreich entfernt.',
	'interaction.rolesAdded': '{{count}} Rollen erfolgreich hinzugefügt.',
	'interaction.rolesRemoved': '{{count}} Rollen erfolgreich entfernt.',
	'interaction.error': 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.',
	'interaction.rateLimited': 'Bitte warte, bevor du es erneut versuchst.',
	'interaction.alreadyHasRole': 'Du hast diese Rolle bereits.',
	'interaction.alreadyHasRoles': 'Du hast diese Rollen bereits.',
	'interaction.roleNotFound': 'Du hast diese Rolle nicht.',
};

/**
 * French translations.
 */
const fr: TranslationKeys = {
	'errors.invalidId': 'ID invalide fourni.',
	'errors.invalidBinding': 'Configuration de liaison invalide.',
	'errors.duplicateBinding': 'Liaison en double détectée.',
	'errors.managerNotStarted': "Le gestionnaire n'est pas démarré.",
	'errors.managerAlreadyStarted': 'Le gestionnaire est déjà démarré.',
	'errors.rateLimited': 'Vous êtes limité. Veuillez réessayer plus tard.',
	'errors.memberNotFound': 'Membre non trouvé sur le serveur.',
	'errors.guildNotFound': 'Serveur non trouvé.',
	'errors.noRoleConfigured': 'Aucun rôle configuré pour cette liaison.',
	'errors.invalidMode': "Mode d'action invalide.",

	'audit.roleAdded': 'Rôle ajouté via {{source}}',
	'audit.roleRemoved': 'Rôle supprimé via {{source}}',
	'audit.roleToggled': 'Rôle basculé via {{source}}',

	'interaction.roleAdded': 'Rôle ajouté avec succès.',
	'interaction.roleRemoved': 'Rôle supprimé avec succès.',
	'interaction.rolesAdded': '{{count}} rôles ajoutés avec succès.',
	'interaction.rolesRemoved': '{{count}} rôles supprimés avec succès.',
	'interaction.error': "Une erreur s'est produite. Veuillez réessayer plus tard.",
	'interaction.rateLimited': 'Veuillez attendre avant de réessayer.',
	'interaction.alreadyHasRole': 'Vous avez déjà ce rôle.',
	'interaction.alreadyHasRoles': 'Vous avez déjà ces rôles.',
	'interaction.roleNotFound': "Vous n'avez pas ce rôle.",
};

/**
 * Spanish translations.
 */
const es: TranslationKeys = {
	'errors.invalidId': 'ID inválida proporcionada.',
	'errors.invalidBinding': 'Configuración de vinculación inválida.',
	'errors.duplicateBinding': 'Vinculación duplicada detectada.',
	'errors.managerNotStarted': 'El gestor no está iniciado.',
	'errors.managerAlreadyStarted': 'El gestor ya está iniciado.',
	'errors.rateLimited': 'Estás siendo limitado. Por favor, inténtalo más tarde.',
	'errors.memberNotFound': 'Miembro no encontrado en el servidor.',
	'errors.guildNotFound': 'Servidor no encontrado.',
	'errors.noRoleConfigured': 'Ningún rol configurado para esta vinculación.',
	'errors.invalidMode': 'Modo de acción inválido.',

	'audit.roleAdded': 'Rol añadido vía {{source}}',
	'audit.roleRemoved': 'Rol eliminado vía {{source}}',
	'audit.roleToggled': 'Rol alternado vía {{source}}',

	'interaction.roleAdded': 'Rol añadido exitosamente.',
	'interaction.roleRemoved': 'Rol eliminado exitosamente.',
	'interaction.rolesAdded': '{{count}} roles añadidos exitosamente.',
	'interaction.rolesRemoved': '{{count}} roles eliminados exitosamente.',
	'interaction.error': 'Ocurrió un error. Por favor, inténtalo más tarde.',
	'interaction.rateLimited': 'Por favor espera antes de intentarlo de nuevo.',
	'interaction.alreadyHasRole': 'Ya tienes este rol.',
	'interaction.alreadyHasRoles': 'Ya tienes estos roles.',
	'interaction.roleNotFound': 'No tienes este rol.',
};

/**
 * Map of locale codes to translations.
 */
const locales: Record<Locale, TranslationKeys> = { en, de, fr, es };

/**
 * Gets a translated string for the given locale and key.
 *
 * @param locale - The locale to use
 * @param key - The translation key
 * @param vars - Variables to interpolate into the translation
 * @returns The translated string
 */
export function t(
	locale: Locale,
	key: keyof TranslationKeys,
	vars?: Record<string, string | number>,
): string {
	const translations = locales[locale] ?? locales.en;
	let text = translations[key] ?? locales.en[key] ?? key;

	if (vars) {
		for (const [name, value] of Object.entries(vars)) {
			text = text.replace(new RegExp(`{{${name}}}`, 'g'), String(value));
		}
	}

	return text;
}

/**
 * Gets a human-readable source name for audit logs.
 *
 * @param locale - The locale to use
 * @param source - The trigger source
 * @returns The localized source name
 */
export function getLocalizedSourceName(locale: Locale, source: TriggerSource | 'auto'): string {
	switch (source) {
		case 'reaction-add':
			return t(locale, 'audit.roleAdded', { source: 'reaction' });
		case 'reaction-remove':
			return t(locale, 'audit.roleRemoved', { source: 'reaction' });
		case 'button':
			return t(locale, 'audit.roleToggled', { source: 'button' });
		case 'auto':
			return 'auto';
		default:
			return source;
	}
}

/**
 * Creates an i18n object for a specific locale.
 *
 * @param locale - The locale to use
 * @returns An object with translation methods
 */
export function createI18n(locale: Locale = 'en') {
	return {
		/**
		 * Translates a key with optional variables.
		 *
		 * @param key - The translation key
		 * @param vars - Variables to interpolate
		 * @returns The translated string
		 */
		t(key: keyof TranslationKeys, vars?: Record<string, string | number>): string {
			return t(locale, key, vars);
		},

		/**
		 * Gets a localized source name.
		 *
		 * @param source - The trigger source
		 * @returns The localized source name
		 */
		getSourceName(source: TriggerSource | 'auto'): string {
			return getLocalizedSourceName(locale, source);
		},
	};
}

// Re-export for convenience
export type { TranslationKeys };
