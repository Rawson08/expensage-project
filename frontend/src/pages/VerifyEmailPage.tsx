import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import apiClient from '../services/api';

type VerificationStatus = 'verifying' | 'success' | 'error';

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [message, setMessage] = useState<string>('Verifying your email...');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-lg shadow-md text-center">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Email Verification
        </h2>
        <div className="mt-8 space-y-6">
          {status === 'verifying' && (
            <p className="text-lg text-gray-600">{message}</p>
            // Optional: Add a spinner icon here
          )}
          {status === 'success' && (
            <>
              <p className="text-lg text-green-600">{message}</p>
              <Link
                to="/login"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mt-4"
              >
                Proceed to Login
              </Link>
            </>
          )}
          {status === 'error' && (
             <>
              <p className="text-lg text-red-600">{message}</p>
               <Link
                to="/login"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 mt-4"
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