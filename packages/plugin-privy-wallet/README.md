# Privy Wallet Plugin for Eliza

This plugin integrates Privy server wallets with the Eliza AI agent framework, enabling blockchain wallet functionality for AI agents.

## Features

- Create and manage blockchain wallets for AI agents
- Sign messages using agent-owned wallets
- Support for Ethereum and Solana chains
- Persistent wallet state through Eliza's memory system

## Installation

1. Install the plugin package in your Eliza project:

```bash
pnpm add @ai16z/plugin-privy-wallet
```

2. Install required dependencies:

```bash
pnpm add @privy-io/server-auth
```

## Environment Setup

Set up the following environment variables:

```bash
PRIVY_APP_ID=your_app_id
PRIVY_APP_SECRET=your_app_secret
```

You can obtain these credentials from the [Privy Dashboard](https://console.privy.io/).

## Integration

Add the Privy wallet plugin to your Eliza character configuration:

```typescript
import { privyWalletPlugin } from "@ai16z/plugin-privy-wallet";

const myCharacter = {
    name: "CryptoAgent",
    username: "crypto_agent",
    plugins: [privyWalletPlugin],
    // ... other character configuration
};
```

## Usage Examples

### Creating a New Wallet

The agent can create a new wallet in response to user requests:

```
User: "I need a new wallet for transactions"
Agent: "I'll create a new wallet for you using the Privy server wallet system."
```

The CreateWallet action will:

1. Generate a new wallet
2. Store the wallet information in agent's memory
3. Return the wallet address

### Signing Messages

Sign messages using the created wallet:

```
User: "Can you sign this message: 'Hello World'"
Agent: "I'll sign the message using our wallet."
```

The SignMessage action will:

1. Retrieve the wallet from memory
2. Sign the provided message
3. Return the signature

### Checking Wallet Status

Query wallet information using the provider:

```typescript
const walletInfo = await runtime.providers.get("privy-wallet");
console.log(walletInfo); // Returns active wallet information
```

## API Reference

### Actions

#### CreateWallet

- Creates a new Privy server wallet
- Stores wallet information in agent memory
- Returns wallet address and ID

#### SignMessage

- Signs a message using the active wallet
- Stores signature in agent memory
- Returns the signature

### Provider

#### privyWalletProvider

- Retrieves active wallet information
- Returns wallet status and details

## Development

To contribute to this plugin:

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

3. Build the plugin:

```bash
pnpm build
```

## License

MIT License
