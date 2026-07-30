import {
  ArrowRightFromSquare,
  ChevronRight,
  Globe,
  Moon,
  PencilToLine,
  Plus,
  Sun,
} from '@gravity-ui/icons';
import { useState } from 'react';

import type { AppTheme, Locale } from '../../../app/config';
import styles from './Sidebar.module.css';
import { Button, Icon } from '@gravity-ui/uikit';

export type SidebarLabels = {
  home: string;
  chats: string;
  newNote: string;
  logout: string;
  createWidget: string;
  language: string;
  theme: string;
  recentWidgets: string;
};

type SidebarProps = {
  username: string;
  locale: Locale;
  theme: AppTheme;
  labels: SidebarLabels;
  widgetNames: readonly string[];
  onLocaleToggle: () => void;
  onThemeToggle: () => void;
  onCreateWidget: () => void;
  onLogout: () => void;
};

export const Sidebar = ({
  username,
  locale,
  theme,
  labels,
  widgetNames,
  onLocaleToggle,
  onThemeToggle,
  onCreateWidget,
  onLogout,
}: SidebarProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <aside className={[styles.sidebar, isExpanded ? styles.expanded : ''].join(' ')}>
      <div className={styles.sidebarContent}>
        <div className={styles.userContainer}>
          <span className={styles.username}>{username}</span>
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            size="xl"
            view="outlined"
            className={[styles.toggle, !isExpanded ? styles.toggleExpanded : ''].join(' ')}
            aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <Icon data={ChevronRight} size={30} />
          </Button>
        </div>

        <div className={styles.divider} />

        <section className={styles.recentWidgets} aria-label={labels.recentWidgets}>
          <span className={styles.recentTitle}>{labels.recentWidgets}</span>
          {widgetNames.map((widgetName) => (
            <div className={styles.btnWrapper} key={widgetName}>
              <Button
                onClick={onCreateWidget}
                size="xl"
                view="outlined"
                className={[styles.button, !isExpanded ? styles.hidden : ''].join(' ')}
              >
                {widgetName}
              </Button>
              <Button
                size="xl"
                view="flat"
                className={styles.btnIcon}
                onClick={onCreateWidget}
                aria-label={labels.createWidget}
              >
                <Icon data={PencilToLine} size={20} />
              </Button>
            </div>
          ))}
        </section>
      </div>

      <div className={styles.controls}>
        <div className={styles.btnWrapper}>
          <Button
            onClick={onThemeToggle}
            size="xl"
            view="outlined-action"
            className={[styles.button, !isExpanded ? styles.hidden : ''].join(' ')}
          >
            {labels.theme}: {theme}
          </Button>
          <Button
            size="xl"
            view="outlined-action"
            className={styles.btnIcon}
            onClick={onThemeToggle}
            aria-label={labels.theme}
          >
            <Icon data={theme === 'dark' ? Moon : Sun} size={25} />
          </Button>
        </div>
        <div className={styles.btnWrapper}>
          <Button
            onClick={onLocaleToggle}
            size="xl"
            view="outlined-action"
            className={[styles.button, !isExpanded ? styles.hidden : ''].join(' ')}
          >
            {labels.language}: {locale.toUpperCase()}
          </Button>
          <Button
            size="xl"
            view="outlined-action"
            className={styles.btnIcon}
            onClick={onLocaleToggle}
            aria-label={labels.language}
          >
            <Icon data={Globe} size={25} />
          </Button>
        </div>
        <div className={styles.btnWrapper}>
          <Button
            onClick={onCreateWidget}
            size="xl"
            view="action"
            className={[styles.button, !isExpanded ? styles.hidden : ''].join(' ')}
          >
            {labels.createWidget}
          </Button>
          <Button
            size="xl"
            view="action"
            className={styles.btnIcon}
            onClick={onCreateWidget}
            aria-label={labels.createWidget}
          >
            <Icon data={Plus} size={25} />
          </Button>
        </div>
        <div className={styles.btnWrapper}>
          <Button
            onClick={onLogout}
            size="xl"
            view="outlined"
            className={[styles.button, !isExpanded ? styles.hidden : ''].join(' ')}
          >
            {labels.logout}
          </Button>
          <Button
            size="xl"
            view="action"
            className={styles.btnIcon}
            onClick={onLogout}
            aria-label={labels.logout}
          >
            <Icon data={ArrowRightFromSquare} size={25} />
          </Button>
        </div>
      </div>
    </aside>
  );
};
