import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api';
import { deleteExpense } from '../services/expenseService';
import { deletePayment } from '../services/paymentService';
import { getGroupBalances } from '../services/balanceService';
import { getGroupTransactions, leaveGroup, deleteGroup } from '../services/groupService';
import { getCommentsForExpense, addCommentToExpense, deleteComment } from '../services/commentService';
import { GroupResponseDto, ExpenseResponseDto, BalanceDto, PaymentResponseDto, TransactionDto, PayerResponseDto, CommentResponseDto, CommentCreateRequest } from '../types/api';
import AddExpenseForm from '../components/AddExpenseForm';
import AddMemberForm from '../components/AddMemberForm';
import AddPaymentForm from '../components/AddPaymentForm';
import ConfirmationModal from '../components/ConfirmationModal';
import { toast } from 'react-toastify';
import { Cog6ToothIcon, XMarkIcon, ReceiptPercentIcon, BanknotesIcon } from '@heroicons/react/24/outline'; // Added relevant icons

// Type guard function to check if a transaction is an expense
function isExpense(tx: TransactionDto): tx is ExpenseResponseDto {
    // Check if 'description' exists, which is unique to ExpenseResponseDto in this model
    return (tx as ExpenseResponseDto).description !== undefined;
}

type ConfirmActionType = 'delete_expense' | 'delete_payment' | 'leave_group' | 'delete_group' | 'delete_comment';
interface ConfirmData {
    id?: number;
    type: ConfirmActionType;
    itemName?: string;
}

const GroupDetailPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState<GroupResponseDto | null>(null);
  const [transactions, setTransactions] = useState<TransactionDto[]>([]); // Holds combined expenses and payments
  const [groupBalances, setGroupBalances] = useState<BalanceDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddExpenseForm, setShowAddExpenseForm] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseResponseDto | null>(null);
  const [editingPayment, setEditingPayment] = useState<PaymentResponseDto | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<ConfirmData | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseResponseDto | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [comments, setComments] = useState<CommentResponseDto[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState<boolean>(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [newCommentContent, setNewCommentContent] = useState<string>('');
  const [isPostingComment, setIsPostingComment] = useState<boolean>(false);


  const fetchGroupData = useCallback(async () => {
      if (!groupId) { setError("Group ID not found."); setIsLoading(false); return; }
      setIsLoading(true); setError(null);
      try {
        const numericGroupId = parseInt(groupId, 10);
        if (isNaN(numericGroupId)) throw new Error("Invalid Group ID.");

        const [groupResponse, balancesResponse, transactionsResponse] = await Promise.all([
            apiClient.get<GroupResponseDto>(`/groups/${numericGroupId}`),
            getGroupBalances(numericGroupId),
            getGroupTransactions(numericGroupId) // Fetches both expenses and payments
        ]);

        setGroup(groupResponse.data);
        setGroupBalances(balancesResponse);
        // Sort combined transactions by date descending
        const sortedTransactions = transactionsResponse.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(sortedTransactions);

      } catch (err: any) {
        console.error("Failed to fetch group data:", err);
        const errorMsg = err.response?.data?.message || err.message || 'Could not load group data.';
        setError(errorMsg); toast.error(errorMsg);
        setGroup(null); setGroupBalances([]); setTransactions([]);
      } finally { setIsLoading(false); }
    }, [groupId]);

  useEffect(() => {
    if (user && groupId) { fetchGroupData(); }
    else if (!groupId) { setError("Group ID is missing."); setIsLoading(false); }
    else { setError("User not logged in."); setIsLoading(false); }
  }, [groupId, user, fetchGroupData]);

  // --- Helper Functions ---
  const formatCurrency = (amount: number | null | undefined, currencyCode: string = 'USD') => {
    if (amount === null || amount === undefined) return 'N/A';
    if (amount === 0) return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(0);
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount); }
    catch (e) { console.error("Error formatting currency:", e); return `$${amount.toFixed(2)}`; }
  };

  const getPayerString = (payers: PayerResponseDto[] | undefined): string => {
      if (!payers || payers.length === 0) return 'Unknown';
      return payers.map(p => p.user ? `${p.user.id === user?.id ? 'You' : p.user.name} (${formatCurrency(p.amountPaid, 'USD')})` : 'Unknown Payer').join(', ');
  };

  const calculateUserPaidAmount = (payers: PayerResponseDto[] | undefined): number => {
      if (!user || !payers) return 0;
      return payers.reduce((sum, payer) => sum + (payer?.user?.id === user.id ? payer.amountPaid : 0), 0);
  };

  const calculateUserLentAmount = (expense: ExpenseResponseDto): number => {
      if (!user) return 0;
      const userPaid = calculateUserPaidAmount(expense.payers);
      let userShare = 0;
      const userSplit = (expense.splits || []).find(split => split?.owedBy?.id === user.id);
      if (userSplit) { userShare = userSplit.amountOwed; }
      else {
          if (expense.splitType === 'EQUAL') {
              const involvedMemberIds = new Set((expense.splits || []).map(s => s?.owedBy?.id).filter(id => id !== undefined));
              if (involvedMemberIds.size === 0) { // If splits array is empty, assume only payers involved equally
                   const payerIds = new Set((expense.payers || []).map(p => p?.user?.id).filter(id => id !== undefined));
                   userShare = payerIds.has(user.id) ? (expense.amount / payerIds.size) : 0;
              } else { // Otherwise, split among those listed in splits
                 userShare = involvedMemberIds.has(user.id) ? (expense.amount / involvedMemberIds.size) : 0;
              }
          } else { userShare = 0; } // For non-equal splits, if not listed, share is 0
      }
      const lentAmount = userPaid - userShare;
      return Math.abs(lentAmount) < 0.005 ? 0 : Math.round(lentAmount * 100) / 100;
  };

  // --- Event Handlers ---
  const handleExpenseSaved = (_savedExpense: ExpenseResponseDto) => { setShowAddExpenseForm(false); setEditingExpense(null); toast.success(editingExpense ? "Expense updated!" : "Expense added!"); fetchGroupData(); };
  const handleMemberAdded = (updatedGroup: GroupResponseDto) => { setGroup(updatedGroup); setShowAddMemberForm(false); toast.success("Member added successfully!"); fetchGroupData(); };
  const handlePaymentSaved = (_savedPayment: PaymentResponseDto) => { setShowAddPaymentForm(false); setEditingPayment(null); toast.success(editingPayment ? "Payment updated!" : "Payment added!"); fetchGroupData(); };
  const handleEditExpenseClick = (expense: ExpenseResponseDto) => { setEditingExpense(expense); setShowAddExpenseForm(true); setIsDetailModalOpen(false); };
  const handleDeleteExpenseClick = (expenseId: number) => { openConfirmModal('delete_expense', expenseId); setIsDetailModalOpen(false); };
  const openConfirmModal = (type: ConfirmActionType, id?: number, itemName?: string) => { setConfirmData({ id, type, itemName }); setIsConfirmModalOpen(true); };
  const closeConfirmModal = () => { setIsConfirmModalOpen(false); setConfirmData(null); };

  const executeConfirmAction = async () => {
      if (!confirmData || !groupId) return;
      const { id, type } = confirmData;
      const numericGroupId = parseInt(groupId, 10);
      try {
          let successMessage = '';
          if (type === 'delete_expense' && id !== undefined) { await deleteExpense(id); successMessage = "Expense deleted"; }
          else if (type === 'delete_payment' && id !== undefined) { await deletePayment(id); successMessage = "Payment deleted"; }
          else if (type === 'delete_comment' && id !== undefined) { await deleteComment(id); successMessage = "Comment deleted"; if (selectedExpense) { fetchCommentsForExpense(selectedExpense.id); } }
          else if (type === 'leave_group' && user?.id !== undefined) { await leaveGroup(numericGroupId, user.id); successMessage = "Left group"; navigate('/app/groups'); }
          else if (type === 'delete_group') { await deleteGroup(numericGroupId); successMessage = "Group deleted"; navigate('/app/groups'); }
          if (successMessage) toast.success(successMessage);
          if (type !== 'leave_group' && type !== 'delete_group' && type !== 'delete_comment') { fetchGroupData(); }
      } catch (err: any) {
          const errorMsg = `Failed to ${type.replace('_', ' ')}: ${err.message || 'Unknown error'}`;
          setError(errorMsg); toast.error(errorMsg); console.error(`Failed to ${type}:`, err);
      } finally { closeConfirmModal(); }
  };

  const fetchCommentsForExpense = async (expenseId: number) => {
      setIsCommentsLoading(true); setCommentError(null);
      try { setComments(await getCommentsForExpense(expenseId)); }
      catch (err: any) { console.error("Failed to fetch comments:", err); setCommentError(err.message || "Could not load comments."); setComments([]); }
      finally { setIsCommentsLoading(false); }
  };

  const openDetailModal = (expense: ExpenseResponseDto) => { setSelectedExpense(expense); setIsDetailModalOpen(true); fetchCommentsForExpense(expense.id); };
  const closeDetailModal = () => { setIsDetailModalOpen(false); setSelectedExpense(null); setComments([]); setIsCommentsLoading(false); setCommentError(null); setNewCommentContent(''); setIsPostingComment(false); };
  const handleAddComment = async () => {
      if (!newCommentContent.trim() || !selectedExpense) return;
      setIsPostingComment(true); setCommentError(null);
      const commentData: CommentCreateRequest = { content: newCommentContent };
      try {
          const addedComment = await addCommentToExpense(selectedExpense.id, commentData);
          setComments(prevComments => [...prevComments, addedComment]); setNewCommentContent(''); toast.success("Comment added!");
      } catch (err: any) { console.error("Failed to add comment:", err); setCommentError(err.message || "Failed to post comment."); toast.error(commentError || "Failed to post comment."); }
      finally { setIsPostingComment(false); }
  };
  const handleDeleteCommentClick = (commentId: number) => { openConfirmModal('delete_comment', commentId, 'this comment'); };
  const handleLeaveGroup = () => { if (!user || !groupId) return; openConfirmModal('leave_group'); };
  const handleDeleteGroup = () => { if (!groupId) return; openConfirmModal('delete_group'); };
  const handleEditPaymentClick = (payment: PaymentResponseDto) => { setEditingPayment(payment); setShowAddPaymentForm(true); };

  // --- Render Logic ---
  if (isLoading) return <p className="p-4 text-center">Loading group details...</p>;
  if (error && !group) return <p className="p-4 text-center text-red-500">Error: {error}</p>;
  if (!group) return <p className="p-4 text-center">Group not found.</p>;

  const isCreator = user?.id === group.creator?.id;
  let lastRenderedMonthYear: string | null = null;

  const getModalContent = () => {
        if (!confirmData) return { title: '', message: '', confirmText: 'Confirm' };
        const { type, itemName } = confirmData;
        switch (type) {
            case 'delete_expense': return { title: 'Delete Expense', message: 'Are you sure you want to delete this expense?', confirmText: 'Delete' };
            case 'delete_payment': return { title: 'Delete Payment', message: 'Are you sure you want to delete this payment record?', confirmText: 'Delete' };
            case 'delete_comment': return { title: 'Delete Comment', message: `Are you sure you want to delete ${itemName || 'this comment'}?`, confirmText: 'Delete' };
            case 'leave_group': return { title: 'Leave Group', message: 'Are you sure you want to leave this group? You cannot rejoin unless invited back.', confirmText: 'Leave' };
            case 'delete_group': return { title: 'Delete Group', message: 'Are you sure you want to permanently delete this group and all its expenses/payments? This cannot be undone.', confirmText: 'Delete Permanently' };
            default: return { title: '', message: '', confirmText: 'Confirm' };
        }
    };
    const modalContent = getModalContent();


  return (
    <div className="container mx-auto p-4 pb-16">
       <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Group: {group.name}</h2>
        <div className="flex space-x-2">
             <button onClick={() => { setEditingPayment(null); setShowAddPaymentForm(true); }} className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-1 px-3 rounded text-sm shadow" title="Settle Up / Record Payment">Settle Up</button>
             <button onClick={() => { setEditingExpense(null); setShowAddExpenseForm(true); }} className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-1 px-3 rounded text-sm shadow" title="Add Expense to Group">Add Expense</button>
             {/* <button className="p-2 text-gray-500 hover:bg-gray-100 rounded"><Cog6ToothIcon className="h-5 w-5" /></button> */}
        </div>
      </div>

       <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="p-4 bg-white shadow rounded-lg">
               <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold">Members</h3>
                     <button onClick={() => setShowAddMemberForm(true)} className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium py-1 px-2 rounded">+ Add Member</button>
               </div>
              <ul className="list-disc list-inside pl-4 text-sm space-y-1">
                  {group.members.map(member => (
                      <li key={member.id}>{member.name} {member.id === user?.id ? <span className="text-gray-500">(You)</span> : ''}</li>
                  ))}
              </ul>
          </div>

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

      {/* Combined Transactions List */}
      <div className="bg-white shadow rounded-lg mb-6">
         <h3 className="text-lg font-semibold mb-0 p-4 border-b">Group Activity</h3>
         {isLoading && <p className="p-4 text-gray-500">Loading activity...</p>}
         {!error && transactions.length === 0 && !isLoading && (
               <p className="p-4 text-gray-500">No expenses or payments recorded in this group yet.</p>
         )}
         {!isLoading && !error && transactions.length > 0 && (
               <ul className="divide-y divide-gray-200">
                 {transactions.map((transaction, index) => { // Use combined 'transactions' state
                     const transactionDate = new Date(transaction.date + 'T00:00:00');
                     const currentMonthYear = `${transactionDate.getFullYear()}-${transactionDate.getMonth()}`;
                     const showMonthHeader = index === 0 || lastRenderedMonthYear !== currentMonthYear;
                     lastRenderedMonthYear = currentMonthYear;

                     let transactionListItem: React.ReactNode | null = null; // Use React.ReactNode

                     if (isExpense(transaction)) {
                         // Render Expense Item
                         const expense = transaction;
                         const youPaid = calculateUserPaidAmount(expense.payers);
                         const youLent = calculateUserLentAmount(expense);
                         const lentAmountDisplay = youLent >= 0 ? youLent : 0;
                         const borrowedAmountDisplay = youLent < 0 ? Math.abs(youLent) : 0;
                         transactionListItem = (
                             <li key={`expense-${expense.id}`} className={`flex items-center px-4 py-2 cursor-pointer hover:bg-gray-50`} onClick={() => openDetailModal(expense)}>
                                 <div className="w-10 text-center mr-2 flex-shrink-0">
                                     <p className="text-xs uppercase text-gray-500">{transactionDate.toLocaleString('default', { month: 'short' })}</p>
                                     <p className="text-base font-medium text-gray-700">{transactionDate.getDate()}</p>
                                 </div>
                                 <div className="flex-grow flex items-center mr-3 overflow-hidden">
                                     <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                                         <ReceiptPercentIcon className="h-5 w-5 text-gray-500" />
                                     </div>
                                     <p className="font-medium text-sm text-gray-800 truncate" title={expense.description}>{expense.description}</p>
                                     {expense.notes && <span title="Has notes" className="ml-1 text-gray-400 text-xs">📝</span>}
                                     {expense.receiptUrl && <span title="Has receipt" className="ml-1 text-gray-400 text-xs">📎</span>}
                                 </div>
                                 <div className="flex flex-col text-right w-20 flex-shrink-0">
                                     <div><p className="text-xs text-gray-500 leading-tight">you paid</p><p className="text-xs font-medium text-gray-700 leading-tight">{formatCurrency(youPaid, expense.currency)}</p></div>
                                     <div className="mt-1">
                                         {lentAmountDisplay > 0 && (<><p className="text-xs text-green-600 leading-tight">you lent</p><p className="text-xs font-medium text-green-600 leading-tight">{formatCurrency(lentAmountDisplay, expense.currency)}</p></>)}
                                         {borrowedAmountDisplay > 0 && (<><p className="text-xs text-red-600 leading-tight">you borrowed</p><p className="text-xs font-medium text-red-600 leading-tight">{formatCurrency(borrowedAmountDisplay, expense.currency)}</p></>)}
                                         {lentAmountDisplay === 0 && borrowedAmountDisplay === 0 && (<><p className="text-xs text-gray-500 leading-tight">no balance</p><p className="text-xs font-medium text-gray-500 leading-tight">{formatCurrency(0, expense.currency)}</p></>)}
                                     </div>
                                 </div>
                             </li>
                         );
                     } else {
                         // Render Payment Item
                         const payment = transaction as PaymentResponseDto;
                         transactionListItem = (
                              <li key={`payment-${payment.id}`} className="flex items-center px-4 py-3 hover:bg-gray-50">
                                  <div className="w-10 text-center mr-2 flex-shrink-0">
                                      <p className="text-xs uppercase text-gray-500">{transactionDate.toLocaleString('default', { month: 'short' })}</p>
                                      <p className="text-base font-medium text-gray-700">{transactionDate.getDate()}</p>
                                  </div>
                                  <div className="flex-grow flex items-center mr-3 overflow-hidden">
                                      <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3"> {/* Changed background to green */}
                                          <BanknotesIcon className="h-5 w-5 text-green-600" /> {/* Changed color to green */}
                                      </div>
                                      <p className="text-sm text-gray-800 truncate">
                                          <span className="font-medium">{payment.paidBy.name === user?.name ? 'You' : payment.paidBy.name}</span> paid <span className="font-medium">{payment.paidTo.name === user?.name ? 'you' : payment.paidTo.name}</span>
                                      </p>
                                  </div>
                                  <div className="text-right w-20 flex-shrink-0">
                                      <p className="text-sm font-medium text-blue-600">{formatCurrency(payment.amount, payment.currency)}</p>
                                  </div>
                                  <div className="ml-4 flex-shrink-0 space-x-2">
                                       <button onClick={() => handleEditPaymentClick(payment)} className="text-indigo-600 hover:text-indigo-900 text-xs">Edit</button>
                                       <button onClick={() => openConfirmModal('delete_payment', payment.id)} className="text-red-600 hover:text-red-900 text-xs">Delete</button>
                                  </div>
                              </li>
                         );
                     }

                     if (showMonthHeader) {
                         return (
                             <React.Fragment key={`month-${currentMonthYear}`}>
                                 <li className="bg-gray-50 px-4 py-1 text-xs font-semibold text-gray-500 uppercase sticky top-0 z-10">
                                     {transactionDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                 </li>
                                 {transactionListItem}
                             </React.Fragment>
                         );
                     } else {
                         return transactionListItem;
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
                <div className="relative mx-auto p-1 border w-full max-w-lg shadow-lg rounded-md bg-white">
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
        {selectedExpense && (
             <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-30 flex items-center justify-center">
                 <div className="relative mx-auto p-5 border w-full max-w-xl shadow-lg rounded-md bg-white">
                     <div className="flex justify-between items-center border-b pb-3 mb-4">
                         <h3 className="text-xl font-semibold text-gray-900">{selectedExpense.description}</h3>
                         <button onClick={closeDetailModal} className="text-gray-400 hover:text-gray-600">
                             <XMarkIcon className="h-6 w-6" />
                         </button>
                     </div>
                     <div className="text-sm space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                         <p><strong>Amount:</strong> {formatCurrency(selectedExpense.amount, selectedExpense.currency)}</p>
                         <p><strong>Date:</strong> {new Date(selectedExpense.date + 'T00:00:00').toLocaleDateString()}</p>
                         <p><strong>Paid by:</strong> {getPayerString(selectedExpense.payers)}</p>
                         <p><strong>Split:</strong> {selectedExpense.splitType}</p>
                         {selectedExpense.splits.length > 0 && (
                             <div>
                                 <strong>Details:</strong>
                                 <ul className="list-disc list-inside pl-4 mt-1">
                                     {selectedExpense.splits.map(split => (
                                         <li key={split.splitId}>
                                             {split.owedBy.name} owes {formatCurrency(split.amountOwed, selectedExpense.currency)}
                                         </li>
                                     ))}
                                 </ul>
                             </div>
                         )}
                         {selectedExpense.notes && <p><strong>Notes:</strong> {selectedExpense.notes}</p>}
                         {selectedExpense.receiptUrl && (
                             <p><strong>Receipt:</strong> <a href={selectedExpense.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View Receipt</a></p>
                         )}

                         {/* Comments Section */}
                         <div className="mt-4 pt-4 border-t">
                             <h4 className="text-md font-semibold mb-2">Comments</h4>
                             {isCommentsLoading && <p>Loading comments...</p>}
                             {commentError && <p className="text-red-500 text-sm">Error: {commentError}</p>}
                             {!isCommentsLoading && !commentError && comments.length === 0 && <p className="text-gray-500 text-sm">No comments yet.</p>}
                             {!isCommentsLoading && !commentError && comments.length > 0 && (
                                 <ul className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                                     {comments.map(comment => (
                                         <li key={comment.id} className="text-xs border-b pb-1">
                                             <span className="font-semibold">{comment.author.name}:</span> {comment.content}
                                             <span className="text-gray-400 text-xxs block text-right">
                                                 {new Date(comment.createdAt).toLocaleString()}
                                                 {comment.author.id === user?.id && (
                                                     <button onClick={() => handleDeleteCommentClick(comment.id)} className="ml-2 text-red-500 hover:text-red-700">Delete</button>
                                                 )}
                                             </span>
                                         </li>
                                     ))}
                                 </ul>
                             )}
                             {/* Add Comment Form */}
                             <div className="mt-4">
                                 <textarea
                                     rows={2}
                                     value={newCommentContent}
                                     onChange={(e) => setNewCommentContent(e.target.value)}
                                     placeholder="Add a comment..."
                                     className="w-full p-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                     disabled={isPostingComment}
                                 />
                                 <button
                                     onClick={handleAddComment}
                                     disabled={!newCommentContent.trim() || isPostingComment}
                                     className="mt-2 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50"
                                 >
                                     {isPostingComment ? 'Posting...' : 'Add Comment'}
                                 </button>
                             </div>
                         </div>
                     </div>
                     <div className="flex justify-end space-x-3 mt-4 pt-4 border-t">
                         <button onClick={() => handleEditExpenseClick(selectedExpense)} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700">Edit</button>
                         <button onClick={() => handleDeleteExpenseClick(selectedExpense.id)} className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700">Delete</button>
                         <button onClick={closeDetailModal} className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300">Close</button>
                     </div>
                 </div>
             </div>
        )}

    </div>
  );
};

export default GroupDetailPage;
