import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 shadow-sm dark:bg-gray-800 dark:border-gray-700 ${className}`}>
      {children}
    </div>
  );
};