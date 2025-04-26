import React from 'react';

export default function NetworkIcon({ className }) {
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
      <path d="M9 2v6m6-6v6M3 8h18m-9 2v10M8 6h8"></path>
      <circle cx="12" cy="18" r="2"></circle>
      <path d="M8.5 12.5 5 15l3.5 2.5"></path>
      <path d="M15.5 12.5 19 15l-3.5 2.5"></path>
    </svg>
  );
}