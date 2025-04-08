import React, { createContext, useState, useEffect, useCallback, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';
// Import all necessary service functions
import { getFriends, getIncomingRequests, getOutgoingRequests } from '../services/friendshipService';
import { getMyGroups } from '../services/groupService';
import { getMyExpenses } from '../services/expenseService';
import { getOverallBalanceSummary, getGroupBalances } from '../services/balanceService';
import { FriendshipResponseDto, GroupResponseDto, ExpenseResponseDto, OverallBalanceSummaryDto, BalanceDto } from '../types/api';
import { toast } from 'react-toastify';

// Define the shape of the context data
interface DataContextState {
    friends: FriendshipResponseDto[];
    groups: GroupResponseDto[];
    expenses: ExpenseResponseDto[];
    balanceSummary: OverallBalanceSummaryDto | null;
    netGroupBalances: { [groupId: number]: number };
    groupBalancesMap: { [groupId: number]: BalanceDto[] }; // Add detailed group balances map
    incomingRequests: FriendshipResponseDto[]; // Add incoming requests
    outgoingRequests: FriendshipResponseDto[]; // Add outgoing requests
    isLoading: boolean;
    error: string | null;
    fetchData: () => void; // Function to manually trigger a refresh
}

// Create the context with a default value
const DataContext = createContext<DataContextState | undefined>(undefined);

// Create the provider component
interface DataProviderProps {
    children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
    const { user } = useAuth();
    const [friends, setFriends] = useState<FriendshipResponseDto[]>([]);
    const [groups, setGroups] = useState<GroupResponseDto[]>([]);
    const [expenses, setExpenses] = useState<ExpenseResponseDto[]>([]);
    const [balanceSummary, setBalanceSummary] = useState<OverallBalanceSummaryDto | null>(null);
    const [netGroupBalances, setNetGroupBalances] = useState<{ [groupId: number]: number }>({});
    const [groupBalancesMap, setGroupBalancesMap] = useState<{ [groupId: number]: BalanceDto[] }>({}); // Add state
    const [incomingRequests, setIncomingRequests] = useState<FriendshipResponseDto[]>([]); // Add state
    const [outgoingRequests, setOutgoingRequests] = useState<FriendshipResponseDto[]>([]); // Add state
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!user) {
            // Reset state if user logs out or is not logged in
            setFriends([]);
            setGroups([]);
            setExpenses([]);
            setBalanceSummary(null);
            setNetGroupBalances({});
            setGroupBalancesMap({}); // Reset map
            setIncomingRequests([]); // Reset requests
            setOutgoingRequests([]); // Reset requests
            setIsLoading(false);
            setError(null); // Clear error on logout
            return;
        }

        setIsLoading(true);
        setError(null);
        console.log("DataContext: Starting data fetch..."); // Debug log

        try {
            // Fetch core data + requests concurrently
            const [
                friendsData,
                groupsData,
                expensesData,
                balanceSummaryData,
                incomingReqData, // Fetch requests
                outgoingReqData // Fetch requests
            ] = await Promise.all([
                getFriends(),
                getMyGroups(),
                getMyExpenses(),
                getOverallBalanceSummary(),
                getIncomingRequests(), // Add call
                getOutgoingRequests() // Add call
            ]);

            console.log("DataContext: Core data fetched."); // Debug log

            const acceptedFriends = friendsData.filter((f: FriendshipResponseDto) => f.status === 'ACCEPTED');
            const sortedExpenses = expensesData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            setFriends(acceptedFriends);
            setGroups(groupsData);
            setExpenses(sortedExpenses);
            setBalanceSummary(balanceSummaryData);
            setIncomingRequests(incomingReqData); // Set requests state
            setOutgoingRequests(outgoingReqData); // Set requests state

            // Fetch group balances after groups are loaded
            if (groupsData.length > 0) {
                console.log("DataContext: Fetching detailed group balances...");
                const detailedBalancesMap: { [groupId: number]: BalanceDto[] } = {};
                const netBalancesMap: { [groupId: number]: number } = {};
                let groupBalanceFetchError: string | null = null;

                try {
                    await Promise.all(groupsData.map(async (group) => {
                        try {
                            const balances = await getGroupBalances(group.id);
                            detailedBalancesMap[group.id] = balances; // Store detailed balances
                            netBalancesMap[group.id] = balances.reduce((sum, balance) => sum + balance.netAmount, 0); // Calculate net balance
                        } catch (groupErr: any) {
                            console.error(`DataContext: Failed to fetch balances for group ${group.id}:`, groupErr);
                            groupBalanceFetchError = groupErr.message || `Could not load balances for group ${group.name}.`;
                            // Store null/empty for this group to indicate failure?
                            detailedBalancesMap[group.id] = [];
                            netBalancesMap[group.id] = 0;
                        }
                    }));
                    setGroupBalancesMap(detailedBalancesMap); // Set the detailed map state
                    setNetGroupBalances(netBalancesMap); // Set the net balances map state
                    if (groupBalanceFetchError) setError(prev => prev ? `${prev}; ${groupBalanceFetchError}` : groupBalanceFetchError);
                    console.log("DataContext: Detailed group balances fetched.");
                } catch (overallErr) {
                    console.error("DataContext: Error fetching group balances:", overallErr);
                    setError(prev => prev ? `${prev}; Failed to fetch some group balances.` : 'Failed to fetch some group balances.');
                }
            } else {
                setNetGroupBalances({});
                setGroupBalancesMap({}); // Reset detailed map too
            }

        } catch (err: any) {
            console.error("DataContext: Failed to load data:", err);
            const errorMsg = err.message || 'Failed to load application data.';
            setError(errorMsg);
            toast.error(errorMsg);
            // Reset state on major error? Optional.
            setFriends([]);
            setGroups([]);
            setExpenses([]);
            setBalanceSummary(null);
            setNetGroupBalances({});
            setGroupBalancesMap({}); // Reset map
            setIncomingRequests([]); // Reset requests
            setOutgoingRequests([]); // Reset requests
        } finally {
            setIsLoading(false);
            console.log("DataContext: Data fetch finished."); // Debug log
        }
    }, [user]); // Dependency on user ensures refetch on login/logout

    // Fetch data when the component mounts or user changes
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Value provided by the context
    const value = {
        friends,
        groups,
        expenses,
        balanceSummary,
        netGroupBalances,
        groupBalancesMap, // Expose detailed map
        incomingRequests, // Expose requests
        outgoingRequests, // Expose requests
        isLoading,
        error,
        fetchData,
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

// Custom hook to use the DataContext
export const useData = (): DataContextState => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};