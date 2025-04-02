import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api';
import { deleteExpense } from '../services/expenseService';
import { deletePayment } from '../services/paymentService';
import { getGroupBalances } from '../services/balanceService';
import { getGroupTransactions, leaveGroup, deleteGroup } from '../services/groupService';
// Removed unused SplitResponseDto, UserResponse from direct import
import { GroupResponseDto, ExpenseResponseDto, BalanceDto, PaymentResponseDto, TransactionDto, PayerResponseDto } from '../types/api';
import AddExpenseForm from '../components/AddExpenseForm';
import AddMemberForm from '../components/AddMemberForm';
import AddPaymentForm from '../components/AddPaymentForm';
import ConfirmationModal from '../components/ConfirmationModal';
import { toast } from 'react-toastify';

// Placeholder Icon Component (Replace with actual icons later if desired)
const PlaceholderIcon = () => (
    <svg className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
    </svg>
);

type ConfirmActionType = 'delete_expense' | 'delete_payment' | 'leave_group' | 'delete_group';
interface ConfirmData {
    id?: number;
    type: ConfirmActionType;
}

// Type guard function using the 'type' property
function isExpense(tx: TransactionDto): tx is ExpenseResponseDto {
    return tx.type === 'expense';
}


const GroupDetailPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState<GroupResponseDto | null>(null);
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [groupBalances, setGroupBalances] = useState<BalanceDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddExpenseForm, setShowAddExpenseForm] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseResponseDto | null>(null);
  const [editingPayment, setEditingPayment] = useState<PaymentResponseDto | null>(null);
  // Removed state for separate notes modal
  // const [showNotesModal, setShowNotesModal] = useState(false);
  // const [noteToShow, setNoteToShow] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<ConfirmData | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseResponseDto | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);


  const fetchGroupData = useCallback(async () => {
      if (!groupId) {
        setError("Group ID not found in URL.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const numericGroupId = parseInt(groupId, 10);
        if (isNaN(numericGroupId)) {
             throw new Error("Invalid Group ID format.");
        }

        const groupPromise = apiClient.get<GroupResponseDto>(`/groups/${numericGroupId}`);
        const balancesPromise = getGroupBalances(numericGroupId);
        const transactionsPromise = getGroupTransactions(numericGroupId);

        const [groupResponse, balancesResponse, transactionsResponse] = await Promise.all([
            groupPromise,
            balancesPromise,
            transactionsPromise
        ]);

        transactionsResponse.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setGroup(groupResponse.data);
        setGroupBalances(balancesResponse);
        setTransactions(transactionsResponse);

      } catch (err: any) {
        console.error("Failed to fetch group data:", err);
        const errorMsg = err.response?.data?.message || err.message || 'Could not load group data.';
        setError(errorMsg);
        toast.error(errorMsg);
        setGroup(null);
        setGroupBalances([]);
        setTransactions([]);
      } finally {
        setIsLoading(false);
      }
    }, [groupId]);

  useEffect(() => {
    if (user && groupId) {
      fetchGroupData();
    } else if (!groupId) {
        setError("Group ID is missing.");
        setIsLoading(false);
    } else {
        setError("User not logged in.");
        setIsLoading(false);
    }
  }, [groupId, user, fetchGroupData]);

  const handleExpenseSaved = (_savedExpense: ExpenseResponseDto) => {
    setShowAddExpenseForm(false);
    setEditingExpense(null);
    toast.success(editingExpense ? "Expense updated!" : "Expense added!");
    fetchGroupData();
  };

  const handleMemberAdded = (updatedGroup: GroupResponseDto) => {
      setGroup(updatedGroup);
      setShowAddMemberForm(false);
      toast.success("Member added successfully!");
      fetchGroupData();
  };

  const handlePaymentSaved = (_savedPayment: PaymentResponseDto) => {
      setShowAddPaymentForm(false);
      setEditingPayment(null);
      toast.success(editingPayment ? "Payment updated!" : "Payment added!");
      fetchGroupData();
  };

  // Called from Detail Modal Edit button
  const handleEditExpenseClick = (expense: ExpenseResponseDto) => {
      setEditingExpense(expense);
      setShowAddExpenseForm(true);
      setIsDetailModalOpen(false);
  };

  // Called from Detail Modal Delete button
  const handleDeleteExpenseClick = (expenseId: number) => {
      openConfirmModal('delete_expense', expenseId);
      setIsDetailModalOpen(false);
  };

  // --- Confirmation Modal Logic ---
  const openConfirmModal = (type: ConfirmActionType, id?: number) => {
        setConfirmData({ id, type });
        setIsConfirmModalOpen(true);
    };

    const closeConfirmModal = () => {
        setIsConfirmModalOpen(false);
        setConfirmData(null);
    };

    const executeConfirmAction = async () => {
        if (!confirmData || !groupId) return;

        const { id, type } = confirmData;
        const numericGroupId = parseInt(groupId, 10);

        try {
            let successMessage = '';
            if (type === 'delete_expense' && id !== undefined) {
                await deleteExpense(id);
                successMessage = "Expense deleted successfully";
            } else if (type === 'delete_payment' && id !== undefined) {
                await deletePayment(id);
                successMessage = "Payment deleted successfully";
            } else if (type === 'leave_group' && user?.id !== undefined) {
                await leaveGroup(numericGroupId, user.id);
                successMessage = "Successfully left group";
                navigate('/app');
            } else if (type === 'delete_group') {
                await deleteGroup(numericGroupId);
                successMessage = "Group deleted successfully";
                navigate('/app');
            }

            if (successMessage) {
                toast.success(successMessage);
            }
            if (type !== 'leave_group' && type !== 'delete_group') {
                fetchGroupData(); // Refetch data after successful action
            }
        } catch (err: any) {
            const errorMsg = `Failed to ${type.replace('_', ' ')}: ${err.message || 'Unknown error'}`;
            setError(errorMsg);
            toast.error(errorMsg);
            console.error(`Failed to ${type}:`, err);
        }
    };
    // --- End Confirmation Modal Logic ---

  // --- Expense Detail Modal Logic ---
  const openDetailModal = (expense: ExpenseResponseDto) => {
      setSelectedExpense(expense);
      setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
      setIsDetailModalOpen(false);
      setSelectedExpense(null);
  };
  // --- End Expense Detail Modal Logic ---


  const handleLeaveGroup = () => {
      if (!user || !groupId) return;
      openConfirmModal('leave_group');
  };

  const handleDeleteGroup = () => {
      if (!groupId) return;
      openConfirmModal('delete_group');
  };

  // Removed unused handleShowNotes function
  // const handleShowNotes = (notes: string | null | undefined) => { ... };


  const formatCurrency = (amount: number | null | undefined, currencyCode: string = 'USD') => {
    if (amount === null || amount === undefined) return 'N/A';
    if (amount === 0) return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(0);
    try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount);
    } catch (e) {
        console.error("Error formatting currency:", e);
        return `$${amount.toFixed(2)}`;
    }
  };

  const getPayerString = (payers: PayerResponseDto[] | undefined): string => {
      if (!payers || payers.length === 0) return 'Unknown';
      return payers.map(p => p.user ? `${p.user.id === user?.id ? 'You' : p.user.name} (${formatCurrency(p.amountPaid, 'USD')})` : 'Unknown Payer').join(', ');
  };


  // --- Calculation Helpers ---
  const calculateUserPaidAmount = (payers: PayerResponseDto[]): number => {
      if (!user) return 0;
      return (payers || []).reduce((sum, payer) => {
          return sum + (payer?.user?.id === user.id ? payer.amountPaid : 0);
      }, 0);
  };

  const calculateUserLentAmount = (expense: ExpenseResponseDto): number => {
      if (!user) return 0;

      const userPaid = calculateUserPaidAmount(expense.payers || []);
      let userShare = 0;
      const userSplit = (expense.splits || []).find(split => split?.owedBy?.id === user.id);

      if (userSplit) {
          userShare = userSplit.amountOwed;
      } else {
          if (expense.splitType === 'EQUAL' && (expense.splits || []).length > 0) {
              const involvedMemberIds = new Set((expense.splits || []).map(s => s?.owedBy?.id).filter(id => id !== undefined));
              if (!involvedMemberIds.has(user.id)) {
                 userShare = 0;
              }
              else {
                 userShare = expense.amount / involvedMemberIds.size;
              }
          } else if (expense.splitType === 'EQUAL' && (expense.splits || []).length === 0) {
              userShare = userPaid;
          }
          else {
              userShare = 0;
          }
      }

      const lentAmount = userPaid - userShare;
      return Math.round(lentAmount * 100) / 100;
  };
  // --- End Calculation Helpers ---


  if (isLoading) return <p>Loading group details...</p>;
  if (error && !group) return <p className="text-red-500">Error: {error}</p>;
  if (!group) return <p>Group not found.</p>;

  const isLastMember = group.members.length <= 1;
  const isCreator = user?.id === group.creator?.id;

  const expensesOnly = transactions.filter(isExpense);

  let lastRenderedMonthYear: string | null = null;

  const getModalContent = () => {
        if (!confirmData) return { title: '', message: '', confirmText: 'Confirm' };
        const { type } = confirmData;
        switch (type) {
            case 'delete_expense':
                return { title: 'Delete Expense', message: 'Are you sure you want to delete this expense?', confirmText: 'Delete' };
            case 'delete_payment':
                return { title: 'Delete Payment', message: 'Are you sure you want to delete this payment record?', confirmText: 'Delete' };
            case 'leave_group':
                return { title: 'Leave Group', message: 'Are you sure you want to leave this group? You cannot rejoin unless invited back.', confirmText: 'Leave' };
            case 'delete_group':
                return { title: 'Delete Group', message: 'Are you sure you want to permanently delete this group and all its expenses/payments? This cannot be undone.', confirmText: 'Delete Permanently' };
            default:
                return { title: '', message: '', confirmText: 'Confirm' };
        }
    };
    const modalContent = getModalContent();


  return (
    <div className="container mx-auto p-4">
       <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Group: {group.name}</h2>
        <div className="flex space-x-2">
            <button onClick={() => { setEditingPayment(null); setShowAddPaymentForm(true); }} className="p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out" title="Add Payment">
                <img src="/add-payment-icon.png" alt="Add Payment" className="w-6 h-6" />
            </button>
            <button onClick={() => { setEditingExpense(null); setShowAddExpenseForm(true); }} className="p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out" title="Add Expense">
                 <img src="/add-expense-icon.png" alt="Add Expense" className="w-6 h-6" />
            </button>
             {!isLastMember && (
                 <button onClick={handleLeaveGroup} className="p-2 rounded-md text-red-600 hover:bg-red-50 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-150 ease-in-out" title="Leave this group">
                     <img src="/leave-group-icon.png" alt="Leave Group" className="w-6 h-6" />
                 </button>
             )}
             {isLastMember && (
                  <button className="bg-gray-400 text-white font-medium py-2 px-4 rounded shadow cursor-not-allowed" title="Cannot leave as the last member" disabled>
                    Leave Group
                 </button>
             )}
        </div>
      </div>

       {/* Top Row: Members and Balances */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Group Members */}
          <div className="p-4 bg-white shadow rounded-lg">
               <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold">Members</h3>
                     <button onClick={() => setShowAddMemberForm(true)} className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium py-1 px-2 rounded">
                        + Add Member
                     </button>
               </div>
              <ul className="list-disc list-inside pl-4">
                  {group.members.map(member => (
                      <li key={member.id}>{member.name} ({member.email}) {member.id === user?.id ? '(You)' : ''}</li>
                  ))}
              </ul>
          </div>

           {/* Group Balances */}
           <div className="p-4 bg-white shadow rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Group Balances</h3>
                {groupBalances.length === 0 ? (
                  <p className="text-gray-500">Everyone is settled up within this group.</p>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {groupBalances.map((balance) => (
                      <li key={balance.otherUser.id} className="py-3 flex justify-between items-center">
                        <span>{balance.otherUser.name}</span>
                        <span className={`font-medium ${balance.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {balance.netAmount >= 0 ? 'owes you' : 'you owe'} {formatCurrency(Math.abs(balance.netAmount), balance.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
           </div>
      </div>


      {/* REFACTORED Expense List */}
      <div className="bg-white shadow rounded-lg mb-6">
         <h3 className="text-lg font-semibold mb-0 p-4 border-b">Expenses</h3>
        {isLoading && <p className="p-4 text-gray-500">Loading expenses...</p>}
        {!error && expensesOnly.length === 0 && !isLoading && (
              <p className="p-4 text-gray-500">No expenses recorded in this group yet.</p>
        )}
        {!isLoading && !error && expensesOnly.length > 0 && (
              <ul className="divide-y divide-gray-200">
                {expensesOnly.map((expense, index) => {
                    const youPaid = calculateUserPaidAmount(expense.payers || []);
                    const youLent = calculateUserLentAmount(expense);
                    const lentAmountDisplay = youLent >= 0 ? youLent : 0;
                    const borrowedAmountDisplay = youLent < 0 ? Math.abs(youLent) : 0;
                    const expenseDate = new Date(expense.date + 'T00:00:00');
                    const currentMonthYear = `${expenseDate.getFullYear()}-${expenseDate.getMonth()}`;

                    const showMonthHeader = index === 0 || lastRenderedMonthYear !== currentMonthYear;
                    lastRenderedMonthYear = currentMonthYear;

                    const expenseListItem = (
                         <li key={`expense-${expense.id}`}
                             className={`flex items-center px-4 py-2 cursor-pointer hover:bg-gray-50`}
                             onClick={() => openDetailModal(expense)}
                         >
                            {/* Date Column */}
                            <div className="w-10 text-center mr-2 flex-shrink-0">
                                <p className="text-xs uppercase text-gray-500">{expenseDate.toLocaleString('default', { month: 'short' })}</p>
                                <p className="text-base font-medium text-gray-700">{expenseDate.getDate()}</p>
                            </div>
                            {/* Icon & Description Column */}
                            <div className="flex-grow flex items-center mr-3 overflow-hidden">
                                <PlaceholderIcon />
                                <p className="font-medium text-sm text-gray-800 truncate" title={expense.description}>{expense.description}</p>
                                {expense.notes && <span title="Has notes" className="ml-1 text-gray-400 text-xs">📝</span>}
                                {expense.receiptUrl && <span title="Has receipt" className="ml-1 text-gray-400 text-xs">📎</span>}
                            </div>
                            {/* Stacked Amounts Column */}
                            <div className="flex flex-col text-right w-20 flex-shrink-0">
                                {/* You Paid */}
                                <div>
                                    <p className="text-xs text-gray-500 leading-tight">you paid</p>
                                    <p className="text-xs font-medium text-gray-700 leading-tight">{formatCurrency(youPaid, expense.currency)}</p>
                                </div>
                                {/* You Lent/Borrowed */}
                                <div className="mt-1">
                                    {lentAmountDisplay > 0 ? (
                                        <>
                                            <p className="text-xs text-green-600 leading-tight">you lent</p>
                                            <p className="text-xs font-medium text-green-600 leading-tight">{formatCurrency(lentAmountDisplay, expense.currency)}</p>
                                        </>
                                    ) : borrowedAmountDisplay > 0 ? (
                                        <>
                                            <p className="text-xs text-red-600 leading-tight">you borrowed</p>
                                            <p className="text-xs font-medium text-red-600 leading-tight">{formatCurrency(borrowedAmountDisplay, expense.currency)}</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-xs text-gray-500 leading-tight">settled</p>
                                            <p className="text-xs font-medium text-gray-500 leading-tight">{formatCurrency(0, expense.currency)}</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </li>
                    );

                    if (showMonthHeader) {
                        return (
                            <React.Fragment key={`month-${currentMonthYear}`}>
                                <li className="bg-gray-100 px-4 py-1 mt-4 border-t border-b">
                                    <p className="text-sm font-semibold text-gray-600">
                                        {expenseDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                    </p>
                                </li>
                                {expenseListItem}
                            </React.Fragment>
                        );
                    } else {
                        return expenseListItem;
                    }
                })}
              </ul>
          )}
        </div>

        {/* Delete Group Button */}
        {isCreator && (
            <div className="mt-8 flex justify-end">
                <button onClick={handleDeleteGroup} className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" title="Permanently delete this group">
                    Delete Group
                </button>
            </div>
        )}


       {/* Add/Edit Expense Form Modal */}
       {showAddExpenseForm && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-20 flex items-center justify-center">
                <div className="relative mx-auto p-1 border w-full max-w-lg shadow-lg rounded-md bg-white">
                     <div className="p-4">
                        <AddExpenseForm
                            onExpenseSaved={handleExpenseSaved}
                            onCancel={() => { setShowAddExpenseForm(false); setEditingExpense(null); }}
                            groupId={group.id}
                            groupMembers={group.members}
                            initialData={editingExpense}
                        />
                     </div>
                </div>
            </div>
       )}
       {/* Add Member Form Modal */}
       {showAddMemberForm && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-20 flex items-center justify-center">
                <div className="relative mx-auto p-1 border w-full max-w-md shadow-lg rounded-md bg-white">
                     <div className="p-4">
                        <AddMemberForm
                            groupId={group.id}
                            onMemberAdded={handleMemberAdded}
                            onCancel={() => setShowAddMemberForm(false)}
                            currentMembers={group.members}
                        />
                     </div>
                </div>
            </div>
       )}
       {/* Add/Edit Payment Form Modal */}
       {showAddPaymentForm && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-20 flex items-center justify-center">
                <div className="relative mx-auto p-1 border w-full max-w-md shadow-lg rounded-md bg-white">
                     <div className="p-4">
                        <AddPaymentForm
                            groupId={group.id}
                            groupMembers={group.members}
                            onPaymentSaved={handlePaymentSaved}
                            onCancel={() => { setShowAddPaymentForm(false); setEditingPayment(null); }}
                            initialData={editingPayment}
                        />
                     </div>
                </div>
            </div>
       )}
       {/* Notes Modal (Separate - can be removed if detail modal handles notes) */}
       {/* {showNotesModal && ( ... )} */} {/* Commented out separate notes modal */}

        {/* Confirmation Modal */}
        <ConfirmationModal
            isOpen={isConfirmModalOpen}
            onClose={closeConfirmModal}
            onConfirm={executeConfirmAction}
            title={modalContent.title}
            message={modalContent.message}
            confirmButtonText={modalContent.confirmText}
        />

        {/* Expense Detail Modal */}
        {isDetailModalOpen && selectedExpense && (
             <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-30 flex items-center justify-center" onClick={closeDetailModal}>
                 <div className="relative mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
                     <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Expense Details: {selectedExpense.description}</h3>
                     <div className="space-y-2 text-sm text-gray-700 max-h-96 overflow-y-auto pr-2">
                         <p><strong>Date:</strong> {selectedExpense.date}</p>
                         <p><strong>Amount:</strong> {formatCurrency(selectedExpense.amount, selectedExpense.currency)}</p>
                         <p><strong>Paid By:</strong> {getPayerString(selectedExpense.payers)}</p>
                         <p><strong>Split Type:</strong> {selectedExpense.splitType}</p>
                         <div>
                             <strong>Splits:</strong>
                             <ul className='list-disc list-inside pl-4 text-sm'>
                                {(selectedExpense.splits || []).map(split => (
                                    <li key={split.splitId}>
                                        {split.owedBy?.name || 'Unknown User'} owes {formatCurrency(split.amountOwed, selectedExpense.currency)}
                                    </li>
                                ))}
                             </ul>
                         </div>
                         <p><strong>Notes:</strong> {selectedExpense.notes || 'N/A'}</p>
                         {selectedExpense.receiptUrl && <p><a href={selectedExpense.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View Receipt</a></p>}
                     </div>

                     <div className="mt-6 flex justify-end space-x-3 border-t pt-4">
                          <button onClick={() => handleEditExpenseClick(selectedExpense)} className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600">Edit</button>
                          <button onClick={() => handleDeleteExpenseClick(selectedExpense.id)} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700">Delete</button>
                          <button onClick={closeDetailModal} className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300">Close</button>
                     </div>
                 </div>
             </div>
        )}

    </div>
  );
};

export default GroupDetailPage;