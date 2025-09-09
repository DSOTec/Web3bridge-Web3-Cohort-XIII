import { useState } from 'react';
import { toast } from 'react-hot-toast';

export default function RewardsSection({ 
  pendingRewards = '0', 
  onClaim, 
  isProcessing = false, 
  apr = '0',
  totalStaked = '0'
}) {
  const [isClaiming, setIsClaiming] = useState(false);
  const pendingRewardsNum = parseFloat(pendingRewards) || 0;
  const aprNum = parseFloat(apr) || 0;
  const totalStakedNum = parseFloat(totalStaked) || 0;

  const handleClaim = async () => {
    if (pendingRewardsNum <= 0) return;
    
    try {
      setIsClaiming(true);
      await onClaim();
      toast.success('Rewards claimed successfully!');
    } catch (error) {
      console.error('Claim error:', error);
      toast.error(error.message || 'Failed to claim rewards');
    } finally {
      setIsClaiming(false);
    }
  };

  // Calculate daily rewards
  const dailyRewards = ((aprNum / 365) * totalStakedNum / 100).toFixed(6);
  const pendingDailyRewards = (pendingRewardsNum * (aprNum / 100) / 365).toFixed(6);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex flex-col space-y-4">
        {/* Rewards Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Your Rewards</h3>
          <div className="text-2xl font-bold text-indigo-600">
            {pendingRewardsNum.toFixed(4)} TOKEN
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="bg-indigo-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Current APR</p>
              <p className="text-lg font-semibold">{aprNum.toFixed(2)}%</p>
              <p className="text-xs text-gray-500">~{pendingDailyRewards} TOKEN/day</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Staked</p>
              <p className="text-lg font-semibold">{totalStakedNum.toFixed(4)} TOKEN</p>
              <p className="text-xs text-gray-500">~{dailyRewards} TOKEN/day</p>
            </div>
          </div>
        </div>
        
        {/* Claim Button */}
        <button
          onClick={handleClaim}
          disabled={isProcessing || pendingRewardsNum <= 0}
          className={`w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            pendingRewardsNum > 0 
              ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500' 
              : 'bg-gray-400 cursor-not-allowed'
          } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isProcessing ? 'opacity-70' : ''
          }`}
        >
          {isProcessing || isClaiming ? (
            <>
              <svg 
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Claiming...
            </>
          ) : (
            `Claim ${pendingRewardsNum.toFixed(4)} TOKEN`
          )}
        </button>
      </div>
    </div>
  );
}
