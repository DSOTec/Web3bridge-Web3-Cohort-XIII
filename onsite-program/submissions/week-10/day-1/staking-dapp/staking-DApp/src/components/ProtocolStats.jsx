import { useState } from 'react';
import { useProtocolStats } from '../hooks/useProtocolStats.js';

export default function ProtocolStats() {
  const [newRewardRate, setNewRewardRate] = useState('');
  const { 
    formattedTotalStaked, 
    formattedRewardRate, 
    apr, 
    isOwner, 
    updateRewardRate,
    isProcessing 
  } = useProtocolStats();

  const handleUpdateRewardRate = async (e) => {
    e.preventDefault();
    if (!newRewardRate || isNaN(newRewardRate) || parseFloat(newRewardRate) < 0) {
      alert('Please enter a valid reward rate');
      return;
    }
    
    try {
      await updateRewardRate(newRewardRate);
      setNewRewardRate('');
    } catch (error) {
      console.error('Failed to update reward rate:', error);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-medium text-gray-900 mb-6">Protocol Statistics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Staked */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-gray-500">Total Value Locked</p>
          <p className="text-2xl font-semibold text-gray-900">{formattedTotalStaked} TOKEN</p>
        </div>
        
        {/* Reward Rate */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-gray-500">Reward Rate</p>
          <p className="text-2xl font-semibold text-gray-900">{formattedRewardRate} TOKEN/block</p>
        </div>
        
        {/* APR */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-gray-500">Estimated APR</p>
          <p className="text-2xl font-semibold text-gray-900">{apr}%</p>
        </div>
      </div>

      {/* Owner Controls */}
      {isOwner && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-md font-medium text-gray-900 mb-4">Owner Controls</h3>
          
          <form onSubmit={handleUpdateRewardRate} className="space-y-4">
            <div>
              <label htmlFor="rewardRate" className="block text-sm font-medium text-gray-700 mb-1">
                Update Reward Rate (TOKEN/block)
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="number"
                  name="rewardRate"
                  id="rewardRate"
                  step="0.000000000000000001"
                  min="0"
                  className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-none rounded-l-md sm:text-sm border-gray-300 p-2 border"
                  placeholder={formattedRewardRate}
                  value={newRewardRate}
                  onChange={(e) => setNewRewardRate(e.target.value)}
                  disabled={isProcessing}
                />
                <button
                  type="submit"
                  disabled={isProcessing || !newRewardRate}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white ${
                    isProcessing || !newRewardRate
                      ? 'bg-indigo-300 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {isProcessing ? 'Updating...' : 'Update'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Current rate: {formattedRewardRate} TOKEN/block
              </p>
            </div>
          </form>
          
          <div className="mt-6">
            <button
              onClick={() => {
                if (window.confirm('WARNING: This will trigger emergency withdrawal for ALL stakers. Are you sure?')) {
                  // Implement emergency withdraw all functionality
                  alert('Emergency withdrawal initiated for all stakers');
                }
              }}
              disabled={isProcessing}
              className={`px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                isProcessing
                  ? 'bg-red-300 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isProcessing ? 'Processing...' : 'Emergency Withdraw All'}
            </button>
            <p className="mt-2 text-xs text-red-600">
              Warning: This will allow all stakers to withdraw their funds immediately with a penalty.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
