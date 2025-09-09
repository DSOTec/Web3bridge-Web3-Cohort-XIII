import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { parseEther, formatEther } from "viem";
import { toast } from "react-hot-toast";
import { DSOTOKEN_ABI } from "../config/ABI";
import { CONTRACT_ADDRESS } from "../config/rainbowkit";

const DSO_TOKEN_ADDRESS = import.meta.env.VITE_DSOTOKEN;

export function useToken() {
    const { address, isConnected } = useAccount();
    const { writeContract } = useWriteContract();

    const { data: balance, refetch: refetchBalance } = useReadContract({
        address: DSO_TOKEN_ADDRESS,
        abi: DSOTOKEN_ABI,
        functionName: "balanceOf",
        args: [address],
        query: { enabled: !!address && isConnected, select: (d) => formatEther(d) },
    });

    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: DSO_TOKEN_ADDRESS,
        abi: DSOTOKEN_ABI,
        functionName: "allowance",
        args: [address, CONTRACT_ADDRESS],
        query: { enabled: !!address && isConnected },
    });

    const approveTokens = async (amount) => {
        const toastId = toast.loading("Approving tokens...");
        try {
            const tx = await writeContract({
                address: DSO_TOKEN_ADDRESS,
                abi: DSOTOKEN_ABI,
                functionName: "approve",
                args: [CONTRACT_ADDRESS, parseEther(amount.toString())],
            });
            toast.success("Tokens approved!", { id: toastId });
            return tx;
        } catch (err) {
            toast.error(err.message || "Approval failed", { id: toastId });
            throw err;
        }
    };

    return { balance, allowance, refetchBalance, refetchAllowance, approveTokens };
}
