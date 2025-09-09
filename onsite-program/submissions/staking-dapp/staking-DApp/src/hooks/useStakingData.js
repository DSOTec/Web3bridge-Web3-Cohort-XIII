import { useReadContract, useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { CONTRACT_ADDRESS } from '../config/rainbowkit';
import { STAKING_CONTRACT_ABI as stakingABI } from '../config/ABI';

export function useStakingData() {
  const { address } = useAccount();

  // Fetch user's staking positions
  const { 
    data: userStakes = [], 
    isLoading: isLoadingStakes,
    refetch: refetchStakes 
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: stakingABI,
    functionName: 'getUserStakes',
    args: [address],
    query: {
      enabled: !!address,
      select: (data) => 
        data.map((stake) => ({
          amount: formatEther(stake.amount),
          rewardDebt: formatEther(stake.rewardDebt),
          unlockTime: Number(stake.unlockTime) * 1000, // Convert to milliseconds
          isLocked: stake.isLocked,
        })),
    },
  });

  // Fetch pending rewards
  const { 
    data: pendingRewards = '0',
    isLoading: isLoadingRewards,
    refetch: refetchRewards 
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: stakingABI,
    functionName: 'pendingReward',
    args: [address],
    query: {
      enabled: !!address,
      select: (data) => formatEther(data),
    },
  });

  // Fetch total staked amount
  const { 
    data: totalStaked = '0',
    isLoading: isLoadingTotalStaked,
    refetch: refetchTotalStaked 
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: stakingABI,
    functionName: 'totalStaked',
    query: {
      select: (data) => formatEther(data),
    },
  });

  // Fetch reward rate
  const { 
    data: rewardRate = '0',
    isLoading: isLoadingRewardRate,
    refetch: refetchRewardRate 
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: stakingABI,
    functionName: 'rewardRate',
    query: {
      select: (data) => formatEther(data),
    },
  });

  // Calculate APR (simplified example)
  const apr = rewardRate ? (parseFloat(rewardRate) * 365 * 24 * 60 * 60 * 100 / Math.max(parseFloat(totalStaked), 1)).toFixed(2) : '0.00';

  // Calculate total value locked (TVL)
  const tvl = totalStaked || '0';

  // Refetch all data
  const refetchAll = () => {
    refetchStakes();
    refetchRewards();
    refetchTotalStaked();
    refetchRewardRate();
  };

  return {
    // Staking positions
    userStakes,
    isLoadingStakes,
    
    // Rewards
    pendingRewards,
    isLoadingRewards,
    
    // Protocol stats
    totalStaked,
    rewardRate,
    apr,
    tvl,
    
    // Loading states
    isLoading: isLoadingStakes || isLoadingRewards || isLoadingTotalStaked || isLoadingRewardRate,
    
    // Refetch functions
    refetchAll,
    refetchStakes,
    refetchRewards,
    refetchTotalStaked,
    refetchRewardRate,
  };
}
