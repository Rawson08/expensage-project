import React, { useState, useEffect } from 'react';
import { UserResponse, FriendshipResponseDto } from '../types/api';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

interface ParticipantSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: UserResponse | null;
    friends: FriendshipResponseDto[];
    initialSelectedParticipants: UserResponse[];
    onUpdateParticipants: (selected: UserResponse[]) => void;
}

const ParticipantSelectionModal: React.FC<ParticipantSelectionModalProps> = ({
    isOpen,
    onClose,
    currentUser,
    friends,
    initialSelectedParticipants,
    onUpdateParticipants,
}) => {
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // Initialize selected IDs when modal opens or initial participants change
    useEffect(() => {
        if (isOpen) {
            setSelectedIds(new Set(initialSelectedParticipants.map(p => p.id)));
        }
    }, [isOpen, initialSelectedParticipants]);

    if (!isOpen || !currentUser) return null;

    const allPossibleParticipants: UserResponse[] = [
        currentUser,
        ...friends.map(f => f.otherUser)
    ].filter((user): user is UserResponse => user !== null); // Ensure no null users

    const handleToggleSelection = (userId: number) => {
        // Prevent deselecting the current user (they must be involved)
        if (userId === currentUser.id) return;

        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(userId)) {
                newSet.delete(userId);
            } else {
                newSet.add(userId);
            }
            return newSet;
        });
    };

    const handleDone = () => {
        const selectedUsers = allPossibleParticipants.filter(p => selectedIds.has(p.id));
        // Ensure current user is always included
        if (!selectedIds.has(currentUser.id)) {
             selectedUsers.push(currentUser);
        }
        onUpdateParticipants(selectedUsers);
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
                className="bg-white rounded-lg shadow-xl w-full max-w-md m-4 transform transition-all duration-300 ease-in-out max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-800">Select participants</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* List */}
                <ul className="overflow-y-auto p-4 space-y-1 flex-grow">
                    {allPossibleParticipants.map((participant) => {
                        const isSelected = selectedIds.has(participant.id);
                        const isCurrentUser = participant.id === currentUser.id;
                        return (
                            <li key={participant.id}>
                                <button
                                    onClick={() => handleToggleSelection(participant.id)}
                                    disabled={isCurrentUser} // Disable toggling for current user
                                    className={`w-full flex items-center justify-between p-3 rounded-lg text-left ${
                                        isCurrentUser ? 'opacity-75 cursor-not-allowed' : 'hover:bg-gray-100'
                                    } ${isSelected ? 'bg-blue-50' : ''} transition-colors duration-150`}
                                >
                                    <span className="flex items-center space-x-3">
                                        {/* Placeholder Avatar */}
                                        <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-200 text-gray-600 text-sm font-medium">
                                            {participant.name.substring(0, 1).toUpperCase()}
                                        </span>
                                        <span>{participant.name} {isCurrentUser ? '(You)' : ''}</span>
                                    </span>
                                    {isSelected && <CheckIcon className="h-5 w-5 text-blue-600" />}
                                </button>
                            </li>
                        );
                    })}
                </ul>

                 {/* Footer */}
                 <div className="p-4 border-t flex justify-end space-x-3">
                     <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                        Cancel
                    </button>
                     <button
                        onClick={handleDone}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        disabled={selectedIds.size === 0} // Cannot proceed with zero selected (currentUser is always added back)
                    >
                        Done
                    </button>
                 </div>
            </div>
        </div>
    );
};

export default ParticipantSelectionModal;