import React, { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { useStaking } from '../hooks/useStaking';
import { useStakingData } from '../hooks/useStakingData';
import { WithdrawForm } from './WithdrawForm';
import RewardsSection from './RewardsSection';
import EmergencyWithdraw from './EmergencyWithdraw';
import { StakePositions } from './StakePositions';
import { toast } from 'react-hot-toast';

const Dashboard = () => {
  const { isConnected, address } = useAccount();
  const navigate = useNavigate();
  const [stakeAmount, setStakeAmount] = useState('');
  const [tokenBalance, setTokenBalance] = useState('0');
  
  // Fetch token balance
  const { data: balanceData } = useBalance({
    address,
    token: '0xYourTokenAddressHere', // Replace with your token address
    watch: true,
  });
  
  useEffect(() => {
    if (balanceData) {
      setTokenBalance(balanceData.formatted);
    }
  }, [balanceData]);
  
  // Custom hooks for staking functionality and data
  const { 
    stake, 
    withdraw,
    claimRewards,
    emergencyWithdraw,
    isProcessing,
    error 
  } = useStaking();
  
  // Fetch all staking data
  const {
    userStakes,
    pendingRewards,
    totalStaked,
    apr,
    tvl,
    isLoading,
    refetchAll
  } = useStakingData();

  // Handle stake submission
  const handleStake = async (e) => {
    e.preventDefault();
    if (!stakeAmount || isNaN(stakeAmount) || parseFloat(stakeAmount) <= 0) {
      toast.error('Please enter a valid amount to stake');
      return;
    }
    
    try {
      await stake(stakeAmount);
      setStakeAmount('');
      // Refresh all data after successful stake
      await refetchAll();
    } catch (error) {
      console.error('Staking error:', error);
      toast.error(error.shortMessage || error.message || 'Failed to stake tokens');
    }
  };

  // Handle rewards claim
  const handleClaimRewards = async () => {
    try {
      await claimRewards();
      await refetchAll();
    } catch (error) {
      console.error('Claim error:', error);
      toast.error(error.shortMessage || error.message || 'Failed to claim rewards');
    }
  };

  // Handle emergency withdraw
  const handleEmergencyWithdraw = async (positionId) => {
    try {
      await emergencyWithdraw(positionId);
      await refetchAll();
    } catch (error) {
      console.error('Emergency withdraw error:', error);
      toast.error(error.shortMessage || error.message || 'Failed to process emergency withdrawal');
    }
  };

  // Handle regular withdraw
  const handleWithdraw = async (amount) => {
    try {
      await withdraw(amount);
      await refetchAll();
    } catch (error) {
      console.error('Withdraw error:', error);
      throw error; // Re-throw to be handled by WithdrawForm
    }
  };

  // Show connect wallet screen if not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6">Please connect your wallet to view the staking dashboard.</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-blue-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/')}
                className="text-white hover:text-indigo-100 text-lg font-medium flex items-center transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Home
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <div className="h-2.5 w-2.5 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-white">
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not Connected'}
                </span>
              </div>
              <ConnectButton />
            </div>
          </div>
          
          {/* Stats Overview */}
          <div className="pt-2 pb-6">
            <h1 className="text-3xl font-bold text-white mb-2">Staking Dashboard</h1>
            <p className="text-indigo-100">Manage your staked tokens and track your rewards</p>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value Locked</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {isLoading ? '...' : `${parseFloat(tvl).toLocaleString()} TOKEN`}
                </div>
                <div className="text-xs text-indigo-500 mt-1">Across all users</div>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Current APR</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{isLoading ? '...' : `${apr}%`}</div>
                <div className="text-xs text-green-500 mt-1">Annual Percentage Rate</div>
              </div>
              
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Your Total Staked</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {isLoading ? '...' : `${parseFloat(totalStaked).toLocaleString(undefined, { maximumFractionDigits: 4 })} TOKEN`}
                </div>
                <div className="text-xs text-yellow-500 mt-1">Across all positions</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-container">
        {/* Main Content Grid */}
        <div className="dashboard-grid">

          {/* Left Column - Staking Actions */}
          <div className="space-y-6">
            {/* Staking Form */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Stake Tokens
                </h2>
              </div>
              <div className="card-body">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Stake Tokens</h2>
                <form onSubmit={handleStake} className="space-y-4">
                  <div className="form-group">
                    <label className="form-label">Amount to Stake</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        className="form-input pl-3 pr-12 py-3 text-base"
                        placeholder="0.0"
                        disabled={isProcessing}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">TOKEN</span>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Available: {tokenBalance ? parseFloat(tokenBalance).toFixed(4) : '0.0000'} TOKEN
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isProcessing || !stakeAmount || parseFloat(stakeAmount) <= 0}
                    className={`btn btn-primary w-full py-3 text-base ${
                      isProcessing || !stakeAmount || parseFloat(stakeAmount) <= 0 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      'Stake Tokens'
                    )}
                  </button>
                  {error && (
                    <div className="mt-3 p-3 bg-red-50 border-l-4 border-red-400 text-red-700 text-sm rounded">
                      <p>{error.shortMessage || error.message || 'Failed to stake tokens'}</p>
                    </div>
                  )}
                </form>
              </div>
            </div>

            {/* Withdraw Form */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7l4-4m0 0l4 4m-4-4v18m-1-8v8m-2 0h4m5-13v5.576c0 .17-.02.335-.059.495l-1.233 4.816a1 1 0 01-.98.796H7.272a1 1 0 01-.98-.796L5.06 13.07a1.5 1.5 0 01-.06-.495V6" />
                  </svg>
                  Withdraw Tokens
                </h2>
              </div>
              <div className="card-body">
                <WithdrawForm 
                  onWithdraw={handleWithdraw}
                  isProcessing={isProcessing}
                  maxAmount={totalStaked}
                />
              </div>
            </div>

            {/* Emergency Withdraw */}
            <div className="card border-red-100">
              <div className="card-header bg-red-50">
                <h2 className="card-title text-red-700">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Emergency Withdraw
                </h2>
              </div>
              <div className="card-body">
                <EmergencyWithdraw 
                  onEmergencyWithdraw={handleEmergencyWithdraw}
                  userStakes={userStakes || []}
                  isProcessing={isProcessing}
                />
              </div>
            </div>
          </div>

          {/* Right Column - Staking Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Rewards Section */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <svg className="w-5 h-5 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Your Rewards
                </h2>
              </div>
              <div className="card-body">
                <RewardsSection 
                  pendingRewards={pendingRewards}
                  onClaim={handleClaimRewards}
                  isProcessing={isProcessing}
                  apr={apr}
                  totalStaked={totalStaked}
                />
              </div>
            </div>

            {/* Staking Positions */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Your Staking Positions
                </h2>
              </div>
              <div className="card-body">
                <StakePositions 
                  userStakes={userStakes || []}
                  isLoading={isLoading}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Staking dApp. All rights reserved.
            </p>
            <div className="mt-4 md:mt-0 flex space-x-6">
              <a href="#" className="text-gray-400 hover:text-gray-500">
                <span className="sr-only">Twitter</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-500">
                <span className="sr-only">GitHub</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-500">
                <span className="sr-only">Discord</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.1 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.1c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.84 19.84 0 006.006-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.158-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.158 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export { Dashboard };
