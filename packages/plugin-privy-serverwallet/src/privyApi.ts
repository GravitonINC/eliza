import { PrivyClient } from "@privy-io/server-auth";

let privy: PrivyClient;

export function createPrivyClient() {
    // Initialize with environment variables
    const appId = process.env.PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;

    if (!appId || !appSecret) {
        throw new Error(
            "PRIVY_APP_ID and PRIVY_APP_SECRET environment variables must be set"
        );
    }

    privy = new PrivyClient(appId, appSecret);
    return privy;
}

export interface WalletMetadata {
    agentId?: string;
    userId?: string;
    chainType: "ethereum" | "solana";
    [key: string]: any;
}

export async function createWallet(metadata: WalletMetadata) {
    if (!privy) {
        createPrivyClient();
    }

    const wallet = await privy.walletApi.create({
        chainType: metadata.chainType,
        authorizationKeyIds: [], // Optional: Add authorization keys if needed
        authorizationThreshold: 1, // Optional: Set threshold for multi-sig
    });

    return wallet;
}

export async function signMessage(
    walletId: string,
    message: string,
    chainType: "ethereum" | "solana" = "ethereum"
) {
    if (!privy) {
        createPrivyClient();
    }

    if (chainType === "ethereum") {
        const result = await privy.walletApi.rpc({
            method: "personal_sign",
            walletId,
            message,
        });
        return (result as unknown as { signature: string }).signature;
    } else {
        // Solana message signing
        const encodedMessage = new TextEncoder().encode(message);
        const result = await privy.walletApi.rpc({
            method: "signMessage",
            walletId,
            message: encodedMessage,
        });
        return (result as unknown as { signature: string }).signature;
    }
}

export async function sendTransaction(
    walletId: string,
    params: any,
    chainType: "ethereum" | "solana" = "ethereum"
) {
    if (!privy) {
        createPrivyClient();
    }

    if (chainType === "ethereum") {
        const result = await privy.walletApi.rpc({
            method: "eth_sendTransaction",
            walletId,
            transaction: params,
        });
        return (result as unknown as { hash: string }).hash;
    } else {
        // Solana transaction sending
        const result = await privy.walletApi.rpc({
            method: "signAndSendTransaction",
            walletId,
            transaction: params,
        });
        return (result as unknown as { signature: string }).signature;
    }
}
