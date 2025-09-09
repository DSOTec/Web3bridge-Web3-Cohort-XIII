import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { parseEther, formatEther } from 'viem';
import { toast } from 'react-hot-toast';
import { CONTRACT_ADDRESS } from '../config/rainbowkit';
import { STAKING_CONTRACT_ABI as stakingABI, DSOTOKEN_ABI } from '../config/ABI';

// Constants
const TOKEN_DECIMALS = 18;
const TOKEN_SYMBOL = 'TOKEN';

// DSO Token contract address from environment variables
const DSO_TOKEN_ADDRESS = import.meta.env.VITE_DSOTOKEN || '0xYourDefaultTokenAddress';

// Helper function to handle transaction errors
const handleTransactionError = (error, defaultMessage = 'Transaction failed') => {
  console.error('Transaction error:', error);
  const message = error?.shortMessage || error?.message || defaultMessage;
  
  // Handle common errors
  if (message.includes('user rejected')) {
    return { success: false, error: new Error('Transaction was rejected') };
  }
  
  if (message.includes('insufficient funds')) {
    return { success: false, error: new Error('Insufficient funds for transaction') };
  }
  
  return { success: false, error: new Error(message) };
};

export function useStaking() {
  const queryClient = useQueryClient();
  const { address, isConnected } = useAccount();
  
  const { 
    writeContract,
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite
  } = useWriteContract({
    mutation: {
      onError: (error) => {
        console.error('Write contract error:', error);
        toast.error(error.shortMessage || error.message || 'Transaction failed');
      },
      onSuccess: () => {
        // Invalidate all queries on success
        queryClient.invalidateQueries({ queryKey: ['staking'] });
      },
    },
  });
  
  // Check token allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: DSO_TOKEN_ADDRESS,
    abi: DSOTOKEN_ABI,
    functionName: 'allowance',
    args: [address, CONTRACT_ADDRESS],
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 10000, // Poll every 10 seconds
    },
  });
  
  // Get token balance
  const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
    address: DSO_TOKEN_ADDRESS,
    abi: DSOTOKEN_ABI,
    functionName: 'balanceOf',
    args: [address],
    query: {
      enabled: !!address && isConnected,
      select: (data) => formatEther(data),
    },
  });
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ 
      onSuccess: () => {
        toast.success('Transaction confirmed!');
        // Invalidate all relevant queries
        queryClient.invalidateQueries({ queryKey: ['staking'] });
        queryClient.invalidateQueries({ queryKey: ['userStakes'] });
        queryClient.invalidateQueries({ queryKey: ['pendingReward'] });
        queryClient.invalidateQueries({ queryKey: ['totalStaked'] });
        queryClient.invalidateQueries({ queryKey: ['allowance'] });
        
        // Refetch all data
        refetchAllowance();
        refetchTokenBalance();
      },
      onError: (error) => {
        const errorMessage = error.shortMessage || error.message || 'Transaction failed';
        console.error('Transaction error:', error);
        toast.error(errorMessage);
      }
    });

  const isProcessing = isWritePending || isConfirming;
  
  // Helper function to execute contract write operations
  const executeContractWrite = async (contractConfig) => {
    try {
      const hash = await writeContract({
        ...contractConfig,
        address: CONTRACT_ADDRESS,
        abi: stakingABI,
      });
      return { success: true, hash };
    } catch (error) {
      return handleTransactionError(error);
    }
  };
  
  // Approve token spending
  const approveTokens = async (amount) => {
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount to approve');
    }
    
    const toastId = toast.loading('Approving tokens...');
    
    try {
      const amountWei = parseEther(amount.toString());
      
      const { success, error, hash } = await executeContractWrite({
        address: DSO_TOKEN_ADDRESS,
        abi: DSOTOKEN_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESS, amountWei],
      });
      
      if (!success) throw error;
      
      // Wait for the approval to be confirmed
      toast.loading('Waiting for confirmation...', { id: toastId });
      await new Promise(resolve => setTimeout(resolve, 2000));
      await refetchAllowance();
      
      toast.success('Tokens approved successfully!', { id: toastId });
      return { success: true, hash };
      
    } catch (err) {
      console.error('Approval error:', err);
      toast.error(`Approval failed: ${err.shortMessage || err.message}`, { id: toastId });
      throw err;
    }
  };

  const stake = async (amount) => {
    if (!amount || amount <= 0) {
      throw new Error('Please enter a valid amount to stake');
    }
    
    const toastId = toast.loading('Processing stake...');
    
    try {
      const amountWei = parseEther(amount.toString());
      
      // First check if we need to approve tokens
      const { data: currentAllowance } = await refetchAllowance();
      
      if (!currentAllowance || currentAllowance < amountWei) {
        toast.loading('Approving tokens first...', { id: toastId });
        await approveTokens(amount);
        toast.loading('Processing stake...', { id: toastId });
      }
      
      const { success, error, hash } = await executeContractWrite({
        functionName: 'stake',
        args: [amountWei],
      });
      
      if (!success) throw error;
      
      toast.success('Stake successful!', { id: toastId });
      return { success: true, hash };
      
    } catch (err) {
      console.error('Staking error:', err);
      const errorMessage = err.shortMessage || err.message || 'Failed to stake tokens';
      toast.error(errorMessage, { id: toastId });
      throw err;
    }
  };

  const withdraw = async (amount) => {
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount to withdraw');
    }
    
    const toastId = toast.loading('Processing withdrawal...');
    
    try {
      const amountWei = parseEther(amount.toString());
      
      const { success, error, hash } = await executeContractWrite({
        functionName: 'withdraw',
        args: [amountWei],
      });
      
      if (!success) throw error;
      
      toast.success('Withdrawal successful!', { id: toastId });
      return { success: true, hash };
      
    } catch (err) {
      console.error('Withdrawal error:', err);
      const errorMessage = err.shortMessage || err.message || 'Failed to withdraw tokens';
      toast.error(errorMessage, { id: toastId });
      throw err;
    }
  };
  
  const claimRewards = async () => {
    const toastId = toast.loading('Claiming rewards...');
    
    try {
      const { success, error, hash } = await executeContractWrite({
        functionName: 'claimRewards',
      });
      
      if (!success) throw error;
      
      toast.success('Rewards claimed successfully!', { id: toastId });
      return { success: true, hash };
      
    } catch (err) {
      console.error('Claim rewards error:', err);
      const errorMessage = err.shortMessage || err.message || 'Failed to claim rewards';
      toast.error(errorMessage, { id: toastId });
      throw err;
    }
  };

  const emergencyWithdraw = async (positionId) => {
    if (positionId === undefined || positionId === null) {
      throw new Error('Invalid position ID');
    }
    
    const toastId = toast.loading('Processing emergency withdrawal...');
    
    try {
      const { success, error, hash } = await executeContractWrite({
        functionName: 'emergencyWithdraw',
        args: [positionId],
      });
      
      if (!success) throw error;
      
      toast.success('Emergency withdrawal successful!', { id: toastId });
      return { success: true, hash };
      
    } catch (err) {
      console.error('Emergency withdrawal error:', err);
      const errorMessage = err.shortMessage || err.message || 'Failed to process emergency withdrawal';
      toast.error(errorMessage, { id: toastId });
      throw err;
    }
  };

  // Get user info
  const getUserInfo = async (userAddress) => {
    try {
      const data = await readContract({
        address: CONTRACT_ADDRESS,
        abi: stakingABI,
        functionName: 'userInfo',
        args: [userAddress],
      });
      
      return {
        amount: formatEther(data.amount),
        rewardDebt: formatEther(data.rewardDebt),
      };
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw error;
    }
  };

  // Get pending rewards
  const getPendingRewards = async (userAddress) => {
    try {
      const rewards = await readContract({
        address: CONTRACT_ADDRESS,
        abi: stakingABI,
        functionName: 'pendingReward',
        args: [userAddress],
      });
      
      return formatEther(rewards);
    } catch (error) {
      console.error('Error fetching pending rewards:', error);
      throw error;
    }
  };

  return {
    // Actions
    stake,
    withdraw,
    claimRewards,
    emergencyWithdraw,
    
    // Getters
    getUserInfo,
    getPendingRewards,
    
    // State
    isProcessing,
    isConfirmed,
    tokenBalance,
    allowance,
    
    // Error handling
    error: writeError,
    reset: resetWrite
  };
}
