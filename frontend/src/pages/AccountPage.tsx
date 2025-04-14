import React, { useMemo } from 'react'; // Merged React imports
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext'; // Import useTheme
import {
    ChevronRightIcon, QrCodeIcon, StarIcon,
    BellIcon, LockClosedIcon, ChatBubbleLeftRightIcon, QuestionMarkCircleIcon,
    LinkIcon, SunIcon, MoonIcon // Add SunIcon and MoonIcon
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
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme(); // Get theme state and toggle function

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
        { label: `Theme (${theme === 'light' ? 'Light' : 'Dark'})`, icon: theme === 'light' ? MoonIcon : SunIcon, action: toggleTheme }, // Add Theme Toggle
        // Feedback Section
        { label: 'Feedback', icon: ChatBubbleLeftRightIcon, section: 'Feedback' },
        { label: 'Rate ExpenSage', icon: StarIcon }, // Reusing StarIcon
        // Contact Section
        { label: 'Contact us', icon: QuestionMarkCircleIcon, section: 'Contact' },
    ];

    // Helper to render list items with optional section headers
    const renderListItems = () => {
        let lastSection: string | undefined = undefined;
        // Memoize list items to prevent re-renders unless theme changes
        const memoizedListItems = useMemo(() => listItems, [theme]);

        return memoizedListItems.map((item) => {
            const showHeader = item.section && item.section !== lastSection;
            lastSection = item.section || lastSection;

            return (
                <React.Fragment key={item.label}>
                    {showHeader && ( // Removed duplicate condition
                        <h3 className="px-4 pt-6 pb-2 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase"> {/* Dark mode header text */}
                            {item.section}
                        </h3>
                    )}
                    <li>
                        <button
                            onClick={item.action || (() => alert(`${item.label} clicked - Action not implemented`))}
                            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150" // Dark mode hover
                        >
                            <span className="flex items-center space-x-3">
                                <item.icon className="h-6 w-6 text-gray-500 dark:text-gray-400" /> {/* Dark mode icon color */}
                                <span className="text-gray-800 dark:text-gray-200">{item.label}</span> {/* Dark mode text color */}
                            </span>
                            {/* Conditionally render Chevron or nothing for theme toggle */}
                            {item.label.startsWith('Theme') ? null : <ChevronRightIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />}
                        </button>
                    </li>
                </React.Fragment>
            );
        });
    };


    return (
        <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 pb-16"> {/* Dark mode background */}
             {/* Header */}
             <header className="p-4 bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-0 z-10"> {/* Dark mode header */}
                 <h1 className="text-xl font-bold text-center text-gray-900 dark:text-gray-100">Account</h1> {/* Dark mode header text */}
             </header>

             {/* Main Content */}
             <main className="flex-grow">
                 {/* User Info Section */}
                 <div className="bg-white dark:bg-gray-800 border-b border-t dark:border-gray-700"> {/* Dark mode user section */}
                     <button className="w-full flex items-center space-x-4 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700"> {/* Dark mode hover */}
                         {/* Use Avatar Component */}
                         <Avatar name={user?.name || '?'} size="lg" />
                         <div className="flex-grow">
                             <p className="font-semibold text-gray-900 dark:text-gray-100">{user?.name || 'User Name'}</p> {/* Dark mode text */}
                             <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email || 'user@example.com'}</p> {/* Dark mode text */}
                         </div>
                         <ChevronRightIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" /> {/* Dark mode icon */}
                     </button>
                 </div>

                 {/* Settings List */}
                 <ul className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700"> {/* Dark mode list */}
                     {renderListItems()}
                 </ul>

                 {/* Logout Button */}
                 <div className="p-4 mt-6">
                     <button
                         onClick={logout}
                         className="w-full text-center text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400 py-2" // Dark mode logout text
                     >
                         Log out
                     </button>
                 </div>

                 {/* Footer Text */}
                 <footer className="py-6 px-4 text-center text-xs text-gray-400 dark:text-gray-500"> {/* Dark mode footer text */}
                     <p>Made with <span role="img" aria-label="love">❤️</span> by ExpenSage Team</p>
                     <p className="mt-1">Copyright © {new Date().getFullYear()} ExpenSage Inc.</p>
                     {/* <p className="mt-1">Version X.Y.Z</p> */}
                 </footer>
             </main>
        </div>
    );
};

export default AccountPage;