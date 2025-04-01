import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode; // Allow React nodes for more complex messages
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonColor?: string; // e.g., 'bg-red-600 hover:bg-red-700'
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = 'Confirm',
  cancelButtonText = 'Cancel',
  confirmButtonColor = 'bg-red-600 hover:bg-red-700', // Default to red for destructive actions
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-40 flex items-center justify-center">
      <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="mt-3 text-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
          <div className="mt-2 px-7 py-3">
            <div className="text-sm text-gray-500">{message}</div>
          </div>
          <div className="items-center px-4 py-3 space-x-4 flex justify-center">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md w-auto shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              {cancelButtonText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose(); // Close modal after confirmation
              }}
              className={`px-4 py-2 text-white text-base font-medium rounded-md w-auto shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${confirmButtonColor} focus:ring-red-500`} // Use dynamic color
            >
              {confirmButtonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;