import { useState } from 'react';
import { parseEther } from 'viem';
import { toast } from 'react-hot-toast';

export function WithdrawForm({ onWithdraw, isProcessing, maxAmount }) {
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isMaxSelected, setIsMaxSelected] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error('Please enter a valid amount to withdraw');
      return;
    }
    
    if (parseFloat(withdrawAmount) > parseFloat(maxAmount)) {
      toast.error('Insufficient staked balance');
      return;
    }
    
    try {
      await onWithdraw(withdrawAmount);
      setWithdrawAmount('');
      setIsMaxSelected(false);
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error(`Withdrawal failed: ${error.shortMessage || error.message}`);
    }
  };

  const handleMaxClick = () => {
  };

  return (
    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Withdraw Tokens</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-group">
          <label className="form-label">Amount to Withdraw</label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <input
              type="number"
              step="any"
              min="0"
              max={maxAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="form-input pl-3 pr-12 py-3 text-base"
              placeholder="0.0"
              disabled={isProcessing}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <span className="text-gray-500 sm:text-sm">TOKEN</span>
            </div>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500">
              Available: {parseFloat(maxAmount).toFixed(4)} TOKEN
            </span>
            <button
              type="button"
              onClick={() => setAmount(maxAmount.toString())}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              disabled={isProcessing}
            >
              MAX
            </button>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={isProcessing || !amount || parseFloat(amount) <= 0}
          className={`btn btn-primary w-full py-3 text-base ${
            isProcessing || !amount || parseFloat(amount) <= 0 ? 'opacity-50 cursor-not-allowed' : ''
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
            'Withdraw Tokens'
          )}
        </button>
        
        {error && (
          <div className="mt-3 p-3 bg-red-50 border-l-4 border-red-400 text-red-700 text-sm rounded">
            <p>{error}</p>
          </div>
        )}
      </form>
    </div>
  );
}
