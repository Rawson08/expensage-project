import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserResponse, ExpenseResponseDto, PayerDetailDto, SplitDetailDto, ExpenseCreateRequest } from '../types/api';
import { createExpense, updateExpense } from '../services/expenseService';
import apiClient from '../services/api';
import { AxiosError } from 'axios';

type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARE';

interface AddExpenseFormProps {
  groupId?: number | null;
  groupMembers: UserResponse[];
  onExpenseSaved: (savedExpense: ExpenseResponseDto) => void;
  onCancel: () => void;
  initialData?: ExpenseResponseDto | null;
}

const AddExpenseForm: React.FC<AddExpenseFormProps> = ({
  groupId,
  groupMembers,
  onExpenseSaved,
  onCancel,
  initialData = null,
}) => {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [splitType, setSplitType] = useState<SplitType>('EQUAL');
  const [payers, setPayers] = useState<PayerDetailDto[]>([]);
  const [splits, setSplits] = useState<SplitDetailDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const isEditing = !!initialData;

  useEffect(() => {
    const numericAmount = parseFloat(amount) || 0;

    if (isEditing && initialData && user) {
      setDescription(initialData.description);
      setAmount(initialData.amount.toString());
      setDate(initialData.date);
      setNotes(initialData.notes || '');
      setReceiptFile(null);
      const initialSplitType = initialData.splitType || 'EQUAL';
      setSplitType(initialSplitType);

      const initialPayers = initialData.payers.map(p => ({
          userId: p.user.id,
          amountPaid: p.amountPaid
      }));
      setPayers(initialPayers);

      let initialSplits: SplitDetailDto[] = [];
      if (initialSplitType === 'EQUAL') {
          initialSplits = initialData.splits.map(s => ({
              userId: s.owedBy.id,
              value: null
          }));
      } else {
           initialSplits = initialData.splits.map(s => ({
              userId: s.owedBy.id,
              value: s.amountOwed.toString()
          }));
      }
      setSplits(initialSplits);

    } else if (user) {
        // Defaults for NEW expense
        setDescription('');
        setAmount('');
        setDate(new Date().toISOString().split('T')[0]);
        setNotes('');
        setReceiptFile(null);
        setSplitType('EQUAL');
        setPayers([{ userId: user.id, amountPaid: numericAmount }]);
        setSplits(groupMembers.map(member => ({ userId: member.id, value: null })));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, isEditing, user, groupMembers]);

  useEffect(() => {
      const numericAmount = parseFloat(amount) || 0;
      if (!isEditing && payers.length === 1) {
          setPayers([{ ...payers[0], amountPaid: numericAmount }]);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, isEditing]);


  const handleAmountChange = (value: string) => {
      setAmount(value);
  };

  const handlePayerChange = (index: number, field: keyof PayerDetailDto, value: string | number) => {
    const updatedPayers = [...payers];
    const numericValue = field === 'amountPaid' ? parseFloat(value as string) || 0 : value;
    updatedPayers[index] = { ...updatedPayers[index], [field]: numericValue };
    setPayers(updatedPayers);
  };

  const addPayer = () => {
    setPayers([...payers, { userId: 0, amountPaid: 0 }]);
  };

  const removePayer = (index: number) => {
    if (payers.length > 1) {
      const updatedPayers = payers.filter((_, i) => i !== index);
      if (updatedPayers.length === 1) {
          const numericAmount = parseFloat(amount) || 0;
          updatedPayers[0] = { ...updatedPayers[0], amountPaid: numericAmount };
      }
      setPayers(updatedPayers);
    }
  };

   const handleSplitUserChange = (userId: number, isChecked: boolean) => {
        if (isChecked) {
            if (!splits.some(s => s.userId === userId)) {
                 setSplits([...splits, { userId: userId, value: splitType !== 'EQUAL' ? '0' : null }]);
            }
        } else {
            if (splits.length > 1) {
                setSplits(splits.filter(s => s.userId !== userId));
            }
        }
    };

   const handleSplitValueChange = (userId: number, value: string) => {
        setSplits(splits.map(s => s.userId === userId ? { ...s, value: value } : s));
    };

    interface ReceiptScanResponse {
        storeName: string;
        date: string;
        totalAmount: number;
        items: Array<{ name: string; price: number }>;
    }

    const scanReceiptAndAutofill = async (file: File) => {
        setScanLoading(true);
        setScanError(null);
        setError(null);

        const formData = new FormData();
        formData.append("receipt", file);

        try {
            const response = await apiClient.post<ReceiptScanResponse>("/receipts/scan-and-parse", formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const json = response.data;

            setDescription(json.storeName || '');
            const formattedDate = json.date ? new Date(json.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            setDate(formattedDate);
            setAmount(json.totalAmount ? json.totalAmount.toString() : '');
            const itemNotes = json.items?.map(item => `${item.name || 'Item'}: ${item.price?.toFixed(2) || 'N/A'}`).join('\n') || '';
            setNotes(itemNotes);

            const numericAmount = json.totalAmount || 0;
            if (user) {
                 setPayers([{ userId: user.id, amountPaid: numericAmount }]);
                 setSplits(groupMembers.map(member => ({ userId: member.id, value: null })));
                 setSplitType('EQUAL');
            }


        } catch (err) {
            console.error("Receipt scanning error:", err);
            let errorMsg = "An unknown error occurred during receipt scanning.";
            if (err instanceof AxiosError && err.response) {
                errorMsg = err.response.data?.message || `Request failed with status ${err.response.status}`;
            } else if (err instanceof Error) {
                errorMsg = err.message;
            }
            setScanError(errorMsg);
        } finally {
            setScanLoading(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setReceiptFile(file);
            scanReceiptAndAutofill(file);
        } else {
            setReceiptFile(null);
        }
    };


  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    // Validation
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) { setError('Please enter a valid positive amount.'); return; }
    if (!description.trim()) { setError('Please enter a description.'); return; }
    if (payers.length === 0 || payers.some(p => !p.userId || p.userId === 0)) { setError('Please select a valid user for each payer.'); return; }
    let finalPayers = [...payers];
    if (finalPayers.length === 1) { finalPayers = [{ ...finalPayers[0], amountPaid: numericAmount }]; }
    const totalPaid = finalPayers.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    if (Math.abs(totalPaid - numericAmount) > 0.005) { setError(`Total amount paid (${totalPaid.toFixed(2)}) must equal the expense amount (${numericAmount.toFixed(2)}).`); return; }
    if (splits.length === 0) { setError('Please select at least one person to split the expense with.'); return; }
    if (splitType !== 'EQUAL') {
        if (splits.some(s => s.value === null || s.value === undefined || s.value === '' || isNaN(parseFloat(String(s.value))))) { setError(`Please enter a valid ${splitType.toLowerCase()} value for each person.`); return; }
        const totalSplitValue = splits.reduce((sum, s) => sum + parseFloat(String(s.value || '0')), 0);
        if (splitType === 'EXACT' && Math.abs(totalSplitValue - numericAmount) > 0.005) { setError(`Sum of exact split amounts (${totalSplitValue.toFixed(2)}) must equal the expense amount (${numericAmount.toFixed(2)}).`); return; }
        if (splitType === 'PERCENTAGE' && Math.abs(totalSplitValue - 100) > 0.005) { setError('Percentages must add up to 100.'); return; }
    }

    setLoading(true);
    const finalSplits = splits.map(s => ({
        userId: s.userId,
        value: (splitType !== 'EQUAL') ? (s.value || '0') : null
    }));

    const expenseData: ExpenseCreateRequest = {
      description: description.trim(),
      amount: numericAmount,
      currency: 'USD',
      date: date,
      groupId: groupId,
      splitType: splitType,
      payers: finalPayers.map(p => ({ userId: p.userId, amountPaid: p.amountPaid || 0 })),
      splits: finalSplits,
      notes: notes || null,
    };

    try {
        let savedExpense: ExpenseResponseDto;
        if (isEditing && initialData) {
            savedExpense = await updateExpense(initialData.id, expenseData, receiptFile);
        } else {
            savedExpense = await createExpense(expenseData, receiptFile);
        }
      onExpenseSaved(savedExpense);
    } catch (err: any) {
      console.error(`Failed to ${isEditing ? 'update' : 'create'} expense:`, err);
      setError(err.message || `Could not ${isEditing ? 'update' : 'create'} expense.`);
    } finally {
      setLoading(false);
    }
  };

  const availablePayers = groupMembers;
  const availableSplitMembers = groupMembers;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded shadow"> {/* Dark mode bg */}
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{isEditing ? 'Edit Expense' : 'Add New Expense'}</h3> {/* Dark mode text */}

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label> {/* Dark mode text */}
        <input type="text" id="description" value={description} onChange={(e) => setDescription(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" disabled={loading} /> {/* Dark mode input */}
      </div>

      {/* Amount & Date Row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount</label> {/* Dark mode text */}
          <input type="number" id="amount" value={amount} onChange={(e) => handleAmountChange(e.target.value)} required min="0.01" step="0.01" className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" placeholder="0.00" disabled={loading} /> {/* Dark mode input */}
        </div>
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label> {/* Dark mode text */}
          <input type="date" id="date" value={date} onChange={(e) => setDate(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 dark:[color-scheme:dark]" disabled={loading} /> {/* Dark mode input + color scheme for picker */}
        </div>
      </div>

       {/* Notes Section */}
       <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes (Optional)</label> {/* Dark mode text */}
        <textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" // Dark mode textarea
            placeholder="Add any relevant notes here..."
            disabled={loading}
        />
      </div>

       {/* Receipt Upload Section */}
       <div>
            <label htmlFor="receiptFile" className="block text-sm font-medium text-gray-700 dark:text-gray-300"> {/* Dark mode text */}
                Receipt (Optional - Autofills form)
            </label>
            <input
                type="file"
                id="receiptFile"
                onChange={handleFileChange}
                accept="image/*,.pdf"
                className="mt-1 block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900 dark:file:text-indigo-300 dark:hover:file:bg-indigo-800 disabled:opacity-50" // Dark mode file input
                disabled={loading || scanLoading}
            />
            {scanLoading && <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-1">Scanning receipt...</p>} {/* Dark mode text */}
            {scanError && <p className="text-sm text-red-600 dark:text-red-400 mt-1">Scan Error: {scanError}</p>} {/* Dark mode error text */}
        </div>


      {/* Payers Section */}
      <fieldset className="border dark:border-gray-600 p-3 rounded"> {/* Dark mode border */}
          <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 px-1">Paid By</legend> {/* Dark mode text */}
          {payers.map((payer, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                  <select
                      value={payer.userId || ''}
                      onChange={(e) => handlePayerChange(index, 'userId', parseInt(e.target.value))}
                      required
                      className="flex-grow mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" // Dark mode select
                      disabled={loading}
                  >
                      <option value="">-- Select Payer --</option>
                      {availablePayers.map(member => (
                          <option key={member.id} value={member.id}>
                              {member.id === user?.id ? 'You' : member.name} ({member.email})
                          </option>
                      ))}
                  </select>
                  {payers.length > 1 && (
                      <input
                          type="number"
                          value={payer.amountPaid || ''}
                          onChange={(e) => handlePayerChange(index, 'amountPaid', e.target.value)}
                          required
                          min="0.01"
                          step="0.01"
                          className="mt-1 block w-1/3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" // Dark mode input
                          placeholder="0.00"
                          disabled={loading}
                      />
                  )}
                  {payers.length > 1 && (
                      <button type="button" onClick={() => removePayer(index)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm" disabled={loading}>Remove</button>
                  )}
              </div>
          ))}
          <button type="button" onClick={addPayer} className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm mt-1" disabled={loading}>+ Add another payer</button>
      </fieldset>

      {/* Split Section */}
       <fieldset className="border dark:border-gray-600 p-3 rounded"> {/* Dark mode border */}
          <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 px-1">Split Between</legend> {/* Dark mode text */}
           {/* Split Type Selector */}
           <div className="mb-3">
                <label htmlFor="splitType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Split Method:</label> {/* Dark mode text */}
                <select
                    id="splitType"
                    value={splitType}
                    onChange={(e) => setSplitType(e.target.value as SplitType)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" // Dark mode select
                    disabled={loading}
                >
                    <option value="EQUAL">Equally</option>
                    <option value="EXACT">Exactly</option>
                    <option value="PERCENTAGE">By Percentage</option>
                    <option value="SHARE">By Shares</option>
                </select>
           </div>

           {/* User Selection/Inputs based on Split Type */}
           <div className="space-y-2">
               {availableSplitMembers.map(member => (
                   <div key={member.id} className="flex items-center justify-between">
                       <div className="flex items-center">
                           <input
                               id={`split-user-${member.id}`}
                               type="checkbox"
                               checked={splits.some(s => s.userId === member.id)}
                               onChange={(e) => handleSplitUserChange(member.id, e.target.checked)}
                               className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-500 rounded focus:ring-indigo-500 dark:bg-gray-600 dark:checked:bg-indigo-600 dark:focus:ring-indigo-600 dark:focus:ring-offset-gray-800" // Dark mode checkbox
                               disabled={loading}
                           />
                           <label htmlFor={`split-user-${member.id}`} className="ml-2 block text-sm text-gray-900 dark:text-gray-100"> {/* Dark mode text */}
                               {member.id === user?.id ? 'You' : member.name}
                           </label>
                       </div>
                       {splits.some(s => s.userId === member.id) && splitType !== 'EQUAL' && (
                           <input
                               type="number"
                               value={splits.find(s => s.userId === member.id)?.value || ''}
                               onChange={(e) => handleSplitValueChange(member.id, e.target.value)}
                               required={splitType as string !== 'EQUAL'}
                               min="0"
                               step={splitType === 'PERCENTAGE' ? "0.01" : (splitType === 'EXACT' ? "0.01" : "1")}
                               className="mt-1 block w-1/3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" // Dark mode input
                               placeholder={splitType === 'PERCENTAGE' ? '%' : (splitType === 'SHARE' ? 'shares' : '0.00')}
                               disabled={loading}
                           />
                       )}
                   </div>
               ))}
           </div>
       </fieldset>


      {error && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>} {/* Dark mode error text */}

      <div className="flex justify-end space-x-3 pt-3 border-t dark:border-gray-700"> {/* Dark mode border */}
         <button type="button" onClick={onCancel} disabled={loading} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500 dark:hover:bg-gray-500 dark:focus:ring-offset-gray-800">Cancel</button> {/* Dark mode cancel button */}
        <button type="submit" disabled={loading || splits.length === 0 || payers.length === 0} className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 dark:focus:ring-offset-gray-800"> {/* Dark mode submit button */}
          {loading ? 'Saving...' : (isEditing ? 'Update Expense' : 'Add Expense')}
        </button>
      </div>
    </form>
  );
};

export default AddExpenseForm;