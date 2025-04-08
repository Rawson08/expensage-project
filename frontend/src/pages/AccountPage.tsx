import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
    ChevronRightIcon, QrCodeIcon, CreditCardIcon, ShieldCheckIcon, StarIcon,
    BellIcon, LockClosedIcon, ChatBubbleLeftRightIcon, QuestionMarkCircleIcon, ArrowLeftOnRectangleIcon,
    LinkIcon
} from '@heroicons/react/24/outline';
import Avatar from '../components/Avatar'; // Import Avatar component

// Interface for list items for easier mapping
interface AccountListItem {
    label: string;
    icon: React.ElementType;
    action?: () => void; // Placeholder for navigation or action
    section?: string; // To group items under headers
}

const AccountPage: React.FC = () => {
    const { user, logout } = useAuth(); // Get user info and logout function

    // Define list items based on the target screenshot
    // TODO: Implement actual navigation/actions later
    const listItems: AccountListItem[] = [
        // Settings Section (User info handled separately)
        { label: 'Scan code', icon: QrCodeIcon, section: 'Settings' },
        // { label: 'Splitwise Pay', icon: CreditCardIcon }, // Example placeholder
        // { label: 'Splitwise Pro', icon: StarIcon }, // Example placeholder
        // Preferences Section
        { label: 'Connected Accounts', icon: LinkIcon, section: 'Preferences' }, // Need LinkIcon
        { label: 'Notifications', icon: BellIcon },
        { label: 'Security', icon: LockClosedIcon },
        // Feedback Section
        { label: 'Feedback', icon: ChatBubbleLeftRightIcon, section: 'Feedback' },
        { label: 'Rate ExpenSage', icon: StarIcon }, // Reusing StarIcon
        // Contact Section
        { label: 'Contact us', icon: QuestionMarkCircleIcon, section: 'Contact' },
    ];

    // Helper to render list items with optional section headers
    const renderListItems = () => {
        let lastSection: string | undefined = undefined;
        return listItems.map((item, index) => {
            const showHeader = item.section && item.section !== lastSection;
            lastSection = item.section || lastSection; // Update last section seen

            return (
                <React.Fragment key={item.label}>
                    {showHeader && (
                        <h3 className="px-4 pt-6 pb-2 text-sm font-semibold text-gray-500 uppercase">
                            {item.section}
                        </h3>
                    )}
                    <li>
                        <button
                            onClick={item.action || (() => alert(`${item.label} clicked - Action not implemented`))}
                            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors duration-150"
                        >
                            <span className="flex items-center space-x-3">
                                <item.icon className="h-6 w-6 text-gray-500" />
                                <span className="text-gray-800">{item.label}</span>
                            </span>
                            <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                        </button>
                    </li>
                </React.Fragment>
            );
        });
    };


    return (
        <div className="flex flex-col min-h-screen bg-gray-100 pb-16"> {/* Ensure padding for bottom nav */}
             {/* Header (Simplified - Title only, search icon might be part of MainLayout later) */}
             <header className="p-4 bg-white border-b sticky top-0 z-10">
                 <h1 className="text-xl font-bold text-center">Account</h1>
             </header>

             {/* Main Content */}
             <main className="flex-grow">
                 {/* User Info Section */}
                 <div className="bg-white border-b border-t">
                     <button className="w-full flex items-center space-x-4 p-4 text-left hover:bg-gray-50">
                         {/* Use Avatar Component */}
                         <Avatar name={user?.name || '?'} size="lg" />
                         <div className="flex-grow">
                             <p className="font-semibold text-gray-900">{user?.name || 'User Name'}</p>
                             <p className="text-sm text-gray-500">{user?.email || 'user@example.com'}</p>
                         </div>
                         <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                     </button>
                 </div>

                 {/* Settings List */}
                 <ul className="bg-white border-b divide-y divide-gray-200">
                     {renderListItems()}
                 </ul>

                 {/* Logout Button */}
                 <div className="p-4 mt-6">
                     <button
                         onClick={logout}
                         className="w-full text-center text-red-600 hover:text-red-800 py-2"
                     >
                         Log out
                     </button>
                 </div>

                 {/* Footer Text */}
                 <footer className="py-6 px-4 text-center text-xs text-gray-400">
                     <p>Made with <span role="img" aria-label="love">❤️</span> by ExpenSage Team</p>
                     <p className="mt-1">Copyright © {new Date().getFullYear()} ExpenSage Inc.</p>
                     {/* <p className="mt-1">Version X.Y.Z</p> */}
                 </footer>
             </main>
        </div>
    );
};

export default AccountPage;