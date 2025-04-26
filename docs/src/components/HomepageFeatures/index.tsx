import React from 'react';
import styles from './styles.module.css';
import FeatureCard from '../FeatureCard';
import FeatureGrid from '../FeatureGrid';
import { ContainersIcon, ImagesIcon, NetworkIcon } from '../icons';

export default function HomepageFeatures() {
  const features = [
    {
      title: "Container Management",
      icon: <ContainersIcon className="" />,
      description: "Monitor and manage all your Docker containers with an intuitive interface. Start, stop, and inspect containers with ease."
    },
    {
      title: "Image Handling",
      icon: <ImagesIcon className="" />,
      description: "Browse and manage your Docker images. Pull from registries, build new images, and clean up unused ones."
    },
    {
      title: "Network Visualization",
      icon: <NetworkIcon className="" />,
      description: "Visualize and configure Docker networks to understand how your containers communicate with each other."
    }
  ];

  return (
    <section className={styles.features}>
      <div className="container">
        <FeatureGrid className={styles.grid}>
          {features.map((feature, idx) => (
            <FeatureCard
              key={idx}
              className="" // Add the required className prop
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
            />
          ))}
        </FeatureGrid>
      </div>
    </section>
  );
}