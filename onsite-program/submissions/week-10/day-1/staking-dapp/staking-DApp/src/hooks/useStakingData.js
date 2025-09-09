import { useReadContract, useAccount } from "wagmi";
import { formatEther } from "viem";
import { STAKING_CONTRACT_ABI } from "../config/ABI";
import { CONTRACT_ADDRESS } from "../config/rainbowkit";

export function useStakingData() {
    const { address, isConnected } = useAccount();

    const { data: userInfo } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: STAKING_CONTRACT_ABI,
        functionName: "userInfo",
        args: [address],
        query: {
            enabled: !!address && isConnected,
            select: (d) => ({
                amount: formatEther(d.amount),
                rewardDebt: formatEther(d.rewardDebt),
            }),
        },
    });

    const { data: pendingRewards } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: STAKING_CONTRACT_ABI,
        functionName: "pendingReward",
        args: [address],
        query: { enabled: !!address && isConnected, select: (d) => formatEther(d) },
    });

    const { data: totalStaked } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: STAKING_CONTRACT_ABI,
        functionName: "totalStaked",
        query: { enabled: isConnected, select: (d) => formatEther(d) },
    });

    const { data: rewardRate } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: STAKING_CONTRACT_ABI,
        functionName: "rewardRate",
        query: { enabled: isConnected, select: (d) => formatEther(d) },
    });

    return { userInfo, pendingRewards, totalStaked, rewardRate };
}
