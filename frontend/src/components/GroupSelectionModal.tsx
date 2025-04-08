import React from 'react';
import { GroupResponseDto } from '../types/api';
import { XMarkIcon, UserGroupIcon, CheckIcon } from '@heroicons/react/24/outline';

interface GroupSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    groups: GroupResponseDto[];
    selectedGroupId: number | null;
    onSelectGroup: (groupId: number | null) => void; // Allow null for "No group"
}

const GroupSelectionModal: React.FC<GroupSelectionModalProps> = ({
    isOpen,
    onClose,
    groups,
    selectedGroupId,
    onSelectGroup,
}) => {
    if (!isOpen) return null;

    const handleSelect = (groupId: number | null) => {
        onSelectGroup(groupId);
        onClose(); // Close modal after selection
    };

    return (
        // Modal Overlay
        <div
            className="fixed inset-0 bg-gray-800 bg-opacity-75 z-40 flex justify-center items-center transition-opacity duration-300 ease-in-out"
            onClick={onClose}
            style={{ opacity: isOpen ? 1 : 0 }}
        >
            {/* Modal Content */}
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-md m-4 transform transition-all duration-300 ease-in-out max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-800">Choose a group</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* List */}
                <ul className="overflow-y-auto p-4 space-y-2 flex-grow">
                    {/* No Group Option */}
                    <li key="no-group">
                        <button
                            onClick={() => handleSelect(null)}
                            className={`w-full flex items-center justify-between p-3 rounded-lg text-left ${
                                selectedGroupId === null
                                    ? 'bg-blue-100 text-blue-700 font-semibold'
                                    : 'text-gray-700 hover:bg-gray-100'
                            } transition-colors duration-150`}
                        >
                            <span className="flex items-center space-x-3">
                                <UserGroupIcon className="h-5 w-5 text-gray-400" />
                                <span>No group</span>
                            </span>
                            {selectedGroupId === null && <CheckIcon className="h-5 w-5 text-blue-600" />}
                        </button>
                    </li>

                    {/* Group List */}
                    {groups.map((group) => (
                        <li key={group.id}>
                            <button
                                onClick={() => handleSelect(group.id)}
                                className={`w-full flex items-center justify-between p-3 rounded-lg text-left ${
                                    selectedGroupId === group.id
                                        ? 'bg-blue-100 text-blue-700 font-semibold'
                                        : 'text-gray-700 hover:bg-gray-100'
                                } transition-colors duration-150`}
                            >
                                <span className="flex items-center space-x-3">
                                     {/* Placeholder icon - could use group specific icon later */}
                                     <UserGroupIcon className="h-5 w-5 text-gray-400" />
                                     <span>{group.name}</span>
                                </span>
                                {selectedGroupId === group.id && <CheckIcon className="h-5 w-5 text-blue-600" />}
                            </button>
                        </li>
                    ))}
                     {groups.length === 0 && (
                        <p className="text-center text-gray-500 py-4">You haven't created any groups yet.</p>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default GroupSelectionModal;