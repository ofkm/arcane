import type { ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '../components/HomepageFeatures';
import { CheckCircle, Zap, Star as RocketIcon, GitHub as GithubIcon, Layout as UiIcon } from 'react-feather';

import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx(styles.heroBanner)}>
      <div className={styles.heroBackground}>
        <div className={styles.heroGradient}></div>
        <div className={styles.heroGlass}></div>
      </div>
      <div className="container">
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <div className={styles.heroTitleWrapper}>
              <h1 className={styles.heroTitle}>Arcane</h1>
              <div className={styles.heroTitleBadge}>Beta</div>
            </div>
            <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
            <div className={styles.heroFeatures}>
              <div className={styles.heroFeatureItem}>
                <CheckCircle className={styles.heroFeatureIcon} />
                <span>Easy to use</span>
              </div>
              <div className={styles.heroFeatureItem}>
                <UiIcon className={styles.heroFeatureIcon} />
                <span>Elegant UI</span>
              </div>
              <div className={styles.heroFeatureItem}>
                <Zap className={styles.heroFeatureIcon} />
                <span>Lightning fast</span>
              </div>
            </div>
            <div className={styles.buttons}>
              <Link className={styles.buttonPrimary} to="/docs/">
                <RocketIcon className={styles.buttonIcon} />
                Get Started
              </Link>
              <Link 
                className={styles.buttonSecondary} 
                href="https://github.com/ofkm/arcane" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <GithubIcon className={styles.buttonIcon} />
                GitHub
              </Link>
            </div>
          </div>
          <div className={styles.heroImage}>
            <div className={styles.mockupWindow}>
              <div className={styles.mockupHeader}>
                <div className={styles.mockupButtons}>
                  <div className={styles.mockupButtonRed}></div>
                  <div className={styles.mockupButtonYellow}></div>
                  <div className={styles.mockupButtonGreen}></div>
                </div>
                <div className={styles.mockupTitle}>Arcane Dashboard</div>
              </div>
              <div className={styles.mockupContent}>
                <div className={styles.mockupInterface}>
                  <div className={styles.mockupSidebar}>
                    <div className={styles.mockupSidebarItem}>
                      <div className={styles.mockupIcon}></div>
                    </div>
                    <div className={styles.mockupSidebarItem}>
                      <div className={styles.mockupIcon}></div>
                    </div>
                    <div className={styles.mockupSidebarItem}>
                      <div className={styles.mockupIcon}></div>
                    </div>
                    <div className={styles.mockupSidebarItem}>
                      <div className={styles.mockupIcon}></div>
                    </div>
                  </div>
                  <div className={styles.mockupMain}>
                    <div className={styles.mockupHeader}>
                      <div className={styles.mockupHeaderTitle}>Containers</div>
                      <div className={styles.mockupHeaderActions}>
                        <div className={styles.mockupButton}></div>
                        <div className={styles.mockupButton}></div>
                      </div>
                    </div>
                    <div className={styles.mockupContainers}>
                      <div className={styles.mockupContainer}>
                        <div className={styles.mockupContainerStatus}></div>
                        <div className={styles.mockupContainerInfo}>
                          <div className={styles.mockupContainerName}></div>
                          <div className={styles.mockupContainerDetails}></div>
                        </div>
                        <div className={styles.mockupContainerActions}></div>
                      </div>
                      <div className={styles.mockupContainer}>
                        <div className={styles.mockupContainerStatus}></div>
                        <div className={styles.mockupContainerInfo}>
                          <div className={styles.mockupContainerName}></div>
                          <div className={styles.mockupContainerDetails}></div>
                        </div>
                        <div className={styles.mockupContainerActions}></div>
                      </div>
                      <div className={styles.mockupContainer}>
                        <div className={styles.mockupContainerStatus}></div>
                        <div className={styles.mockupContainerInfo}>
                          <div className={styles.mockupContainerName}></div>
                          <div className={styles.mockupContainerDetails}></div>
                        </div>
                        <div className={styles.mockupContainerActions}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title={`Arcane - ${siteConfig.tagline}`} description="Arcane is a Simple and Elegant Docker Management UI written in Typescript and SvelteKit. Explore the documentation to get started.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
