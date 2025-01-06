import { PrivyClient } from '@privy-io/server-auth';

interface PrivyClientConfig {
    appId: string;
    appSecret: string;
    authorizationPrivateKey?: string;
}

export interface PrivyWalletResponse {
    id: string;
    address: string;
    type: string;
    chain: string;
}

class PrivyClientWrapper {
    private client: PrivyClient;
    private static instance: PrivyClientWrapper;

    private constructor(config: PrivyClientConfig) {
        this.client = new PrivyClient(config.appId, config.appSecret, {
            walletApi: config.authorizationPrivateKey ? {
                authorizationPrivateKey: config.authorizationPrivateKey
            } : undefined
        });
    }

    public static getInstance(config: PrivyClientConfig): PrivyClientWrapper {
        if (!PrivyClientWrapper.instance) {
            PrivyClientWrapper.instance = new PrivyClientWrapper(config);
        }
        return PrivyClientWrapper.instance;
    }

    public async getWallet(userId: string, chain: string): Promise<PrivyWalletResponse | null> {
        try {
            const { wallets } = await this.client.getWallets({ userId });
            const wallet = wallets.find(w => w.chain === chain);
            if (!wallet) {
                return null;
            }

            return {
                id: wallet.id,
                address: wallet.address,
                type: 'privy',
                chain: chain,
            };
        } catch (error) {
            console.error(`Error getting ${chain} wallet for user ${userId}:`, error);
            return null;
        }
    }

    public async createWallet(userId: string, chain: string): Promise<PrivyWalletResponse | null> {
        try {
            const { wallets } = await this.client.createWallets({
                userId,
                chains: [chain]
            });
            
            if (!wallets || wallets.length === 0) {
                return null;
            }

            const wallet = wallets[0];
            return {
                id: wallet.id,
                address: wallet.address,
                type: 'privy',
                chain: chain,
            };
        } catch (error) {
            console.error(`Error creating ${chain} wallet for user ${userId}:`, error);
            return null;
        }
    }

    public async signMessage(
        userId: string,
        chain: string,
        message: string
    ): Promise<string | null> {
        try {
            const { signature } = await this.client.signMessage({
                userId,
                chain,
                message: Buffer.from(message).toString('hex')
            });
            return signature;
        } catch (error) {
            console.error(`Error signing message for user ${userId} on chain ${chain}:`, error);
            return null;
        }
    }

    public async sendTransaction(
        userId: string,
        chain: string,
        transaction: string
    ): Promise<string | null> {
        try {
            const { hash } = await this.client.sendTransaction({
                userId,
                chain,
                transaction: {
                    data: transaction
                }
            });
            return hash;
        } catch (error) {
            console.error(`Error sending transaction for user ${userId} on chain ${chain}:`, error);
            return null;
        }
    }
}

export const createPrivyClient = (config: PrivyClientConfig): PrivyClientWrapper => {
    return PrivyClientWrapper.getInstance(config);
};
