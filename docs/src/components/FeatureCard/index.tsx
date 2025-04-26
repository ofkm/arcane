import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

export default function FeatureCard({ 
  title, 
  description, 
  icon, 
  className,
  ...props 
}) {
  return (
    <div className={clsx(styles.featureCard, className)} {...props}>
      {icon && (
        <div className={styles.featureIconWrapper}>
          {React.cloneElement(icon, { className: styles.featureIcon })}
        </div>
      )}
      <h3 className={styles.featureTitle}>{title}</h3>
      <p className={styles.featureDescription}>{description}</p>
    </div>
  );
}