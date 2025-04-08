import React from 'react';

interface AvatarProps {
    name: string;
    size?: 'sm' | 'md' | 'lg'; // Example sizes
    // Add src prop later if actual image URLs become available
}

// Simple hash function to get a somewhat consistent color based on name
const simpleHash = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
};

// Predefined background colors (Tailwind classes)
const bgColors = [
    'bg-red-100 text-red-700', 'bg-orange-100 text-orange-700', 'bg-amber-100 text-amber-700',
    'bg-yellow-100 text-yellow-700', 'bg-lime-100 text-lime-700', 'bg-green-100 text-green-700',
    'bg-emerald-100 text-emerald-700', 'bg-teal-100 text-teal-700', 'bg-cyan-100 text-cyan-700',
    'bg-sky-100 text-sky-700', 'bg-blue-100 text-blue-700', 'bg-indigo-100 text-indigo-700',
    'bg-violet-100 text-violet-700', 'bg-purple-100 text-purple-700', 'bg-fuchsia-100 text-fuchsia-700',
    'bg-pink-100 text-pink-700', 'bg-rose-100 text-rose-700',
];

const Avatar: React.FC<AvatarProps> = ({ name, size = 'md' }) => {
    const initial = name ? name.substring(0, 1).toUpperCase() : '?';
    const colorIndex = name ? simpleHash(name) % bgColors.length : 0;
    const colorClasses = bgColors[colorIndex];

    let sizeClasses = 'h-10 w-10 text-base'; // Default medium
    if (size === 'sm') {
        sizeClasses = 'h-8 w-8 text-sm';
    } else if (size === 'lg') {
        sizeClasses = 'h-12 w-12 text-xl';
    }

    return (
        <span className={`inline-flex items-center justify-center rounded-full ${sizeClasses} ${colorClasses} font-medium flex-shrink-0`}>
            {initial}
        </span>
    );
};

export default Avatar;