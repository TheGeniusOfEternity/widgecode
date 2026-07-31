import { LogoGithub, Plus } from '@gravity-ui/icons';
import { Button, Icon } from '@gravity-ui/uikit';

import styles from '@/pages/widgets-gallery/ui/WidgetsGalleryHeader.module.css';

type WidgetsGalleryHeaderProps = {
  eyebrow: string;
  title: string;
  createWidget: string;
  starOnGithub: string;
  isLanguageLoading: boolean;
};

const repositoryUrl = 'https://github.com/TheGeniusOfEternity/github-stats';

export const WidgetsGalleryHeader = ({
  eyebrow,
  title,
  createWidget,
  starOnGithub,
  isLanguageLoading,
}: WidgetsGalleryHeaderProps) => (
  <header className={styles.header}>
    <div className={styles.copy}>
      <p className={`${styles.eyebrow} ${isLanguageLoading ? styles.textSkeleton : ''}`}>
        {isLanguageLoading ? '' : eyebrow}
      </p>
      <h1 className={isLanguageLoading ? styles.textSkeletonHeading : ''}>
        {isLanguageLoading ? '' : title}
      </h1>
    </div>
    <div className={styles.actions}>
      <Button href={repositoryUrl} target="_blank" rel="noreferrer" view="outlined" size="l">
        <Icon data={LogoGithub} size={18} />
        <span className={`${styles.buttonLabel} ${isLanguageLoading ? styles.textSkeleton : ''}`}>
          {isLanguageLoading ? '' : starOnGithub}
        </span>
      </Button>
      <Button view="action" size="l">
        <Icon data={Plus} size={18} />
        <span className={`${styles.buttonLabel} ${isLanguageLoading ? styles.textSkeleton : ''}`}>
          {isLanguageLoading ? '' : createWidget}
        </span>
      </Button>
    </div>
  </header>
);
