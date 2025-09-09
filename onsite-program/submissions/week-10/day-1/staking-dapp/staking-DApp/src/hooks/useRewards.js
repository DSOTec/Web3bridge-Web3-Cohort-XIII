import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { formatEther } from 'viem';
import { toast } from 'react-hot-toast';
import { CONTRACT_ADDRESS } from '../config/rainbowkit';
import { STAKING_CONTRACT_ABI as stakingABI } from '../config/ABI';

export function useRewards() {
    const { address } = useAccount();
    const queryClient = useQueryClient();

    // --- Pending rewards ---
    const { data: pendingRewards, refetch } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: stakingABI,
        functionName: 'pendingReward',
        args: [address],
        query: { enabled: !!address },
    });

    const { writeContract } = useWriteContract();
    const { isLoading: isConfirming } = useWaitForTransactionReceipt({
        onSuccess: () => {
            toast.success('Rewards claimed!');
            queryClient.invalidateQueries();
            refetch();
        },
    });

    const claimRewards = async () => {
        if (!pendingRewards || pendingRewards === 0n) return toast.error('No rewards available');
        await writeContract({
            address: CONTRACT_ADDRESS,
            abi: stakingABI,
            functionName: 'claimRewards',
        });
    };

    return {
        pendingRewards: pendingRewards || 0n,
        formattedRewards: pendingRewards ? formatEther(pendingRewards) : '0',
        claimRewards,
        isConfirming,
        hasRewards: pendingRewards && pendingRewards > 0n,
    };
}
