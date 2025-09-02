import React from 'react';

const ProgressBar = ({ progress, className = '' }) => {
  return (
    <div className={`w-full bg-gray-200 rounded-full h-2.5 ${className}`}>
      <div
        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span className="sr-only">{progress}% complete</span>
      </div>
    </div>
  );
};


export default ProgressBar;