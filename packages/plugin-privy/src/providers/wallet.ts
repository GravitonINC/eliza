import { IAgentRuntime, Memory, Provider, State } from "@ai16z/eliza";
import { PrivyServerAuth } from "@privy-io/server-auth";
import BigNumber from "bignumber.js";
import NodeCache from "node-cache";

// Provider configuration
const PROVIDER_CONFIG = {
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000,
    SUPPORTED_CHAINS: [
        "ethereum",
        "polygon",
        "optimism",
        "arbitrum",
        "base",
        "zora",
        "solana",
    ],
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

interface WalletPortfolio {
    totalUsd: string;
    wallets: Array<PrivyWalletInfo>;
}

export class WalletProvider {
    private cache: NodeCache;
    private privy: PrivyServerAuth;

    constructor() {
        this.cache = new NodeCache({ stdTTL: 300 }); // Cache TTL set to 5 minutes
    }

    private async initPrivy(runtime: IAgentRuntime) {
        const appId = runtime.getSetting("PRIVY_APP_ID");
        const appSecret = runtime.getSetting("PRIVY_APP_SECRET");

        if (!appId || !appSecret) {
            throw new Error("Privy credentials not configured");
        }

        this.privy = new PrivyServerAuth({
            appId,
            appSecret,
        });
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

            if (!this.privy) {
                await this.initPrivy(runtime);
            }

            const wallets: PrivyWalletInfo[] = [];
            let totalUsd = new BigNumber(0);

            // Fetch wallets for each supported chain
            for (const chain of PROVIDER_CONFIG.SUPPORTED_CHAINS) {
                try {
                    const wallet = await this.privy.getWallet(userId, chain);
                    if (wallet) {
                        const walletInfo: PrivyWalletInfo = {
                            walletId: wallet.id,
                            chainType: chain,
                            address: wallet.address,
                        };
                        wallets.push(walletInfo);
                    }
                } catch (error) {
                    console.error(`Error fetching ${chain} wallet:`, error);
                }
            }

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

    formatPortfolio(runtime: IAgentRuntime, portfolio: WalletPortfolio): string {
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

    async getFormattedPortfolio(runtime: IAgentRuntime): Promise<string> {
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
