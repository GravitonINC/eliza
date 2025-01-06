import {
    Plugin,
    Provider,
    Action,
    Service,
    IAgentRuntime,
    Memory,
    State,
} from "@ai16z/eliza";
import {
    createPrivyClient,
    createWallet,
    signMessage,
    sendTransaction,
} from "./privyApi.js";

interface WalletMetadata {
    agent_id: string;
    chainType: "ethereum" | "solana";
    [key: string]: string;
}

interface WalletResponse {
    id: string;
    address: string;
}

// Provider that manages wallet state and information
const privyWalletProvider: Provider = {
    async get(runtime: IAgentRuntime, message: Memory, state?: State) {
        try {
            // Attempt to find existing wallet info from memory
            const memories = await runtime.messageManager.getMemories({
                roomId: state?.roomId!,
                count: 1,
            });

            const walletInfo = memories.find(
                (m: Memory) =>
                    m.content?.text?.includes("wallet_id:") ||
                    m.content?.text?.includes("New wallet:")
            );

            if (walletInfo) {
                return { text: `Active ${walletInfo.content.text}` };
            }

            return {
                text: "No active wallet found. Use CreateWallet action to create one.",
            };
        } catch (error) {
            console.error("Error in privyWalletProvider:", error);
            return { text: "Unable to retrieve wallet information." };
        }
    },
};

// Action to create a new wallet
const createWalletAction: Action = {
    name: "CreateWallet",
    description: "Creates a new Privy server wallet",
    similes: [
        "generate a new blockchain wallet",
        "setup a new crypto wallet",
        "initialize a blockchain account",
    ],
    examples: [
        [
            {
                user: "user",
                content: { text: "I need a new wallet for transactions" },
            },
            {
                user: "assistant",
                content: {
                    text: "I'll create a new wallet for you using the Privy server wallet system.",
                },
            },
        ],
    ],
    validate: async () => true,
    handler: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        try {
            const newWallet = await createWallet({
                agent_id: runtime.agentId,
                chainType: "ethereum",
            });

            // Store wallet creation in memory with structured data
            await runtime.messageManager.createMemory({
                content: {
                    text: `New wallet created - wallet_id: ${newWallet.id}, address: ${newWallet.address}`,
                    metadata: {
                        wallet_id: newWallet.id,
                        address: newWallet.address,
                        chain_type: "ethereum",
                        created_at: new Date().toISOString(),
                        type: "wallet_creation",
                    },
                },
                userId: runtime.agentId,
                agentId: runtime.agentId,
                roomId: state?.roomId!,
            });

            return [
                {
                    user: "assistant",
                    content: {
                        text: `I've created a new wallet with address ${newWallet.address}. This wallet can be used for blockchain transactions.`,
                        metadata: {
                            wallet_id: newWallet.id,
                            address: newWallet.address,
                        },
                    },
                },
            ];
        } catch (error) {
            console.error("Error in CreateWallet action:", error);
            return [
                {
                    user: "assistant",
                    content: {
                        text: "I encountered an error while trying to create the wallet. Please try again later.",
                    },
                },
            ];
        }
    },
};

// Action to sign messages
const signMessageAction: Action = {
    name: "SignMessage",
    description: "Signs a message using the Privy server wallet",
    similes: [
        "cryptographically sign a message",
        "create a digital signature",
        "sign data with wallet",
    ],
    examples: [
        [
            {
                user: "user",
                content: { text: "Can you sign this message: 'Hello World'" },
            },
            {
                user: "assistant",
                content: { text: "I'll sign the message using our wallet." },
            },
        ],
    ],
    validate: async () => true,
    handler: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        try {
            // Find wallet ID from memory
            const memories = await runtime.messageManager.getMemories({
                roomId: state?.roomId!,
                count: 1,
            });

            const walletInfo = memories.find((m: Memory) =>
                m.content?.text?.includes("wallet_id:")
            );

            if (!walletInfo) {
                return [
                    {
                        user: "assistant",
                        content: {
                            text: "No wallet found. Please create a wallet first using the CreateWallet action.",
                        },
                    },
                ];
            }

            const walletId =
                walletInfo.content.text.match(/wallet_id: ([^,]+)/)?.[1];
            const messageToSign = message.content?.text || "Hello World";

            const signature = await signMessage(walletId!, messageToSign);

            // Store signature in memory with structured data
            await runtime.messageManager.createMemory({
                content: {
                    text: `Message signed - wallet_id: ${walletId}, message: ${messageToSign}, signature: ${signature}`,
                    metadata: {
                        wallet_id: walletId,
                        message: messageToSign,
                        signature: signature,
                        signed_at: new Date().toISOString(),
                        type: "message_signature",
                    },
                },
                userId: runtime.agentId,
                agentId: runtime.agentId,
                roomId: state?.roomId!,
            });

            return [
                {
                    user: "assistant",
                    content: {
                        text: `I've signed the message. The signature is: ${signature}`,
                        metadata: {
                            wallet_id: walletId,
                            signature: signature,
                        },
                    },
                },
            ];
        } catch (error) {
            console.error("Error in SignMessage action:", error);
            return [
                {
                    user: "assistant",
                    content: {
                        text: "I encountered an error while trying to sign the message. Please try again later.",
                    },
                },
            ];
        }
    },
};

// The main plugin export
export const privyWalletPlugin: Plugin = {
    name: "privy-wallet-plugin",
    description: "Plugin to integrate Privy server wallets with Eliza",
    providers: [privyWalletProvider],
    actions: [createWalletAction, signMessageAction],
    evaluators: [],
    services: [],
    clients: [],
};
