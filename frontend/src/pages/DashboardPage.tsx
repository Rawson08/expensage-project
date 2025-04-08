import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { UserGroupIcon, UserIcon, DocumentTextIcon, MagnifyingGlassIcon, UserPlusIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline'; // Assuming Heroicons v2 Outline
import { useAuth } from '../context/AuthContext';
import { getOverallBalanceSummary, getGroupBalances } from '../services/balanceService'; // Added getGroupBalances
import { getMyGroups } from '../services/groupService';
import { getMyExpenses } from '../services/expenseService';
import { getFriends } from '../services/friendshipService'; // Added getFriends
import { GroupResponseDto, ExpenseResponseDto, OverallBalanceSummaryDto, BalanceDto, FriendshipResponseDto } from '../types/api'; // Added BalanceDto, FriendshipResponseDto
import CreateGroupForm from '../components/CreateGroupForm';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [balanceSummary, setBalanceSummary] = useState<OverallBalanceSummaryDto | null>(null);
  const [groups, setGroups] = useState<GroupResponseDto[]>([]);
  const [expenses, setExpenses] = useState<ExpenseResponseDto[]>([]); // Keep recent expenses for now, might remove later if not needed for dashboard view
  // Unused state removed: groupBalancesMap
  const [netGroupBalances, setNetGroupBalances] = useState<{ [groupId: number]: number }>({});
  const [friends, setFriends] = useState<FriendshipResponseDto[]>([]); // State for friends
  const [nonGroupNetBalance, setNonGroupNetBalance] = useState<number>(0); // State for non-group balance
  const [isLoadingBalances, setIsLoadingBalances] = useState(true);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [isLoadingGroupBalances, setIsLoadingGroupBalances] = useState(false);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true); // Loading state for friends
  const [errorBalances, setErrorBalances] = useState<string | null>(null);
  const [errorGroups, setErrorGroups] = useState<string | null>(null);
  // Unused state removed: errorExpenses
  const [errorGroupBalances, setErrorGroupBalances] = useState<string | null>(null);
  const [errorFriends, setErrorFriends] = useState<string | null>(null); // Error state for friends
  const [showCreateGroupForm, setShowCreateGroupForm] = useState(false);

  const fetchBalanceSummary = useCallback(async () => {
    setIsLoadingBalances(true);
    setErrorBalances(null);
    try {
      const data = await getOverallBalanceSummary();
      setBalanceSummary(data);
    } catch (err: any) {
      setErrorBalances(err.message || 'Could not load balance summary.');
      setBalanceSummary(null);
    } finally {
      setIsLoadingBalances(false);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
      setIsLoadingGroups(true);
      setErrorGroups(null);
      try {
          const data = await getMyGroups();
          setGroups(data);
      } catch (err: any) {
          setErrorGroups(err.message || 'Could not load groups.');
      } finally {
          setIsLoadingGroups(false);
      }
  }, []);

  const fetchExpenses = useCallback(async () => {
      setIsLoadingExpenses(true);
      // Unused setter call removed
      try {
          const data = await getMyExpenses();
          data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setExpenses(data);
      } catch (err: any) {
          console.error("Failed to fetch expenses:", err);
          // Unused setter call removed
      } finally {
          setIsLoadingExpenses(false);
      }
  }, []);

  const fetchFriends = useCallback(async () => {
      setIsLoadingFriends(true);
      setErrorFriends(null);
      try {
          const data = await getFriends();
          // Filter for accepted friends only, just in case API returns others
          setFriends(data.filter(f => f.status === 'ACCEPTED'));
      } catch (err: any) {
          console.error("Failed to fetch friends:", err);
          setErrorFriends(err.message || 'Could not load friends.');
      } finally {
          setIsLoadingFriends(false);
      }
  }, []);


  // Fetch initial data (overall balance, groups, expenses)
  // Fetch initial data (overall balance, groups, expenses, friends)
  useEffect(() => {
    if (user) {
      fetchBalanceSummary();
      fetchGroups();
      fetchExpenses();
      fetchFriends(); // Fetch friends as well
    } else {
      // Reset state if user logs out
      setIsLoadingBalances(false);
      setIsLoadingGroups(false);
      setIsLoadingExpenses(false);
      setIsLoadingGroupBalances(false);
      setIsLoadingFriends(false); // Reset friends loading
      setBalanceSummary(null);
      setGroups([]);
      setExpenses([]);
      setFriends([]); // Reset friends
      // Unused setter call removed
      setNetGroupBalances({});
      setNonGroupNetBalance(0); // Reset non-group balance
      setErrorBalances("User not logged in.");
      setErrorGroups("User not logged in.");
      // Unused setter call removed
      setErrorGroupBalances(null);
      setErrorFriends("User not logged in."); // Reset friends error
    }
  }, [user, fetchBalanceSummary, fetchGroups, fetchExpenses, fetchFriends]); // Added fetchFriends dependency

  // Fetch and calculate balances for each group after groups are loaded
  useEffect(() => {
    if (groups.length > 0 && !isLoadingGroups) {
      const fetchAllGroupBalances = async () => {
        setIsLoadingGroupBalances(true);
        setErrorGroupBalances(null);
        // setErrorFriends("User not logged in."); // REMOVED - Misplaced line
        const balancesMap: { [groupId: number]: BalanceDto[] } = {};
        const netBalances: { [groupId: number]: number } = {};
        let fetchError = null;

        try {
          await Promise.all(groups.map(async (group) => {
            try {
              const balances = await getGroupBalances(group.id);
              balancesMap[group.id] = balances;
              // Calculate net balance for the current user in this group
              netBalances[group.id] = balances.reduce((sum, balance) => sum + balance.netAmount, 0);
            } catch (groupErr: any) {
              console.error(`Failed to fetch balances for group ${group.id}:`, groupErr);
              // Store group-specific error or a general one? For now, set a general error.
              fetchError = groupErr.message || `Could not load balances for group ${group.name}.`;
              // Optionally store per-group errors if needed later
            }
          }));
        } catch (overallErr) {
            // This catch might not be strictly necessary with individual catches,
            // but good for catching potential Promise.all issues.
            console.error("Error fetching group balances:", overallErr);
            fetchError = "An unexpected error occurred while fetching group balances.";
        }


        // Unused setter call removed
        setNetGroupBalances(netBalances);
        setErrorGroupBalances(fetchError); // Set the general error if any occurred
        setIsLoadingGroupBalances(false);
      };

      fetchAllGroupBalances();
    } else {
        // Reset if groups list becomes empty
        // Unused setter call removed
        setNetGroupBalances({});
        setIsLoadingGroupBalances(false); // Ensure loading is false if no groups
    }
  }, [groups, isLoadingGroups]); // Dependency: run when groups array or its loading state changes


  // Calculate net balance for non-group expenses
  useEffect(() => {
      if (!isLoadingExpenses && expenses.length > 0 && user) {
          let netBalance = 0;
          const nonGroupExpenses = expenses.filter(exp => !exp.groupId);

          nonGroupExpenses.forEach(expense => {
              // Money paid by the current user
              const paidByUser = expense.payers.reduce((sum, payer) => {
                  return sum + (payer.user?.id === user.id ? payer.amountPaid : 0);
              }, 0);

              // Money owed by the current user from splits
              const owedByUser = expense.splits.reduce((sum, split) => {
                  return sum + (split.owedBy?.id === user.id ? split.amountOwed : 0);
              }, 0);

              // Net change for this expense: (amount user should have paid) - (amount user actually paid)
              // If positive, user is owed; if negative, user owes.
              // Simplified: If user paid more than they owe, they are owed the difference.
              // If user owes more than they paid, they owe the difference.
              // Net = OwedToUser - OwedByUser = (paidByUser - owedByUser)
              netBalance += (paidByUser - owedByUser);
          });

          setNonGroupNetBalance(netBalance);
      } else {
          setNonGroupNetBalance(0); // Reset if no expenses or user logs out
      }
  }, [expenses, isLoadingExpenses, user]); // Dependencies: expenses, loading state, user

  const handleGroupCreated = (newGroup: GroupResponseDto) => {
    setGroups(prevGroups => [...prevGroups, newGroup]);
    setShowCreateGroupForm(false);
  };

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

  // Unused getPayerString function removed previously

  return (
    // Mobile-first container, padding adjusted for typical mobile view
    <div className="container mx-auto px-0 sm:px-4 pb-16"> {/* Added padding-bottom for potential bottom nav */}

      {/* Header Area - Simplified for now */}
      <div className="p-4 flex justify-between items-center">
        {/* Placeholder for Logo/App Name */}
        <div className="text-xl font-bold text-green-600">ExpenSage</div>
        {/* Placeholder for Header Icons (Search, Add Friend, Filters) */}
        <div className="flex space-x-4">
          {/* Actual Header Icons */}
          <button className="text-gray-600 hover:text-gray-800"><MagnifyingGlassIcon className="h-6 w-6" /></button>
          <button className="text-gray-600 hover:text-gray-800"><UserPlusIcon className="h-6 w-6" /></button>
          <button className="text-gray-600 hover:text-gray-800"><AdjustmentsHorizontalIcon className="h-6 w-6" /></button>
        </div>
      </div>

      {/* Overall Balance Summary */}
      <div className="p-4 mb-4">
        {isLoadingBalances && <p className="text-center text-gray-500">Loading overall balance...</p>}
        {errorBalances && <p className="text-center text-red-500">Error: {errorBalances}</p>}
        {!isLoadingBalances && !errorBalances && balanceSummary && (
          <div className="text-center">
            {(balanceSummary.totalOwedToUser === 0 && balanceSummary.totalOwedByUser === 0) ? (
              <p className="text-lg text-gray-600">You are all settled up!</p>
            ) : (
              <>
                {balanceSummary.totalOwedToUser > balanceSummary.totalOwedByUser ? (
                  <p className="text-lg text-gray-600">
                    Overall, you are owed <span className="font-bold text-green-600">{formatCurrency(balanceSummary.totalOwedToUser - balanceSummary.totalOwedByUser, balanceSummary.currency)}</span>
                  </p>
                ) : (
                  <p className="text-lg text-gray-600">
                    Overall, you owe <span className="font-bold text-red-600">{formatCurrency(balanceSummary.totalOwedByUser - balanceSummary.totalOwedToUser, balanceSummary.currency)}</span>
                  </p>
                )}
                {/* Optional: Show breakdown if needed */}
                {/* <div className="text-sm text-gray-500 mt-1">
                  (Owed: {formatCurrency(balanceSummary.totalOwedToUser, balanceSummary.currency)} / Owing: {formatCurrency(balanceSummary.totalOwedByUser, balanceSummary.currency)})
                </div> */}
              </>
            )}
          </div>
        )}
         {!isLoadingBalances && !errorBalances && !balanceSummary && (
             <p className="text-center text-gray-500">Could not load balance summary.</p>
         )}
      </div>

      {/* Group Balances List */}
      <div className="px-2"> {/* Slight horizontal padding for list items */}
        {(isLoadingGroups || isLoadingFriends) && <p className="text-center text-gray-500 py-4">Loading balances...</p>}
        {errorGroups && <p className="text-center text-red-500 py-4">Error loading groups: {errorGroups}</p>}
        {errorFriends && <p className="text-center text-red-500 py-4">Error loading friends: {errorFriends}</p>}
        {/* Group balance errors are handled below within the loop potentially */}
        {errorGroupBalances && <p className="text-center text-red-500 py-4">Error loading group balances: {errorGroupBalances}</p>}


        {/* Combined rendering logic for Groups, Friends, and Non-Group */}
        {!isLoadingGroups && !isLoadingFriends && !isLoadingGroupBalances && !errorGroups && !errorFriends && !errorGroupBalances && (
          (groups.filter(g => netGroupBalances[g.id] !== undefined && netGroupBalances[g.id] !== 0).length === 0 &&
           friends.filter(f => f.netBalance && f.netBalance !== 0).length === 0 &&
           nonGroupNetBalance === 0) ? (
            <p className="text-center text-gray-500 py-4">No balances to show.</p> // Show only if ALL sections are empty/settled
          ) : (
            <ul className="space-y-3"> {/* Spacing between list items */}

              {/* Render Group Balances */}
              {groups.map((group) => {
                const netBalance = netGroupBalances[group.id];
                // Only render if balance is calculated and non-zero
                if (netBalance === undefined || netBalance === 0) return null;

                const isOwed = netBalance > 0;
                const balanceAmount = Math.abs(netBalance);

                return (
                  <li key={`group-${group.id}`} className="bg-white shadow rounded-lg p-3 flex items-center space-x-3 hover:bg-gray-50 transition-colors duration-150">
                    {/* Group Icon */}
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                        <UserGroupIcon className="h-6 w-6" />
                    </div>
                    <div className="flex-grow">
                      <Link to={`/app/group/${group.id}`} className="font-medium text-gray-800 hover:text-blue-600">
                        {group.name}
                      </Link>
                      {/* TODO: Add inner balance details if needed */}
                    </div>
                    <div className="text-right">
                      <span className={`text-xs block ${isOwed ? 'text-green-600' : 'text-red-600'}`}>
                        {isOwed ? 'you are owed' : 'you owe'}
                      </span>
                      <span className={`font-medium ${isOwed ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(balanceAmount, balanceSummary?.currency || 'USD')}
                      </span>
                    </div>
                  </li>
                );
              })}

              {/* Render Friend Balances */}
              {friends.map((friendship) => {
                  // Only render accepted friends with a non-zero balance
                  if (!friendship.netBalance || friendship.netBalance === 0) return null;

                  const isOwed = friendship.netBalance > 0;
                  const balanceAmount = Math.abs(friendship.netBalance);

                  return (
                      <li key={`friend-${friendship.id}`} className="bg-white shadow rounded-lg p-3 flex items-center space-x-3 hover:bg-gray-50 transition-colors duration-150">
                          {/* Friend Icon */}
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                              <UserIcon className="h-6 w-6" />
                          </div>
                          <div className="flex-grow">
                              {/* TODO: Link to friend detail page? */}
                              <span className="font-medium text-gray-800">{friendship.otherUser.name}</span>
                          </div>
                          <div className="text-right">
                              <span className={`text-xs block ${isOwed ? 'text-green-600' : 'text-red-600'}`}>
                                  {isOwed ? `${friendship.otherUser.name} owes you` : 'you owe'} {/* Adjusted text based on who owes */}
                              </span>
                              <span className={`font-medium ${isOwed ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(balanceAmount, balanceSummary?.currency || 'USD')}
                              </span>
                          </div>
                      </li>
                  );
              })}

              {/* Render Non-Group Expenses Summary */}
              {nonGroupNetBalance !== 0 && (
                  <li key="non-group" className="bg-white shadow rounded-lg p-3 flex items-center space-x-3 hover:bg-gray-50 transition-colors duration-150">
                      {/* Non-Group Icon */}
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600">
                          <DocumentTextIcon className="h-6 w-6" />
                      </div>
                      <div className="flex-grow">
                          <span className="font-medium text-gray-800">Non-group expenses</span>
                      </div>
                      <div className="text-right">
                          {nonGroupNetBalance > 0 ? (
                              <>
                                  <span className="text-xs text-green-600 block">you are owed</span>
                                  <span className="font-medium text-green-600">{formatCurrency(nonGroupNetBalance, balanceSummary?.currency || 'USD')}</span>
                              </>
                          ) : (
                              <>
                                  <span className="text-xs text-red-600 block">you owe</span>
                                  <span className="font-medium text-red-600">{formatCurrency(Math.abs(nonGroupNetBalance), balanceSummary?.currency || 'USD')}</span>
                              </>
                          )}
                      </div>
                  </li>
              )}
            </ul>
          )
        )}
      </div>

      {/* Floating Action Button Placeholder? Or rely on bottom nav */}
      {/* <button
          onClick={() => setShowCreateGroupForm(true)} // Or navigate to an 'add expense' page
          className="fixed bottom-20 right-4 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg z-10"
          aria-label="Add Expense or Group"
      >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
      </button> */}

      {/* Keep Create Group Modal (might need styling adjustments later) */}


       {/* Create Group Form Modal */}
       {showCreateGroupForm && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-20 flex items-center justify-center">
                <div className="relative mx-auto p-1 border w-full max-w-md shadow-lg rounded-md bg-white">
                     <div className="p-4">
                        <CreateGroupForm
                            onGroupCreated={handleGroupCreated}
                            onCancel={() => setShowCreateGroupForm(false)}
                        />
                     </div>
                </div>
            </div>
       )}

    </div>
  );
};

export default DashboardPage;