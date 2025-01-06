# Privy Wallet Provider Plugin for Eliza

This plugin adds Privy server wallet support to the Eliza framework as an additional wallet provider option, enabling AI agents to manage blockchain wallets across multiple chains while maintaining compatibility with existing wallet providers.

## Features

- Create and manage Privy server wallets alongside existing wallet providers
- Comprehensive blockchain network support:
  - EVM Mainnet Chains:
    - Ethereum
    - Polygon
    - Optimism
    - Arbitrum
    - Base
    - Zora
    - Avalanche
    - Binance Smart Chain
    - Fantom
    - Gnosis
  - EVM Testnet Chains:
    - Sepolia
    - Goerli
    - Mumbai (Polygon)
    - Arbitrum Goerli
    - Base Goerli
  - Solana Networks:
    - Mainnet
    - Devnet
    - Testnet
- Wallet portfolio tracking with USD values
- Memory-based wallet reference storage
- Automatic retry mechanism for API calls
- Secure credential management

## Installation

```bash
pnpm add @ai16z/plugin-privy
```

## Configuration

### Environment Variables

The plugin requires the following environment variables:

```env
PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret
PRIVY_USER_ID=your_privy_user_id
```

To set up your Privy credentials:

1. Create a Privy account at [https://privy.io](https://privy.io)
2. Create a new application in the Privy dashboard
3. Copy your App ID and App Secret
4. Generate a user ID for your server wallet operations
5. Add the environment variables to your Eliza configuration

For secure secrets management, refer to the [Secrets Management Guide](../docs/guides/secrets-management.md).

## Usage

### Basic Usage

```typescript
import { WalletProvider } from '@ai16z/plugin-privy';

// Initialize the Privy wallet provider
const privyProvider = new WalletProvider();

// Create a new wallet
const ethereumWallet = await privyProvider.createWallet(runtime, 'ethereum');
const solanaWallet = await privyProvider.createWallet(runtime, 'solana');

// Get wallet portfolio
const portfolio = await privyProvider.getFormattedPortfolio(runtime);
```

### Using with Other Wallet Providers

The Privy wallet provider can be used alongside existing wallet providers:

```typescript
import { WalletProvider as PrivyWalletProvider } from '@ai16z/plugin-privy';
import { WalletProvider as SolanaWalletProvider } from '@ai16z/plugin-solana';

// Use multiple providers
const privyProvider = new PrivyWalletProvider();
const solanaProvider = new SolanaWalletProvider();

// Create wallets using different providers
const privyWallet = await privyProvider.createWallet(runtime, 'ethereum');
const solanaWallet = await solanaProvider.createWallet(runtime);
```

### Chain Support

To create a wallet for a specific chain:

```typescript
// EVM Chains
const ethereumWallet = await provider.createWallet(runtime, 'ethereum');
const polygonWallet = await provider.createWallet(runtime, 'polygon');
const optimismWallet = await provider.createWallet(runtime, 'optimism');

// Solana
const solanaWallet = await provider.createWallet(runtime, 'solana');
const solanaDevnetWallet = await provider.createWallet(runtime, 'solana-devnet');

// Testnets
const sepoliaWallet = await provider.createWallet(runtime, 'sepolia');
const goerliWallet = await provider.createWallet(runtime, 'goerli');
```

## Memory Storage

The plugin stores wallet references in Eliza's memory system:

```typescript
interface WalletMetadata {
    category: string;      // Always "privy_wallets"
    walletId: string;     // Privy wallet ID
    chain: string;        // Blockchain network
    address: string;      // Wallet address
    created_at: string;   // Creation timestamp
    type: 'evm' | 'solana'; // Chain type
    network: string;      // Network identifier
}
```

## Error Handling

The plugin includes comprehensive error handling:

- Automatic retries for API calls (configurable via PROVIDER_CONFIG)
- Detailed error logging for debugging
- Type-safe operations with proper validation
- Graceful fallback mechanisms

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

MIT
