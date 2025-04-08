import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNavBar from './BottomNavBar';

const MainLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Main content area */}
      <main className="flex-grow pb-16"> {/* padding-bottom to prevent content from hiding behind the fixed nav bar */}
        {/* Outlet renders the matched child route component (e.g., GroupsPage, FriendsPage) */}
        <Outlet />
      </main>

      {/* Bottom Navigation Bar */}
      <BottomNavBar />
    </div>
  );
};

export default MainLayout;