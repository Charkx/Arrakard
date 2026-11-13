import type { Tier } from '@arrakis/domain';
import { useI18n } from '../i18n/i18n.tsx';

/** Pastille de palier, reprise de la v1. */
export function TierPill({ tier }: { readonly tier: Tier }) {
  const { t } = useI18n();
  return <span className={`tier-pill ${tier}`}>{t(`tier.${tier}`)}</span>;
}
