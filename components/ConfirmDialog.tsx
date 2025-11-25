import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger'
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const getButtonClass = () => {
    switch (variant) {
      case 'danger':
        return 'btn-danger';
      case 'warning':
        return 'btn bg-warning-500 text-white hover:bg-warning-600';
      case 'primary':
        return 'btn-primary';
      default:
        return 'btn-danger';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content w-full max-w-md p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {message}
          </p>
        </div>
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`btn ${getButtonClass()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
