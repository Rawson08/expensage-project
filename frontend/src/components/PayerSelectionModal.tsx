import React from 'react';
import { UserResponse } from '../types/api';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

interface PayerSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    participants: UserResponse[]; // Possible payers are the participants
    selectedPayerId: number | null; // Allow only one payer for now
    onSelectPayer: (payerId: number) => void;
}

const PayerSelectionModal: React.FC<PayerSelectionModalProps> = ({
    isOpen,
    onClose,
    participants,
    selectedPayerId,
    onSelectPayer,
}) => {
    if (!isOpen) return null;

    const handleSelect = (userId: number) => {
        onSelectPayer(userId);
        onClose();
    };

    return (
        // Modal Overlay
        <div
            className="fixed inset-0 bg-gray-800 bg-opacity-75 z-50 flex justify-center items-center transition-opacity duration-300 ease-in-out"
            onClick={onClose}
            style={{ opacity: isOpen ? 1 : 0 }}
        >
            {/* Modal Content */}
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-xs m-4 transform transition-all duration-300 ease-in-out max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-800">Select Payer</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* List */}
                <ul className="overflow-y-auto p-4 space-y-1 flex-grow">
                    {participants.map((participant) => (
                        <li key={participant.id}>
                            <button
                                onClick={() => handleSelect(participant.id)}
                                className={`w-full flex items-center justify-between p-3 rounded-lg text-left ${
                                    selectedPayerId === participant.id
                                        ? 'bg-blue-100 text-blue-700 font-semibold'
                                        : 'text-gray-700 hover:bg-gray-100'
                                } transition-colors duration-150`}
                            >
                                <span className="flex items-center space-x-3">
                                    {/* Placeholder Avatar */}
                                    <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-200 text-gray-600 text-sm font-medium">
                                        {participant.name.substring(0, 1).toUpperCase()}
                                    </span>
                                    <span>{participant.name}</span>
                                </span>
                                {selectedPayerId === participant.id && <CheckIcon className="h-5 w-5 text-blue-600" />}
                            </button>
                        </li>
                    ))}
                     {participants.length === 0 && (
                        <p className="text-center text-gray-500 py-4">No participants selected yet.</p>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default PayerSelectionModal;