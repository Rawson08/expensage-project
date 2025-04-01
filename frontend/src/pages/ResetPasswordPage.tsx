import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { AxiosError } from 'axios';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const token = searchParams.get('token');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setError('Invalid password reset link: Token missing.');
    }
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!token) {
      setError('Invalid password reset link: Token missing.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/auth/reset-password', { token, newPassword });
      setMessage(response.data || 'Password has been successfully reset. Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
       let errorMsg = "An unknown error occurred.";
       if (err instanceof AxiosError && err.response) {
           errorMsg = err.response.data?.message || err.response.data || `Request failed with status ${err.response.status}`;
       } else if (err instanceof Error) {
           errorMsg = err.message;
       }
      setError(`Password reset failed: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset Your Password
          </h2>
        </div>
        {!token ? (
             <p className="text-center text-red-600">{error || 'Invalid or missing reset token.'}</p>
        ) : (
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <input type="hidden" name="remember" defaultValue="true" />
            <div className="rounded-md shadow-sm -space-y-px">
                <div>
                <label htmlFor="new-password" className="sr-only">New Password</label>
                <input
                    id="new-password"
                    name="newPassword"
                    type="password"
                    required
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="New Password (min. 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={loading}
                />
                </div>
                <div>
                <label htmlFor="confirm-password" className="sr-only">Confirm New Password</label>
                <input
                    id="confirm-password"
                    name="confirmPassword"
                    type="password"
                    required
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                />
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="rounded-md bg-red-50 p-4 mt-4">
                <div className="flex">
                    <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                    </div>
                </div>
                </div>
            )}

            {/* Success Message */}
            {message && (
                <div className="rounded-md bg-green-50 p-4 mt-4">
                <div className="flex">
                    <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">{message}</p>
                    </div>
                </div>
                </div>
            )}


            <div>
                <button
                type="submit"
                disabled={loading || !!message} // Disable if loading or success message shown
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                {loading ? 'Resetting...' : 'Reset Password'}
                </button>
            </div>
            </form>
        )}
         <div className="text-sm text-center">
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Back to Login
            </Link>
          </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;