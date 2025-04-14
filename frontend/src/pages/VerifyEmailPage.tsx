import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import apiClient from '../services/api';
import { toast } from 'react-toastify'; // Import toast
type VerificationStatus = 'verifying' | 'success' | 'error';

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [message, setMessage] = useState<string>('Verifying your email...');
  const [resendEmail, setResendEmail] = useState<string>(''); // State for email input
  const [isResending, setIsResending] = useState<boolean>(false); // State for resend loading
  const token = searchParams.get('token');
  const hasVerified = useRef(false);

  useEffect(() => {
    if (token && !hasVerified.current) {
      hasVerified.current = true;

      const verifyToken = async () => {
        try {
          const response = await apiClient.get(`/auth/verify?token=${token}`);
          setStatus('success');
          setMessage(response.data || 'Email successfully verified. You can now log in.');
        } catch (error: any) {
          setStatus('error');
          const backendMessage = error.response?.data?.message || error.response?.data || error.message;
          const displayMessage = error.response?.data === "Email verification failed. The link may be invalid or expired."
                               ? error.response.data
                               : `Verification failed: ${backendMessage || 'Invalid or expired token.'}`;
          setMessage(displayMessage);
          console.error("Verification error:", error); // Keep this error log for debugging verification issues
        }
      };

      verifyToken();
    } else if (!token && !hasVerified.current) {
        hasVerified.current = true;
        setStatus('error');
        setMessage('Verification token missing. Please check the link in your email.');
    }
  }, [token]);

  // Function to handle resending the verification email
  const handleResendVerification = async () => {
      if (!resendEmail) {
          toast.error("Please enter your email address.");
          return;
      }
      setIsResending(true);
      try {
          await apiClient.post('/auth/resend-verification', { email: resendEmail });
          toast.success("If your account exists and is not verified, a new verification email has been sent.");
          setResendEmail(''); // Clear input on success
      } catch (error: any) {
          // Log the error but show a generic message to the user
          console.error("Resend verification error:", error);
          toast.error("An error occurred while trying to resend the verification email. Please try again later.");
      } finally {
          setIsResending(false);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8"> {/* Dark mode page bg */}
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-10 rounded-lg shadow-md text-center"> {/* Dark mode container bg */}
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100"> {/* Dark mode text */}
          Email Verification
        </h2>
        <div className="mt-8 space-y-6">
          {status === 'verifying' && (
            <p className="text-lg text-gray-600 dark:text-gray-300">{message}</p>
            
          ) }
          {status === 'success' && (
            <>
              <p className="text-lg text-green-600 dark:text-green-400">{message}</p> {/* Dark mode success text */}
              <Link
                to="/login"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mt-4 dark:focus:ring-offset-gray-800" // Dark mode button
              >
                Proceed to Login
              </Link>
            </>
          )}
          {status === 'error' && (
             <>
              <p className="text-lg text-red-600 dark:text-red-400 mb-4">{message}</p> {/* Dark mode error text */}
              {/* Add Resend Section */}
              <div className="mt-6 border-t dark:border-gray-700 pt-6 space-y-4"> {/* Dark mode border */}
                   <p className="text-sm text-gray-600 dark:text-gray-400">If the link has expired or you didn't receive an email, you can request a new one.</p> {/* Dark mode text */}
                   <div>
                       <label htmlFor="resend-email" className="sr-only">Email address</label>
                       <input
                           id="resend-email"
                           name="email"
                           type="email"
                           autoComplete="email"
                           required
                           className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-700" // Dark mode input
                           placeholder="Enter your email address"
                           value={resendEmail}
                           onChange={(e) => setResendEmail(e.target.value)}
                           disabled={isResending}
                       />
                   </div>
                   <button
                       type="button"
                       onClick={handleResendVerification}
                       disabled={isResending || !resendEmail}
                       className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 dark:focus:ring-offset-gray-800" // Dark mode button
                   >
                       {isResending ? 'Sending...' : 'Resend Verification Email'}
                   </button>
              </div>
              <Link
                to="/login"
                className="block text-center mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300" // Dark mode link
              >
                Back to Login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;