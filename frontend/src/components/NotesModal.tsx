import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface NotesModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialNotes: string;
    onSave: (notes: string) => void;
}

const NotesModal: React.FC<NotesModalProps> = ({
    isOpen,
    onClose,
    initialNotes,
    onSave,
}) => {
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (isOpen) {
            setNotes(initialNotes); // Reset notes when modal opens
        }
    }, [isOpen, initialNotes]);

    if (!isOpen) return null;

    const handleSaveClick = () => {
        onSave(notes);
        // onClose(); // The parent component calls onClose via onSave handler
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
                className="bg-white rounded-lg shadow-xl w-full max-w-md m-4 transform transition-all duration-300 ease-in-out flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-800">Add notes</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Text Area */}
                <div className="p-4 flex-grow">
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Enter notes here..."
                        className="w-full h-40 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" // Added resize-none
                        autoFocus
                    />
                </div>

                 {/* Footer */}
                 <div className="p-4 border-t flex justify-end space-x-3">
                     <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                        Cancel
                    </button>
                     <button
                        onClick={handleSaveClick}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Save Notes
                    </button>
                 </div>
            </div>
        </div>
    );
};

export default NotesModal;