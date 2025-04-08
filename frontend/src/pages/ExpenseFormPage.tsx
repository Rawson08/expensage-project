import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { createExpense } from '../services/expenseService';
import apiClient from '../services/api';
import { AxiosError } from 'axios';
import { GroupResponseDto, UserResponse, ExpenseCreateRequest, PayerDetailDto, SplitDetailDto, FriendshipResponseDto } from '../types/api';
import { toast } from 'react-toastify';
import { XMarkIcon, CalendarIcon, UserGroupIcon, CameraIcon, DocumentTextIcon, CurrencyDollarIcon, Bars3BottomLeftIcon } from '@heroicons/react/24/outline';
import DateSelectionModal from '../components/DateSelectionModal';
import SplitOptionsModal from '../components/SplitOptionsModal';
// PayerSelectionModal is removed as we use direct input

type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARE';

interface ReceiptScanResponse {
    storeName: string;
    date: string;
    totalAmount: number;
    items: Array<{ name: string; price: number }>;
}

const ExpenseFormPage: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const { friends: contextFriends, groups: contextGroups, isLoading: isContextLoading, error: contextError, fetchData: refreshDataContext } = useData();

    // --- Form State ---
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState<string>('');
    const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
    const [selectedParticipants, setSelectedParticipants] = useState<UserResponse[]>(user ? [user as UserResponse] : []);
    const [splitType, setSplitType] = useState<SplitType>('EQUAL');
    const [date, setDate] = useState<Date>(new Date());
    const [notes, setNotes] = useState('');
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [splitValues, setSplitValues] = useState<{ [userId: number]: string }>({});
    const [includedInSplitIds, setIncludedInSplitIds] = useState<Set<number>>(new Set(user ? [user.id] : []));
    // State for multiple payers, initialized with current user paying full amount (amount updated in useEffect)
    const [payers, setPayers] = useState<PayerDetailDto[]>(user ? [{ userId: user.id, amountPaid: 0 }] : []);

    // --- UI State ---
    const [isSaving, setIsSaving] = useState(false);
    const [scanLoading, setScanLoading] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);
    const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
    // No payer modal state needed

    // --- Effects ---
    // Pre-populate based on navigation state
    useEffect(() => {
        if (!isContextLoading && location.state?.targetType && location.state?.targetId && user) {
            const { targetType, targetId } = location.state;
            let stateProcessed = false;
            try {
                if (targetType === 'group') {
                    const selectedGroup = contextGroups.find(g => g.id === targetId);
                    if (selectedGroup) {
                        setSelectedGroupId(targetId);
                        const members = selectedGroup.members || [];
                        const allMembers = [user as UserResponse, ...members];
                        const uniqueParticipants = allMembers.filter((m, index, self) => m && index === self.findIndex((t) => (t && t.id === m.id)));
                        setSelectedParticipants(uniqueParticipants);
                        setIncludedInSplitIds(new Set(uniqueParticipants.map(p => p.id)));
                        setPayers([{ userId: user.id, amountPaid: parseFloat(amount) || 0 }]); // Reset payer to user
                        stateProcessed = true;
                    } else { toast.error("Could not find the selected group."); }
                } else if (targetType === 'friend') {
                    setSelectedGroupId(null);
                    const friendUser = contextFriends.find(f => f.otherUser?.id === targetId)?.otherUser;
                    if (friendUser) {
                         const participants = [user as UserResponse, friendUser];
                         setSelectedParticipants(participants);
                         setIncludedInSplitIds(new Set(participants.map(p => p.id)));
                         setPayers([{ userId: user.id, amountPaid: parseFloat(amount) || 0 }]); // Reset payer to user
                         stateProcessed = true;
                    } else { toast.error("Could not find the selected friend."); }
                }
                if (stateProcessed) { navigate(location.pathname, { replace: true, state: {} }); }
            } catch (error) { console.error("Error pre-populating form:", error); toast.error("Error setting up form."); }
        }
    }, [location.state, user, contextFriends, contextGroups, navigate, isContextLoading, amount]); // Added amount dependency for payer reset

    // Effect to update the single payer's amount when total amount changes OR when payers list changes to 1
    useEffect(() => {
        const numericAmount = parseFloat(amount) || 0;
        if (payers.length === 1) {
            if (payers[0].amountPaid !== numericAmount) {
                setPayers([{ ...payers[0], amountPaid: numericAmount }]);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [amount, payers.length]);

    // Update included IDs if participants change
     useEffect(() => {
        setIncludedInSplitIds(new Set(selectedParticipants.map(p => p.id)));
     }, [selectedParticipants]);


    // --- Handlers ---
    const handleSave = async () => {
        if (!user || isSaving) return;
        if (!description || !amount || parseFloat(amount) <= 0 || selectedParticipants.length === 0) {
            toast.error("Please fill in description, amount (>0), and select participants."); return;
        }
        const includedParticipants = selectedParticipants.filter(p => includedInSplitIds.has(p.id));
        if (includedParticipants.length === 0) {
            toast.error("Please include at least one participant in the split."); return;
        }
        // Payer Validation
        if (payers.length === 0 || payers.some(p => !p.userId || p.userId === 0)) {
             toast.error('Please select a valid user for each payer.'); return;
        }
        const numericAmount = parseFloat(amount);
        const totalPaid = payers.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
        if (Math.abs(totalPaid - numericAmount) > 0.01) {
             toast.error(`Total amount paid (${totalPaid.toFixed(2)}) must equal the expense amount (${numericAmount.toFixed(2)}).`); return;
        }

        setIsSaving(true);
        try {
            let splits: SplitDetailDto[];

            // Construct splits based on type and included participants
            if (splitType === 'EQUAL') {
                const numIncludedEqual = includedParticipants.length;
                const splitAmount = parseFloat((numericAmount / numIncludedEqual).toFixed(2));
                const totalSplit = splitAmount * numIncludedEqual;
                const remainder = parseFloat((numericAmount - totalSplit).toFixed(2));
                splits = includedParticipants.map((p, index) => ({
                    userId: p.id,
                    value: index === numIncludedEqual - 1 ? splitAmount + remainder : splitAmount,
                }));
            } else {
                splits = includedParticipants.map(p => ({
                    userId: p.id,
                    value: splitValues[p.id] || '0'
                }));
                // Validation for non-equal splits
                if (splits.some(s => s.value === null || s.value === undefined || s.value === '' || isNaN(parseFloat(String(s.value))))) {
                    toast.error(`Please enter a valid ${splitType.toLowerCase()} value for each included participant.`);
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
                description, amount: numericAmount, groupId: selectedGroupId, splitType,
                payers: payers.map(p => ({ userId: p.userId, amountPaid: p.amountPaid || 0 })), // Ensure amountPaid is number
                splits, date: date.toISOString().split('T')[0], notes: notes || undefined,
            };

            await createExpense(payload, receiptFile || undefined);
            toast.success("Expense added successfully!");
            refreshDataContext();
            if (selectedGroupId) { navigate(`/app/group/${selectedGroupId}`); }
            else { navigate('/app/friends'); }

        } catch (err: any) {
            toast.error(`Failed to save expense: ${err.message || 'Unknown error'}`);
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const scanReceiptAndAutofill = async (file: File) => {
        setScanLoading(true); setScanError(null);
        const formData = new FormData(); formData.append("receipt", file);
        try {
            const response = await apiClient.post<ReceiptScanResponse>("/receipts/scan-and-parse", formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            const json = response.data;
            setDescription(json.storeName || description);
            const formattedDate = json.date ? new Date(json.date).toISOString().split('T')[0] : date.toISOString().split('T')[0];
            setDate(new Date(formattedDate));
            setAmount(json.totalAmount ? json.totalAmount.toString() : amount);
            const itemNotes = json.items?.map((item: { name: string; price: number }) => `${item.name || 'Item'}: ${item.price?.toFixed(2) || 'N/A'}`).join('\n') || '';
            setNotes(itemNotes || notes);
            const numericAmount = json.totalAmount || parseFloat(amount) || 0;
             if (user && Math.abs(numericAmount - (parseFloat(amount) || 0)) > 0.01) {
                 if (selectedParticipants.length === 1 && selectedParticipants[0].id === user.id) { }
                 toast.info("Receipt scanned. Please verify payer and split details.");
             }
        } catch (err) {
            console.error("Receipt scanning error:", err);
            let errorMsg = "An unknown error occurred during receipt scanning.";
            if (err instanceof AxiosError && err.response) { errorMsg = err.response.data?.message || `Request failed with status ${err.response.status}`; }
            else if (err instanceof Error) { errorMsg = err.message; }
            setScanError(errorMsg); toast.error(`Scan failed: ${errorMsg}`);
        } finally { setScanLoading(false); }
    };

     const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) { setReceiptFile(file); scanReceiptAndAutofill(file); }
        else { setReceiptFile(null); }
    };

    const handleSplitOptions = () => setIsSplitModalOpen(true);
    const handleSaveSplits = (type: SplitType, values: { [userId: number]: string }, includedIds: Set<number>) => {
        setSplitType(type);
        setSplitValues(values);
        setIncludedInSplitIds(includedIds);
    };
    const handleDateSelection = () => setIsDateModalOpen(true);
    const handleSelectDate = (newDate: Date) => setDate(newDate);

    // --- Handlers for Multi-Payer Inputs ---
    const handlePayerChange = (index: number, field: keyof PayerDetailDto, value: string | number) => {
        const updatedPayers = [...payers];
        const processedValue = field === 'amountPaid' ? parseFloat(value as string) || 0 : value;
        updatedPayers[index] = { ...updatedPayers[index], [field]: processedValue };
        setPayers(updatedPayers);
    };

    const addPayer = () => {
        const currentPayerIds = new Set(payers.map(p => p.userId));
        const availableParticipant = selectedParticipants.find(p => !currentPayerIds.has(p.id));
        setPayers([...payers, { userId: availableParticipant?.id || 0, amountPaid: 0 }]);
    };

    const removePayer = (index: number) => {
        if (payers.length > 1) {
            let updatedPayers = payers.filter((_, i) => i !== index);
            // If only one payer remains, useEffect will update their amount
            setPayers(updatedPayers);
        } else {
            toast.warn("At least one payer is required.");
        }
    };

    // --- Render ---
    if (isContextLoading) return <div className="p-4 text-center">Loading data...</div>;
    if (contextError) return <div className="p-4 text-center text-red-500">Error: {contextError}</div>;

    const selectedGroupName = selectedGroupId ? contextGroups.find(g => g.id === selectedGroupId)?.name : 'No group';

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            <header className="flex items-center justify-between p-4 bg-white border-b flex-shrink-0">
                <button onClick={() => navigate(-1)} className="text-gray-600"><XMarkIcon className="h-6 w-6" /></button>
                <h1 className="text-lg font-semibold">Add an expense</h1>
                <button onClick={handleSave} disabled={isSaving} className="text-blue-600 font-semibold disabled:opacity-50">{isSaving ? 'Saving...' : 'Save'}</button>
            </header>

            <main className="flex-grow p-3 space-y-3 overflow-y-auto">
                 <div className="flex items-center space-x-2 flex-wrap gap-y-1 bg-white p-3 rounded-lg shadow-sm">
                    <span className="text-gray-600 mr-1">With:</span>
                    {selectedParticipants.map(p => (
                         <span key={p.id} className="inline-flex items-center bg-gray-200 text-gray-700 text-sm font-medium px-2 py-0.5 rounded-full">
                            <span className="inline-block h-4 w-4 rounded-full bg-gray-400 mr-1.5"></span>
                            {p.id === user?.id ? 'You' : p.name}
                         </span>
                    ))}
                     {selectedParticipants.length === 0 && <span className="text-sm text-red-500">No participants selected (Error?)</span>}
                </div>

                <div className="flex items-center space-x-3 bg-white p-3 rounded-lg shadow-sm">
                    <div className="p-2 bg-gray-100 rounded"><Bars3BottomLeftIcon className="h-6 w-6 text-gray-500" /></div>
                    <input type="text" placeholder="Enter a description" value={description} onChange={(e) => setDescription(e.target.value)} className="flex-grow p-2 border-b focus:outline-none focus:border-blue-500" />
                </div>
                <div className="flex items-center space-x-3 bg-white p-3 rounded-lg shadow-sm">
                     <div className="p-2 bg-gray-100 rounded"><CurrencyDollarIcon className="h-6 w-6 text-gray-500" /></div>
                    <input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="flex-grow p-2 border-b focus:outline-none focus:border-blue-500 text-xl" inputMode="decimal" />
                </div>

                 {/* Payer Input Section */}
                <fieldset className="bg-white p-3 rounded-lg shadow-sm border">
                    <legend className="text-sm font-medium text-gray-700 px-1">Paid By</legend>
                    {payers.map((payer, index) => (
                        <div key={index} className="flex items-center space-x-2 mb-2 last:mb-0">
                            <select
                                value={payer.userId || ''}
                                onChange={(e) => handlePayerChange(index, 'userId', parseInt(e.target.value))}
                                required
                                className="flex-grow mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                                disabled={isSaving}
                            >
                                <option value="0">-- Select Payer --</option>
                                {selectedParticipants.map(member => (
                                    <option key={member.id} value={member.id}>
                                        {member.id === user?.id ? 'You' : member.name}
                                    </option>
                                ))}
                            </select>
                            {payers.length > 1 && (
                                <input
                                    type="number"
                                    value={payer.amountPaid || ''}
                                    onChange={(e) => handlePayerChange(index, 'amountPaid', e.target.value)}
                                    required
                                    min="0.01"
                                    step="0.01"
                                    className="mt-1 block w-1/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="0.00"
                                    disabled={isSaving}
                                />
                            )}
                            {payers.length > 1 && (
                                <button type="button" onClick={() => removePayer(index)} className="text-red-600 hover:text-red-800 text-sm p-1 flex-shrink-0" disabled={isSaving}>Remove</button>
                            )}
                        </div>
                    ))}
                    <button type="button" onClick={addPayer} className="text-indigo-600 hover:text-indigo-800 text-sm mt-1" disabled={isSaving}>+ Add another payer</button>
                </fieldset>

                {/* Split Info Button */}
                 <div className="text-center">
                    <button type="button" onClick={handleSplitOptions} className="text-blue-600 text-sm border border-gray-300 rounded-full px-4 py-1 hover:bg-gray-100">
                         Split {splitType.toLowerCase()}
                    </button>
                </div>

                {/* Notes Input Area */}
                <div className="bg-white p-3 rounded-lg shadow-sm">
                     <label htmlFor="notes-area" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                     <textarea id="notes-area" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y" placeholder="Add notes..." disabled={isSaving} />
                </div>

                 {/* Receipt Upload Area */}
                 <div className="bg-white p-3 rounded-lg shadow-sm">
                     <label className="block text-sm font-medium text-gray-700 mb-1">Attach Receipt (Optional - Scans & Autofills)</label>
                     <input type="file" id="receipt-upload" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} accept="image/*,.pdf" disabled={isSaving || scanLoading} />
                     <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-1 text-sm text-blue-600 hover:underline disabled:opacity-50" disabled={isSaving || scanLoading}>
                         {receiptFile ? `Selected: ${receiptFile.name}` : 'Choose file...'}
                     </button>
                     {scanLoading && <p className="text-sm text-blue-600 mt-1">Scanning...</p>}
                     {scanError && <p className="text-sm text-red-600 mt-1">Scan Error: {scanError}</p>}
                 </div>
            </main>

            <footer className="flex items-center justify-between p-3 bg-white border-t text-sm text-gray-600 flex-shrink-0">
                <button onClick={handleDateSelection} className="flex items-center space-x-1 hover:text-gray-800">
                    <CalendarIcon className="h-5 w-5" />
                    <span>{date ? date.toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Select Date'}</span>
                </button>
                <span className="flex items-center space-x-1 text-gray-700">
                     <UserGroupIcon className="h-5 w-5" />
                     <span>{selectedGroupName}</span>
                </span>
                <div className="flex space-x-3">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="hover:text-gray-800">
                        <CameraIcon className="h-5 w-5" />
                    </button>
                </div>
            </footer>

            {/* Modals */}
            <DateSelectionModal isOpen={isDateModalOpen} onClose={() => setIsDateModalOpen(false)} currentDate={date} onSelectDate={handleSelectDate} />
            <SplitOptionsModal
                isOpen={isSplitModalOpen}
                onClose={() => setIsSplitModalOpen(false)}
                participants={selectedParticipants}
                currentUser={user as UserResponse | null}
                currentSplitType={splitType}
                currentSplits={[]} // Pass empty array for now
                totalAmount={parseFloat(amount) || 0}
                onSaveSplits={handleSaveSplits}
            />
            {/* PayerSelectionModal removed */}
        </div>
    );
};

export default ExpenseFormPage;