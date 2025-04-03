import React from 'react';

const HelpPage: React.FC = () => {
    const pwaAndroidUrl = 'https://youtube.com/shorts/h7yPZunsYgw';
    const pwaIosUrl = 'https://youtube.com/shorts/J8HP5TaA2Z8';
    const ocrUrl = 'https://youtube.com/shorts/8T6epPYqRUY';
    const playlistUrl = 'https://www.youtube.com/playlist?list=PLMABSR62SLI-f0LwIcPiP2eNnXmRNQ2nB';

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-6">Help & Tutorials</h2>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Installation Guides */}
                <div className="p-4 bg-white shadow rounded-lg">
                    <h3 className="text-lg font-semibold mb-3">App Installation (PWA)</h3>
                    <p className="text-gray-600 mb-4">Install ExpenSage on your phone for easy access:</p>
                    <ul className="space-y-2">
                        <li>
                            <a href={pwaAndroidUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 hover:underline">
                                Android Installation Guide (Video)
                            </a>
                        </li>
                        <li>
                            <a href={pwaIosUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 hover:underline">
                                iOS Installation Guide (Video)
                            </a>
                        </li>
                    </ul>
                </div>

                {/* Feature Guides */}
                <div className="p-4 bg-white shadow rounded-lg">
                    <h3 className="text-lg font-semibold mb-3">Feature Guides</h3>
                     <ul className="space-y-2">
                        <li>
                            <a href={ocrUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 hover:underline">
                                How to Use Receipt Scanning (OCR) (Video)
                            </a>
                        </li>
                         <li>
                            <a href={playlistUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 hover:underline">
                                View All Tutorial Videos (YouTube Playlist)
                            </a>
                        </li>
                        {/* Add more feature guides here as needed */}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default HelpPage;