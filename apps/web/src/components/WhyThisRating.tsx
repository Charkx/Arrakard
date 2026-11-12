import type { RatingBreakdown, Role } from '@arrakis/domain';
import type { TextKey } from '../i18n/dictionary.ts';
import { useI18n } from '../i18n/i18n.tsx';

/**
 * « Pourquoi cette note » (cas d'usage V10) : l'explication de note calculée
 * par le domaine, mise en phrases. Le navigateur ne calcule rien : il lit les
 * étapes du calcul et les affiche.
 */
export function WhyThisRating({
  breakdown,
  role,
}: {
  readonly breakdown: RatingBreakdown;
  readonly role: Role;
}) {
  const { t, language } = useI18n();
  const { steps, result, nextTier } = breakdown;
  if (!steps) return null;

  const number = (value: number, digits = 1) =>
    new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : 'en-GB', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  const percent = (rate: number) => number(rate * 100, 0);
  const sum =
    steps.contributions.impact + steps.contributions.consistency + steps.contributions.clutch;
  const same = (a: number, b: number) => Math.abs(a - b) < 0.005;

  const reliable = steps.reliability >= 1;
  const weighted =
    !same(steps.kda.unweighted, steps.kda.weighted) ||
    !same(steps.winrate.unweighted, steps.winrate.weighted);
  const floored = steps.ratingBeforeFloor < 60;

  return (
    <section className="neo-panel why-panel" aria-labelledby="why-title">
      <h2 id="why-title" className="panel-title">
        {t('why.title')}
      </h2>
      <div className="why-body">
        <p className="why-intro">{t('why.intro')}</p>

        <div className="attrs-card">
          <Contribution
            label={t('profile.attr.impact')}
            source="why.impact.source"
            value={result.impact}
            points={number(steps.contributions.impact)}
            color="coral"
          />
          <Contribution
            label={t('profile.attr.consistency')}
            source="why.consistency.source"
            value={result.consistency}
            points={number(steps.contributions.consistency)}
            color="blue"
          />
          <Contribution
            label={t('profile.attr.clutch')}
            source="why.clutch.source"
            value={result.clutch}
            points={number(steps.contributions.clutch)}
            color="violet"
          />
          <p className="why-total">
            {t('why.total', { sum: number(sum, 2), rating: result.rating })}
          </p>
        </div>

        <ul className="why-rules">
          <Rule
            title={t('why.rule.baseline', { role })}
            effect={`KDA ${number(steps.roleBaseline.kda)} · ${percent(steps.roleBaseline.winrate)} %`}
            text={t('why.rule.baseline.text', { role, kda: number(steps.roleBaseline.kda) })}
          />
          {reliable ? (
            <Rule
              title={t('why.rule.reliability.full')}
              text={t('why.rule.reliability.full.text', { games: breakdown.games })}
              off
            />
          ) : (
            <Rule
              title={t('why.rule.reliability')}
              effect={`KDA ${number(steps.kda.afterCap)} → ${number(steps.kda.reliable)}`}
              text={t('why.rule.reliability.text', {
                games: breakdown.games,
                share: percent(steps.reliability),
                role,
                kdaFrom: number(steps.kda.afterCap),
                kdaTo: number(steps.kda.reliable),
                wrFrom: percent(steps.winrate.weighted),
                wrTo: percent(steps.winrate.reliable),
              })}
            />
          )}
          <Rule
            title={t('why.rule.prestige')}
            {...(weighted
              ? {
                  effect: `KDA ${number(steps.kda.unweighted)} → ${number(steps.kda.weighted)}`,
                  text: t('why.rule.prestige.text', {
                    kdaFrom: number(steps.kda.unweighted),
                    kdaTo: number(steps.kda.weighted),
                    wrFrom: percent(steps.winrate.unweighted),
                    wrTo: percent(steps.winrate.weighted),
                  }),
                }
              : { text: t('why.rule.prestige.none'), off: true })}
          />
          <Rule
            title={t('why.rule.cap')}
            {...(steps.kda.capped
              ? {
                  effect: `KDA ${number(steps.kda.weighted)} → 8`,
                  text: t('why.rule.cap.text', { kda: number(steps.kda.weighted) }),
                }
              : { text: t('why.rule.cap.none'), off: true })}
          />
          <Rule
            title={t('why.rule.floor')}
            {...(floored
              ? {
                  effect: `${String(steps.ratingBeforeFloor)} → 60`,
                  text: t('why.rule.floor.text', { raw: steps.ratingBeforeFloor }),
                }
              : { text: t('why.rule.floor.none'), off: true })}
          />
        </ul>

        <p className="why-next">
          {nextTier
            ? t('why.next', { points: nextTier.pointsMissing, tier: t(`tier.${nextTier.tier}`) })
            : t('why.next.top')}
        </p>
      </div>
    </section>
  );
}

function Contribution({
  label,
  source,
  value,
  points,
  color,
}: {
  readonly label: string;
  readonly source: TextKey;
  readonly value: number;
  readonly points: string;
  readonly color: string;
}) {
  const { t } = useI18n();
  return (
    <div className="attr-row why-contribution">
      <span className="attr-label-cell">
        <span className="attr-label">
          {label} <span className="why-source">· {t(source)}</span>
        </span>
      </span>
      <div className="attr-bar-outer" aria-hidden="true">
        <div
          className={`attr-bar-fill attr-fill-${color}`}
          style={{ width: `${String(Math.min(100, value))}%` }}
        />
      </div>
      <span className={`attr-value color-${color}`}>{value}</span>
      <span className="why-points">{t('why.points', { points })}</span>
    </div>
  );
}

function Rule({
  title,
  text,
  effect,
  off = false,
}: {
  readonly title: string;
  readonly text: string;
  readonly effect?: string;
  readonly off?: boolean;
}) {
  const { t } = useI18n();
  return (
    <li className={`why-rule${off ? ' off' : ''}`}>
      <span className="why-rule-title">{title}</span>
      <span className="why-rule-effect">{effect ?? t('why.effect.none')}</span>
      <p className="why-rule-text">{text}</p>
    </li>
  );
}
