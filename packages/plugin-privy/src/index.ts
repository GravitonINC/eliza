import { Plugin } from '@elizaos/core';
import { PrivyWalletProvider } from './providers/wallet';

// Create provider instance
const walletProvider = new PrivyWalletProvider();

// Export plugin
export const privyPlugin: Plugin = {
  name: 'privy',
  description: 'Privy Server Wallet Plugin for Eliza',
  providers: [walletProvider],
};

export default privyPlugin;

// Export provider and types
export * from './providers/wallet';
