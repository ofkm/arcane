import React from 'react';
import styles from './styles.module.css';
import FeatureCard from '../FeatureCard';
import FeatureGrid from '../FeatureGrid';
import { ContainersIcon, ImagesIcon, NetworkIcon, MaturityIcon } from '../icons';

export default function HomepageFeatures() {
  const features = [
    {
      title: 'Container Overview',
      icon: <ContainersIcon className={styles.featureIcon} />,
      description: 'See all your containers at a glance with real-time status updates, resource usage, and quick actions.'
    },
    {
      title: 'Container Details',
      icon: <ContainersIcon className={styles.featureIcon} />,
      description: 'Deep dive into container specifics - inspect configuration, view logs, and manage ports.'
    },
    {
      title: 'Image Management',
      icon: <ImagesIcon className={styles.featureIcon} />,
      description: 'Browse local images, pull from registries, and clean up unused images to reclaim disk space.'
    },
    {
      title: 'Image Maturity',
      icon: <MaturityIcon className={styles.featureIcon} />,
      description: 'Track and manage image maturity levels across environments. Ensure production readiness with automated validation.'
    },
    {
      title: 'Networks & Volumes',
      icon: <NetworkIcon className={styles.featureIcon} />,
      description: 'Create and manage Docker networks and volumes with an intuitive interface.'
    },
    {
      title: 'Container Stats',
      icon: <ContainersIcon className={styles.featureIcon} />,
      description: 'Monitor CPU, memory, network, and disk usage in real-time with historical data tracking.'
    },
  ];

  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.featuresHeader}>
          <h2 className={styles.featuresTitle}>Core Features</h2>
          <p className={styles.featuresSubtitle}>
            Modern Docker management, designed for everyone
          </p>
        </div>
        <FeatureGrid columns={3} className={styles.featureGrid}>
          {features.map((feature, idx) => (
            <FeatureCard
              key={idx}
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
              className={styles.featureCard}
            />
          ))}
        </FeatureGrid>
      </div>
    </section>
  );
}
