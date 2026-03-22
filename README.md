# @devgonzi/reaction-roles

Modern Discord.js v14 reaction role and button role system with flexible binding modes and full i18n support.

**Features:**

- ✅ Reaction-based role assignment (classic)
- ✅ Button-based role assignment (modern)
- ✅ Multiple binding modes (toggle, add, remove, once)
- ✅ Multi-role support (single action assigns multiple roles)
- ✅ Rate limiting built-in
- ✅ Custom callbacks for role changes
- ✅ Full i18n support (en, de, fr, es)
- ✅ TypeScript first-class support

## Installation

```bash
npm install @devgonzi/reaction-roles
```

**Requires:** `discord.js@^14.19.2`

## Quick Start

```typescript
import { Client } from 'discord.js';
import { DiscordRoleManager, defineReactionRole, defineButtonRole } from '@devgonzi/reaction-roles';

const client = new Client({ intents: [...] });

const manager = new DiscordRoleManager(client, {
  locale: 'de', // Optional: use German messages (en, de, fr, es)
  bindings: [
    defineReactionRole({
      messageId: '123456789',
      emoji: '🎮',
      roleId: 'gamerRoleId',
    }),
    defineButtonRole({
      messageId: '123456789',
      customId: 'get-announcements',
      roleId: 'announcementsRoleId',
    }),
  ],
});

manager.start();
```

## Comparison vs discordjs-reaction-roles

| Feature        | Old (discordjs-reaction-roles) | New (@devgonzi/reaction-roles) |
| -------------- | ------------------------------ | ------------------------------ |
| Button roles   | No                             | Yes, modern Discord UI         |
| TypeScript     | Limited                        | Full strict typing             |
| i18n           | None                           | 4 locales built-in             |
| Binding modes  | Toggle only                    | toggle, add, remove, once      |
| Multi-role     | No                             | Yes, assign multiple roles     |
| Callbacks      | No                             | onAdd, onRemove callbacks      |
| Rate limiting  | No                             | Built-in per-guild-user        |
| Error handling | Basic                          | Custom error handler           |
| Validation     | Limited                        | Full ID validation             |

## API Reference

### DiscordRoleManager

Main class for managing role bindings.

```typescript
const manager = new DiscordRoleManager(client, {
  bindings: [], // Initial bindings
  onError: (error, ctx) => {}, // Custom error handler
});
```

### RoleManagerOptions

| Option   | Type                    | Default       | Description                  |
| -------- | ----------------------- | ------------- | ---------------------------- |
| bindings | RoleBindingInput[]      | []            | Initial bindings to register |
| onError  | RoleManagerErrorHandler | console.error | Error handler function       |

### Binding Types

#### ReactionRoleBindingInput

| Property  | Type                | Required | Description                  |
| --------- | ------------------- | -------- | ---------------------------- |
| type      | 'reaction'          | Yes      | Binding type                 |
| messageId | Snowflake           | Yes      | Message ID                   |
| emoji     | string              | Yes      | Emoji (unicode or custom ID) |
| roleId    | Snowflake           | No\*     | Single role ID               |
| roleIds   | Snowflake[]         | No\*     | Multiple role IDs            |
| mode      | RoleActionMode      | 'toggle' | Binding mode                 |
| onAdd     | RoleBindingCallback | No       | Callback after adding        |
| onRemove  | RoleBindingCallback | No       | Callback after removing      |

\*At least one of `roleId` or `roleIds` is required.

#### ButtonRoleBindingInput

| Property  | Type                | Required | Description             |
| --------- | ------------------- | -------- | ----------------------- |
| type      | 'button'            | Yes      | Binding type            |
| messageId | Snowflake           | Yes      | Message ID              |
| customId  | string              | Yes      | Button custom ID        |
| roleId    | Snowflake           | No\*     | Single role ID          |
| roleIds   | Snowflake[]         | No\*     | Multiple role IDs       |
| mode      | RoleActionMode      | 'toggle' | Binding mode            |
| onAdd     | RoleBindingCallback | No       | Callback after adding   |
| onRemove  | RoleBindingCallback | No       | Callback after removing |

### RoleActionMode

| Mode   | Description                                 |
| ------ | ------------------------------------------- |
| toggle | Add if missing, remove if present (default) |
| add    | Only add roles, never remove                |
| remove | Only remove roles, never add                |
| once   | Add once, then ignore (reaction is pruned)  |

### Methods

| Method                   | Parameters         | Returns                 | Description            |
| ------------------------ | ------------------ | ----------------------- | ---------------------- |
| start                    | -                  | this                    | Attach event listeners |
| stop                     | -                  | this                    | Detach event listeners |
| setBindings              | RoleBindingInput[] | this                    | Replace all bindings   |
| addBindings              | RoleBindingInput[] | this                    | Add more bindings      |
| getBindings              | -                  | NormalizedRoleBinding[] | Get all bindings       |
| removeBindingsForMessage | messageId          | NormalizedRoleBinding[] | Remove by message      |
| destroy                  | -                  | void                    | Stop and clear all     |

### Helper Functions

| Function           | Parameters                                   | Returns                  | Description             |
| ------------------ | -------------------------------------------- | ------------------------ | ----------------------- |
| defineReactionRole | Omit&lt;ReactionRoleBindingInput, 'type'&gt; | ReactionRoleBindingInput | Create reaction binding |
| defineButtonRole   | Omit&lt;ButtonRoleBindingInput, 'type'&gt;   | ButtonRoleBindingInput   | Create button binding   |

### Utilities

| Function           | Parameters | Returns | Description           |
| ------------------ | ---------- | ------- | --------------------- |
| validateDiscordId  | id, name   | void    | Validate single ID    |
| validateDiscordIds | ids, name  | void    | Validate multiple IDs |
| isValidDiscordId   | id         | boolean | Check if valid        |
| getEmojiKey        | emoji      | string  | Normalize emoji       |

## i18n

Supported locales: `en`, `de`, `fr`, `es`

```typescript
import { createI18n } from "@devgonzi/reaction-roles";

const i18n = createI18n("de"); // German
const message = i18n.t("interaction.roleAdded", { count: "2" });
```

Default messages are shown to users when roles change:

- `interaction.roleAdded` / `interaction.rolesAdded`
- `interaction.roleRemoved` / `interaction.rolesRemoved`
- `interaction.rateLimited`
- `interaction.error`

## Examples

### Self-role menu with reactions

```typescript
const manager = new DiscordRoleManager(client, {
  bindings: [
    defineReactionRole({
      messageId: "menuMessageId",
      emoji: "🎮",
      roleId: "gamerRoleId",
      mode: "toggle",
    }),
    defineReactionRole({
      messageId: "menuMessageId",
      emoji: "🎨",
      roleId: "artistRoleId",
      mode: "toggle",
    }),
    defineReactionRole({
      messageId: "menuMessageId",
      emoji: "🎵",
      roleId: "musicRoleId",
      mode: "toggle",
    }),
  ],
});

manager.start();
```

### Button role menu

```typescript
const manager = new DiscordRoleManager(client, {
  bindings: [
    defineButtonRole({
      messageId: "menuMessageId",
      customId: "btn-announcements",
      roleId: "announcementsRoleId",
      mode: "toggle",
    }),
    defineButtonRole({
      messageId: "menuMessageId",
      customId: "btn-events",
      roleId: "eventsRoleId",
      mode: "toggle",
    }),
  ],
});

manager.start();
```

### Multi-role assignment

```typescript
// Assign 3 roles at once
const manager = new DiscordRoleManager(client, {
  bindings: [
    defineButtonRole({
      messageId: "menuMessageId",
      customId: "btn-verified",
      roleIds: ["verifiedId", "memberId", "accessId"],
      mode: "add", // Only add, never remove
    }),
  ],
});
```

### One-time role (verification)

```typescript
const manager = new DiscordRoleManager(client, {
  bindings: [
    defineButtonRole({
      messageId: "rulesMessageId",
      customId: "btn-accept-rules",
      roleId: "memberRoleId",
      mode: "once", // Can only get once, button becomes disabled
    }),
  ],
});
```

### Dynamic binding management

```typescript
const manager = new DiscordRoleManager(client);
manager.start();

// Add bindings dynamically
manager.addBindings([
  defineReactionRole({
    messageId: "newMessageId",
    emoji: "⭐",
    roleId: "specialRoleId",
  }),
]);

// Remove all bindings for a message
const removed = manager.removeBindingsForMessage("oldMessageId");
console.log(`Removed ${removed.length} bindings`);
```

### Custom callbacks

```typescript
const manager = new DiscordRoleManager(client, {
  bindings: [
    defineButtonRole({
      messageId: "menuMessageId",
      customId: "btn-premium",
      roleId: "premiumRoleId",
      onAdd: async ({ member, interaction }) => {
        // Log to channel
        await logChannel.send(`${member.user.tag} got premium!`);
        // DM user
        await member.send("Thanks for subscribing!");
      },
      onRemove: async ({ member }) => {
        await logChannel.send(`${member.user.tag} lost premium.`);
      },
    }),
  ],
});
```

### Custom error handler

```typescript
const manager = new DiscordRoleManager(client, {
  onError: async (error, context) => {
    console.error(`Error in ${context.source}:`, error);

    // Log to monitoring service
    await sentry.captureException(error, {
      extra: {
        source: context.source,
        userId: context.user?.id,
        messageId: context.binding?.messageId,
      },
    });
  },
});
```

### Team selection (add-only mode)

```typescript
const manager = new DiscordRoleManager(client, {
  bindings: [
    defineButtonRole({
      messageId: "teamMessageId",
      customId: "btn-red-team",
      roleId: "redTeamRoleId",
      mode: "add", // Can only add, not toggle
    }),
    defineButtonRole({
      messageId: "teamMessageId",
      customId: "btn-blue-team",
      roleId: "blueTeamRoleId",
      mode: "add",
    }),
  ],
});
```

### Remove-only mode (warning roles)

```typescript
const manager = new DiscordRoleManager(client, {
  bindings: [
    defineButtonRole({
      messageId: "warningMessageId",
      customId: "btn-ack-warning",
      roleId: "warningRoleId",
      mode: "remove", // Only removes the role
    }),
  ],
});
```

## Error Handling

The manager handles common errors gracefully:

- **Invalid IDs**: Throws `InvalidIdError` with context
- **Duplicate bindings**: Throws `DuplicateBindingError`
- **Rate limiting**: Silently ignores rapid interactions
- **Missing permissions**: Logs error, continues operation
- **Hierarchy issues**: Handles Discord role hierarchy errors

## Testbot

See working examples in the testbot:

```bash
cd testbot
pnpm install
# Configure .env
pnpm dev
```

## Migration from discordjs-reaction-roles

**Before:**

```typescript
import ReactionRole from 'discordjs-reaction-roles';
const rr = new ReactionRole(client, { ... });
```

**After:**

```typescript
import {
  DiscordRoleManager,
  defineReactionRole,
} from "@devgonzi/reaction-roles";

const manager = new DiscordRoleManager(client, {
  bindings: [
    defineReactionRole({ messageId: "...", emoji: "🎮", roleId: "..." }),
  ],
});
manager.start();
```

Key changes:

- `bindings` array in constructor instead of method calls
- `defineReactionRole()` helper for type inference
- `start()` method to attach listeners
- `mode` option for different behaviors (toggle, add, remove, once)
- Supports both `roleId` (single) and `roleIds` (multiple)
- Button roles via `defineButtonRole()`
- i18n built-in, no custom message strings needed

## License

MIT © [Gonzi](https://github.com/devgonzi)
