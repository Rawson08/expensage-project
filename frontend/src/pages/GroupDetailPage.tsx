import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api';
import { deleteExpense } from '../services/expenseService';
import { deletePayment } from '../services/paymentService';
import { getGroupBalances } from '../services/balanceService';
import { getGroupTransactions, leaveGroup, deleteGroup } from '../services/groupService';
// Import comment service functions
import { getCommentsForExpense, addCommentToExpense, deleteComment } from '../services/commentService'; 
// Import comment types
import { GroupResponseDto, ExpenseResponseDto, BalanceDto, PaymentResponseDto, TransactionDto, PayerResponseDto, CommentResponseDto, CommentCreateRequest } from '../types/api'; 
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

// Add delete_comment type
type ConfirmActionType = 'delete_expense' | 'delete_payment' | 'leave_group' | 'delete_group' | 'delete_comment'; 
interface ConfirmData {
    id?: number;
    type: ConfirmActionType;
    // Optional: Add extra data if needed, e.g., for comment deletion confirmation message
    itemName?: string; 
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
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<ConfirmData | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseResponseDto | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // State for comments within the detail modal
  const [comments, setComments] = useState<CommentResponseDto[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState<boolean>(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [newCommentContent, setNewCommentContent] = useState<string>('');
  const [isPostingComment, setIsPostingComment] = useState<boolean>(false);


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

        // Fetch group details (which now includes payments)
        const groupPromise = apiClient.get<GroupResponseDto>(`/groups/${numericGroupId}`);
        const balancesPromise = getGroupBalances(numericGroupId);
        // We still fetch transactions for expenses, but payments come from groupPromise
        const transactionsPromise = getGroupTransactions(numericGroupId); 

        const [groupResponse, balancesResponse, transactionsResponse] = await Promise.all([
            groupPromise,
            balancesPromise,
            transactionsPromise // Keep fetching transactions for expenses
        ]);

        // Sort transactions (expenses) by date
        transactionsResponse.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setGroup(groupResponse.data); // Group data now includes payments
        setGroupBalances(balancesResponse);
        // Store all transactions
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
      fetchGroupData(); // Refetch data after saving
  };

  // Called from Detail Modal Edit button
  const handleEditExpenseClick = (expense: ExpenseResponseDto) => {
      setEditingExpense(expense);
      setShowAddExpenseForm(true);
      setIsDetailModalOpen(false); // Close detail modal when opening edit form
  };

  // Called from Detail Modal Delete button
  const handleDeleteExpenseClick = (expenseId: number) => {
      openConfirmModal('delete_expense', expenseId);
      setIsDetailModalOpen(false); // Close detail modal when opening confirm modal
  };

  // --- Confirmation Modal Logic ---
  const openConfirmModal = (type: ConfirmActionType, id?: number, itemName?: string) => { // Added itemName
        setConfirmData({ id, type, itemName });
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
            } else if (type === 'delete_comment' && id !== undefined) { // Handle comment deletion
                await deleteComment(id);
                successMessage = "Comment deleted successfully";
                // Refetch comments for the currently selected expense if modal is open
                if (selectedExpense) {
                    fetchCommentsForExpense(selectedExpense.id); 
                }
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
            // Refetch group data only if the action wasn't leaving/deleting group or deleting comment
            if (type !== 'leave_group' && type !== 'delete_group' && type !== 'delete_comment') { 
                fetchGroupData(); 
            }
        } catch (err: any) {
            const errorMsg = `Failed to ${type.replace('_', ' ')}: ${err.message || 'Unknown error'}`;
            setError(errorMsg); // Maybe use commentError for comment deletion?
            toast.error(errorMsg);
            console.error(`Failed to ${type}:`, err);
        } finally {
            closeConfirmModal(); // Close modal after action attempt
        }
    };
    // --- End Confirmation Modal Logic ---

  // --- Expense Detail Modal Logic ---
  const fetchCommentsForExpense = async (expenseId: number) => {
      setIsCommentsLoading(true);
      setCommentError(null);
      try {
          const fetchedComments = await getCommentsForExpense(expenseId);
          setComments(fetchedComments);
      } catch (err: any) {
          console.error("Failed to fetch comments:", err);
          setCommentError(err.message || "Could not load comments.");
          setComments([]); // Clear comments on error
      } finally {
          setIsCommentsLoading(false);
      }
  };

  const openDetailModal = (expense: ExpenseResponseDto) => {
      setSelectedExpense(expense);
      setIsDetailModalOpen(true);
      fetchCommentsForExpense(expense.id); // Fetch comments when modal opens
  };

  const closeDetailModal = () => {
      setIsDetailModalOpen(false);
      setSelectedExpense(null);
      // Reset comment state on close
      setComments([]);
      setIsCommentsLoading(false);
      setCommentError(null);
      setNewCommentContent('');
      setIsPostingComment(false);
  };
  // --- End Expense Detail Modal Logic ---

  // --- Comment Handling Logic ---
  const handleAddComment = async () => {
      if (!newCommentContent.trim() || !selectedExpense) return;

      setIsPostingComment(true);
      setCommentError(null);
      const commentData: CommentCreateRequest = { content: newCommentContent };

      try {
          const addedComment = await addCommentToExpense(selectedExpense.id, commentData);
          setComments(prevComments => [...prevComments, addedComment]); // Add to state
          setNewCommentContent(''); // Clear input
          toast.success("Comment added!");
      } catch (err: any) {
          console.error("Failed to add comment:", err);
          setCommentError(err.message || "Failed to post comment.");
          toast.error(commentError || "Failed to post comment.");
      } finally {
          setIsPostingComment(false);
      }
  };

  const handleDeleteCommentClick = (commentId: number) => {
      // Use the confirmation modal for deleting comments
      openConfirmModal('delete_comment', commentId, 'this comment');
  };
  // --- End Comment Handling Logic ---


  const handleLeaveGroup = () => {
      if (!user || !groupId) return;
      openConfirmModal('leave_group');
  };

  const handleDeleteGroup = () => {
      if (!groupId) return;
      openConfirmModal('delete_group');
  };

  const handleEditPaymentClick = (payment: PaymentResponseDto) => {
      setEditingPayment(payment);
      setShowAddPaymentForm(true);
  };

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

  // Use transactions state for expenses
  const expensesOnly = transactions.filter(isExpense); 
  // Ensure group.payments exists before accessing it
  const paymentsOnly = group?.payments || []; 

  let lastRenderedMonthYear: string | null = null;
  // Initialize payment month tracker
  let lastRenderedPaymentMonthYear: string | null = null; 

  const getModalContent = () => {
        if (!confirmData) return { title: '', message: '', confirmText: 'Confirm' };
        const { type, itemName } = confirmData; // Added itemName
        switch (type) {
            case 'delete_expense':
                return { title: 'Delete Expense', message: 'Are you sure you want to delete this expense?', confirmText: 'Delete' };
            case 'delete_payment':
                return { title: 'Delete Payment', message: 'Are you sure you want to delete this payment record?', confirmText: 'Delete' };
            case 'delete_comment': // Added case for comment deletion
                return { title: 'Delete Comment', message: `Are you sure you want to delete ${itemName || 'this comment'}?`, confirmText: 'Delete' };
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
                    // Add type guard check inside map
                    if (!isExpense(expense)) return null; 
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

        {/* Payments List */}
        <div className="bg-white shadow rounded-lg mb-6">
            <h3 className="text-lg font-semibold mb-0 p-4 border-b">Payments</h3>
            {/* Use isLoading state for payments too */}
            {isLoading && <p className="p-4 text-gray-500">Loading payments...</p>} 
            {!error && paymentsOnly.length === 0 && !isLoading && (
                <p className="p-4 text-gray-500">No payments recorded in this group yet.</p>
            )}
            {!isLoading && !error && paymentsOnly.length > 0 && (
                <ul className="divide-y divide-gray-200">
                    {paymentsOnly
                        // Add explicit types for sort parameters
                        .sort((a: PaymentResponseDto, b: PaymentResponseDto) => new Date(b.date).getTime() - new Date(a.date).getTime()) 
                        // Add explicit types for map parameters
                        .map((payment: PaymentResponseDto, index: number) => { 
                            const paymentDate = new Date(payment.date + 'T00:00:00');
                            const currentPaymentMonthYear = `${paymentDate.getFullYear()}-${paymentDate.getMonth()}`;

                            // Check index === 0 first to prevent comparing null with string
                            const showPaymentMonthHeader = index === 0 || (lastRenderedPaymentMonthYear !== null && lastRenderedPaymentMonthYear !== currentPaymentMonthYear);
                            // Assign after comparison
                            lastRenderedPaymentMonthYear = currentPaymentMonthYear; 

                            // Define the list item JSX in a variable
                            const paymentListItem = ( 
                                <li key={`payment-${payment.id}`} className="flex items-center px-4 py-3">
                                    {/* Date Column */}
                                    <div className="w-10 text-center mr-2 flex-shrink-0">
                                        <p className="text-xs uppercase text-gray-500">{paymentDate.toLocaleString('default', { month: 'short' })}</p>
                                        <p className="text-base font-medium text-gray-700">{paymentDate.getDate()}</p>
                                    </div>
                                    {/* Icon & Description Column */}
                                    <div className="flex-grow flex items-center mr-3 overflow-hidden">
                                        {/* Placeholder Payment Icon */}
                                        <svg className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                        <p className="font-medium text-sm text-gray-800 truncate" title={`${payment.paidBy.name} paid ${payment.paidTo.name}`}>
                                            {payment.paidBy.id === user?.id ? 'You' : payment.paidBy.name} paid {payment.paidTo.id === user?.id ? 'You' : payment.paidTo.name}
                                        </p>
                                    </div>
                                    {/* Amount Column */}
                                    <div className="flex flex-col text-right w-20 flex-shrink-0">
                                        <p className="text-sm font-medium text-blue-600 leading-tight">{formatCurrency(payment.amount, payment.currency)}</p>
                                    </div>
                                    {/* Action Buttons: Edit, Delete */}
                                    <div className="flex items-center space-x-2 ml-auto pl-2 flex-shrink-0">
                                        {/* Edit Button */}
                                        <button onClick={() => handleEditPaymentClick(payment)} className="p-1 rounded text-blue-600 hover:bg-blue-100" title="Edit Payment">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828zM5 13V11h2v2H5zm14-9l-2-2-9 9v4h4l7-7z"></path></svg>
                                        </button>
                                        {/* Delete Button */}
                                        <button onClick={() => openConfirmModal('delete_payment', payment.id)} className="p-1 rounded text-red-600 hover:bg-red-100" title="Delete Payment">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
                                        </button>
                                    </div>
                                </li>
                            );

                            // Explicitly return the JSX based on the condition
                            if (showPaymentMonthHeader) { 
                                return (
                                    <React.Fragment key={`payment-month-${currentPaymentMonthYear}`}>
                                        <li className="bg-gray-100 px-4 py-1 mt-4 border-t border-b">
                                            <p className="text-sm font-semibold text-gray-600">
                                                {paymentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                            </p>
                                        </li>
                                        {paymentListItem}
                                    </React.Fragment>
                                );
                            } else {
                                return paymentListItem; 
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
                            onPaymentSaved={handlePaymentSaved}
                            onCancel={() => { setShowAddPaymentForm(false); setEditingPayment(null); }}
                            groupId={group.id}
                            groupMembers={group.members}
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
       {isDetailModalOpen && selectedExpense && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-20 flex items-center justify-center">
                {/* Increased max-w- for more space */}
                <div className="relative mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white"> 
                    <h3 className="text-xl font-semibold mb-4">Expense Details</h3>
                    <div className="space-y-3 text-sm mb-6 max-h-[30vh] overflow-y-auto pr-2"> {/* Added max-height and scroll */}
                        <p><strong>Description:</strong> {selectedExpense.description}</p>
                        <p><strong>Amount:</strong> {formatCurrency(selectedExpense.amount, selectedExpense.currency)}</p>
                        <p><strong>Date:</strong> {new Date(selectedExpense.date + 'T00:00:00').toLocaleDateString()}</p>
                        <p><strong>Paid by:</strong> {getPayerString(selectedExpense.payers)}</p>
                        <p><strong>Split:</strong> {selectedExpense.splitType}</p>
                        {selectedExpense.splits && selectedExpense.splits.length > 0 && (
                            <div>
                                <strong>Split Details:</strong>
                                <ul className="list-disc pl-5">
                                    {selectedExpense.splits.map(split => (
                                        <li key={split.splitId}>
                                            {split.owedBy.name}: {formatCurrency(split.amountOwed, selectedExpense.currency)}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {selectedExpense.notes && <p><strong>Notes:</strong> {selectedExpense.notes}</p>}
                        {selectedExpense.receiptUrl && (
                            <p><strong>Receipt:</strong> <a href={selectedExpense.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View Receipt</a></p>
                        )}
                        <p><strong>Added on:</strong> {new Date(selectedExpense.createdAt).toLocaleString()}</p>
                    </div>

                    {/* Comments Section */}
                    <div className="border-t pt-4">
                        <h4 className="text-lg font-semibold mb-3">Comments</h4>
                        {isCommentsLoading && <p className="text-gray-500">Loading comments...</p>}
                        {commentError && <p className="text-red-500 text-sm mb-2">Error: {commentError}</p>}
                        
                        <div className="space-y-3 mb-4 max-h-[25vh] overflow-y-auto pr-2"> {/* Scrollable comment list */}
                            {comments.length === 0 && !isCommentsLoading && (
                                <p className="text-gray-500 text-sm">No comments yet.</p>
                            )}
                            {comments.map(comment => (
                                <div key={comment.id} className="text-sm border-b pb-2 last:border-b-0">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-semibold">{comment.author.id === user?.id ? 'You' : comment.author.name}</span>
                                        <span className="text-xs text-gray-500">
                                            {new Date(comment.createdAt).toLocaleString()}
                                            {comment.author.id === user?.id && (
                                                <button 
                                                    onClick={() => handleDeleteCommentClick(comment.id)} 
                                                    className="ml-2 text-red-500 hover:text-red-700 text-xs"
                                                    title="Delete comment"
                                                >
                                                    (Delete)
                                                </button>
                                            )}
                                        </span>
                                    </div>
                                    <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p> 
                                </div>
                            ))}
                        </div>

                        {/* Add Comment Form */}
                        <div className="mt-4">
                            <textarea
                                value={newCommentContent}
                                onChange={(e) => setNewCommentContent(e.target.value)}
                                placeholder="Add a comment..."
                                rows={2}
                                className="w-full p-2 border rounded focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                disabled={isPostingComment}
                            />
                            <button
                                onClick={handleAddComment}
                                disabled={isPostingComment || !newCommentContent.trim()}
                                className="mt-2 px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                                {isPostingComment ? 'Posting...' : 'Post Comment'}
                            </button>
                        </div>
                    </div>
                    {/* End Comments Section */}

                    <div className="flex justify-end space-x-3 mt-6 border-t pt-4"> {/* Added border-t and pt-4 */}
                        <button onClick={() => handleEditExpenseClick(selectedExpense)} className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300">
                            Edit Expense
                        </button>
                        <button onClick={() => handleDeleteExpenseClick(selectedExpense.id)} className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300">
                            Delete Expense
                        </button>
                        <button onClick={closeDetailModal} className="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default GroupDetailPage;