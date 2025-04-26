import React from 'react';
import styles from './styles.module.css';

export default function FeatureGrid({ children, columns = 3, className, ...props }) {
  return (
    <div 
      className={`${styles.featureGrid} ${className || ''}`}
      style={{ '--columns': columns } as React.CSSProperties}
      {...props}
    >
      {children}
    </div>
  );
}