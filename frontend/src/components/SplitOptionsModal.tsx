import React, { useState, useEffect } from 'react';
import { UserResponse, SplitDetailDto } from '../types/api';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import Avatar from './Avatar'; // Import Avatar component

type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARE';

interface SplitOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    participants: UserResponse[];
    currentUser: UserResponse | null;
    currentSplitType: SplitType;
    currentSplits: SplitDetailDto[]; // Used to initialize values if editing
    totalAmount: number;
    onSaveSplits: (type: SplitType, values: { [userId: number]: string }, includedIds: Set<number>) => void; // Pass back type, raw values map, and included IDs
}

const SplitOptionsModal: React.FC<SplitOptionsModalProps> = ({
    isOpen,
    onClose,
    participants,
    currentUser,
    currentSplitType,
    currentSplits,
    totalAmount,
    onSaveSplits,
}) => {
    const [selectedType, setSelectedType] = useState<SplitType>(currentSplitType);
    const [splitValues, setSplitValues] = useState<{ [userId: number]: string }>({});
    const [includedParticipantIds, setIncludedParticipantIds] = useState<Set<number>>(new Set());

    // Initialize state when modal opens or relevant props change
    useEffect(() => {
        if (isOpen) {
            setSelectedType(currentSplitType);
            const initialValues: { [userId: number]: string } = {};
            const initialIncludedIds = new Set<number>();

            participants.forEach(p => {
                const existingSplit = currentSplits.find(s => s.userId === p.id);
                if (existingSplit) {
                    initialValues[p.id] = String(existingSplit.value ?? '0'); // Use existing value or default
                    initialIncludedIds.add(p.id); // Include if they have an existing split value
                } else {
                    // Default for participants not in currentSplits
                    initialValues[p.id] = '0';
                    // Default to included unless explicitly excluded later? Or start excluded?
                    // Let's default to included if it's an EQUAL split initially, otherwise require explicit inclusion?
                    // Safest: Default all participants to included initially when modal opens.
                    initialIncludedIds.add(p.id);
                }
                 // Ensure initial value is '0' if split type is not EQUAL and no value exists
                 if (currentSplitType !== 'EQUAL' && (!existingSplit || existingSplit.value === null)) {
                    initialValues[p.id] = '0';
                 }
            });
            setSplitValues(initialValues);
            setIncludedParticipantIds(initialIncludedIds);
        }
    }, [isOpen, currentSplitType, currentSplits, participants]);


    if (!isOpen) return null;

    const splitOptions: { key: SplitType; label: string; description: string }[] = [
        { key: 'EQUAL', label: 'Split equally', description: 'Split the total cost equally among included participants.' },
        { key: 'EXACT', label: 'Split by exact amounts', description: 'Specify the exact amount each included participant owes.' },
        { key: 'PERCENTAGE', label: 'Split by percentages', description: 'Split the cost based on percentages for included participants.' },
        { key: 'SHARE', label: 'Split by shares', description: 'Split the cost based on shares for included participants.' },
    ];

    const handleTypeSelect = (type: SplitType) => {
        setSelectedType(type);
        // When switching to EQUAL, ensure all participants are included? Or keep current selection?
        // Let's keep current selection for now.
        if (type === 'EQUAL') {
             // Optionally reset values to '0' or clear them when switching to EQUAL
             // setSplitValues({}); // Or set based on participants
        }
    };

    const handleValueChange = (userId: number, value: string) => {
        const sanitizedValue = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
        setSplitValues(prev => ({ ...prev, [userId]: sanitizedValue }));
    };

    const handleToggleInclude = (userId: number) => {
        setIncludedParticipantIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(userId)) {
                // Prevent removing the last included person? Or allow zero? Allow for now.
                // if (newSet.size > 1) {
                    newSet.delete(userId);
                // } else {
                //     toast.warn("At least one participant must be included in the split.");
                // }
            } else {
                newSet.add(userId);
            }
            return newSet;
        });
    };

    const handleDone = () => {
        const includedCount = includedParticipantIds.size;

        if (includedCount === 0) {
             toast.error("Please include at least one participant in the split.");
             return;
        }

        // Basic check: ensure values exist if needed for non-equal splits
        if (selectedType !== 'EQUAL') {
            const valuesAreMissing = participants.some(p =>
                includedParticipantIds.has(p.id) && // Only check included participants
                !splitValues[p.id]?.trim()
            );
            if (valuesAreMissing) {
                 toast.warn(`Please enter a value for each included participant for ${selectedType.toLowerCase()} split.`);
                 return;
            }
            // More complex validation (summing) will be done in the parent handleSave
        }
        onSaveSplits(selectedType, splitValues, includedParticipantIds); // Pass back type, raw values map, and included IDs
        onClose();
    };

    return (
        <div
            className="fixed inset-0 bg-gray-800 bg-opacity-75 z-50 flex justify-center items-center transition-opacity duration-300 ease-in-out"
            onClick={onClose}
            style={{ opacity: isOpen ? 1 : 0 }}
        >
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-lg m-4 transform transition-all duration-300 ease-in-out max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-800">Choose split option</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-4 border-b text-sm text-gray-600">
                    Splitting among: {participants.filter(p => includedParticipantIds.has(p.id)).map(p => p.name).join(', ') || 'None selected'} ({includedParticipantIds.size})
                </div>

                <ul className="overflow-y-auto p-4 space-y-3 flex-grow">
                    {splitOptions.map((option) => (
                        <li key={option.key}>
                            <button
                                onClick={() => handleTypeSelect(option.key)}
                                className={`w-full flex items-center justify-between p-3 rounded-lg text-left ${
                                    selectedType === option.key
                                        ? 'bg-blue-100 ring-2 ring-blue-300'
                                        : 'text-gray-700 hover:bg-gray-100'
                                } transition-colors duration-150`}
                            >
                                <div>
                                    <span className={`font-semibold ${selectedType === option.key ? 'text-blue-800' : ''}`}>{option.label}</span>
                                    <p className={`text-xs ${selectedType === option.key ? 'text-blue-600' : 'text-gray-500'}`}>{option.description}</p>
                                </div>
                                {selectedType === option.key && <CheckIcon className="h-5 w-5 text-blue-600 flex-shrink-0 ml-3" />}
                            </button>

                            {selectedType !== 'EQUAL' && selectedType === option.key && (
                                <div className="mt-3 pl-4 pr-2 space-y-2">
                                    <p className="text-sm font-medium text-gray-600">Enter {selectedType.toLowerCase()}s for included participants:</p>
                                    {participants.map(participant => {
                                        const isIncluded = includedParticipantIds.has(participant.id);
                                        return (
                                            <div key={participant.id} className="flex items-center justify-between space-x-2">
                                                <div className="flex items-center flex-grow space-x-2">
                                                     <input
                                                        id={`split-include-${participant.id}`}
                                                        type="checkbox"
                                                        checked={isIncluded}
                                                        onChange={() => handleToggleInclude(participant.id)}
                                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0" // Added flex-shrink-0
                                                    />
                                                    {/* Use Avatar component */}
                                                    <Avatar name={participant.name} size="sm" />
                                                    <label htmlFor={`split-include-${participant.id}`} className={`text-sm flex-grow truncate ${isIncluded ? 'text-gray-700' : 'text-gray-400 line-through'}`}>
                                                        {participant.name} {participant.id === currentUser?.id ? '(You)' : ''}
                                                    </label>
                                                </div>
                                                {isIncluded && (
                                                    <input
                                                        id={`split-val-${participant.id}`}
                                                        type="text"
                                                        inputMode={selectedType === 'SHARE' ? 'numeric' : 'decimal'}
                                                        value={splitValues[participant.id] || ''}
                                                        onChange={(e) => handleValueChange(participant.id, e.target.value)}
                                                        className="w-24 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm flex-shrink-0" // Added flex-shrink-0
                                                        placeholder={selectedType === 'PERCENTAGE' ? '%' : (selectedType === 'SHARE' ? 'shares' : '0.00')}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>

                 <div className="p-4 border-t flex justify-end">
                     <button onClick={handleDone} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Done</button>
                 </div>
            </div>
        </div>
    );
};

export default SplitOptionsModal;