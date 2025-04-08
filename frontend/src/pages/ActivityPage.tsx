import React, { useState, useEffect } from 'react'; // Removed useCallback
import { useAuth } from '../context/AuthContext'; // Keep for user ID check
import { useData } from '../context/DataContext'; // Import useData
// Remove service imports for data now in context
// import { getMyExpenses } from '../services/expenseService';
// import { getMyGroups } from '../services/groupService';
import { ExpenseResponseDto, GroupResponseDto } from '../types/api'; // Keep types
import { format } from 'date-fns';
import { ReceiptPercentIcon, UserGroupIcon } from '@heroicons/react/24/outline'; // Removed ShoppingCartIcon

// TODO: Define a type for the combined/processed activity item
interface ActivityItem {
    id: string; // Unique key (e.g., 'expense-123')
    type: 'expense_added' | 'group_created';
    timestamp: Date;
    actorName: string; // Who performed the action ('You' or another user name)
    description: string; // e.g., "added 'Groceries'"
    context?: string; // e.g., "in 'Trip to Bali'"
    amountChange?: number; // Positive if user gets money back, negative if user paid/owes more
    currency?: string;
    originalData: ExpenseResponseDto | GroupResponseDto;
}


const ActivityPage: React.FC = () => {
    const { user } = useAuth();
    // Consume data from context
    const {
        groups, // Get groups from context
        expenses, // Get expenses from context
        isLoading, // Use combined loading state
        error, // Use combined error state
        // fetchData // Can use this for refresh later if needed
    } = useData();

    // Local state for processed activities
    const [activities, setActivities] = useState<ActivityItem[]>([]);

    // Removed old fetchData function and its useEffect hook

    // Process data from context into activities whenever context data changes
    useEffect(() => {
        if (!isLoading && user) { // Process only when context is not loading and user exists
             try {
                 // Process expenses into activity items
                const expenseActivities: ActivityItem[] = expenses.map((expense: ExpenseResponseDto) => { // Added type
                    const actor = expense.payers[0]?.user;
                    const actorName = actor?.id === user.id ? 'You' : actor?.name || 'Someone';
                    const paidByUser = expense.payers.reduce((sum, p) => sum + (p.user?.id === user.id ? p.amountPaid : 0), 0);
                    const owedByUser = expense.splits.reduce((sum, s) => sum + (s.owedBy?.id === user.id ? s.amountOwed : 0), 0);
                    const netChangeForUser = paidByUser - owedByUser;
                    const groupName = expense.groupId ? groups.find(g => g.id === expense.groupId)?.name : null;

                    return {
                        id: `expense-${expense.id}`,
                        type: 'expense_added',
                        timestamp: new Date(expense.createdAt),
                        actorName: actorName,
                        description: `added "${expense.description}"`,
                        context: groupName ? `in "${groupName}"` : undefined,
                        amountChange: netChangeForUser,
                        currency: expense.currency,
                        originalData: expense,
                    };
                });

                // Process groups into activity items
                const groupActivities: ActivityItem[] = groups.map((group: GroupResponseDto) => { // Added type
                    const actorName = group.creator?.id === user?.id ? 'You' : group.creator?.name || 'Someone';
                    return {
                        id: `group-${group.id}`,
                        type: 'group_created',
                        timestamp: new Date(group.createdAt),
                        actorName: actorName,
                        description: `created the group "${group.name}"`,
                        originalData: group,
                    };
                });

                // Combine and sort
                const allActivities = [...expenseActivities, ...groupActivities];
                allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
                setActivities(allActivities);

             } catch (processingError) {
                 console.error("Error processing activity data:", processingError);
                 // Optionally set a local error state specific to processing
             }
        } else if (!isLoading && !user) {
            // Clear activities if user logs out
            setActivities([]);
        }
    }, [groups, expenses, isLoading, user]); // Re-process when context data changes


    // TODO: Extract formatCurrency to a shared utility file
    const formatCurrency = (amount: number, currencyCode: string = 'USD') => {
        if (amount === null || amount === undefined) return 'N/A';
        try {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount);
        } catch (e) {
            return `$${amount.toFixed(2)}`;
        }
    };

    // Helper to format timestamp using date-fns
    const formatTimestamp = (date: Date): string => {
        try {
            // Example format: Mar 29 at 3:23 PM
            return format(date, "MMM d 'at' h:mm a");
        } catch (e) {
            console.error("Error formatting date:", e);
            return 'Invalid date';
        }
    };


    return (
        <div className="container mx-auto px-0 sm:px-4 pb-16">
             {/* Header */}
             <div className="p-4">
                 <h2 className="text-xl font-bold">Recent activity</h2>
             </div>

             {isLoading && <p className="text-center text-gray-500 py-6">Loading activity...</p>}
             {error && <p className="text-center text-red-500 py-6">Error: {error}</p>}

             {!isLoading && !error && activities.length === 0 && (
                 <p className="text-center text-gray-500 py-6">No recent activity.</p>
             )}

             {!isLoading && !error && activities.length > 0 && (
                 <ul className="divide-y divide-gray-200">
                     {activities.map(activity => {
                         const amount = activity.amountChange ?? 0;
                         const isCredit = amount > 0; // User gets money back
                         // const isDebit = amount < 0; // Unused variable

                         // Choose icon based on activity type
                         const IconComponent = activity.type === 'group_created'
                             ? UserGroupIcon // Icon for group creation
                             : ReceiptPercentIcon; // Default for expenses for now

                         return (
                             <li key={activity.id} className="p-4 flex items-start space-x-4 hover:bg-gray-50">
                                 {/* Icon */}
                                 <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mt-1">
                                     <IconComponent className="h-6 w-6 text-gray-500" />
                                     {/* TODO: Add small user avatar overlay like in example? */}
                                 </div>
                                 {/* Text Content */}
                                 <div className="flex-grow">
                                     <p className="text-sm text-gray-800 leading-snug">
                                         <span className="font-medium">{activity.actorName}</span> {activity.description} {activity.context || ''}.
                                     </p>
                                     {/* Financial Impact (Only show for expense_added type) */}
                                     {activity.type === 'expense_added' && amount !== 0 && (
                                         <p className={`text-sm font-semibold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                                             {isCredit ? 'You get back' : 'You paid'} {formatCurrency(Math.abs(amount), activity.currency)}
                                         </p>
                                     )}
                                     {/* Timestamp */}
                                     <p className="text-xs text-gray-400 mt-1">
                                         {formatTimestamp(activity.timestamp)}
                                     </p>
                                 </div>
                             </li>
                         );
                     })}
                 </ul>
             )}
        </div>
    );
};

export default ActivityPage;