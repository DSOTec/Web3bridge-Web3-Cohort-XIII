import { useState, useEffect } from 'react';
import { formatEther } from 'viem';
import { toast } from 'react-hot-toast';
import { useStaking } from '../hooks/useStaking.js';
import { useRewards } from '../hooks/useRewards.js';
import { useStakingPositions } from '../hooks/useStakingPositions.js';

export default function StakingForm() {
  const [amount, setAmount] = useState('');
  const [action, setAction] = useState('stake'); // 'stake' or 'withdraw'
  
  // Use custom hooks
  const { stake, withdraw, isProcessing } = useStaking();
  const { pendingRewards, claimRewards } = useRewards();
  const { positions } = useStakingPositions();
  
  // Reset form when action changes
  useEffect(() => {
    setAmount('');
  }, [action]);

  // Calculate total staked amount
  const totalStaked = positions.reduce((sum, pos) => sum + BigInt(pos.amount || 0), 0n);
  const hasStake = totalStaked > 0n;
  const maxWithdrawAmount = action === 'withdraw' ? formatEther(totalStaked) : '';

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    try {
      if (action === 'stake') {
        await stake(amount);
      } else {
        await withdraw(amount);
      }
      
      // Reset form on success (handled in the hook)
      setAmount('');
    } catch (error) {
      console.error('Transaction error:', error);
      // Error is already handled in the hook
    }
  };
  
  // Handle max button click
  const handleMaxClick = () => {
    if (action === 'withdraw' && maxWithdrawAmount) {
      setAmount(maxWithdrawAmount);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-medium text-gray-900 mb-4">
        {action === 'stake' ? 'Stake Tokens' : 'Withdraw Tokens'}
      </h2>
      
      {/* Action Toggle */}
      <div className="flex rounded-md shadow-sm mb-6">
        <button
          type="button"
          onClick={() => setAction('stake')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-l-md ${
            action === 'stake'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Stake
        </button>
        <button
          type="button"
          onClick={() => setAction('withdraw')}
          disabled={!hasStake}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-r-md ${
            !hasStake
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : action === 'withdraw'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Withdraw
        </button>
      </div>

      {/* Stake/Withdraw Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            {action === 'stake' ? 'Amount to Stake' : 'Amount to Withdraw'}
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <input
              type="number"
              name="amount"
              id="amount"
              step="0.000000000000000001"
              min="0"
              max={action === 'withdraw' ? maxWithdrawAmount : undefined}
              className="block w-full pr-12 sm:text-sm border-gray-300 rounded-md p-2 border"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isProcessing || (action === 'withdraw' && !hasStake)}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">TOKEN</span>
            </div>
            {action === 'withdraw' && hasStake && (
              <div className="absolute right-0 top-0 h-full flex items-center pr-2">
                <button
                  type="button"
                  onClick={handleMaxClick}
                  className="text-xs bg-gray-100 hover:bg-gray-200 rounded px-2 py-1 text-gray-600"
                  disabled={isProcessing}
                >
                  MAX
                </button>
              </div>
            )}
          </div>
          {action === 'withdraw' && hasStake && (
            <p className="mt-1 text-xs text-gray-500">
              Available: {formatEther(totalStaked)} TOKEN
            </p>
          )}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isProcessing || (action === 'withdraw' && !hasStake)}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              isProcessing || (action === 'withdraw' && !hasStake)
                ? 'bg-indigo-300 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isProcessing ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : action === 'stake' ? (
              'Stake Tokens'
            ) : (
              'Withdraw Tokens'
            )}
          </button>
        </div>
      </form>

      {/* Claim Rewards Section */}
      {pendingRewards > 0n && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Pending Rewards</p>
              <p className="text-lg font-semibold">{formatEther(pendingRewards)} TOKEN</p>
            </div>
            <button
              onClick={claimRewards}
              disabled={isProcessing}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                isProcessing
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isProcessing ? 'Processing...' : 'Claim Rewards'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
