import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext'; // Removed unused import
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
        <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900"> {/* Dark mode bg */}
            {/* Header */}
            <header className="flex items-center p-4 bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-0 z-10"> {/* Dark mode header */}
                 <button onClick={() => navigate(-1)} className="text-gray-600 dark:text-gray-400 mr-4"> {/* Dark mode button */}
                    <XMarkIcon className="h-6 w-6" />
                </button>
                <div className="relative flex-grow">
                     <input
                         type="text"
                         placeholder="Enter names, emails, or group name"
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                         className="w-full p-2 pl-10 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" // Dark mode input
                     />
                     <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2" /> {/* Dark mode icon */}
                 </div>
            </header>

            {/* Content Area */}
            <main className="flex-grow overflow-y-auto p-4">
                {isLoading && <p className="text-center text-gray-500 dark:text-gray-400 py-6">Loading...</p>} {/* Dark mode text */}
                {error && <p className="text-center text-red-500 dark:text-red-400 py-6">Error: {error}</p>} {/* Dark mode error text */}

                {!isLoading && !error && (
                    <div className="space-y-6">
                        {/* TODO: Add Recent Section */}

                        {/* Groups Section */}
                        {filteredGroups.length > 0 && (
                            <section>
                                <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 px-1">Groups</h2> {/* Dark mode text */}
                                <ul className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border dark:border-gray-700"> {/* Dark mode list bg/border */}
                                    {filteredGroups.map(group => (
                                        <li key={`group-${group.id}`} className="border-b dark:border-gray-700 last:border-b-0"> {/* Dark mode border */}
                                            <button
                                                onClick={() => handleSelectTarget('group', group.id)}
                                                className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left" // Dark mode hover
                                            >
                                                {/* Use square Avatar for groups? Or keep icon? Let's keep icon for now */}
                                                <span className="flex-shrink-0 w-8 h-8 bg-orange-100 dark:bg-orange-900/50 rounded flex items-center justify-center"> {/* Dark mode icon bg */}
                                                    <UserGroupIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" /> {/* Dark mode icon color */}
                                                </span>
                                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{group.name}</span> {/* Dark mode text */}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {/* Friends Section */}
                         {filteredFriends.length > 0 && (
                            <section>
                                <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 px-1">Friends</h2> {/* Dark mode text */}
                                <ul className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border dark:border-gray-700"> {/* Dark mode list bg/border */}
                                    {filteredFriends.map(friend => (
                                        <li key={`friend-${friend.id}`} className="border-b dark:border-gray-700 last:border-b-0"> {/* Dark mode border */}
                                            <button
                                                onClick={() => handleSelectTarget('friend', friend.otherUser.id)}
                                                className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left" // Dark mode hover
                                            >
                                                {/* Use Avatar Component */}
                                                <Avatar name={friend.otherUser.name} size="sm" />
                                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{friend.otherUser.name}</span> {/* Dark mode text */}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {/* No Results */}
                        {searchTerm && filteredFriends.length === 0 && filteredGroups.length === 0 && (
                             <p className="text-center text-gray-500 dark:text-gray-400 py-6">{/* Dark mode text */}No matching friends or groups found.</p>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default SelectExpenseTargetPage;