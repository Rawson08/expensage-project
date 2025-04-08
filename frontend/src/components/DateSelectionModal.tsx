import React, { useState } from 'react';
import { XMarkIcon, CalendarIcon } from '@heroicons/react/24/outline';

interface DateSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentDate: Date;
    onSelectDate: (date: Date) => void;
}

const DateSelectionModal: React.FC<DateSelectionModalProps> = ({
    isOpen,
    onClose,
    currentDate,
    onSelectDate,
}) => {
    // Store date as YYYY-MM-DD string for input[type=date]
    const [dateString, setDateString] = useState<string>(currentDate.toISOString().split('T')[0]);

    if (!isOpen) return null;

    const handleSelect = () => {
        // Parse the string back to a Date object
        // Important: Input type="date" returns YYYY-MM-DD. Parsing this directly
        // can lead to timezone issues (it might be interpreted as UTC midnight).
        // A robust solution often involves a date library or careful handling.
        // Simple approach for now: create date from parts to assume local timezone.
        const parts = dateString.split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
            const day = parseInt(parts[2], 10);
            const selectedDate = new Date(year, month, day);
            if (!isNaN(selectedDate.getTime())) {
                 onSelectDate(selectedDate);
            } else {
                 // Handle invalid date input? Maybe show an error.
                 console.error("Invalid date selected");
            }
        }
        onClose();
    };

     const selectToday = () => {
        onSelectDate(new Date());
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
                className="bg-white rounded-lg shadow-xl w-full max-w-xs m-4 p-5 transform transition-all duration-300 ease-in-out"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Select date</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="space-y-4">
                     <button
                        onClick={selectToday}
                        className="w-full flex items-center justify-center space-x-2 p-2 border rounded-md text-gray-700 hover:bg-gray-100"
                    >
                         <CalendarIcon className="h-5 w-5" />
                         <span>Today</span>
                    </button>

                    <input
                        type="date"
                        value={dateString}
                        onChange={(e) => setDateString(e.target.value)}
                        className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <button
                        onClick={handleSelect}
                        className="w-full p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DateSelectionModal;