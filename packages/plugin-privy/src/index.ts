import { Plugin } from "@ai16z/eliza";
import { walletProvider, WalletProvider } from "./providers/wallet";

export { WalletProvider };

export const privyPlugin: Plugin = {
    name: "privy",
    description: "Privy Server Wallet Plugin for Eliza",
    providers: [walletProvider],
    actions: [],
    evaluators: [],
};

export default privyPlugin;
