import React, { useState } from 'react'; // Removed useEffect, useCallback
import { Link } from 'react-router-dom';
import { UserGroupIcon, MagnifyingGlassIcon, AdjustmentsHorizontalIcon, PlusCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'; // Removed UserPlusIcon, Added XMarkIcon
import { useAuth } from '../context/AuthContext'; // Keep useAuth for user ID if needed
import { useData } from '../context/DataContext'; // Import useData hook
// import { getGroupBalances } from '../services/balanceService'; // Remove service import, data comes from context
import { GroupResponseDto, ExpenseResponseDto } from '../types/api'; // Removed BalanceDto
import CreateGroupForm from '../components/CreateGroupForm';
import FilterModal from '../components/FilterModal'; // Keep single import

// Renamed component from DashboardPage to GroupsPage
const GroupsPage: React.FC = () => {
  // Consume data from context
  const {
      groups,
      balanceSummary,
      netGroupBalances,
      groupBalancesMap, // Get detailed map from context
      isLoading,
      error,
      fetchData
  } = useData();
  const { user } = useAuth();

  // Local UI state remains
  const [showCreateGroupForm, setShowCreateGroupForm] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [groupFilter, setGroupFilter] = useState<'none' | 'outstanding' | 'owe' | 'owed'>('none');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  // Remove local state for groupBalancesMap, now comes from context
  // const [groupBalancesMap, setGroupBalancesMap] = useState<{ [groupId: number]: BalanceDto[] }>({});

  // Remove redundant fetch functions and the main data fetching useEffect
  // const fetchBalanceSummary = useCallback(...); // Provided by context
  // const fetchGroups = useCallback(...); // Provided by context
  // const fetchExpenses = useCallback(...); // Provided by context (if needed elsewhere)
  // useEffect(() => { /* Fetch initial data */ }, ...); // Handled by context

  // Remove useEffect for fetching groupBalancesMap locally

  // Remove useEffect hook for fetching groupBalancesMap locally


  // Removed non-group expense calculation useEffect

  const handleGroupCreated = (newGroup: GroupResponseDto) => {
    // Need to refresh context data after creating a group
    fetchData(); // Call context refresh function
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

  // Removed unused getPayerString function

  const handleToggleSearch = () => {
      setShowSearchInput(prev => !prev);
      if (showSearchInput) { // If we are closing the search, clear the term
          setSearchTerm('');
      }
  };

  const handleSelectFilter = (filter: 'none' | 'outstanding' | 'owe' | 'owed') => {
    setGroupFilter(filter);
    setShowFilterModal(false); // Close modal after selection
  };

  return (
    // Mobile-first container, padding adjusted for typical mobile view
    <div className="container mx-auto px-0 sm:px-4 pb-16"> {/* Added padding-bottom for potential bottom nav */}

      {/* Header Area - Simplified for now */}
      <div className="p-4 flex justify-between items-center space-x-4">
        {/* Conditionally render Add Group or Search Input */}
        {!showSearchInput ? (
             <button onClick={() => setShowCreateGroupForm(true)} className="text-blue-600 hover:text-blue-800 flex-shrink-0">
                 <PlusCircleIcon className="h-7 w-7" />
             </button>
        ) : (
            <div className="flex-grow relative">
                 <input
                     type="text"
                     placeholder="Search groups..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full p-2 pl-8 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                     autoFocus // Focus input when it appears
                 />
                 <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-2 top-1/2 transform -translate-y-1/2" />
            </div>
        )}

        {/* Header Icons (Top Right) */}
        <div className="flex space-x-4 flex-shrink-0">
          {/* Search Toggle Button */}
          <button onClick={handleToggleSearch} className="text-gray-600 hover:text-gray-800">
            {showSearchInput ? <XMarkIcon className="h-6 w-6" /> : <MagnifyingGlassIcon className="h-6 w-6" />}
          </button>
          {/* Filter Button - Hide when search is active? Optional */}
          {!showSearchInput && (
              <button onClick={() => setShowFilterModal(true)} className="text-gray-600 hover:text-gray-800">
                  <AdjustmentsHorizontalIcon className="h-6 w-6" />
              </button>
          )}
        </div>
      </div>

      {/* Overall Balance Summary - Use context data */}
      <div className="p-4 mb-4">
        {/* Use combined loading/error state from context */}
        {isLoading && <p className="text-center text-gray-500">Loading data...</p>}
        {error && <p className="text-center text-red-500">Error: {error}</p>}
        {!isLoading && !error && balanceSummary && (
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
         {!isLoading && !error && !balanceSummary && (
             <p className="text-center text-gray-500">Could not load balance summary.</p>
         )}
      </div>

      {/* Group Balances List */}
      <div className="px-2"> {/* Slight horizontal padding for list items */}
        {/* Loading/error messages handled above with combined state */}


        {/* Combined rendering logic for Groups, Friends, and Non-Group */}
        {/* Updated condition to only check group related loading/errors */}
        {!isLoading && !error && (() => { // Use combined loading/error state
            // Apply filtering AND search
            const filteredAndSearchedGroups = groups.filter(group => {
                // Apply search filter first
                const searchTermLower = searchTerm.toLowerCase();
                if (searchTermLower && !group.name.toLowerCase().includes(searchTermLower)) {
                    return false; // Exclude if search term doesn't match group name
                }

                // Then apply balance filter
                const balance = netGroupBalances[group.id];
                // If searching, maybe show settled groups that match search? Decide on interaction.
                // For now, keep existing filter logic after search filter passes.
                if (balance === undefined && groupFilter !== 'none') return false; // Hide if balance needed but not ready

                switch (groupFilter) {
                    case 'outstanding':
                        return balance !== undefined && balance !== 0;
                    case 'owe':
                        return balance !== undefined && balance < 0;
                    case 'owed':
                        return balance !== undefined && balance > 0;
                    case 'none':
                    default:
                        return true; // Show if passes search filter
                }
            });

            if (filteredAndSearchedGroups.length === 0) {
                return <p className="text-center text-gray-500 py-4">
                    {searchTerm ? 'No groups match your search.' : 'No groups match the current filter.'}
                </p>;
            }

            return (
                <ul className="space-y-3"> {/* Spacing between list items */}
                    {filteredAndSearchedGroups.map((group) => {
                        const netBalance = netGroupBalances[group.id];
                        // We already filtered out undefined balances above
                        if (netBalance === undefined) return null; // Should not happen, but safe guard

                        const isOwed = netBalance > 0;
                        // const isOwing = netBalance < 0; // Removed unused variable
                        const balanceAmount = Math.abs(netBalance);

                        return (
                            // Key must be on the outermost element in the map (the Link)
                            <Link key={`group-${group.id}`} to={`/app/group/${group.id}`} className="block bg-white shadow rounded-lg hover:bg-gray-50 transition-colors duration-150">
                                {/* The content of the link is the visual list item */}
                                <div className="p-3 flex items-center space-x-3">
                                    {/* Group Icon */}
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 flex-shrink-0">
                                        <UserGroupIcon className="h-6 w-6" />
                                    </div>
                                    {/* Group Name & Balance Breakdown */}
                                    <div className="flex-grow min-w-0"> {/* Added min-w-0 for potential text truncation */}
                                        <span className="font-medium text-gray-800 block truncate">{group.name}</span>
                                        {/* Balance Breakdown Section */}
                                        <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                                            {groupBalancesMap[group.id] && groupBalancesMap[group.id]
                                                .filter(b => b.netAmount !== 0) // Filter out zero balances
                                                .sort((a, b) => {
                                                    // Optional: Sort logic (e.g., show debts first, then credits, then by amount)
                                                    // Simple sort by absolute amount descending for now
                                                    return Math.abs(b.netAmount) - Math.abs(a.netAmount);
                                                })
                                                .slice(0, 2) // Show top 2 balances
                                                .map(balance => (
                                                    <div key={balance.otherUser.id} className="truncate">
                                                        {balance.netAmount < 0 ? (
                                                            <>You owe {balance.otherUser.name} <span className="text-red-600">{formatCurrency(Math.abs(balance.netAmount))}</span></>
                                                        ) : (
                                                            <>{balance.otherUser.name} owes you <span className="text-green-600">{formatCurrency(balance.netAmount)}</span></>
                                                        )}
                                                    </div>
                                                ))
                                            }
                                            {/* Show "Plus X more" if applicable */}
                                            {groupBalancesMap[group.id] && groupBalancesMap[group.id].filter(b => b.netAmount !== 0).length > 2 && (
                                                <div className="text-xs text-gray-400 italic">
                                                    Plus {groupBalancesMap[group.id].filter(b => b.netAmount !== 0).length - 2} more balance{groupBalancesMap[group.id].filter(b => b.netAmount !== 0).length - 2 > 1 ? 's' : ''}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* Balance */}
                                    <div className="text-right flex-shrink-0">
                                        {netBalance === 0 ? (
                                            <span className="text-sm text-gray-500">Settled up</span>
                                        ) : (
                                            <>
                                                <span className={`text-xs block ${isOwed ? 'text-green-600' : 'text-red-600'}`}>
                                                    {isOwed ? 'you are owed' : 'you owe'}
                                                </span>
                                                <span className={`font-medium ${isOwed ? 'text-green-600' : 'text-red-600'}`}>
                                                    {formatCurrency(balanceAmount, balanceSummary?.currency || 'USD')}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </ul>
            );
        })()}
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

       {/* Filter Modal */}
       <FilterModal
           isOpen={showFilterModal}
           onClose={() => setShowFilterModal(false)}
           currentFilter={groupFilter}
           onSelectFilter={handleSelectFilter}
       />

    </div>
  );
};

// Renamed export
export default GroupsPage;