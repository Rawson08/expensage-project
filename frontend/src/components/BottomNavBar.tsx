import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { UsersIcon, UserGroupIcon, ChartBarIcon, UserCircleIcon, PlusIcon } from '@heroicons/react/24/outline';

const BottomNavBar: React.FC = () => {
  const activeClassName = "text-blue-600"; // Style for the active tab
  const inactiveClassName = "text-gray-500 hover:text-gray-700";

  // Helper function to determine class names for NavLink
  const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center w-full pt-1 pb-1 ${isActive ? activeClassName : inactiveClassName}`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 shadow-md flex items-center justify-around z-30">
      {/* Friends Tab */}
      <NavLink to="/app/friends" className={getNavLinkClass}>
        <UsersIcon className="h-6 w-6 mb-1" />
        <span className="text-xs font-medium">Friends</span>
      </NavLink>

      {/* Groups Tab */}
      <NavLink to="/app/groups" className={getNavLinkClass}>
        <UserGroupIcon className="h-6 w-6 mb-1" />
        <span className="text-xs font-medium">Groups</span>
      </NavLink>

      {/* Add Expense Button */}
      <Link
        to="/app/add-expense" // Or trigger a modal later
        className="flex items-center justify-center w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transform -translate-y-4 focus:outline-none"
        aria-label="Add Expense"
      >
        <PlusIcon className="h-7 w-7" />
      </Link>

      {/* Activity Tab */}
      <NavLink to="/app/activity" className={getNavLinkClass}>
        <ChartBarIcon className="h-6 w-6 mb-1" />
        <span className="text-xs font-medium">Activity</span>
      </NavLink>

      {/* Account Tab */}
      <NavLink to="/app/account" className={getNavLinkClass}>
        <UserCircleIcon className="h-6 w-6 mb-1" />
        <span className="text-xs font-medium">Account</span>
      </NavLink>
    </nav>
  );
};

export default BottomNavBar;