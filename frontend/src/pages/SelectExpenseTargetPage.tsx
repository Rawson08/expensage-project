import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getFriends } from '../services/friendshipService';
import { getMyGroups } from '../services/groupService';
import { FriendshipResponseDto, GroupResponseDto } from '../types/api';
import { XMarkIcon, MagnifyingGlassIcon, UserGroupIcon } from '@heroicons/react/24/outline'; // Removed UserIcon
import { toast } from 'react-toastify';
import Avatar from '../components/Avatar'; // Import Avatar component

const SelectExpenseTargetPage: React.FC = () => {
    const navigate = useNavigate();
    // const { user } = useAuth(); // Removed unused user variable
    const [friends, setFriends] = useState<FriendshipResponseDto[]>([]);
    const [groups, setGroups] = useState<GroupResponseDto[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch friends and groups
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [friendsData, groupsData] = await Promise.all([
                getFriends(),
                getMyGroups()
            ]);
            setFriends(friendsData.filter((f: FriendshipResponseDto) => f.status === 'ACCEPTED'));
            setGroups(groupsData);
        } catch (err: any) {
            setError('Failed to load data.');
            toast.error('Failed to load friends or groups.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSelectTarget = (type: 'friend' | 'group', id: number) => {
        // Navigate to the actual expense form page, passing target info
        // Using state for simplicity, query params are also an option
        navigate('/app/expense/new', { state: { targetType: type, targetId: id } });
    };

    // Filter logic
    const searchTermLower = searchTerm.toLowerCase();
    const filteredFriends = friends.filter(f =>
        f.otherUser?.name.toLowerCase().includes(searchTermLower) ||
        f.otherUser?.email.toLowerCase().includes(searchTermLower)
    );
    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(searchTermLower)
    );

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            {/* Header */}
            <header className="flex items-center p-4 bg-white border-b sticky top-0 z-10">
                 <button onClick={() => navigate(-1)} className="text-gray-600 mr-4"> {/* Go back */}
                    <XMarkIcon className="h-6 w-6" />
                </button>
                <div className="relative flex-grow">
                     <input
                         type="text"
                         placeholder="Enter names, emails, or group name"
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                         className="w-full p-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                     />
                     <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                 </div>
            </header>

            {/* Content Area */}
            <main className="flex-grow overflow-y-auto p-4">
                {isLoading && <p className="text-center text-gray-500 py-6">Loading...</p>}
                {error && <p className="text-center text-red-500 py-6">Error: {error}</p>}

                {!isLoading && !error && (
                    <div className="space-y-6">
                        {/* TODO: Add Recent Section */}

                        {/* Groups Section */}
                        {filteredGroups.length > 0 && (
                            <section>
                                <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2 px-1">Groups</h2>
                                <ul className="bg-white rounded-lg shadow overflow-hidden">
                                    {filteredGroups.map(group => (
                                        <li key={`group-${group.id}`} className="border-b last:border-b-0">
                                            <button
                                                onClick={() => handleSelectTarget('group', group.id)}
                                                className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 text-left"
                                            >
                                                {/* Use square Avatar for groups? Or keep icon? Let's keep icon for now */}
                                                <span className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded flex items-center justify-center">
                                                    <UserGroupIcon className="h-5 w-5 text-orange-600" />
                                                </span>
                                                <span className="text-sm font-medium text-gray-800">{group.name}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {/* Friends Section */}
                         {filteredFriends.length > 0 && (
                            <section>
                                <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2 px-1">Friends</h2>
                                <ul className="bg-white rounded-lg shadow overflow-hidden">
                                    {filteredFriends.map(friend => (
                                        <li key={`friend-${friend.id}`} className="border-b last:border-b-0">
                                            <button
                                                onClick={() => handleSelectTarget('friend', friend.otherUser.id)}
                                                className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 text-left"
                                            >
                                                {/* Use Avatar Component */}
                                                <Avatar name={friend.otherUser.name} size="sm" />
                                                <span className="text-sm font-medium text-gray-800">{friend.otherUser.name}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {/* No Results */}
                        {searchTerm && filteredFriends.length === 0 && filteredGroups.length === 0 && (
                             <p className="text-center text-gray-500 py-6">No matching friends or groups found.</p>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default SelectExpenseTargetPage;