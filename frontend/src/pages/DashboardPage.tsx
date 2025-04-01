import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getOverallBalanceSummary } from '../services/balanceService';
import { getMyGroups } from '../services/groupService';
import { getMyExpenses } from '../services/expenseService';
import { GroupResponseDto, ExpenseResponseDto, OverallBalanceSummaryDto } from '../types/api';
import CreateGroupForm from '../components/CreateGroupForm';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [balanceSummary, setBalanceSummary] = useState<OverallBalanceSummaryDto | null>(null);
  const [groups, setGroups] = useState<GroupResponseDto[]>([]);
  const [expenses, setExpenses] = useState<ExpenseResponseDto[]>([]);
  const [isLoadingBalances, setIsLoadingBalances] = useState(true);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [errorBalances, setErrorBalances] = useState<string | null>(null);
  const [errorGroups, setErrorGroups] = useState<string | null>(null);
  const [errorExpenses, setErrorExpenses] = useState<string | null>(null);
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
      setErrorExpenses(null);
      try {
          const data = await getMyExpenses();
          data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setExpenses(data);
      } catch (err: any) {
          console.error("Failed to fetch expenses:", err);
          setErrorExpenses(err.message || 'Could not load expenses.');
      } finally {
          setIsLoadingExpenses(false);
      }
  }, []);


  useEffect(() => {
    if (user) {
      fetchBalanceSummary();
      fetchGroups();
      fetchExpenses();
    } else {
      setIsLoadingBalances(false);
      setIsLoadingGroups(false);
      setIsLoadingExpenses(false);
      setBalanceSummary(null);
      setGroups([]);
      setExpenses([]);
      setErrorBalances("User not logged in.");
      setErrorGroups("User not logged in.");
      setErrorExpenses("User not logged in.");
    }
  }, [user, fetchBalanceSummary, fetchGroups, fetchExpenses]);

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

  const getPayerString = (payers: ExpenseResponseDto['payers']): string => {
      if (!payers || payers.length === 0) return 'Unknown';
      return payers.map(p => p.user ? `${p.user.id === user?.id ? 'You' : p.user.name} (${formatCurrency(p.amountPaid, 'USD')})` : 'Unknown Payer').join(', ');
  };

  return (
    <div className="container mx-auto p-4">
       <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Dashboard</h2>
      </div>

      {/* Top Row: Balances and Groups */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Balances Section */}
        <div className="bg-white shadow rounded-lg p-4">
           <h3 className="text-lg font-semibold mb-3">Overall Balances</h3>
          {isLoadingBalances && <p>Loading balances...</p>}
          {errorBalances && <p className="text-red-500">Error: {errorBalances}</p>}
          {!isLoadingBalances && !errorBalances && balanceSummary && (
            <div>
              {(balanceSummary.totalOwedToUser === 0 && balanceSummary.totalOwedByUser === 0) ? (
                <p className="text-gray-500">You are all settled up!</p>
              ) : (
                <div className="space-y-2">
                  {balanceSummary.totalOwedToUser > 0 && (
                    <div className="text-green-600">
                      Total you are owed: {formatCurrency(balanceSummary.totalOwedToUser, balanceSummary.currency)}
                    </div>
                  )}
                  {balanceSummary.totalOwedByUser > 0 && (
                    <div className="text-red-600">
                      Total you owe: {formatCurrency(balanceSummary.totalOwedByUser, balanceSummary.currency)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {!isLoadingBalances && !errorBalances && !balanceSummary && (
               <p className="text-gray-500">Could not load balance summary.</p>
          )}
        </div>

        {/* Groups Section */}
        <div className="bg-white shadow rounded-lg p-4">
           <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Your Groups</h3>
                <button
                    onClick={() => setShowCreateGroupForm(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-1 px-3 rounded"
                >
                    + Create Group
                </button>
           </div>
           {isLoadingGroups && <p>Loading groups...</p>}
           {errorGroups && <p className="text-red-500">Error: {errorGroups}</p>}
           {!isLoadingGroups && !errorGroups && (
            groups.length === 0 ? (
                <p className="text-gray-500">You are not in any groups yet.</p>
            ) : (
              <ul className="divide-y divide-gray-200 -mt-3">
              {groups.map((group) => (
                  <li key={group.id}>
                      <Link
                          to={`/app/group/${group.id}`}
                          className="block px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-md transition duration-150 ease-in-out"
                      >
                          {group.name}
                      </Link>
                  </li>
              ))}
           </ul>
            )
           )}
        </div>
      </div>

      {/* Expenses Section */}
       <div className="bg-white shadow rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Recent Expenses</h3>
          {isLoadingExpenses && <p>Loading expenses...</p>}
          {errorExpenses && <p className="text-red-500">Error: {errorExpenses}</p>}
          {!isLoadingExpenses && !errorExpenses && (
            expenses.length === 0 ? (
              <p className="text-gray-500">No expenses recorded yet.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {expenses.map((expense) => (
                  <li key={expense.id} className="py-3">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="font-medium">{expense.description}</p>
                            <p className="text-sm text-gray-500">
                                Paid by {getPayerString(expense.payers)} on {expense.date}
                                {expense.groupId &&
                                    <span className="ml-2 italic text-gray-400">
                                        (Group: {groups.find(g => g.id === expense.groupId)?.name || 'Unknown'})
                                    </span>
                                }
                            </p>
                        </div>
                        <span className="font-medium">{formatCurrency(expense.amount, expense.currency)}</span>
                    </div>
                    <div className="mt-2 pl-4 text-sm text-gray-600">
                        {expense.splits.length > 0 ? (
                            <ul>
                                {expense.splits.map(split => (
                                    split.owedBy ? (
                                        <li key={split.splitId}>
                                            - {split.owedBy.id === user?.id ? 'You owe' : `${split.owedBy.name} owes`} {formatCurrency(split.amountOwed, expense.currency)}
                                        </li>
                                    ) : (
                                        <li key={split.splitId}>- Error: Owed by user missing</li>
                                    )
                                ))}
                            </ul>
                        ) : (
                            <p><i>(Paid by payer(s) for themselves)</i></p>
                        )}
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>


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