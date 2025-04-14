import React, { useState, useEffect } from 'react'; // Removed useCallback
import { Link } from 'react-router-dom'; // Import Link
// Removed entire unused import line
import { toast } from 'react-toastify';
import ConfirmationModal from '../components/ConfirmationModal';
// Removed unused UserIcon, DocumentTextIcon
import Avatar from '../components/Avatar'; // Import Avatar component
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext'; // Re-add useData import
// Remove service imports for data now coming from context
// import { getOverallBalanceSummary } from '../services/balanceService';
// import { getMyExpenses } from '../services/expenseService';
import {
    // Keep friendship service functions needed for actions
    // Removed unused getIncomingRequests, getOutgoingRequests
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriendship
} from '../services/friendshipService';
// getFriends is no longer needed here if friends come from context

// Define types for confirmation data
type ConfirmActionType = 'reject' | 'remove';
interface ConfirmData {
    id: number;
    name?: string;
    type: ConfirmActionType;
}

const FriendsPage: React.FC = () => {
    const { user } = useAuth();
    // Consume data from context
    const {
        friends,
        expenses,
        balanceSummary,
        incomingRequests: contextIncomingRequests, // Get incoming from context
        outgoingRequests: contextOutgoingRequests, // Get outgoing from context
        isLoading,
        error, // Use combined error state
        fetchData: refreshDataContext // Get context fetch function
    } = useData();

    // Keep only UI state and calculated state locally
    const [nonGroupBalancesPerFriend, setNonGroupBalancesPerFriend] = useState<{ [friendId: number]: number }>({});
    const [friendEmail, setFriendEmail] = useState('');
    // Remove local state for requests, loading, and errors related to requests
    // const [incomingRequests, setIncomingRequests] = useState<FriendshipResponseDto[]>([]);
    // const [outgoingRequests, setOutgoingRequests] = useState<FriendshipResponseDto[]>([]);
    // const [isLoadingRequests, setIsLoadingRequests] = useState(true);
    // const [errorRequests, setErrorRequests] = useState<string | null>(null);
    const [addFriendError, setAddFriendError] = useState<string | null>(null);

    // State for confirmation modal
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmData, setConfirmData] = useState<ConfirmData | null>(null);

    // Remove local fetchRequests function and its useEffect hook

    const handleAddFriend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!friendEmail) return;
        setAddFriendError(null);
        try {
            await sendFriendRequest(friendEmail);
            setFriendEmail('');
            toast.success('Friend request sent!');
            // fetchRequests(); // Remove call to deleted function
            refreshDataContext(); // Refresh context data (friends list might change if user adds self)
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to send friend request.';
            setAddFriendError(errorMsg);
            toast.error(errorMsg);
            console.error(err);
        }
    };

    const handleAccept = async (id: number) => {
        try {
            await acceptFriendRequest(id);
            toast.success("Friend request accepted!");
            // fetchRequests(); // No longer needed
            refreshDataContext(); // Refresh context data (friend status changes)
        } catch (err: any) {
            const errorMsg = `Error accepting request: ${err.message || 'Unknown error'}`;
            toast.error(errorMsg);
            console.error(err);
        }
    };

    // --- Modal Handling ---
    const openConfirmModal = (id: number, type: ConfirmActionType, name?: string) => {
        setConfirmData({ id, type, name });
        setIsConfirmModalOpen(true);
    };

    const closeConfirmModal = () => {
        setIsConfirmModalOpen(false);
        setConfirmData(null);
    };

    const executeConfirmAction = async () => {
        if (!confirmData) return;

        const { id, type, name } = confirmData;

        try {
            if (type === 'reject') {
                await rejectFriendRequest(id);
                toast.info("Friend request rejected.");
            } else if (type === 'remove') {
                await removeFriendship(id);
                toast.info(`Removed ${name || 'friendship/request'}.`);
            }
            // fetchRequests(); // No longer needed
            refreshDataContext(); // Refresh context data (friend removed or request cancelled)
        } catch (err: any) {
            const actionText = type === 'reject' ? 'rejecting request' : 'removing friendship/request';
            const errorMsg = `Error ${actionText}: ${err.message || 'Unknown error'}`;
            toast.error(errorMsg);
            console.error(err);
        }
    };
    // --- End Modal Handling ---


    // Modified handlers to open modal instead of confirm
    const handleReject = (id: number) => {
         openConfirmModal(id, 'reject');
    };

     const handleRemove = (friendshipId: number, friendName: string) => {
         openConfirmModal(friendshipId, 'remove', friendName);
    };


    // Determine modal content based on state
    const getModalContent = () => {
        if (!confirmData) return { title: '', message: '' };
        const { type, name } = confirmData;
        if (type === 'reject') {
            return {
                title: 'Reject Friend Request',
                message: 'Are you sure you want to reject this friend request?',
                confirmText: 'Reject'
            };
        } else if (type === 'remove') {
            return {
                title: 'Remove Friendship/Request',
                message: `Are you sure you want to remove ${name} as a friend or cancel the request?`,
                confirmText: 'Remove'
            };
        }
        return { title: '', message: '' }; // Should not happen
    };

    const modalContent = getModalContent();

    // Calculate non-group net balance PER FRIEND
    // Calculate non-group balances using data from context
    useEffect(() => {
        const newBalances: { [friendId: number]: number } = {};
        if (!isLoading && expenses.length > 0 && user) { // Use context isLoading
            const nonGroupExpenses = expenses.filter(exp => !exp.groupId);

            nonGroupExpenses.forEach(expense => {
                // Identify participants (excluding the current user)
                const participants = new Set<number>();
                expense.payers.forEach(p => { if (p.user && p.user.id !== user.id) participants.add(p.user.id); });
                expense.splits.forEach(s => { if (s.owedBy && s.owedBy.id !== user.id) participants.add(s.owedBy.id); });

                // Only consider expenses strictly between the user and ONE other friend for this simple breakdown
                if (participants.size === 1) {
                    const friendId = participants.values().next().value;

                    const paidByUser = expense.payers.reduce((sum, p) => sum + (p.user?.id === user.id ? p.amountPaid : 0), 0);
                    const owedByUser = expense.splits.reduce((sum, s) => sum + (s.owedBy?.id === user.id ? s.amountOwed : 0), 0);
                    // netChangeForUser: Positive if user is owed this amount for this expense, negative if user owes.
                    const netChangeForUser = paidByUser - owedByUser;

                    // Add to the friend's non-group balance map
                    // The value represents the net amount the *friend* owes the *user* for non-group items.
                    // So, if netChangeForUser is positive (user is owed), friendOwesUser is positive.
                    // If netChangeForUser is negative (user owes), friendOwesUser is negative.
                    // Ensure friendId is a valid number before using as index
                    if (typeof friendId === 'number') {
                        newBalances[friendId] = (newBalances[friendId] || 0) - netChangeForUser; // Friend's balance = -(User's net change)
                    }
                }
                // Note: This logic currently ignores non-group expenses split among more than 2 people.
                // A more complex calculation would be needed for those cases.
            });
        }
        setNonGroupBalancesPerFriend(newBalances);
    }, [expenses, isLoading, user]); // Depend on context expenses and loading state



    // TODO: Extract formatCurrency to a shared utility file
    const formatCurrency = (amount: number, currencyCode: string = 'USD') => {
        if (amount === null || amount === undefined) {
            return 'N/A';
        }
        try {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount);
        } catch (e) {
            console.error("Error formatting currency:", e);
            return `$${amount.toFixed(2)}`;
        }
    };


    return (
        // Adjusted padding for consistency with GroupsPage within MainLayout
        <div className="container mx-auto px-0 sm:px-4 pb-4 bg-gray-50 dark:bg-gray-900"> {/* Added default light/dark bg */}
            {/* Header - Can potentially be removed if MainLayout handles it */}
            {/* <div className="p-4 flex justify-between items-center">
                 <h2 className="text-xl font-bold">Friends</h2>
            </div> */}

            {/* Overall Balance Summary */}
            <div className="p-4 mb-4 text-center"> {/* Added text-center */}
                {/* Use context loading/error for balance summary */}
                {isLoading && <p className="text-gray-500 dark:text-gray-400">Loading overall balance...</p>} {/* Dark mode text */}
                {error && <p className="text-red-500 dark:text-red-400">Error: {error}</p>} {/* Dark mode text */}
                {!isLoading && !error && balanceSummary && (
                    <>
                        {(balanceSummary.totalOwedToUser === 0 && balanceSummary.totalOwedByUser === 0) ? (
                            <p className="text-lg text-gray-600 dark:text-gray-300">{/* Dark mode text */}You are all settled up!</p>
                        ) : (
                            <>
                                {balanceSummary.totalOwedToUser >= balanceSummary.totalOwedByUser ? ( // Show owed if >= 0 net
                                    <p className="text-lg text-gray-600 dark:text-gray-300"> {/* Dark mode text */}
                                        Overall, you are owed <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(balanceSummary.totalOwedToUser - balanceSummary.totalOwedByUser, balanceSummary.currency)}</span>{/* Dark mode balance */}
                                    </p>
                                ) : (
                                    <p className="text-lg text-gray-600 dark:text-gray-300"> {/* Dark mode text */}
                                        Overall, you owe <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(balanceSummary.totalOwedByUser - balanceSummary.totalOwedToUser, balanceSummary.currency)}</span>{/* Dark mode balance */}
                                    </p>
                                )}
                            </>
                        )}
                    </>
                )}
                {!isLoading && !error && !balanceSummary && (
                    <p className="text-gray-500 dark:text-gray-400">Could not load balance summary.</p> /* Dark mode text */
                ) }
            </div>

            {/* Action Buttons Row */}
            <div className="px-4 mb-4 flex justify-end space-x-3">
                 <Link
                    to="/app/settle-up"
                    className="bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 text-white font-medium py-2 px-4 rounded shadow text-sm" // Dark mode button
                 >
                     Settle Up
                 </Link>
                 {/* Add Friend Form can be triggered by a button here too if preferred */}
            </div>

             {/* Add Friend Form */}
            <form onSubmit={handleAddFriend} className="mb-8 p-4 border dark:border-gray-700 rounded shadow-sm bg-white dark:bg-gray-800"> {/* Dark mode form bg/border */}
                {/* ... form content ... */}
                 <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Add Friend</h3> {/* Dark mode text */}
                <div className="flex items-center space-x-2">
                    <input
                        type="email"
                        value={friendEmail}
                        onChange={(e) => setFriendEmail(e.target.value)}
                        placeholder="Enter friend's email"
                        className="flex-grow p-2 border dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" // Dark mode input
                        required
                    />
                    <button
                        type="submit"
                        className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium py-2 px-4 rounded shadow disabled:opacity-50" // Dark mode button
                        disabled={!friendEmail}
                    >
                        Send Request
                    </button>
                </div>
                 {addFriendError && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{addFriendError}</p>} {/* Dark mode error text */}
            </form>

            {/* Use combined loading state, show request loading separately */}
            {/* Use combined loading/error state from context */}
            {isLoading && <p className="text-center text-gray-500 dark:text-gray-400 py-4">Loading data...</p> /* Dark mode text */}
            {error && <p className="text-center text-red-500 dark:text-red-400 py-4">Error: {error}</p> /* Dark mode text */}

            {!isLoading && !error && ( // Use combined loading/error state
                // Single column layout
                <div className="px-2 space-y-6"> {/* Add spacing between sections */}

                    {/* Friends List - Styled like GroupsPage */}
                    <div>
                        {/* Optional: Add a subtle header if needed */}
                        {/* <h3 className="text-md font-semibold mb-2 text-gray-600 px-2">Your Friends</h3> */}
                        {friends.length === 0 ? (
                            <p className="text-center text-gray-500 dark:text-gray-400 py-4">{/* Dark mode text */}No friends yet. Use the form below to add some!</p>
                         ) : (
                            <ul className="space-y-3">
                                {friends.map(friend => {
                                    if (!friend.otherUser) {
                                        return <li key={friend.id} className="py-2 px-3 text-red-500 dark:text-red-400 text-sm"> Error: Friend data incomplete (ID: {friend.id}) </li>; /* Dark mode error text */
                                    }

                                    // Calculate combined balance
                                    const backendNetBalance = friend.netBalance ?? 0;
                                    const nonGroupBalance = nonGroupBalancesPerFriend[friend.otherUser.id] ?? 0;
                                    // Note: backendNetBalance positive means friend owes user.
                                    // nonGroupBalance positive means friend owes user for non-group items.
                                    const totalNetBalance = backendNetBalance + nonGroupBalance;

                                    const isOwed = totalNetBalance > 0.005; // Use tolerance
                                    const isOwing = totalNetBalance < -0.005; // Use tolerance
                                    const balanceAmount = Math.abs(totalNetBalance);

                                    return (
                                        <li key={friend.id} className="bg-white dark:bg-gray-800 shadow rounded-lg p-3 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"> {/* Dark mode list item */}
                                            {/* Use Avatar Component */}
                                            <Avatar name={friend.otherUser.name} size="md" />
                                            {/* Friend Name & Breakdown */}
                                            <div className="flex-grow min-w-0">
                                                <span className="font-medium text-gray-800 dark:text-gray-200 block truncate">{friend.otherUser.name}</span>{/* Dark mode text */}
                                                {/* Non-group Balance Breakdown */}
                                                {nonGroupBalance !== 0 && (
                                                     <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{/* Dark mode sub-text */}
                                                        {nonGroupBalance > 0 ? (
                                                            <>owes you <span className="text-green-700 dark:text-green-500">{formatCurrency(nonGroupBalance)}{/* Dark mode balance */}</span> in non-group</>
                                                        ) : (
                                                            <>you owe <span className="text-red-700 dark:text-red-500">{formatCurrency(Math.abs(nonGroupBalance))}{/* Dark mode balance */}</span> in non-group</>
                                                        )}
                                                    </div>
                                                )}
                                                 {/* TODO: Add breakdown from group balances if needed/available */}
                                            </div>
                                            {/* Total Net Balance Info */}
                                            <div className="text-right flex-shrink-0 w-24">
                                                {(isOwed || isOwing) ? (
                                                    <>
                                                        <span className={`text-xs block ${isOwed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{/* Dark mode sub-text */}
                                                            {isOwed ? `owes you` : 'you owe'}
                                                        </span>
                                                        <span className={`font-medium ${isOwed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{/* Dark mode balance text */}
                                                            {formatCurrency(balanceAmount)}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">{/* Dark mode text */}Settled up</span>
                                                ) } {/* Correctly closed ternary operator */}
                                            </div>
                                            {/* Remove Button - Less prominent? */}
                                            <button
                                                onClick={() => handleRemove(friend.id, friend.otherUser.name)}
                                                className="text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 ml-2 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/50" // Dark mode remove button
                                                title="Remove Friend"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </li>
                                    );
                                })}

                                {/* Removed the separate Non-Group Expenses Summary item - This block was incorrectly left by previous diff */}
                            </ul>
                        )}
                    </div>

                    {/* Incoming Requests */}
                    {/* Incoming Requests Section - Use contextIncomingRequests */}
                    <div className="p-4 border dark:border-gray-700 rounded shadow-sm bg-white dark:bg-gray-800"> {/* Dark mode section bg/border */}
                        <h3 className="text-lg font-semibold mb-3 border-b dark:border-gray-600 pb-2 text-gray-900 dark:text-gray-100">Incoming Requests ({contextIncomingRequests.length})</h3> {/* Dark mode header */}
                         {contextIncomingRequests.length === 0 ? ( <p className="text-gray-500 dark:text-gray-400">No incoming requests.</p> /* Dark mode text */ ) : (
                            <ul className="divide-y divide-gray-200 dark:divide-gray-600"> {/* Dark mode divider */}
                                {contextIncomingRequests.map(req => (
                                    req.otherUser ? (
                                        <li key={req.id} className="py-3 flex justify-between items-center">
                                            <div>
                                                <span className="font-medium text-gray-900 dark:text-gray-100">{req.otherUser.name}</span> {/* Dark mode text */}
                                                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">({req.otherUser.email})</span> {/* Dark mode text */}
                                            </div>
                                            <div className="space-x-2 flex-shrink-0">
                                                <button onClick={() => handleAccept(req.id)} className="bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800 text-xs font-semibold px-2 py-1 rounded">Accept</button> {/* Dark mode button */}
                                                <button onClick={() => handleReject(req.id)} className="bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800 text-xs font-semibold px-2 py-1 rounded">Reject</button> {/* Dark mode button */}
                                            </div>
                                        </li>
                                    ) : ( <li key={req.id} className="py-2 text-red-500 dark:text-red-400 text-sm"> Error: Request data incomplete (ID: {req.id}) </li> /* Dark mode error text */ )
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Outgoing Requests Section - Use contextOutgoingRequests */}
                    <div className="p-4 border dark:border-gray-700 rounded shadow-sm bg-white dark:bg-gray-800"> {/* Dark mode section bg/border */}
                        <h3 className="text-lg font-semibold mb-3 border-b dark:border-gray-600 pb-2 text-gray-900 dark:text-gray-100">Outgoing Requests ({contextOutgoingRequests.length})</h3> {/* Dark mode header */}
                         {contextOutgoingRequests.length === 0 ? ( <p className="text-gray-500 dark:text-gray-400">No outgoing requests.</p> /* Dark mode text */ ) : (
                            <ul className="divide-y divide-gray-200 dark:divide-gray-600"> {/* Dark mode divider */}
                                {contextOutgoingRequests.map(req => (
                                     req.otherUser ? (
                                        <li key={req.id} className="py-3 flex justify-between items-center">
                                            <div>
                                                <span className="font-medium text-gray-900 dark:text-gray-100">{req.otherUser.name}</span> {/* Dark mode text */}
                                                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">({req.otherUser.email})</span> {/* Dark mode text */}
                                            </div>
                                            <button onClick={() => handleRemove(req.id, req.otherUser.name)} className="bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 text-xs font-semibold px-2 py-1 rounded flex-shrink-0">Cancel</button> {/* Dark mode button */}
                                        </li>
                                     ) : ( <li key={req.id} className="py-2 text-red-500 dark:text-red-400 text-sm"> Error: Request data incomplete (ID: {req.id}) </li> /* Dark mode error text */ )
                                ))}
                            </ul>
                        )}
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

export default FriendsPage;