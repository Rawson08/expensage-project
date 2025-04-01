import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api';
import { deleteExpense } from '../services/expenseService';
import { deletePayment } from '../services/paymentService';
import { getGroupBalances } from '../services/balanceService';
import { getGroupTransactions, leaveGroup, deleteGroup } from '../services/groupService';
import { GroupResponseDto, ExpenseResponseDto, BalanceDto, PaymentResponseDto, TransactionDto, PayerResponseDto } from '../types/api';
import AddExpenseForm from '../components/AddExpenseForm';
import AddMemberForm from '../components/AddMemberForm';
import AddPaymentForm from '../components/AddPaymentForm';
import ConfirmationModal from '../components/ConfirmationModal';
import { toast } from 'react-toastify';

type ConfirmActionType = 'delete_expense' | 'delete_payment' | 'leave_group' | 'delete_group';
interface ConfirmData {
    id?: number;
    type: ConfirmActionType;
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
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [noteToShow, setNoteToShow] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<ConfirmData | null>(null);


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

  const handlePaymentSaved = (_savedPayment: PaymentResponseDto) => { // Added underscore
      setShowAddPaymentForm(false);
      setEditingPayment(null);
      toast.success(editingPayment ? "Payment updated!" : "Payment added!");
      fetchGroupData();
  };

  const handleEditExpense = (expenseId: number) => {
      const expenseToEdit = transactions.find(tx => tx.type === 'expense' && tx.id === expenseId) as ExpenseResponseDto | undefined;
      if (expenseToEdit) {
          setEditingExpense(expenseToEdit);
          setShowAddExpenseForm(true);
      } else {
          const errorMsg = "Could not find the expense to edit.";
          console.error("Could not find expense with ID", expenseId, "to edit.");
          setError(errorMsg);
          toast.error(errorMsg);
      }
  };

  const handleEditPayment = (paymentId: number) => {
       const paymentToEdit = transactions.find(tx => tx.type === 'payment' && tx.id === paymentId) as PaymentResponseDto | undefined;
       if (paymentToEdit) {
           setEditingPayment(paymentToEdit);
           setShowAddPaymentForm(true);
       } else {
           const errorMsg = "Could not find the payment to edit.";
           console.error("Could not find payment with ID", paymentId, "to edit.");
           setError(errorMsg);
           toast.error(errorMsg);
       }
  };

  // --- Modal Handling ---
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
                fetchGroupData();
            }
        } catch (err: any) {
            const errorMsg = `Failed to ${type.replace('_', ' ')}: ${err.message || 'Unknown error'}`;
            setError(errorMsg);
            toast.error(errorMsg);
            console.error(`Failed to ${type}:`, err);
        }
    };
    // --- End Modal Handling ---


  const handleDeleteExpense = (expenseId: number) => {
      openConfirmModal('delete_expense', expenseId);
  };

  const handleDeletePayment = (paymentId: number) => {
      openConfirmModal('delete_payment', paymentId);
  };

  const handleLeaveGroup = () => {
      if (!user || !groupId) return;
      openConfirmModal('leave_group');
  };

  const handleDeleteGroup = () => {
      if (!groupId) return;
      openConfirmModal('delete_group');
  };

  const handleShowNotes = (notes: string | null | undefined) => {
      if (notes) {
          setNoteToShow(notes);
          setShowNotesModal(true);
      }
  };


  const formatCurrency = (amount: number, currencyCode: string = 'USD') => {
    if (amount === null || amount === undefined) return 'N/A';
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

  if (isLoading) return <p>Loading group details...</p>;
  if (error && !group) return <p className="text-red-500">Error: {error}</p>;
  if (!group) return <p>Group not found.</p>;

  const isLastMember = group.members.length <= 1;
  const isCreator = user?.id === group.creator?.id;

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


      {/* Transactions List */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
         <h3 className="text-lg font-semibold mb-3">Transactions</h3>
        {isLoading && <p>Loading transactions...</p>}
        {!error && transactions.length === 0 && !isLoading && (
              <p className="text-gray-500">No transactions recorded in this group yet.</p>
        )}
        {!isLoading && !error && transactions.length > 0 && (
              <ul className="divide-y divide-gray-200">
                {transactions.map((tx) => (
                  <li key={`${tx.type}-${tx.id}`} className="py-3">
                    {tx.type === 'expense' && (
                        <>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-medium">{tx.description}</p>
                                    <p className="text-sm text-gray-500">
                                        Paid by {getPayerString(tx.payers)} on {tx.date}
                                    </p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <span className="font-medium">{formatCurrency(tx.amount, tx.currency)}</span>
                                    {tx.receiptUrl && ( <a href={tx.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 hover:underline p-1">Receipt</a> )}
                                    {tx.notes && ( <button onClick={() => handleShowNotes(tx.notes)} className="text-xs text-gray-500 hover:text-gray-700 hover:underline p-1">Notes</button> )}
                                    <button onClick={() => handleEditExpense(tx.id)} className="text-xs text-blue-600 hover:underline p-1">Edit</button>
                                    <button onClick={() => handleDeleteExpense(tx.id)} className="text-xs text-red-600 hover:underline p-1">Delete</button>
                                </div>
                            </div>
                            <div className="mt-1 pl-4 text-sm text-gray-600">
                                {tx.splits && tx.splits.length > 0 ? (
                                    <ul>
                                        {tx.splits.map(split => (
                                            split.owedBy ? ( <li key={split.splitId}> - {split.owedBy.id === user?.id ? 'You owe' : `${split.owedBy.name} owes`} {formatCurrency(split.amountOwed, tx.currency)} </li> )
                                                         : ( <li key={split.splitId}>- Error: Owed by user missing</li> )
                                        ))}
                                    </ul>
                                ) : ( <p><i>(Paid by payer(s) for themselves)</i></p> )}
                            </div>
                        </>
                    )}
                    {tx.type === 'payment' && tx.paidBy && tx.paidTo && (
                         <div className="flex justify-between items-center">
                            <div>
                                <p className="font-medium italic"> {tx.paidBy.id === user?.id ? 'You' : tx.paidBy.name} paid {tx.paidTo.id === user?.id ? 'You' : tx.paidTo.name} </p>
                                <p className="text-sm text-gray-500"> Payment recorded on {tx.date} </p>
                            </div>
                             <div className="flex items-center space-x-3">
                                <span className="font-medium">{formatCurrency(tx.amount, tx.currency)}</span>
                                {tx.paidBy.id === user?.id && ( <button onClick={() => handleEditPayment(tx.id)} className="text-xs text-blue-600 hover:underline p-1">Edit</button> )}
                                <button onClick={() => handleDeletePayment(tx.id)} className="text-xs text-red-600 hover:underline p-1">Delete</button>
                            </div>
                        </div>
                    )}
                  </li>
                ))}
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
       {/* Notes Modal */}
       {showNotesModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-30 flex items-center justify-center">
                <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
                    <div className="mt-3 text-center">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">Expense Notes</h3>
                        <div className="mt-2 px-7 py-3">
                            <p className="text-sm text-gray-500 whitespace-pre-wrap">
                                {noteToShow}
                            </p>
                        </div>
                        <div className="items-center px-4 py-3">
                            <button
                                id="ok-btn"
                                onClick={() => setShowNotesModal(false)}
                                className="px-4 py-2 bg-indigo-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
       )}

        {/* Confirmation Modal */}
        <ConfirmationModal
            isOpen={isConfirmModalOpen}
            onClose={closeConfirmModal}
            onConfirm={executeConfirmAction}
            title={modalContent.title}
            message={modalContent.message}
            confirmButtonText={modalContent.confirmText}
        />

    </div>
  );
};

export default GroupDetailPage;