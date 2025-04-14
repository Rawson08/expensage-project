import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-center px-4">
      <h2 className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-4">404 - Page Not Found</h2>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">Sorry, the page you are looking for does not exist.</p>
      <Link to="/app" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
        Go to Dashboard
      </Link>
    </div>
  );
};

export default NotFoundPage;