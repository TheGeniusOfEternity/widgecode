import { Checkbox, Select, TextArea, TextInput } from '@gravity-ui/uikit';

import { blockDefinitions, type WidgetBlock } from '@/entities/widget/model';
import { sourceForBlock } from '@/pages/widget-editor/model/layout';
import { messages, type Locale } from '@/shared/locale/content';
import styles from '@/pages/widget-editor/ui/WidgetEditorPage.module.css';

export const BlockConfigPanel = ({
  block,
  locale,
  onChange,
}: {
  block: WidgetBlock;
  locale: Locale;
  onChange: (patch: Record<string, unknown>) => void;
}) => {
  const t = messages[locale];
  const source = sourceForBlock(block.type);
  const options =
    block.type === 'github-stats'
      ? [
          ['showRepositories', locale === 'ru' ? 'Репозитории' : 'Repositories'],
          ['showFollowers', locale === 'ru' ? 'Подписчики' : 'Followers'],
          ['showFollowing', locale === 'ru' ? 'Подписки' : 'Following'],
        ]
      : block.type === 'leetcode-stats'
        ? [
            ['showRanking', locale === 'ru' ? 'Рейтинг' : 'Ranking'],
            ['showContestRating', locale === 'ru' ? 'Рейтинг соревнований' : 'Contest rating'],
          ]
        : [];
  return (
    <section className={styles.settingsSection}>
      <div className={styles.panelHeading}>
        <div>
          <p>{t.blockSettings}</p>
          <h2>{blockDefinitions.find((definition) => definition.type === block.type)?.label}</h2>
        </div>
      </div>
      {source && (
        <label className={styles.field}>
          <span>{source === 'github' ? t.githubUsername : t.leetcodeUsername}</span>
          <TextInput
            size="l"
            value={String(block.config.username ?? '')}
            placeholder={source === 'github' ? 'octocat' : 'tourist'}
            onUpdate={(value) => onChange({ username: value })}
          />
        </label>
      )}
      {block.type === 'text' && (
        <>
          <label className={styles.field}>
            <span>{locale === 'ru' ? 'Текст' : 'Text'}</span>
            <TextArea
              size="l"
              value={String(block.config.text ?? '')}
              onUpdate={(value) => onChange({ text: value })}
            />
          </label>
          <label className={styles.field}>
            <span>{locale === 'ru' ? 'Выравнивание' : 'Alignment'}</span>
            <Select
              size="l"
              width="max"
              value={[String(block.config.align ?? 'left')]}
              options={[
                { value: 'left', content: 'Left' },
                { value: 'center', content: 'Center' },
                { value: 'right', content: 'Right' },
              ]}
              onUpdate={(value) => onChange({ align: value[0] ?? 'left' })}
            />
          </label>
        </>
      )}
      {block.type === 'github-langs' && (
        <label className={styles.field}>
          <span>{locale === 'ru' ? 'Количество языков' : 'Language count'}</span>
          <TextInput
            size="l"
            type="number"
            value={String(Number(block.config.limit ?? 5))}
            onUpdate={(value) => onChange({ limit: Number(value) })}
          />
        </label>
      )}
      {options.map(([key, label]) => (
        <Checkbox
          key={key}
          size="m"
          className={styles.checkField}
          checked={block.config[key] !== false}
          onUpdate={(checked) => onChange({ [key]: checked })}
        >
          {label}
        </Checkbox>
      ))}
      <p className={styles.muted}>{t.moveResize}</p>
    </section>
  );
};
