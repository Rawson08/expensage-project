import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserResponse, PaymentResponseDto } from '../types/api';
import { PaymentCreateRequest } from '../types/api';
import { recordPayment, updatePayment } from '../services/paymentService';

interface AddPaymentFormProps {
  groupId: number;
  groupMembers: UserResponse[];
  onPaymentSaved: (savedPayment: PaymentResponseDto) => void;
  onCancel: () => void;
  initialData?: PaymentResponseDto | null;
}

const AddPaymentForm: React.FC<AddPaymentFormProps> = ({
  groupId,
  groupMembers,
  onPaymentSaved,
  onCancel,
  initialData = null,
}) => {
  const { user } = useAuth();
  const [paidToUserId, setPaidToUserId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isEditing = !!initialData;

  useEffect(() => {
    if (isEditing && initialData) {
      setPaidToUserId(initialData.paidTo.id.toString());
      setAmount(initialData.amount.toString());
      setDate(initialData.date);
    } else {
      setPaidToUserId('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [initialData, isEditing]);


  const recipientOptions = groupMembers.filter(member => member.id !== user?.id);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!paidToUserId || !amount || parseFloat(amount) <= 0) {
      setError('Please select a recipient and enter a valid positive amount.');
      return;
    }

    const numericPaidToUserId = parseInt(paidToUserId, 10);
    const numericAmount = parseFloat(amount);

    if (isNaN(numericPaidToUserId) || isNaN(numericAmount)) {
        setError('Invalid user ID or amount.');
        return;
    }

    const paymentData: PaymentCreateRequest = {
      paidToUserId: numericPaidToUserId,
      amount: numericAmount,
      date: date,
      currency: 'USD',
      groupId: groupId,
    };

    setLoading(true);
    try {
      let savedPayment: PaymentResponseDto;
      if (isEditing && initialData) {
          savedPayment = await updatePayment(initialData.id, paymentData);
      } else {
          savedPayment = await recordPayment(paymentData);
      }
      onPaymentSaved(savedPayment);
    } catch (err: any) {
      console.error(`Failed to ${isEditing ? 'update' : 'record'} payment:`, err);
      setError(err.message || `Could not ${isEditing ? 'update' : 'record'} payment.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded shadow"> {/* Dark mode bg */}
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{isEditing ? 'Edit Payment' : 'Record Payment'} in Group</h3> {/* Dark mode text */}

      {/* Recipient Selection */}
      <div>
        <label htmlFor="paidToUser" className="block text-sm font-medium text-gray-700 dark:text-gray-300"> {/* Dark mode text */}
          {isEditing ? 'You paid to:' : 'You paid to:'}
        </label>
        <select
          id="paidToUser"
          value={paidToUserId}
          onChange={(e) => setPaidToUserId(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" // Dark mode select
          disabled={loading || recipientOptions.length === 0}
        >
          <option value="">-- Select Member --</option>
          {recipientOptions.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name} ({member.email})
            </option>
          ))}
        </select>
         {recipientOptions.length === 0 && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">No other members in this group to pay.</p>} {/* Dark mode text */}
      </div>

      {/* Amount */}
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300"> {/* Dark mode text */}
          Amount:
        </label>
        <input
          type="number"
          id="amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          min="0.01"
          step="0.01"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" // Dark mode input
          placeholder="0.00"
          disabled={loading}
        />
      </div>

       {/* Date */}
       <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300"> {/* Dark mode text */}
          Date:
        </label>
        <input
          type="date"
          id="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 dark:[color-scheme:dark]" // Dark mode input + color scheme
          disabled={loading}
        />
      </div>


      {error && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>} {/* Dark mode error text */}

      <div className="flex justify-end space-x-3 pt-3 border-t dark:border-gray-700"> {/* Dark mode border */}
         <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500 dark:hover:bg-gray-500 dark:focus:ring-offset-gray-800" // Dark mode cancel button
         >
            Cancel
         </button>
        <button
          type="submit"
          disabled={loading || !paidToUserId || !amount}
          className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 dark:focus:ring-offset-gray-800" // Dark mode submit button
        >
          {loading ? 'Saving...' : (isEditing ? 'Update Payment' : 'Record Payment')}
        </button>
      </div>
    </form>
  );
};

export default AddPaymentForm;