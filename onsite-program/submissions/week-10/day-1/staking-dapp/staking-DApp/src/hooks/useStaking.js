import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { parseEther, formatEther } from 'viem';
import { toast } from 'react-hot-toast';
import { CONTRACT_ADDRESS } from '../config/rainbowkit';
import { STAKING_CONTRACT_ABI as stakingABI, DSOTOKEN_ABI } from '../config/ABI';

const DSO_TOKEN_ADDRESS = import.meta.env.VITE_DSOTOKEN;

export function useStaking() {
    const { address, isConnected } = useAccount();
    const queryClient = useQueryClient();

    // --- Allowance check ---
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: DSO_TOKEN_ADDRESS,
        abi: DSOTOKEN_ABI,
        functionName: 'allowance',
        args: [address, CONTRACT_ADDRESS],
        query: { enabled: !!address && isConnected },
    });

    // --- Token balance ---
    const { data: tokenBalance } = useReadContract({
        address: DSO_TOKEN_ADDRESS,
        abi: DSOTOKEN_ABI,
        functionName: 'balanceOf',
        args: [address],
        query: { enabled: !!address && isConnected },
    });

    // --- Write contracts ---
    const { writeContract, isPending: isWritePending, error: writeError, reset } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        onSuccess: () => {
            toast.success('Transaction confirmed');
            queryClient.invalidateQueries(); // refresh all
            refetchAllowance();
        },
    });

    const isProcessing = isWritePending || isConfirming;

    // --- Actions ---
    const approveTokens = async (amount) => {
        const toastId = toast.loading('Approving tokens...');
        const hash = await writeContract({
            address: DSO_TOKEN_ADDRESS,
            abi: DSOTOKEN_ABI,
            functionName: 'approve',
            args: [CONTRACT_ADDRESS, parseEther(amount.toString())],
        });
        toast.success('Tokens approved!', { id: toastId });
        return hash;
    };

    const stake = async (amount) => {
        if (!amount || amount <= 0) return toast.error('Invalid stake amount');
        const amountWei = parseEther(amount.toString());

        if (!allowance || allowance < amountWei) {
            await approveTokens(amount);
        }

        await writeContract({
            address: CONTRACT_ADDRESS,
            abi: stakingABI,
            functionName: 'stake',
            args: [amountWei],
        });

        toast.success('Staked successfully!');
    };

    const withdraw = async (amount) => {
        if (!amount || amount <= 0) return toast.error('Invalid withdrawal amount');
        await writeContract({
            address: CONTRACT_ADDRESS,
            abi: stakingABI,
            functionName: 'withdraw',
            args: [parseEther(amount.toString())],
        });
        toast.success('Withdraw successful!');
    };

    const claimRewards = async () => {
        await writeContract({
            address: CONTRACT_ADDRESS,
            abi: stakingABI,
            functionName: 'claimRewards',
        });
        toast.success('Rewards claimed!');
    };

    const emergencyWithdraw = async () => {
        await writeContract({
            address: CONTRACT_ADDRESS,
            abi: stakingABI,
            functionName: 'emergencyWithdraw',
        });
        toast.success('Emergency withdrawal successful!');
    };

    return {
        stake,
        withdraw,
        claimRewards,
        emergencyWithdraw,
        approveTokens,
        allowance,
        tokenBalance: tokenBalance ? formatEther(tokenBalance) : '0',
        isProcessing,
        isConfirmed,
        error: writeError,
        reset,
    };
}
