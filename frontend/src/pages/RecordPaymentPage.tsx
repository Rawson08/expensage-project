import React, { useState } from 'react'; // Removed useEffect, useCallback
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext'; // Use context for friends
import { PaymentCreateRequest } from '../types/api'; // Removed UserResponse, PaymentResponseDto, FriendshipResponseDto
import { recordPayment } from '../services/paymentService'; // Only need recordPayment
import { toast } from 'react-toastify';
import { XMarkIcon } from '@heroicons/react/24/outline';

const RecordPaymentPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Get friends list from context
  const { friends: contextFriends, isLoading: isContextLoading, error: contextError, fetchData: refreshDataContext } = useData();

  // Form State
  const [otherUserId, setOtherUserId] = useState<string>(''); // Renamed state variable
  const [paymentDirection, setPaymentDirection] = useState<'paidTo' | 'receivedFrom'>('paidTo'); // User paid someone vs received from someone
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Filtered list of friends for dropdown
  const friendOptions = contextFriends.map(f => f.otherUser);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!otherUserId || !amount || parseFloat(amount) <= 0) { // Use renamed state variable
      setError('Please select a friend and enter a valid positive amount.');
      return;
    }

    const numericOtherUserId = parseInt(otherUserId, 10); // Use renamed state variable
    const numericAmount = parseFloat(amount);

    if (isNaN(numericOtherUserId) || isNaN(numericAmount) || !user) { // Use renamed state variable
        setError('Invalid user ID or amount.');
        return;
    }

    // Determine paidToUserId based on direction (paidBy is inferred by backend)
    const paidToUserIdFinal = paymentDirection === 'paidTo' ? numericOtherUserId : user.id;
    // const paidByUserId = paymentDirection === 'paidTo' ? user.id : numericOtherUserId; // paidByUserId is not needed in request

    const paymentData: PaymentCreateRequest = {
      paidToUserId: paidToUserIdFinal,
      // paidByUserId is inferred by backend based on authenticated user
      amount: numericAmount,
      date: date,
      currency: 'USD', // Assuming USD for now
      groupId: null, // Explicitly null for non-group payments
    };

    setLoading(true);
    try {
      await recordPayment(paymentData); // Don't need to store savedPayment if unused
      toast.success("Payment recorded successfully!");
      refreshDataContext(); // Refresh data context
      navigate('/app/activity'); // Navigate to activity feed after saving
    } catch (err: any) {
      console.error(`Failed to record payment:`, err);
      setError(err.message || `Could not record payment.`);
      toast.error(`Failed to record payment: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (isContextLoading) return <div className="p-4 text-center">Loading data...</div>;
  if (contextError) return <div className="p-4 text-center text-red-500">Error loading data: {contextError}</div>;


  return (
     <div className="flex flex-col h-screen bg-gray-50">
        {/* Header */}
        <header className="flex items-center justify-between p-4 bg-white border-b flex-shrink-0">
            <button onClick={() => navigate(-1)} className="text-gray-600"><XMarkIcon className="h-6 w-6" /></button>
            <h1 className="text-lg font-semibold">Record a Payment</h1>
            <button onClick={handleSubmit} disabled={loading || !otherUserId || !amount} className="text-blue-600 font-semibold disabled:opacity-50"> {/* Use renamed state variable */}
                {loading ? 'Saving...' : 'Save'}
            </button>
        </header>

        {/* Form Body */}
        <main className="flex-grow p-4 space-y-4 overflow-y-auto">
             <form onSubmit={handleSubmit} className="space-y-4">
                {/* Payment Direction Toggle */}
                 <div className="flex justify-center p-1 bg-gray-200 rounded-lg">
                    <button
                        type="button"
                        onClick={() => setPaymentDirection('paidTo')}
                        className={`w-1/2 py-2 px-4 rounded-md text-sm font-medium ${paymentDirection === 'paidTo' ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        You paid someone
                    </button>
                    <button
                        type="button"
                        onClick={() => setPaymentDirection('receivedFrom')}
                        className={`w-1/2 py-2 px-4 rounded-md text-sm font-medium ${paymentDirection === 'receivedFrom' ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        Someone paid you
                    </button>
                </div>

                {/* Friend Selection */}
                <div>
                    <label htmlFor="paidUser" className="block text-sm font-medium text-gray-700">
                    {paymentDirection === 'paidTo' ? 'Recipient:' : 'Payer:'}
                    </label>
                    <select
                    id="paidUser"
                    value={otherUserId} // Use renamed state variable
                    onChange={(e) => setOtherUserId(e.target.value)} // Use renamed state variable setter
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                    disabled={loading || friendOptions.length === 0}
                    >
                    <option value="">-- Select Friend --</option>
                    {friendOptions.map((friend) => (
                        <option key={friend.id} value={friend.id}>
                        {friend.name} ({friend.email})
                        </option>
                    ))}
                    </select>
                    {friendOptions.length === 0 && <p className="text-xs text-gray-500 mt-1">You have no friends to record payments with.</p>}
                </div>

                {/* Amount */}
                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount:</label>
                    <input
                    type="number"
                    id="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    min="0.01"
                    step="0.01"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="0.00"
                    disabled={loading}
                    />
                </div>

                {/* Date */}
                <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date:</label>
                    <input
                    type="date"
                    id="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    disabled={loading}
                    />
                </div>

                {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

                {/* Submit button is in the header */}
             </form>
        </main>
     </div>
  );
};

export default RecordPaymentPage;