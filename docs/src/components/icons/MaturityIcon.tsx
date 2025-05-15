import React from 'react';

export default function MaturityIcon({ className }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 2L2 19h20L12 2z"/>
      <path d="M12 16v2"/>
      <path d="M12 10v4"/>
    </svg>
  );
}