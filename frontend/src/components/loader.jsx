import React from 'react';

// Custom Tailwind Loader Component
const Loader = () => {
  return (
    <div className="flex justify-center items-center space-x-2">
      <div className="w-6 h-6 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
      <span className="text-blue-500 text-lg">Loading...</span>
    </div>
  );
};

export default Loader;
