import React, { useState, useEffect, useCallback } from 'react';
import { FriendshipResponseDto } from '../types/api';
import { toast } from 'react-toastify';
import ConfirmationModal from '../components/ConfirmationModal'; // Import the modal
import {
    getFriends,
    getIncomingRequests,
    getOutgoingRequests,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriendship
} from '../services/friendshipService';

// Define types for confirmation data
type ConfirmActionType = 'reject' | 'remove';
interface ConfirmData {
    id: number;
    name?: string;
    type: ConfirmActionType;
}

const FriendsPage: React.FC = () => {
    const [friends, setFriends] = useState<FriendshipResponseDto[]>([]);
    const [incomingRequests, setIncomingRequests] = useState<FriendshipResponseDto[]>([]);
    const [outgoingRequests, setOutgoingRequests] = useState<FriendshipResponseDto[]>([]);
    const [friendEmail, setFriendEmail] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [addFriendError, setAddFriendError] = useState<string | null>(null);

    // State for confirmation modal
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmData, setConfirmData] = useState<ConfirmData | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setAddFriendError(null);
        try {
            const [friendsData, incomingData, outgoingData] = await Promise.all([
                getFriends(),
                getIncomingRequests(),
                getOutgoingRequests()
            ]);
            setFriends(friendsData);
            setIncomingRequests(incomingData);
            setOutgoingRequests(outgoingData);
        } catch (err: any) {
            setError(err.message || 'Failed to load friendship data.');
            console.error(err);
            toast.error(err.message || 'Failed to load friendship data.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddFriend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!friendEmail) return;
        setAddFriendError(null);
        try {
            await sendFriendRequest(friendEmail);
            setFriendEmail('');
            toast.success('Friend request sent!');
            fetchData();
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to send friend request.';
            setAddFriendError(errorMsg);
            toast.error(errorMsg);
            console.error(err);
        }
    };

    const handleAccept = async (id: number) => {
        try {
            await acceptFriendRequest(id);
            toast.success("Friend request accepted!");
            fetchData();
        } catch (err: any) {
            const errorMsg = `Error accepting request: ${err.message || 'Unknown error'}`;
            toast.error(errorMsg);
            console.error(err);
        }
    };

    // --- Modal Handling ---
    const openConfirmModal = (id: number, type: ConfirmActionType, name?: string) => {
        setConfirmData({ id, type, name });
        setIsConfirmModalOpen(true);
    };

    const closeConfirmModal = () => {
        setIsConfirmModalOpen(false);
        setConfirmData(null);
    };

    const executeConfirmAction = async () => {
        if (!confirmData) return;

        const { id, type, name } = confirmData;

        try {
            if (type === 'reject') {
                await rejectFriendRequest(id);
                toast.info("Friend request rejected.");
            } else if (type === 'remove') {
                await removeFriendship(id);
                toast.info(`Removed ${name || 'friendship/request'}.`);
            }
            fetchData(); // Refresh lists after action
        } catch (err: any) {
            const actionText = type === 'reject' ? 'rejecting request' : 'removing friendship/request';
            const errorMsg = `Error ${actionText}: ${err.message || 'Unknown error'}`;
            toast.error(errorMsg);
            console.error(err);
        }
    };
    // --- End Modal Handling ---


    // Modified handlers to open modal instead of confirm
    const handleReject = (id: number) => {
         openConfirmModal(id, 'reject');
    };

     const handleRemove = (friendshipId: number, friendName: string) => {
         openConfirmModal(friendshipId, 'remove', friendName);
    };


    // Determine modal content based on state
    const getModalContent = () => {
        if (!confirmData) return { title: '', message: '' };
        const { type, name } = confirmData;
        if (type === 'reject') {
            return {
                title: 'Reject Friend Request',
                message: 'Are you sure you want to reject this friend request?',
                confirmText: 'Reject'
            };
        } else if (type === 'remove') {
            return {
                title: 'Remove Friendship/Request',
                message: `Are you sure you want to remove ${name} as a friend or cancel the request?`,
                confirmText: 'Remove'
            };
        }
        return { title: '', message: '' }; // Should not happen
    };

    const modalContent = getModalContent();


    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-6">Friends</h2>

            {/* Add Friend Form */}
            <form onSubmit={handleAddFriend} className="mb-8 p-4 border rounded shadow-sm bg-white">
                {/* ... form content ... */}
                 <h3 className="text-lg font-semibold mb-3">Add Friend</h3>
                <div className="flex items-center space-x-2">
                    <input
                        type="email"
                        value={friendEmail}
                        onChange={(e) => setFriendEmail(e.target.value)}
                        placeholder="Enter friend's email"
                        className="flex-grow p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                    <button
                        type="submit"
                        className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded shadow disabled:opacity-50"
                        disabled={!friendEmail}
                    >
                        Send Request
                    </button>
                </div>
                 {addFriendError && <p className="text-red-500 text-sm mt-2">{addFriendError}</p>}
            </form>

            {isLoading && <p>Loading...</p>}

            {!isLoading && !error && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Friends List */}
                    <div className="p-4 border rounded shadow-sm bg-white">
                        <h3 className="text-lg font-semibold mb-3 border-b pb-2">Your Friends ({friends.length})</h3>
                        {friends.length === 0 ? ( <p className="text-gray-500">No friends yet.</p> ) : (
                            <ul>
                                {friends.map(friend => (
                                    friend.otherUser ? (
                                        <li key={friend.id} className="py-2 border-b last:border-b-0 flex justify-between items-center">
                                            {/* ... friend details ... */}
                                             <div>
                                                <span className="font-medium">{friend.otherUser.name}</span>
                                                <span className="text-sm text-gray-500 ml-2">({friend.otherUser.email})</span>
                                                {friend.netBalance !== undefined && friend.netBalance !== null && (
                                                    <span className={`ml-4 text-sm ${friend.netBalance > 0 ? 'text-green-600' : friend.netBalance < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                                        {friend.netBalance > 0 ? `owes you ${Math.abs(friend.netBalance).toFixed(2)}` :
                                                         friend.netBalance < 0 ? `you owe ${Math.abs(friend.netBalance).toFixed(2)}` :
                                                         'settled up'}
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleRemove(friend.id, friend.otherUser.name)} // Use updated handler
                                                className="text-red-500 hover:text-red-700 text-sm font-medium px-2 py-1 rounded hover:bg-red-50 ml-4 flex-shrink-0"
                                                title="Remove Friend"
                                            > Remove </button>
                                        </li>
                                    ) : ( <li key={friend.id} className="py-2 border-b last:border-b-0 text-red-500 text-sm"> Error: Friend data incomplete (ID: {friend.id}) </li> )
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Incoming Requests */}
                    <div className="p-4 border rounded shadow-sm bg-white">
                        <h3 className="text-lg font-semibold mb-3 border-b pb-2">Incoming Requests ({incomingRequests.length})</h3>
                         {incomingRequests.length === 0 ? ( <p className="text-gray-500">No incoming requests.</p> ) : (
                            <ul>
                                {incomingRequests.map(req => (
                                    req.otherUser ? (
                                        <li key={req.id} className="py-2 border-b last:border-b-0 flex justify-between items-center">
                                            <span>{req.otherUser.name} ({req.otherUser.email})</span>
                                            <div className="space-x-2">
                                                <button onClick={() => handleAccept(req.id)} className="text-green-500 hover:text-green-700 text-sm">Accept</button>
                                                <button onClick={() => handleReject(req.id)} className="text-red-500 hover:text-red-700 text-sm">Reject</button> {/* Use updated handler */}
                                            </div>
                                        </li>
                                    ) : ( <li key={req.id} className="py-2 border-b last:border-b-0 text-red-500 text-sm"> Error: Request data incomplete (ID: {req.id}) </li> )
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Outgoing Requests */}
                    <div className="p-4 border rounded shadow-sm bg-white">
                        <h3 className="text-lg font-semibold mb-3 border-b pb-2">Outgoing Requests ({outgoingRequests.length})</h3>
                         {outgoingRequests.length === 0 ? ( <p className="text-gray-500">No outgoing requests.</p> ) : (
                            <ul>
                                {outgoingRequests.map(req => (
                                     req.otherUser ? (
                                        <li key={req.id} className="py-2 border-b last:border-b-0 flex justify-between items-center">
                                            <span>{req.otherUser.name} ({req.otherUser.email})</span>
                                            <button onClick={() => handleRemove(req.id, req.otherUser.name)} className="text-gray-500 hover:text-gray-700 text-sm">Cancel</button> {/* Use updated handler */}
                                        </li>
                                     ) : ( <li key={req.id} className="py-2 border-b last:border-b-0 text-red-500 text-sm"> Error: Request data incomplete (ID: {req.id}) </li> )
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}

             {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={closeConfirmModal}
                onConfirm={executeConfirmAction}
                title={modalContent.title}
                message={modalContent.message}
                confirmButtonText={modalContent.confirmText}
            />
        </div>
    );
};

export default FriendsPage;