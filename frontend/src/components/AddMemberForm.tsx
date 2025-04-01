import React, { useState, useEffect } from 'react';
import { addMemberToGroup } from '../services/groupService';
import { getFriends, sendFriendRequest } from '../services/friendshipService'; // Added sendFriendRequest
import { GroupResponseDto, UserResponse, FriendshipResponseDto } from '../types/api'; // Ensure FriendshipResponseDto is imported
import { AddMemberRequest } from '../types/group';

interface AddMemberFormProps {
  groupId: number;
  onMemberAdded: (updatedGroup: GroupResponseDto) => void; // Callback might need adjustment if adding multiple
  onCancel: () => void;
  currentMembers: UserResponse[]; // Pass current members to prevent adding duplicates
}

const AddMemberForm: React.FC<AddMemberFormProps> = ({ groupId, onMemberAdded, onCancel, currentMembers }) => {
  const [friendEmail, setFriendEmail] = useState(''); // For adding new friend email
  const [error, setError] = useState<string | null>(null);
  const [addFriendError, setAddFriendError] = useState<string | null>(null); // Separate error for friend request
  const [addFriendSuccess, setAddFriendSuccess] = useState<string | null>(null); // Success message for friend request
  const [loadingAddMembers, setLoadingAddMembers] = useState(false); // Loading state for adding members
  const [friendRequestLoading, setFriendRequestLoading] = useState(false); // Loading state for friend request
  const [friends, setFriends] = useState<FriendshipResponseDto[]>([]); // Use FriendshipResponseDto
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<number>>(new Set()); // Use Set for multiple selections

  // Fetch friends when component mounts
  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const friendsData = await getFriends();
        // Filter out users already in the group, only if currentMembers is available
        if (currentMembers) {
            const currentMemberIds = new Set(currentMembers.map(m => m.id));
            // Filter based on the otherUser's ID
            setFriends(friendsData.filter(f => !currentMemberIds.has(f.otherUser.id)));
        } else {
            setFriends(friendsData);
            console.warn("AddMemberForm: currentMembers prop was undefined during friend fetch.");
        }
      } catch (err) {
        console.error("Failed to fetch friends for add member form:", err);
        setError("Could not load friends list.");
      }
    };
    fetchFriends();
  }, [currentMembers]); // Refetch if current members change

  const handleFriendSelectionChange = (friendUserId: number, isSelected: boolean) => {
    setSelectedFriendIds(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(friendUserId);
      } else {
        newSet.delete(friendUserId);
      }
      return newSet;
    });
     // Clear email if selecting friends
     if (isSelected) setFriendEmail('');
  };

  // Handler for adding SELECTED friends to the group
  const handleAddSelectedFriends = async (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedFriendIds.size === 0) {
        setError('Please select at least one friend from the list.');
        return;
    }
    setError(null);
    setLoadingAddMembers(true);

    let success = true;
    let lastError = null;
    let updatedGroupData: GroupResponseDto | null = null;

    // Create a map for quick lookup
    const friendMap = new Map(friends.map(f => [f.otherUser.id, f.otherUser]));

    for (const friendUserId of selectedFriendIds) {
        const selectedFriendUser = friendMap.get(friendUserId); // Look up user details by ID
        if (!selectedFriendUser) {
            console.error(`Selected friend with User ID ${friendUserId} not found in state.`);
            lastError = `Friend with ID ${friendUserId} not found.`;
            success = false;
            continue; // Skip this friend
        }

        const memberData: AddMemberRequest = {
            memberEmail: selectedFriendUser.email,
        };

        try {
            updatedGroupData = await addMemberToGroup(groupId, memberData);
        } catch (err: any) {
            console.error(`Failed to add friend ${selectedFriendUser.email} to group:`, err);
            lastError = err.message || `Could not add ${selectedFriendUser.name}.`;
            success = false;
        }
    }

    setLoadingAddMembers(false);
    if (success && updatedGroupData) {
        onMemberAdded(updatedGroupData);
        setSelectedFriendIds(new Set());
    } else if (lastError) {
        setError(lastError);
    }
  };

  // Handler for sending a NEW friend request
  const handleSendFriendRequest = async () => {
    if (!friendEmail.trim() || !friendEmail.includes('@')) {
      setAddFriendError('Please enter a valid email address.');
      return;
    }
    setAddFriendError(null);
    setAddFriendSuccess(null);
    setFriendRequestLoading(true);

    try {
        await sendFriendRequest(friendEmail);
        setAddFriendSuccess(`Friend request sent to ${friendEmail}. Add them to the group from the list after they accept.`);
        setFriendEmail('');
    } catch (err: any) {
        console.error('Failed to send friend request:', err);
        setAddFriendError(err.message || 'Failed to send friend request.');
    } finally {
        setFriendRequestLoading(false);
    }
  };


  return (
    <div className="p-4 bg-white rounded shadow max-h-[70vh] overflow-y-auto">
       <h3 className="text-lg font-medium text-gray-900 mb-4">Add Member to Group</h3>

       {/* Option 1: Select from Friends */}
       <form onSubmit={handleAddSelectedFriends} className="mb-4 pb-4 border-b">
         <label className="block text-sm font-medium text-gray-700 mb-2">
           Add Existing Friends:
         </label>
         <div className="max-h-40 overflow-y-auto border rounded p-2 mb-3 space-y-1">
            {friends.length === 0 ? (
                 <p className="text-xs text-gray-500 p-2">No friends available to add (or they are already in the group). Add users on the Friends page first.</p>
            ) : (
                friends.map(friend => (
                  // Use friend.id (friendship ID) for React key
                  <div key={friend.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`friend-${friend.otherUser.id}`} // Use otherUser ID for unique element ID
                      checked={selectedFriendIds.has(friend.otherUser.id)} // Check against otherUser ID
                      onChange={(e) => {
                          handleFriendSelectionChange(friend.otherUser.id, e.target.checked); // Pass otherUser ID
                          if (e.target.checked) setFriendEmail('');
                      }}
                      disabled={loadingAddMembers}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor={`friend-${friend.otherUser.id}`} className="ml-2 text-sm text-gray-700">
                      {friend.otherUser.name} ({friend.otherUser.email}) {/* Use otherUser details */}
                    </label>
                  </div>
                ))
            )}
         </div>
         <button
           type="submit"
           disabled={loadingAddMembers || selectedFriendIds.size === 0}
           className="w-full inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
         >
           {loadingAddMembers ? 'Adding...' : `Add Selected Friend${selectedFriendIds.size !== 1 ? 's' : ''}`}
         </button>
         {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
       </form>


       <div className="text-center my-2 text-gray-500 text-sm font-medium">OR</div>

       {/* Option 2: Invite New Friend */}
       <div className="space-y-3">
         <label htmlFor="memberEmail" className="block text-sm font-medium text-gray-700">
           Add New Friend (Sends Friend Request):
         </label>
         <div className="flex items-center space-x-2">
             <input
               type="email"
               id="memberEmail"
               value={friendEmail}
               onChange={(e) => {
                 setFriendEmail(e.target.value);
                 if (e.target.value) setSelectedFriendIds(new Set()); // Clear friend selection
               }}
               disabled={friendRequestLoading || selectedFriendIds.size > 0} // Disable if friends selected
               className="flex-grow mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
               placeholder="Enter friend's email"
             />
             <button
                type="button"
                onClick={handleSendFriendRequest}
                disabled={friendRequestLoading || !friendEmail || selectedFriendIds.size > 0}
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {friendRequestLoading ? 'Sending...' : 'Send Request'}
              </button>
         </div>
          {addFriendError && <p className="text-sm text-red-600 mt-2">{addFriendError}</p>}
          {addFriendSuccess && <p className="text-sm text-green-600 mt-2">{addFriendSuccess}</p>}
       </div>


       <div className="flex justify-end pt-4 mt-4 border-t">
          <button
             type="button"
             onClick={onCancel}
             className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
             Close
          </button>
       </div>
     </div>
  );
};

export default AddMemberForm;