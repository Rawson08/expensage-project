import React from 'react';

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentFilter: 'none' | 'outstanding' | 'owe' | 'owed';
    onSelectFilter: (filter: 'none' | 'outstanding' | 'owe' | 'owed') => void;
}

const FilterModal: React.FC<FilterModalProps> = ({
    isOpen,
    onClose,
    currentFilter,
    onSelectFilter,
}) => {
    if (!isOpen) return null;

    const filterOptions: { key: 'none' | 'outstanding' | 'owe' | 'owed'; label: string }[] = [
        { key: 'none', label: 'None' }, // Show all groups, including settled
        { key: 'outstanding', label: 'Groups with outstanding balances' }, // Show groups where balance is not 0
        { key: 'owe', label: 'Group balances you owe' }, // Show groups where balance < 0
        { key: 'owed', label: 'Group balances you are owed' }, // Show groups where balance > 0
    ];

    return (
        // Modal overlay
        <div
            className="fixed inset-0 bg-gray-800 bg-opacity-75 z-40 flex justify-center items-end transition-opacity duration-300 ease-in-out"
            onClick={onClose} // Close when clicking overlay
            style={{ opacity: isOpen ? 1 : 0 }}
        >
            {/* Modal Content */}
            <div
                className="bg-white rounded-t-lg shadow-xl w-full max-w-lg p-5 transform transition-all duration-300 ease-in-out"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
                style={{ transform: isOpen ? 'translateY(0)' : 'translateY(100%)' }}
            >
                <h3 className="text-xl font-semibold mb-5 text-center text-gray-800">Set filter</h3>
                <ul className="space-y-2 mb-4">
                    {filterOptions.map((option) => (
                        <li key={option.key}>
                            <button
                                onClick={() => onSelectFilter(option.key)}
                                className={`w-full text-left p-3 rounded-lg text-lg ${
                                    currentFilter === option.key
                                        ? 'bg-blue-100 text-blue-700 font-bold'
                                        : 'text-gray-700 hover:bg-gray-100'
                                } transition-colors duration-150`}
                            >
                                {option.label}
                                {currentFilter === option.key && <span className="float-right text-blue-600">✓</span>}
                            </button>
                        </li>
                    ))}
                </ul>
                <button
                    onClick={onClose}
                    className="mt-4 w-full p-3 bg-gray-200 hover:bg-gray-300 rounded-lg text-center font-semibold text-gray-700 text-lg"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default FilterModal;