import { useState, type SyntheticEvent } from 'react';
import { useAdminSource } from '../../data/DataContext.tsx';
import { useI18n } from '../../shared/i18n/i18n.tsx';
import { MissingSheet, readStatsSheet } from './excel.ts';
import { useCommand } from './useCommand.ts';

/**
 * Importer le fichier Excel d'une édition sans match (cas d'usage A1, cas
 * simple ; ADR 0038) : le navigateur lit la feuille, le serveur la vérifie et
 * enregistre ses matchs en brouillon.
 */
export function ImportPanel({
  editionId,
  version,
  onImported,
}: {
  readonly editionId: string;
  readonly version: number;
  readonly onImported: () => void;
}) {
  const { t } = useI18n();
  const admin = useAdminSource();
  const [file, setFile] = useState<File | null>(null);
  const [imported, setImported] = useState<number | null>(null);
  const { busy, failure, send } = useCommand(onImported);

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    if (file === null) return;
    setImported(null);
    send(async () => {
      const rows = await readStatsSheet(await file.arrayBuffer()).catch((error: unknown) => {
        throw new Error(
          error instanceof MissingSheet
            ? t('admin.import.noSheet', { sheets: error.sheets.join(', ') })
            : t('admin.import.unreadable'),
        );
      });
      setImported(await admin.importEdition(editionId, version, rows));
    });
  };

  return (
    <form className="admin-import" onSubmit={submit}>
      <h2 className="admin-import-title">{t('admin.import.title')}</h2>
      <p>{t('admin.import.help')}</p>
      <label>
        {t('admin.import.file')}
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
          }}
        />
      </label>
      <button type="submit" className="auth-button" disabled={busy || file === null}>
        {t('admin.import.send')}
      </button>
      <div aria-live="polite">
        {imported !== null && (
          <p role="status">{t('admin.import.done', { count: String(imported) })}</p>
        )}
        {failure !== null && (
          <p role="alert" className="admin-import-failure">
            {failure}
          </p>
        )}
      </div>
    </form>
  );
}
