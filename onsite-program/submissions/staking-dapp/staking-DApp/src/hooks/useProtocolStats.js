import { useReadContract, useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { formatEther, parseEther } from 'viem';
import { toast } from 'react-hot-toast';
import { CONTRACT_ADDRESS } from '../config/rainbowkit';
import { stakingABI } from '../config/ABI';

export function useProtocolStats() {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  
  // Fetch total staked amount
  const { data: totalStaked, refetch: refetchTotalStaked } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: stakingABI,
    functionName: 'totalStaked',
    query: {
      refetchInterval: 30000, // 30 seconds
    },
  });

  // Fetch reward rate
  const { data: rewardRate, refetch: refetchRewardRate } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: stakingABI,
    functionName: 'rewardRate',
  });

  // Check if current user is the owner
  const { data: owner, refetch: refetchOwner } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: stakingABI,
    functionName: 'owner',
  });

  // Write operations for owner functions
  const { 
    writeContract,
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite
  } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ 
      onSuccess: () => {
        toast.success('Protocol updated successfully!');
        queryClient.invalidateQueries({ queryKey: ['rewardRate'] });
        queryClient.invalidateQueries({ queryKey: ['totalStaked'] });
        refetchRewardRate();
        refetchTotalStaked();
      },
      onError: (error) => {
        toast.error(`Update failed: ${error.shortMessage || error.message}`);
      }
    });

  const isProcessing = isWritePending || isConfirming;

  // Calculate APR (simplified example - adjust based on your contract)
  const apr = rewardRate ? (Number(rewardRate) / 1e18) * 365 * 24 * 60 * 60 * 100 : 0;
  
  // Format values for display
  const formattedTotalStaked = totalStaked ? formatEther(totalStaked) : '0';
  const formattedRewardRate = rewardRate ? formatEther(rewardRate) : '0';
  const isOwner = owner && address ? owner.toLowerCase() === address.toLowerCase() : false;

  // Update reward rate function
  const updateRewardRate = async (newRate) => {
    if (!isOwner) {
      toast.error('Only the owner can update the reward rate');
      return;
    }
    
    try {
      const rateWei = parseEther(newRate.toString());
      toast.loading('Updating reward rate...');
      
      await writeContract({
        address: CONTRACT_ADDRESS,
        abi: stakingABI,
        functionName: 'updateRewardRate',
        args: [rateWei],
      });
    } catch (err) {
      console.error('Update reward rate error:', err);
      toast.error(`Update failed: ${err.shortMessage || err.message}`);
      toast.dismiss();
    }
  };

  // Refresh all stats
  const refresh = async () => {
    await Promise.all([
      refetchTotalStaked(),
      refetchRewardRate(),
      refetchOwner(),
    ]);
  };

  return {
    // Raw values
    totalStaked,
    rewardRate,
    owner,
    
    // Formatted values
    formattedTotalStaked,
    formattedRewardRate,
    apr: apr.toFixed(2),
    
    // Status
    isOwner,
    isProcessing,
    
    // Functions
    updateRewardRate,
    refresh,
    
    // Error handling
    error: writeError,
    reset: resetWrite
  };
}
