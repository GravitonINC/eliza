import { IAgentRuntime, Memory, Provider, State, elizaLogger } from '@elizaos/core';
import { PrivyClient } from '@privy-io/server-auth';
import NodeCache from 'node-cache';

interface WalletPortfolio {
    totalUsd: string;
    items: Array<{
        name: string;
        symbol: string;
        address: string;
        chain: string;
        balance: string;
        uiAmount: string;
        priceUsd: string;
        valueUsd: string;
    }>;
}

export class PrivyWalletProvider implements Provider {
    private cache: NodeCache;
    private client: PrivyClient | null = null;
    private readonly CACHE_TTL = 300; // 5 minutes
    private readonly SUPPORTED_CHAINS = ['ethereum', 'polygon', 'optimism', 'arbitrum', 'base', 'solana'];

    constructor() {
        this.cache = new NodeCache({ stdTTL: this.CACHE_TTL });
    }

    private async getClient(runtime: IAgentRuntime): Promise<PrivyClient> {
        if (this.client) return this.client;

        const appId = runtime.getSetting('PRIVY_APP_ID');
        const appSecret = runtime.getSetting('PRIVY_APP_SECRET');
        const authKey = runtime.getSetting('PRIVY_AUTH_KEY');

        if (!appId || !appSecret) {
            throw new Error('Privy credentials not configured. Please set PRIVY_APP_ID and PRIVY_APP_SECRET environment variables.');
        }

        this.client = new PrivyClient(appId, appSecret, {
            walletApi: authKey ? {
                authorizationPrivateKey: authKey
            } : undefined
        });

        return this.client;
    }

    async get(
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<string | null> {
        try {
            // Check memory for cached wallet data
            const memoryKey = 'privy_wallet_data';
            const cachedData = await runtime.memory.get(memoryKey);
            
            if (cachedData) {
                elizaLogger.log('Using cached wallet data from memory');
                return cachedData;
            }

            const portfolio = await this.getFormattedPortfolio(runtime);
            
            // Store in memory for future use
            await runtime.memory.set(memoryKey, portfolio);
            
            return portfolio;
        } catch (error) {
            elizaLogger.error('Error in Privy wallet provider:', error);
            return null;
        }
    }

    private async fetchPortfolioValue(runtime: IAgentRuntime): Promise<WalletPortfolio> {
        try {
            const cacheKey = 'privy-portfolio';
            const cachedValue = this.cache.get<WalletPortfolio>(cacheKey);

            if (cachedValue) {
                elizaLogger.log('Cache hit for fetchPortfolioValue');
                return cachedValue;
            }

            const client = await this.getClient(runtime);
            
            // Initialize portfolio with supported chains
            const portfolio: WalletPortfolio = {
                totalUsd: '0',
                items: this.SUPPORTED_CHAINS.map(chain => ({
                    name: chain.charAt(0).toUpperCase() + chain.slice(1),
                    symbol: chain === 'solana' ? 'SOL' : 'ETH',
                    address: '',
                    chain,
                    balance: '0',
                    uiAmount: '0',
                    priceUsd: '0',
                    valueUsd: '0'
                }))
            };

            // TODO: Implement wallet creation and portfolio fetching using Privy SDK
            // This will be implemented after adding SDK dependencies
            // For each chain:
            // 1. Get or create wallet
            // 2. Fetch balances
            // 3. Update portfolio data

            this.cache.set(cacheKey, portfolio);
            return portfolio;
        } catch (error) {
            elizaLogger.error('Error fetching Privy portfolio:', error);
            throw error;
        }
    }

    private formatPortfolio(runtime: IAgentRuntime, portfolio: WalletPortfolio): string {
        let output = `${runtime.character.system}\n`;
        output += 'Privy Server Wallet Portfolio\n\n';


        const totalUsd = portfolio.totalUsd;
        output += `Total Value: $${totalUsd}\n\n`;
        output += 'Token Balances by Chain:\n';

        // Group items by chain
        const chainGroups: { [key: string]: typeof portfolio.items } = {};
        for (const item of portfolio.items) {
            if (!chainGroups[item.chain]) {
                chainGroups[item.chain] = [];
            }
            chainGroups[item.chain].push(item);
        }

        // Output items grouped by chain
        for (const [chain, items] of Object.entries(chainGroups)) {
            output += `\n${chain.toUpperCase()}:\n`;
            for (const item of items) {
                output += `  ${item.name} (${item.symbol}): ${item.uiAmount} ($${item.valueUsd})\n`;
            }
        }

        return output;
    }

    private async getFormattedPortfolio(runtime: IAgentRuntime): Promise<string> {
        try {
            const portfolio = await this.fetchPortfolioValue(runtime);
            return this.formatPortfolio(runtime, portfolio);
        } catch (error) {
            elizaLogger.error('Error generating Privy portfolio report:', error);
            return 'Unable to fetch Privy wallet information. Please try again later.';
        }
    }
}

// Export the provider instance
export const walletProvider = new PrivyWalletProvider();
