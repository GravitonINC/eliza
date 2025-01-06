import { IAgentRuntime, Memory, Provider, State } from "@ai16z/eliza";
import BigNumber from "bignumber.js";
import NodeCache from "node-cache";
import { createPrivyClient, PrivyWalletResponse } from "../privyClient";

// Provider configuration
const PROVIDER_CONFIG = {
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000,
    SUPPORTED_CHAINS: {
        evm: [
            // Mainnet chains
            "ethereum",
            "polygon",
            "optimism",
            "arbitrum",
            "base",
            "zora",
            "avalanche",
            "binance-smart-chain",
            "fantom",
            "gnosis",
            // Testnet chains
            "sepolia",
            "goerli",
            "mumbai",
            "arbitrum-goerli",
            "base-goerli"
        ],
        solana: [
            "solana",
            "solana-devnet",
            "solana-testnet"
        ],
    },
};

export interface PrivyWalletInfo {
    walletId: string;
    chainType: string;
    address: string;
    balance?: string;
    uiAmount?: string;
    priceUsd?: string;
    valueUsd?: string;
}

interface WalletMetadata {
    category: string;
    walletId: string;
    chain: string;
    address: string;
    created_at: string;
    type: 'evm' | 'solana';
    network: string;
}

interface WalletPortfolio {
    totalUsd: string;
    wallets: Array<PrivyWalletInfo>;
}

export class WalletProvider {
    private cache: NodeCache;
    constructor() {
        this.cache = new NodeCache({ stdTTL: 300 }); // Cache TTL set to 5 minutes
    }

    private userId: string | null = null;

    private async getPrivyClient(runtime: IAgentRuntime) {
        const appId = runtime.getSetting("PRIVY_APP_ID");
        const appSecret = runtime.getSetting("PRIVY_APP_SECRET");
        const userId = runtime.getSetting("PRIVY_USER_ID");

        // Validate required credentials
        const missing = [];
        if (!appId) missing.push("PRIVY_APP_ID");
        if (!appSecret) missing.push("PRIVY_APP_SECRET");
        if (!userId) missing.push("PRIVY_USER_ID");

        if (missing.length > 0) {
            throw new Error(`Missing required Privy credentials: ${missing.join(", ")}`);
        }

        // Validate credential formats
        if (!appId.match(/^[a-zA-Z0-9-_]+$/)) {
            throw new Error("Invalid PRIVY_APP_ID format");
        }

        if (!appSecret.match(/^[a-zA-Z0-9-_]+$/)) {
            throw new Error("Invalid PRIVY_APP_SECRET format");
        }

        // Store userId for wallet operations
        this.userId = userId;

        // Create client with validated credentials
        try {
            return createPrivyClient({ 
                appId, 
                appSecret
            });
        } catch (error) {
            console.error("Error initializing Privy client:", error);
            throw new Error("Failed to initialize Privy client. Check your credentials.");
        }
    }

    private async storeWalletReference(
        runtime: IAgentRuntime,
        walletId: string,
        chain: string,
        address: string
    ): Promise<void> {
        const category = "privy_wallets";
        const chainType = chain.toLowerCase().includes('solana') ? 'solana' : 'evm';
        const metadata: WalletMetadata = {
            category,
            walletId,
            chain,
            address,
            created_at: new Date().toISOString(),
            type: chainType,
            network: chain.toLowerCase()
        };
        
        const message: Memory = {
            id: runtime.agentId,
            userId: runtime.agentId,
            agentId: runtime.agentId,
            roomId: runtime.agentId,
            content: {
                text: `Creating Privy wallet for chain ${chain}`,
                source: 'privy-wallet-provider',
                action: 'create-wallet'
            }
        };
        
        const state = await runtime.composeState(message);

        try {
            await runtime.knowledgeManager.createMemory({
                id: runtime.agentId,
                userId: state.userId,
                agentId: runtime.agentId,
                roomId: state.roomId,
                content: {
                    text: `Privy wallet for chain ${chain}`,
                    metadata
                }
            });
            console.log(`Stored Privy wallet reference: ${walletId} for chain ${chain}`);
        } catch (error) {
            console.error(`Error storing wallet reference: ${error}`);
            throw new Error(`Failed to store wallet reference: ${error}`);
        }
    }

    private async getStoredWallets(
        runtime: IAgentRuntime,
        chain?: string
    ): Promise<Array<WalletMetadata>> {
        try {
            const category = "privy_wallets";
        const message: Memory = {
            id: runtime.agentId,
            userId: runtime.agentId,
            agentId: runtime.agentId,
            roomId: runtime.agentId,
            content: {
                text: 'Retrieving stored Privy wallets',
                source: 'privy-wallet-provider',
                action: 'get-wallets'
            }
        };
        
        const state = await runtime.composeState(message);

        const memories = await runtime.knowledgeManager.getMemories({
            roomId: state.roomId,
            unique: true
        });
        
        // Filter memories by category and cast metadata to WalletMetadata
        const walletMemories = memories.filter(memory => 
            memory.content?.metadata && 
            (memory.content.metadata as WalletMetadata).category === category
        );
        if (!memories || memories.length === 0) return [];

        const wallets = walletMemories.map(memory => memory.content.metadata as WalletMetadata);
        if (chain) {
            return wallets.filter(wallet => wallet.chain === chain);
        }
            console.log(`Retrieved ${wallets.length} Privy wallet(s)${chain ? ` for chain ${chain}` : ''}`);
            return wallets;
        } catch (error) {
            console.error(`Error retrieving stored wallets: ${error}`);
            throw new Error(`Failed to retrieve stored wallets: ${error}`);
        }
    }

    public async createWallet(
        runtime: IAgentRuntime,
        chain: string
    ): Promise<PrivyWalletInfo | null> {
        try {
            const privy = await this.getPrivyClient(runtime);
            const wallet = await privy.createWallet(runtime.getSetting("PRIVY_USER_ID"), chain);
            
            if (wallet) {
                await this.storeWalletReference(runtime, wallet.id, chain, wallet.address);
                return {
                    walletId: wallet.id,
                    chainType: PROVIDER_CONFIG.SUPPORTED_CHAINS.evm.includes(chain) ? "evm" : "solana",
                    address: wallet.address,
                };
            }
            return null;
        } catch (error) {
            console.error(`Error creating wallet for chain ${chain}:`, error);
            return null;
        }
    }

    private async fetchWithRetry(
        url: string,
        options: RequestInit = {}
    ): Promise<any> {
        let lastError: Error;

        for (let i = 0; i < PROVIDER_CONFIG.MAX_RETRIES; i++) {
            try {
                const response = await fetch(url, options);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return await response.json();
            } catch (error) {
                console.error(`Attempt ${i + 1} failed:`, error);
                lastError = error as Error;
                if (i < PROVIDER_CONFIG.MAX_RETRIES - 1) {
                    await new Promise(resolve =>
                        setTimeout(resolve, PROVIDER_CONFIG.RETRY_DELAY * Math.pow(2, i))
                    );
                }
            }
        }
        throw lastError!;
    }

    async fetchPortfolioValue(runtime: IAgentRuntime): Promise<WalletPortfolio> {
        try {
            const userId = runtime.getSetting("PRIVY_USER_ID");
            if (!userId) {
                throw new Error("PRIVY_USER_ID not configured");
            }

            const cacheKey = `portfolio-${userId}`;
            const cachedValue = this.cache.get<WalletPortfolio>(cacheKey);

            if (cachedValue) {
                console.log("Cache hit for fetchPortfolioValue");
                return cachedValue;
            }

            // First check stored wallets in memory
            const storedWallets = await this.getStoredWallets(runtime);
            const wallets: PrivyWalletInfo[] = [];
            let totalUsd = new BigNumber(0);

            // If we have stored wallets, use them
            if (storedWallets.length > 0) {
                for (const stored of storedWallets) {
                    const chainType = PROVIDER_CONFIG.SUPPORTED_CHAINS.evm.includes(stored.chain) 
                        ? "evm" 
                        : "solana";
                    wallets.push({
                        walletId: stored.walletId,
                        chainType,
                        address: stored.address,
                    });
                }
            }

            // Always fetch from Privy to ensure we have the latest data
            const privy = await this.getPrivyClient(runtime);
            
            // Fetch wallets for each supported chain type if we don't have stored wallets
            if (wallets.length === 0) {
                for (const [chainType, chains] of Object.entries(PROVIDER_CONFIG.SUPPORTED_CHAINS)) {
                    for (const chain of chains) {
                        const wallet = await privy.getWallet(userId, chain);
                        if (wallet) {
                            const walletInfo: PrivyWalletInfo = {
                                walletId: wallet.id,
                                chainType,
                                address: wallet.address,
                            };
                            wallets.push(walletInfo);
                            // Store the wallet reference in memory
                            await this.storeWalletReference(runtime, wallet.id, chain, wallet.address);
                        }
                    }
                }
            }

            // Update wallet balances and values
            const updatedWallets = await Promise.all(
                wallets.map(async (wallet) => {
                    const chain = wallet.chainType === "evm" 
                        ? PROVIDER_CONFIG.SUPPORTED_CHAINS.evm.find(c => 
                            wallet.address.toLowerCase() === wallet.address.toLowerCase())
                        : "solana";
                    if (chain) {
                        const updated = await privy.getWallet(userId, chain);
                        if (updated && updated.balance) {
                            const walletInfo: PrivyWalletInfo = {
                                ...wallet,
                                balance: updated.balance,
                                uiAmount: updated.uiAmount,
                                priceUsd: updated.priceUsd,
                                valueUsd: updated.valueUsd
                            };
                            if (updated.valueUsd) {
                                totalUsd = totalUsd.plus(updated.valueUsd);
                            }
                            return walletInfo;
                        }
                    }
                    return wallet;
                })
            );
            
            // Update the wallets array with the latest data
            wallets.length = 0;
            wallets.push(...updatedWallets.filter(Boolean));

            const portfolio: WalletPortfolio = {
                totalUsd: totalUsd.toString(),
                wallets: wallets,
            };

            this.cache.set(cacheKey, portfolio);
            return portfolio;
        } catch (error) {
            console.error("Error fetching portfolio:", error);
            throw error;
        }
    }

    public formatPortfolio(runtime: IAgentRuntime, portfolio: WalletPortfolio): string {
        let output = `${runtime.character.system}\n`;
        output += "Privy Server Wallets:\n\n";

        const totalUsdFormatted = new BigNumber(portfolio.totalUsd).toFixed(2);
        output += `Total Value: $${totalUsdFormatted}\n\n`;
        output += "Wallet Addresses:\n";

        for (const wallet of portfolio.wallets) {
            output += `${wallet.chainType}: ${wallet.address}\n`;
        }

        return output;
    }

    public async getFormattedPortfolio(runtime: IAgentRuntime): Promise<string> {
        try {
            const portfolio = await this.fetchPortfolioValue(runtime);
            return this.formatPortfolio(runtime, portfolio);
        } catch (error) {
            console.error("Error generating portfolio report:", error);
            return "Unable to fetch Privy wallet information. Please try again later.";
        }
    }
}

// Export the provider implementation
const walletProvider: Provider = {
    get: async (
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State
    ): Promise<string | null> => {
        try {
            const provider = new WalletProvider();
            return await provider.getFormattedPortfolio(runtime);
        } catch (error) {
            console.error("Error in Privy wallet provider:", error);
            return null;
        }
    },
};

export { walletProvider };
