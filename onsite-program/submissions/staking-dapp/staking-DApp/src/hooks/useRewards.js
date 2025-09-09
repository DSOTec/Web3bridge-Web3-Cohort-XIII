import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { formatEther } from 'viem';
import { toast } from 'react-hot-toast';
import { CONTRACT_ADDRESS } from '../config/rainbowkit';
import { STAKING_CONTRACT_ABI as stakingABI } from '../config/ABI';

export function useRewards() {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  
  // Read pending rewards
  const { 
    data: pendingRewards,
    refetch: refetchRewards,
    isPending: isLoadingRewards,
    error: rewardsError 
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: stakingABI,
    functionName: 'pendingReward',
    args: [address],
    query: {
      enabled: !!address,
      refetchInterval: 10000, // Refresh every 10 seconds
    }
  });

  // Write operations for claiming rewards
  const { 
    writeContract,
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite
  } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ 
      onSuccess: () => {
        toast.success('Rewards claimed successfully!');
        queryClient.invalidateQueries({ queryKey: ['pendingReward'] });
        queryClient.invalidateQueries({ queryKey: ['userStakes'] });
        refetchRewards();
      },
      onError: (error) => {
        toast.error(`Claim failed: ${error.shortMessage || error.message}`);
      }
    });

  const isProcessing = isWritePending || isConfirming;

  // Format rewards for display
  const formattedRewards = pendingRewards ? formatEther(pendingRewards) : '0';
  const hasRewards = pendingRewards && pendingRewards > 0n;

  // Claim rewards function
  const claimRewards = async () => {
    if (!hasRewards) {
      toast.error('No rewards available to claim');
      return;
    }
    
    try {
      toast.loading('Claiming rewards...');
      
      await writeContract({
        address: CONTRACT_ADDRESS,
        abi: stakingABI,
        functionName: 'claimRewards',
      });
    } catch (err) {
      console.error('Claim rewards error:', err);
      toast.error(`Claim failed: ${err.shortMessage || err.message}`);
      toast.dismiss();
    }
  };

  return {
    pendingRewards: pendingRewards || 0n, // Return raw BigInt value
    formattedRewards,
    hasRewards,
    claimRewards,
    isLoading: isLoadingRewards,
    isProcessing,
    isConfirmed,
    error: rewardsError || writeError,
    refetch: refetchRewards,
    reset: resetWrite
  };
}
