import { useState } from 'react';
import { toast } from 'react-hot-toast';

const EmergencyWithdraw = ({ onEmergencyWithdraw, userStakes, isProcessing }) => {
  const [selectedStake, setSelectedStake] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleEmergencyWithdraw = async () => {
    if (!selectedStake) return;
    
    try {
      await onEmergencyWithdraw(selectedStake);
      setSelectedStake(null);
      setShowConfirm(false);
      toast.success('Emergency withdrawal successful');
    } catch (error) {
      console.error('Emergency withdrawal failed:', error);
      toast.error(error.shortMessage || 'Emergency withdrawal failed');
    }
  };

  if (!userStakes || userStakes.length === 0) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-red-800">No active positions</p>
            <p className="mt-1 text-sm text-red-700">
              There are no staked positions available for emergency withdrawal.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="space-y-4">
      {/* Warning Banner */}
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Emergency Withdraw</h3>
            <div className="mt-1 text-sm text-red-700 space-y-1">
              <p>Use this only if you need to withdraw immediately. This action will:</p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>Charge a 10% penalty on your staked amount</li>
                <li>Forfeit all pending rewards</li>
                <li>Be processed immediately without waiting for unlock time</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Position Selection */}
      <div className="space-y-2">
        <label htmlFor="stake-select" className="block text-sm font-medium text-gray-700">
          Select Position to Withdraw
        </label>
        <select
          id="stake-select"
          value={selectedStake?.id || ''}
          onChange={(e) => {
            const stake = userStakes.find(s => s.id === e.target.value);
            setSelectedStake(stake || null);
          }}
          className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md shadow-sm"
        >
          <option value="">Select a staked position</option>
          {userStakes.map((stake) => (
            <option key={stake.id} value={stake.id}>
              {parseFloat(stake.amount).toFixed(4)} TOKEN • Unlocks: {formatDate(stake.unlockTime)}
            </option>
          ))}
        </select>
      </div>

      {/* Selected Position Details */}
      {selectedStake && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Emergency Withdraw {parseFloat(selectedStake.amount).toFixed(4)} TOKEN
              </h3>
              <div className="mt-2 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">You will receive:</span>
                  <span className="font-medium">
                    {(parseFloat(selectedStake.amount) * 0.9).toFixed(4)} TOKEN
                    <span className="text-red-600 ml-1">(-10% penalty)</span>
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Forfeited rewards:</span>
                  <span className="font-medium text-red-600">All pending rewards</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Original unlock time:</span>
                  <span className="font-medium">{formatDate(selectedStake.unlockTime)}</span>
                </div>
              </div>
              <div className="mt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowConfirm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isProcessing}
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
                    'Emergency Withdraw'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStake(null)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed z-50 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowConfirm(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Confirm Emergency Withdrawal
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        You are about to emergency withdraw <span className="font-medium">{parseFloat(selectedStake?.amount).toFixed(4)} TOKEN</span>.
                        This action will charge a 10% penalty and forfeit all pending rewards.
                      </p>
                      <div className="mt-4 p-3 bg-red-50 rounded-md text-sm">
                        <p className="font-medium text-red-800">You will receive: {(parseFloat(selectedStake?.amount) * 0.9).toFixed(4)} TOKEN</p>
                      </div>
                      <p className="mt-3 text-sm text-gray-500">
                        This action cannot be undone. Are you sure you want to continue?
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleEmergencyWithdraw}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Confirm Emergency Withdrawal'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmergencyWithdraw;
