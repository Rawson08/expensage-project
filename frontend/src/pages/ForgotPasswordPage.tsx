import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../services/api';
import { toast } from 'react-toastify'; // Import toast

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  // const [message, setMessage] = useState<string | null>(null); // Remove message state
  // const [error, setError] = useState<string | null>(null); // Remove error state
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    // setError(null); // Remove error state clearing
    // setMessage(null); // Remove message state clearing
    setLoading(true);

    try {
      // Call the backend forgot-password endpoint
      await apiClient.post('/auth/forgot-password', { email });
      toast.info('If an account exists for this email, a password reset link has been sent. Please check your inbox (and spam folder).'); // Use toast.info
      setEmail(''); // Clear the form
    } catch (err) {
      console.error("Forgot password error:", err);
      // Show a generic error, as the backend always returns success to prevent enumeration
      toast.error('An error occurred. Please try again later.'); // Use toast.error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Forgot Your Password?
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <input type="hidden" name="remember" defaultValue="true" />
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

           {/* Error Message Block Removed */}
           {/* Success/Info Message Block Removed */}


          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </div>
        </form>
         <div className="text-sm text-center">
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Back to Login
            </Link>
          </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;