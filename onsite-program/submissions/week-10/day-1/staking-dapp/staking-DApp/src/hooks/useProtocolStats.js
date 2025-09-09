import { useReadContract } from "wagmi";
import { formatEther } from "viem";
import { STAKING_CONTRACT_ABI } from "../config/ABI";
import { CONTRACT_ADDRESS } from "../config/rainbowkit";

export function useProtocolStats() {
    const { data: apr } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: STAKING_CONTRACT_ABI,
        functionName: "getAPR", // adjust if your contract uses another name
        query: { select: (d) => formatEther(d) },
    });

    return { apr };
}
