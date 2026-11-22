import { useCallback, useState, type SyntheticEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAdminSource } from '../../data/DataContext.tsx';
import type { AdminSource } from '../../data/admin-source.ts';
import { useI18n } from '../../shared/i18n/i18n.tsx';
import { todayInParis } from '../../shared/today.ts';
import {
  blankEdition,
  EDITION_TYPES,
  isExternal,
  PRESTIGES,
  toSend,
  type EditionDetails,
  type EditionForm,
} from './edition-form.ts';
import { useAdminData } from './useAdminData.ts';
import { useCommand } from './useCommand.ts';

/** Créer une édition (`/admin/editions/new`) ou la modifier (cas d'usage A3, ADR 0035). */
export function EditionFormPage() {
  const { t } = useI18n();
  const { editionId = null } = useParams();
  const load = useCallback((admin: AdminSource) => admin.editionForm(editionId), [editionId]);
  const { state, reload } = useAdminData(load);

  if (state.status === 'refused') return <Navigate to="/login" replace />;
  const creating = editionId === null;

  return (
    <section className="admin-page">
      <Link className="admin-back" to="/admin">
        {t('admin.back')}
      </Link>
      <h1 className="page-title">{t(creating ? 'admin.edition.new' : 'admin.edition.edit')}</h1>
      {state.status === 'loading' && <p role="status">{t('common.loading')}</p>}
      {state.status === 'error' && <p role="alert">{t('admin.edition.error')}</p>}
      {state.status === 'ready' &&
        (!creating && state.data.edition === null ? (
          <p role="alert">{t('admin.edition.notFound')}</p>
        ) : (
          // Une nouvelle version recharge le formulaire avec ce que le serveur a gardé.
          <EditionFields
            key={state.data.edition?.version ?? 0}
            editionId={editionId}
            form={state.data}
            onSaved={reload}
          />
        ))}
    </section>
  );
}

function EditionFields({
  editionId,
  form,
  onSaved,
}: {
  readonly editionId: string | null;
  readonly form: EditionForm;
  readonly onSaved: () => void;
}) {
  const { t } = useI18n();
  const admin = useAdminSource();
  const navigate = useNavigate();
  const [details, setDetails] = useState<EditionDetails>(() => {
    if (form.edition === null) return blankEdition(todayInParis(), form);
    const { version: _read, closedAt: _closed, ...saved } = form.edition;
    return saved;
  });
  const [search, setSearch] = useState('');
  const [confirming, setConfirming] = useState<'close' | 'archive' | null>(null);
  const { busy, failure, send } = useCommand(onSaved);
  const set = (change: Partial<EditionDetails>) => {
    setDetails((current) => ({ ...current, ...change }));
  };
  const text = (value: string) => (value === '' ? null : value);
  const version = form.edition?.version;
  const closedAt = form.edition?.closedAt ?? null;

  const save = (event: SyntheticEvent) => {
    event.preventDefault();
    if (editionId === null || version === undefined) {
      send(async () => {
        const created = await admin.createEdition(toSend(details));
        void navigate(`/admin/editions/${created}`, { replace: true });
      });
    } else {
      send(() => admin.updateEdition(editionId, version, toSend(details)));
    }
  };

  const external = isExternal(details.type);
  const needle = search.trim().toLowerCase();
  const shown = form.players.filter(
    (p) =>
      details.participantIds.includes(p.id) ||
      (needle !== '' && p.nickname.toLowerCase().includes(needle)),
  );

  return (
    <div className="admin-panel">
      <div className="admin-panel-body">
        <form className="admin-form admin-edition-form" onSubmit={save}>
          <label>
            {t('admin.edition.name')}
            <input
              value={details.name}
              required
              maxLength={80}
              onChange={(e) => {
                set({ name: e.target.value });
              }}
            />
          </label>
          <label>
            {t('admin.col.type')}
            <select
              value={details.type}
              onChange={(e) => {
                set({ type: e.target.value as EditionDetails['type'] });
              }}
            >
              {EDITION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`edition.type.${type}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('admin.col.date')}
            <input
              type="date"
              value={details.date}
              required
              onChange={(e) => {
                set({ date: e.target.value });
              }}
            />
          </label>
          <label>
            {t('admin.edition.season')}
            <select
              value={details.seasonId ?? ''}
              onChange={(e) => {
                set({ seasonId: text(e.target.value) });
              }}
            >
              {form.seasons.map((season) => (
                <option key={season.id} value={season.id} disabled={season.status === 'closed'}>
                  {season.name}
                </option>
              ))}
              <option value="">{t('admin.season.none')}</option>
            </select>
          </label>
          <label>
            {t('admin.edition.prestige')}
            <select
              value={details.prestige}
              onChange={(e) => {
                set({ prestige: e.target.value as EditionDetails['prestige'] });
              }}
            >
              {PRESTIGES.map((prestige) => (
                <option key={prestige} value={prestige}>
                  {t(`admin.prestige.${prestige}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('admin.edition.location')}
            <input
              value={details.location ?? ''}
              maxLength={120}
              onChange={(e) => {
                set({ location: text(e.target.value) });
              }}
            />
          </label>
          <label>
            {t('admin.edition.url')}
            <input
              type="url"
              value={details.url ?? ''}
              onChange={(e) => {
                set({ url: text(e.target.value.trim()) });
              }}
            />
          </label>
          <label className="admin-wide">
            {t('admin.edition.description')}
            <textarea
              value={details.description ?? ''}
              maxLength={2000}
              rows={3}
              onChange={(e) => {
                set({ description: text(e.target.value) });
              }}
            />
          </label>
          {external && (
            <fieldset className="admin-wide admin-participants">
              <legend>{t('admin.edition.participants')}</legend>
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={details.arrakisWon === true}
                  onChange={(e) => {
                    set({ arrakisWon: e.target.checked ? true : null });
                  }}
                />
                {t('admin.edition.won')}
              </label>
              <label>
                {t('admin.edition.search')}
                <input
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                  }}
                />
              </label>
              {shown.map((player) => (
                <label key={player.id} className="admin-check">
                  <input
                    type="checkbox"
                    checked={details.participantIds.includes(player.id)}
                    onChange={(e) => {
                      set({
                        participantIds: e.target.checked
                          ? [...details.participantIds, player.id]
                          : details.participantIds.filter((id) => id !== player.id),
                      });
                    }}
                  />
                  {player.nickname}
                </label>
              ))}
            </fieldset>
          )}
          <button type="submit" className="auth-button" disabled={busy}>
            {t(editionId === null ? 'admin.edition.create' : 'admin.edition.save')}
          </button>
        </form>
        {editionId !== null && version !== undefined && (
          <div className="admin-panel-body admin-edition-actions">
            {closedAt !== null && (
              <p>{t('admin.edition.closedOn', { date: closedAt.slice(0, 10) })}</p>
            )}
            {confirming === null ? (
              <div className="auth-actions">
                {closedAt === null && (
                  <button
                    type="button"
                    className="auth-button auth-button-secondary"
                    onClick={() => {
                      setConfirming('close');
                    }}
                  >
                    {t('admin.edition.close')}
                  </button>
                )}
                <button
                  type="button"
                  className="auth-button auth-button-secondary"
                  onClick={() => {
                    setConfirming('archive');
                  }}
                >
                  {t('admin.edition.archive')}
                </button>
              </div>
            ) : (
              <>
                <p>
                  {t(
                    confirming === 'close'
                      ? 'admin.edition.confirmClose'
                      : 'admin.edition.confirmArchive',
                    { edition: details.name },
                  )}
                </p>
                <div className="auth-actions">
                  <button
                    type="button"
                    className="auth-button"
                    disabled={busy}
                    onClick={() => {
                      if (confirming === 'close') {
                        send(
                          () => admin.closeEdition(editionId, version),
                          () => {
                            setConfirming(null);
                          },
                        );
                        return;
                      }
                      send(async () => {
                        await admin.archiveEdition(editionId, version);
                        void navigate('/admin', { replace: true });
                      });
                    }}
                  >
                    {t(
                      confirming === 'close'
                        ? 'admin.edition.closeYes'
                        : 'admin.edition.archiveYes',
                    )}
                  </button>
                  <button
                    type="button"
                    className="auth-button auth-button-secondary"
                    onClick={() => {
                      setConfirming(null);
                    }}
                  >
                    {t('admin.cancel')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        {failure !== null && <p role="alert">{t('admin.failed', { message: failure })}</p>}
      </div>
    </div>
  );
}
