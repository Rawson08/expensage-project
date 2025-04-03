import React, { useState, useEffect } from 'react';

// Simple Download Icon (replace with a better one if available)
const DownloadIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
    </svg>
);

const InstallPwaButton: React.FC = () => {
    const [showPrompt, setShowPrompt] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Check if running as standalone PWA - hide button if true
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsStandalone(true);
        }
        // Add click outside listener to close prompt
        const handleClickOutside = (event: MouseEvent) => {
             // Type assertion needed as event.target might not be Element
            if (showPrompt && !(event.target as Element)?.closest('.install-pwa-popover') && !(event.target as Element)?.closest('.install-pwa-button')) { // Changed Node to Element
                setShowPrompt(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showPrompt]); // Re-run effect if showPrompt changes to attach/detach listener correctly

    const handleInstallClick = (os: 'android' | 'ios') => {
        const urls = {
            android: 'https://youtube.com/shorts/h7yPZunsYgw',
            ios: 'https://youtube.com/shorts/J8HP5TaA2Z8'
        };
        window.location.href = urls[os];
        setShowPrompt(false);
    };

    // Don't render the button if running in standalone mode
    if (isStandalone) {
        return null;
    }

    return (
        <div className="relative"> {/* Container for positioning the popover */}
            {/* Install Button */}
            <button
                onClick={() => setShowPrompt(prev => !prev)}
                type="button"
                // Add class for click outside detection
                className="install-pwa-button p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                title="Install App Guide"
            >
                <DownloadIcon />
            </button>

            {/* OS Selection Popover */}
            {showPrompt && (
                // Add class for click outside detection
                <div className="install-pwa-popover absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        <p className="px-4 py-2 text-sm text-gray-500">Install Guide:</p>
                        <button
                            onClick={() => handleInstallClick('android')}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                            role="menuitem"
                        >
                            Android
                        </button>
                        <button
                            onClick={() => handleInstallClick('ios')}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                            role="menuitem"
                        >
                            iOS
                        </button>
                         <button
                            onClick={() => setShowPrompt(false)}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 border-t mt-1"
                            role="menuitem"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InstallPwaButton;