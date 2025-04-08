import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getFriends } from '../services/friendshipService'; // Corrected function name
import { getMyGroups } from '../services/groupService';
import { createExpense } from '../services/expenseService';
import { FriendshipResponseDto, GroupResponseDto, UserResponse, ExpenseCreateRequest, PayerDetailDto, SplitDetailDto } from '../types/api';
import { toast } from 'react-toastify';
import { XMarkIcon, CalendarIcon, UserGroupIcon, CameraIcon, DocumentTextIcon, CurrencyDollarIcon, Bars3BottomLeftIcon } from '@heroicons/react/24/outline'; // Removed ChevronDownIcon
import GroupSelectionModal from '../components/GroupSelectionModal';
import ParticipantSelectionModal from '../components/ParticipantSelectionModal';
import DateSelectionModal from '../components/DateSelectionModal';
import SplitOptionsModal from '../components/SplitOptionsModal'; // Import split modal

// Define types for form state
type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARE'; // Match backend types

const AddExpensePage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState<string>(''); // Store as string for easier input handling
    const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
    const [selectedParticipants, setSelectedParticipants] = useState<UserResponse[]>(user ? [user as UserResponse] : []); // Start with current user
    const [splitType, setSplitType] = useState<SplitType>('EQUAL');
    const [date, setDate] = useState<Date>(new Date());
    const [splitValues, setSplitValues] = useState<{ [userId: number]: string }>({}); // State for split values from modal

    const [friends, setFriends] = useState<FriendshipResponseDto[]>([]);
    const [groups, setGroups] = useState<GroupResponseDto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);
    const [isSplitModalOpen, setIsSplitModalOpen] = useState(false); // State for split modal
    const [error, setError] = useState<string | null>(null);

    // Fetch friends and groups
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [friendsData, groupsData] = await Promise.all([
                getFriends(), // Corrected function call
                getMyGroups()
            ]);
            setFriends(friendsData.filter((f: FriendshipResponseDto) => f.status === 'ACCEPTED')); // Added type to filter param
            setGroups(groupsData);
        } catch (err: any) {
            setError('Failed to load necessary data.');
            toast.error('Failed to load friends or groups.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async () => {
        if (!user || isSaving) return;
        if (!description || !amount || parseFloat(amount) <= 0 || selectedParticipants.length === 0) {
            toast.error("Please fill in description, amount (>0), and select participants.");
            return;
        }

        setIsSaving(true);
        try {
            const numericAmount = parseFloat(amount);

            // --- Prepare Payload ---
            // --- Calculate Payers and Splits ---
            let payers: PayerDetailDto[];
            let splits: SplitDetailDto[];

            // Assumption for now: Current user paid the full amount.
            // TODO: Implement UI for selecting multiple payers if needed.
            payers = [{ userId: user.id, amountPaid: numericAmount }];

            // Calculate splits based on selected type
            // Construct splits based on type and stored values
            if (splitType === 'EQUAL') {
                const numParticipants = selectedParticipants.length;
                if (numParticipants > 0) {
                    const splitAmount = parseFloat((numericAmount / numParticipants).toFixed(2));
                    const totalSplit = splitAmount * numParticipants;
                    const remainder = parseFloat((numericAmount - totalSplit).toFixed(2));
                    splits = selectedParticipants.map((p, index) => ({
                        userId: p.id,
                        value: index === numParticipants - 1 ? splitAmount + remainder : splitAmount,
                    }));
                } else { splits = []; }
            } else {
                // Use stored splitValues for non-equal splits
                splits = selectedParticipants.map(p => ({
                    userId: p.id,
                    value: splitValues[p.id] || '0' // Use value from state map
                }));

                // Validation for non-equal splits
                if (splits.some(s => s.value === null || s.value === undefined || s.value === '' || isNaN(parseFloat(String(s.value))))) {
                    toast.error(`Please enter a valid ${splitType.toLowerCase()} value for each participant.`);
                    setIsSaving(false); return;
                }
                const totalSplitValue = splits.reduce((sum, s) => sum + parseFloat(String(s.value || '0')), 0);
                if (splitType === 'EXACT' && Math.abs(totalSplitValue - numericAmount) > 0.01) {
                    toast.error(`Sum of exact amounts (${totalSplitValue.toFixed(2)}) must equal the total expense amount (${numericAmount.toFixed(2)}).`);
                    setIsSaving(false); return;
                }
                if (splitType === 'PERCENTAGE' && Math.abs(totalSplitValue - 100) > 0.01) {
                    toast.error('Percentages must add up to 100.');
                    setIsSaving(false); return;
                }
            }


            const payload: ExpenseCreateRequest = {
                description,
                amount: numericAmount,
                groupId: selectedGroupId,
                splitType: splitType,
                payers: payers, // Placeholder
                splits: splits, // Placeholder
                date: date.toISOString().split('T')[0], // Format as YYYY-MM-DD
                // currency: 'USD', // Add if needed
                // notes: '', // Add if needed
            };

            await createExpense(payload);
            toast.success("Expense added successfully!");
            navigate('/app/groups'); // Navigate back after save (adjust as needed)

        } catch (err: any) {
            toast.error(`Failed to save expense: ${err.message || 'Unknown error'}`);
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    // --- Modal Handlers ---
    const handleParticipantSelection = () => {
        setIsParticipantModalOpen(true); // Open participant modal
    };
    const handleUpdateParticipants = (updatedParticipants: UserResponse[]) => {
        setSelectedParticipants(updatedParticipants);
        // Modal closes itself
    };
    const handleSplitOptions = () => {
        setIsSplitModalOpen(true); // Open split modal
   };
    // Updated handler to receive type and values map from modal
    const handleSaveSplits = (type: SplitType, values: { [userId: number]: string }) => {
        setSplitType(type);
        setSplitValues(values); // Store the raw values
    };
    const handleGroupSelection = () => {
       setIsGroupModalOpen(true); // Open the modal
   };
    const handleSelectGroup = (groupId: number | null) => {
       setSelectedGroupId(groupId);
       // Note: Modal closes itself via its internal handleSelect
    };
     const handleDateSelection = () => {
        setIsDateModalOpen(true); // Open date modal
    };
     const handleSelectDate = (newDate: Date) => {
        setDate(newDate);
        // Modal closes itself
    };

    if (isLoading) {
        return <div className="p-4 text-center">Loading data...</div>;
    }
    if (error) {
         return <div className="p-4 text-center text-red-500">Error: {error}</div>;
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <header className="flex items-center justify-between p-4 bg-white border-b">
                <button onClick={() => navigate(-1)} className="text-gray-600"> {/* Go back */}
                    <XMarkIcon className="h-6 w-6" />
                </button>
                <h1 className="text-lg font-semibold">Add an expense</h1>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="text-blue-600 font-semibold disabled:opacity-50"
                >
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
            </header>

            {/* Form Body */}
            <main className="flex-grow p-4 space-y-4 overflow-y-auto">
                {/* Participants */}
                <div className="flex items-center space-x-2 flex-wrap gap-y-1"> {/* Added flex-wrap and gap-y */}
                    <span className="text-gray-600 mr-1">With <span className="font-medium">you</span> and:</span>
                    {/* Display selected participants (excluding current user) */}
                    {selectedParticipants.filter(p => p.id !== user?.id).map(p => (
                         <span key={p.id} className="inline-flex items-center bg-gray-200 text-gray-700 text-sm font-medium px-2 py-0.5 rounded-full">
                            {/* Placeholder Avatar */}
                            <span className="inline-block h-4 w-4 rounded-full bg-gray-400 mr-1.5"></span>
                            {p.name}
                         </span>
                    ))}
                    {/* Button to add/edit participants */}
                    <button onClick={handleParticipantSelection} className="text-blue-600 border-b border-dotted border-blue-600 text-sm ml-1">
                        {selectedParticipants.length > 1 ? 'Edit' : 'Add friends'}
                    </button>
                </div>

                {/* Description & Amount */}
                <div className="flex items-center space-x-3 bg-white p-3 rounded-lg shadow-sm">
                    <div className="p-2 bg-gray-100 rounded">
                        <Bars3BottomLeftIcon className="h-6 w-6 text-gray-500" />
                    </div>
                    <input
                        type="text"
                        placeholder="Enter a description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="flex-grow p-2 border-b focus:outline-none focus:border-blue-500"
                    />
                </div>
                <div className="flex items-center space-x-3 bg-white p-3 rounded-lg shadow-sm">
                     <div className="p-2 bg-gray-100 rounded">
                        <CurrencyDollarIcon className="h-6 w-6 text-gray-500" />
                    </div>
                    <input
                        type="number" // Use number type, potentially add step="0.01"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="flex-grow p-2 border-b focus:outline-none focus:border-blue-500 text-xl" // Larger font for amount
                        inputMode="decimal" // Hint for mobile keyboards
                    />
                </div>

                {/* Split Info Button */}
                <div className="text-center">
                    <button onClick={handleSplitOptions} className="text-blue-600 text-sm border border-gray-300 rounded-full px-4 py-1 hover:bg-gray-100">
                        Paid by you and split {splitType.toLowerCase()} {/* Make dynamic */}
                    </button>
                </div>
            </main>

            {/* Footer Metadata Bar */}
            <footer className="flex items-center justify-between p-3 bg-white border-t text-sm text-gray-600">
                <button onClick={handleDateSelection} className="flex items-center space-x-1 hover:text-gray-800">
                    <CalendarIcon className="h-5 w-5" />
                    {/* Display selected date */}
                    <span>{date ? date.toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Select Date'}</span>
                </button>
                <button onClick={handleGroupSelection} className="flex items-center space-x-1 hover:text-gray-800">
                    <UserGroupIcon className="h-5 w-5" />
                    <span>{selectedGroupId ? groups.find(g => g.id === selectedGroupId)?.name : 'No group'}</span>
                </button>
                <div className="flex space-x-3">
                    <button className="hover:text-gray-800">
                        <CameraIcon className="h-5 w-5" />
                    </button>
                     <button className="hover:text-gray-800">
                        <DocumentTextIcon className="h-5 w-5" />
                    </button>
                </div>
            </footer>

            {/* Group Selection Modal */}
            <GroupSelectionModal
                isOpen={isGroupModalOpen}
                onClose={() => setIsGroupModalOpen(false)}
                groups={groups}
                selectedGroupId={selectedGroupId}
                onSelectGroup={handleSelectGroup}
            />

             {/* Date Selection Modal */}
            <DateSelectionModal
                isOpen={isDateModalOpen}
                onClose={() => setIsDateModalOpen(false)}
                currentDate={date}
                onSelectDate={handleSelectDate}
            />

             {/* Split Options Modal */}
             <SplitOptionsModal
                isOpen={isSplitModalOpen}
                onClose={() => setIsSplitModalOpen(false)}
                participants={selectedParticipants}
                currentUser={user as UserResponse | null} // Pass current user
                currentSplitType={splitType}
                currentSplits={[]} // Pass empty array for now
                // totalAmount prop removed from modal
                onSaveSplits={handleSaveSplits} // Pass the correct handler
            />

            {/* Participant Selection Modal */}
            <ParticipantSelectionModal
                isOpen={isParticipantModalOpen}
                onClose={() => setIsParticipantModalOpen(false)}
                currentUser={user as UserResponse | null} // Pass current user
                friends={friends} // Pass fetched friends
                initialSelectedParticipants={selectedParticipants}
                onUpdateParticipants={handleUpdateParticipants}
            />
        </div>
    );
};

export default AddExpensePage;