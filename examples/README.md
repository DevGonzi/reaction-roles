# @devgonzi/reaction-roles Examples

This directory contains practical examples of how to use the reaction-roles package.

## Examples

### 1. **basic-setup.ts**

The simplest way to get started. Shows:

- Creating a RoleManager with basic bindings
- Using both reaction roles and button roles
- Starting the manager

**Use this if:** You just want to add role assignment to your bot quickly.

### 2. **advanced-modes.ts**

Demonstrates all binding modes:

- `toggle` - User can add/remove role
- `add` - Always gives role (user can't remove)
- `remove` - Always removes role
- `once` - Gives role once (permanent, can't be undone)
- Multiple roles in one binding

**Use this if:** You need different behavior for different role assignments.

### 3. **callbacks.ts**

Shows custom logic when roles change:

- `onAdd` callback - Runs when user gets role
- `onRemove` callback - Runs when user loses role
- Sending DMs to users
- Logging to channels

**Use this if:** You want to run custom code (notifications, logging, etc) when roles change.

### 4. **error-handling.ts**

Demonstrates error handling:

- Custom error handler
- Catching validation errors
- Notifying admins on errors
- User-friendly error messages

**Use this if:** You want robust error handling and don't want to crash on bad IDs.

### 5. **i18n.ts**

Shows multi-language support:

- English (en)
- German (de)
- French (fr)
- Spanish (es)

**Use this if:** You have servers in different languages and want localized messages.

## Running Examples

Since these are TypeScript, you'll need to compile them:

```bash
# Option 1: Using tsx (recommended for TS files)
npx tsx examples/basic-setup.ts

# Option 2: Compile to JS first
tsc examples/basic-setup.ts
node examples/basic-setup.js

# Option 3: Using ts-node
npx ts-node examples/basic-setup.ts
```

## Setup

Before running any example:

1. **Create a `.env` file** in your project root:

   ```
   DISCORD_TOKEN=your_bot_token_here
   ```

2. **Get Discord IDs** (message ID, role ID, etc):

   - Enable Developer Mode in Discord
   - Right-click messages/roles and "Copy ID"

3. **Replace placeholder IDs** in the examples with your actual IDs

## Combining Examples

You can mix and match patterns from different examples:

```typescript
// Basic setup + callbacks + error handling
const manager = new DiscordRoleManager(client, {
  locale: "de",
  bindings: [
    defineButtonRole({
      messageId: "...",
      customId: "my-button",
      roleId: "...",
      mode: "add",
      onAdd: async (context) => {
        // Your custom logic here
      },
    }),
  ],
  onError: async (error, context) => {
    // Your error handling here
  },
});
```

## Common Patterns

### Verification Role

```typescript
defineButtonRole({
  messageId: "...",
  customId: "verify",
  roleId: "...",
  mode: "once", // User can only click once
  onAdd: async (context) => {
    await context.member.user.send("Welcome to the server!");
  },
});
```

### Notification Opt-In

```typescript
defineButtonRole({
  messageId: "...",
  customId: "notifications",
  roleId: "...",
  mode: "toggle", // User can turn on/off
});
```

### Multiple Roles

```typescript
defineButtonRole({
  messageId: "...",
  customId: "game-bundle",
  roleIds: ["role1", "role2", "role3"], // All at once!
  mode: "add",
});
```

## More Help

- Check the [main README](../README.md) for full API docs
- See [package.json](../package.json) for available scripts
- Report issues on GitHub: https://github.com/DevGonzi/reaction-roles/issues
