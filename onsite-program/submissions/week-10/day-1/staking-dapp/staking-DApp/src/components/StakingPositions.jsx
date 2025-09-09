import { formatEther } from 'viem';
import { useStaking } from '../hooks/useStaking.js';
import { useRewards } from '../hooks/useRewards.js';
import { useStakingPositions } from '../hooks/useStakingPositions.js';

export default function StakingPositions() {
  // Use custom hooks
  const { positions, isLoading, refresh } = useStakingPositions();
  const { claimRewards, pendingRewards } = useRewards();
  const { emergencyWithdraw, isProcessing } = useStaking();

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (!positions || positions.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Your Staking Positions</h2>
        <p className="text-gray-500">No active staking positions found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Your Staking Positions</h2>
        <button
          onClick={refresh}
          className="text-sm text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded"
          disabled={isProcessing}
        >
          Refresh
        </button>
      </div>
      
      <div className="border-t border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount Staked
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unlock Time
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {positions.map((position, index) => {
              const unlockDate = new Date(Number(position.unlockTime) * 1000);
              const isLocked = position.unlockTime * 1000 > Date.now();
              
              return (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatEther(position.amount)} TOKEN
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {unlockDate.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      isLocked 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {isLocked ? 'Locked' : 'Unlocked'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to emergency withdraw? A penalty fee will be applied.')) {
                          emergencyWithdraw(position.id || index);
                        }
                      }}
                      disabled={isProcessing}
                      className={`text-sm ${
                        isProcessing 
                          ? 'text-gray-400 cursor-not-allowed' 
                          : 'text-red-600 hover:text-red-900'
                      }`}
                      title="Emergency Withdraw (with penalty)"
                    >
                      {isProcessing ? 'Processing...' : 'Emergency Withdraw'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Pending Rewards */}
      {pendingRewards > 0n && (
        <div className="bg-indigo-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-700">
                Pending Rewards: <span className="font-medium">{formatEther(pendingRewards)} TOKEN</span>
              </p>
            </div>
            <button
              onClick={claimRewards}
              disabled={isProcessing || pendingRewards <= 0n}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                isProcessing || pendingRewards <= 0n
                  ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
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
