import { formatDistanceToNow } from 'date-fns';

export function StakePositions({ userStakes, isLoading }) {
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    }).format(date);
  };

  const getTimeRemaining = (timestamp) => {
    if (!timestamp) return '';
    const now = Math.floor(Date.now() / 1000);
    if (timestamp <= now) return 'Unlocked';
    
    const diff = timestamp - now;
    const days = Math.floor(diff / (3600 * 24));
    const hours = Math.floor((diff % (3600 * 24)) / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    
    if (days > 0) return `Unlocks in ${days}d ${hours}h`;
    if (hours > 0) return `Unlocks in ${hours}h ${minutes}m`;
    return `Unlocks in ${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-24 bg-gray-100 rounded-xl"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!userStakes || userStakes.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <div className="mx-auto w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
          <svg
            className="h-8 w-8 text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No active positions</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          You don't have any staked tokens yet. Stake tokens to start earning rewards.
        </p>
      </div>
    );
  }

  const totalStaked = userStakes.reduce((sum, stake) => sum + parseFloat(stake.amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-800">Your Staking Positions</h2>
        <div className="text-right">
          <p className="text-sm text-gray-500">Total Staked</p>
          <p className="text-lg font-bold text-indigo-600">{totalStaked.toFixed(4)} TOKEN</p>
        </div>
      </div>
      <div>
        {userStakes.map((stake, index) => {
          const isLocked = stake.unlockTime * 1000 > Date.now();
          const timeRemaining = getTimeRemaining(stake.unlockTime);
          
          return (
            <div key={index} className="position-card group hover:shadow-md transition-shadow p-4 mb-4 bg-white rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {parseFloat(stake.amount).toFixed(4)} <span className="text-lg text-gray-600">TOKEN</span>
                  </div>
                  <div className="mt-1 flex items-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${isLocked ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                      {isLocked ? 'Locked' : 'Unlocked'}
                    </span>
                    <span className="ml-2 text-sm text-gray-500">
                      {timeRemaining}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Unlocks on</div>
                  <div className="text-sm font-medium text-gray-700">
                    {formatDate(stake.unlockTime)}
                  </div>
                </div>
              </div>
              
              {isLocked && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Unlock progress</span>
                    <span className="font-medium text-gray-700">
                      {Math.min(100, Math.round(((Date.now() / 1000 - stake.startTime) / 
                        (stake.unlockTime - stake.startTime)) * 100))}%
                    </span>
                  </div>
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full" 
                      style={{
                        width: `${Math.min(100, Math.round(((Date.now() / 1000 - stake.startTime) / 
                          (stake.unlockTime - stake.startTime)) * 100))}%`
                      }}
                    ></div>
                  </div>
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Start Date</div>
                    <div className="font-medium">
                      {new Date(stake.startTime * 1000).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Reward Debt</div>
                    <div className="font-medium">
                      {parseFloat(stake.rewardDebt || 0).toFixed(4)} TOKEN
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
