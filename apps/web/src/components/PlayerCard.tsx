import type { Role, Tier } from '@arrakis/domain';
import { useEffect, useRef, useState } from 'react';
import { championIconUrl } from '../data/champions.ts';
import { useI18n } from '../i18n/i18n.tsx';

/**
 * Carte de collection d'un joueur, reprise de la v1 (PlayerCardHero) :
 * même cadre par palier, mêmes effets, même inclinaison au survol.
 * Sans titre ni badges : ils arrivent en tranche 2.
 */
export interface PlayerCardProps {
  readonly nickname: string;
  readonly initials: string;
  readonly rating: number;
  readonly tier: Tier;
  readonly teamTag: string | null;
  readonly role: Role;
  readonly impact: number;
  readonly consistency: number;
  readonly clutch: number;
  readonly games: number;
  readonly editionsPlayed: number;
  /** Les champions les plus joués, trois au plus. */
  readonly champions?: readonly string[];
  /** Échelle d'affichage (1 = 320 × 532, la taille de la v1). */
  readonly scale?: number;
}

/** Nom de palier dans le style de la carte (libellés de la v1). */
const RANK: Record<Tier, string> = {
  bronze: 'bronze',
  silver: 'argent',
  gold: 'or',
  elite: 'elite',
};

const ROLE_ICON_BASE =
  'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-';
const ROLE_ICON: Record<Role, string> = {
  TOP: 'top',
  JGL: 'jungle',
  MID: 'middle',
  ADC: 'bottom',
  SUP: 'utility',
};

const CARD_WIDTH = 320;
const CARD_HEIGHT = 532;

/** Icône du champion, avec ses trois premières lettres si l'image ne charge pas (comme en v1). */
function ChampionIcon({ name }: { readonly name: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="pch-champ" title={name}>
      {failed ? (
        <span className="pch-champ-fb">{name.slice(0, 3).toUpperCase()}</span>
      ) : (
        <img
          className="pch-champ-img"
          src={championIconUrl(name)}
          alt={name}
          loading="lazy"
          onError={() => {
            setFailed(true);
          }}
        />
      )}
    </div>
  );
}

function RoleIcon({ role }: { readonly role: Role }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="pch-role-txt">{role}</span>;
  return (
    <img
      className="pch-role-img"
      src={`${ROLE_ICON_BASE}${ROLE_ICON[role]}.png`}
      alt=""
      loading="lazy"
      onError={() => {
        setFailed(true);
      }}
    />
  );
}

export function PlayerCard(props: PlayerCardProps) {
  const { t } = useI18n();
  const sceneRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const { scale = 1, champions = [] } = props;

  // Inclinaison 3D qui suit le pointeur (souris seulement), comme en v1.
  useEffect(() => {
    const scene = sceneRef.current;
    const frame = frameRef.current;
    if (!scene || !frame || window.matchMedia('(pointer: coarse)').matches) return;

    const onMove = (event: MouseEvent) => {
      const box = scene.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width;
      const y = (event.clientY - box.top) / box.height;
      frame.style.setProperty('--ry', `${String((x - 0.5) * 16)}deg`);
      frame.style.setProperty('--rx', `${String((y - 0.5) * -16)}deg`);
      frame.style.setProperty('--mx', `${String(Math.round(x * 100))}%`);
      frame.style.setProperty('--my', `${String(Math.round(y * 100))}%`);
      frame.style.setProperty('--pointer', '1');
    };
    const onLeave = () => {
      frame.style.setProperty('--ry', '0deg');
      frame.style.setProperty('--rx', '0deg');
      frame.style.setProperty('--pointer', '0');
    };
    scene.addEventListener('mousemove', onMove);
    scene.addEventListener('mouseleave', onLeave);
    return () => {
      scene.removeEventListener('mousemove', onMove);
      scene.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  const host = scale === 1 ? undefined : { width: CARD_WIDTH * scale, height: CARD_HEIGHT * scale };
  const stage =
    scale === 1
      ? undefined
      : {
          display: 'block' as const,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          transform: `scale(${String(scale)})`,
          transformOrigin: 'top left' as const,
        };

  return (
    <div className="pch-host" style={host}>
      <div ref={sceneRef} className="pch-stage" style={stage}>
        <div ref={frameRef} className="pch-frame" data-rank={RANK[props.tier]} data-img="off">
          <div className="pch-card">
            <div className="pch-inner">
              <div className="pch-bg" />
              <div className="pch-dunes" />
              <div className="pch-stars" />
              <div className="pch-spice" />
              <div className="pch-bevel" />

              <div className="pch-dust" />
              <div className="pch-wind" />
              <div className="pch-glitter">
                {Array.from({ length: 7 }, (_, i) => (
                  <b
                    key={i}
                    style={{
                      left: `${String(12 + i * 12)}%`,
                      top: `${String(20 + (i % 4) * 16)}%`,
                      animationDelay: `${String(i * 0.4)}s`,
                    }}
                  />
                ))}
              </div>
              <div className="pch-embers">
                {Array.from({ length: 7 }, (_, i) => (
                  <b
                    key={i}
                    style={{
                      left: `${String(10 + i * 12)}%`,
                      animationDuration: `${String(8 + i)}s`,
                      animationDelay: `${String(i)}s`,
                    }}
                  />
                ))}
              </div>
              <div className="pch-sheen" />
              <div className="pch-prism" />
              <div className="pch-glare" />
              <div className="pch-ring" />
              <div className="pch-beam" />
              <div className="pch-gust" />
              <div className="pch-flare" />
              <div className="pch-ripple" />

              <div className="pch-hud">
                <span className="tl" />
                <span className="tr" />
                <span className="bl" />
                <span className="br" />
              </div>
              <div className="pch-rivets">
                <b className="p1" />
                <b className="p2" />
                <b className="p3" />
                <b className="p4" />
              </div>

              <div className="pch-content">
                <div className="pch-topbar">
                  <span className="pch-tier">{t(`tier.${props.tier}`)}</span>
                  <span className="pch-team">{props.teamTag ?? '—'}</span>
                </div>

                <div className="pch-nameplate">
                  <span className="pch-nm">{props.nickname}</span>
                </div>

                <div className="pch-mid">
                  <div className="pch-ppzone">
                    <div className="pch-ovr">{props.rating}</div>
                    <div className="pch-halo" />
                    <div className="pch-ppwrap">
                      <div className="pch-pp">
                        <div className="pch-ppframe" />
                        <div className="pch-photo" />
                        <div className="pch-init">{props.initials}</div>
                      </div>
                    </div>
                    <div className="pch-rail">
                      {champions.slice(0, 3).map((name) => (
                        <ChampionIcon key={name} name={name} />
                      ))}
                      {Array.from({ length: 3 - Math.min(champions.length, 3) }, (_, i) => (
                        <div key={`empty-${String(i)}`} className="pch-champ pch-champ-empty" />
                      ))}
                      <div className="pch-role">
                        <RoleIcon role={props.role} />
                        <span>{props.role}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pch-statpanel">
                  <div className="pch-stats">
                    <div className="pch-stat">
                      <div className="v">{props.impact}</div>
                      <div className="l">{t('card.impact')}</div>
                    </div>
                    <div className="pch-stat">
                      <div className="v">{props.consistency}</div>
                      <div className="l">{t('card.consistency')}</div>
                    </div>
                    <div className="pch-stat">
                      <div className="v">{props.clutch}</div>
                      <div className="l">{t('card.clutch')}</div>
                    </div>
                  </div>
                  <div className="pch-meta">
                    <span>{t('card.games', { n: props.games })}</span>
                    <span className="pch-brand">ARRAKIS</span>
                    <span>{t('card.editions', { n: props.editionsPlayed })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
