import React, { useState } from 'react';
import { createGroup } from '../services/groupService';
import { GroupResponseDto } from '../types/api';

interface CreateGroupFormProps {
  onGroupCreated: (newGroup: GroupResponseDto) => void;
  onCancel?: () => void;
}

const CreateGroupForm: React.FC<CreateGroupFormProps> = ({ onGroupCreated, onCancel }) => {
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!groupName.trim()) {
      setError('Group name cannot be empty.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const newGroup = await createGroup({ name: groupName });
      onGroupCreated(newGroup);
      setGroupName('');
    } catch (err: any) {
      console.error('Failed to create group:', err);
      setError(err.message || 'Could not create group.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded shadow"> {/* Dark mode bg */}
       <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Create New Group</h3> {/* Dark mode text */}
      <div>
        <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 dark:text-gray-300"> {/* Dark mode text */}
          Group Name:
        </label>
        <input
          type="text"
          id="groupName"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          required
          disabled={loading}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" // Dark mode input
          placeholder="e.g., Trip to Italy, Apartment Bills"
        />
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>} {/* Dark mode error text */}
      <div className="flex justify-end space-x-3">
         {onCancel && (
             <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500 dark:hover:bg-gray-500 dark:focus:ring-offset-gray-800" // Dark mode cancel button
             >
                Cancel
             </button>
         )}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 dark:focus:ring-offset-gray-800" // Dark mode submit button (added focus offset)
        >
          {loading ? 'Creating...' : 'Create Group'}
        </button>
      </div>
    </form>
  );
};

export default CreateGroupForm;