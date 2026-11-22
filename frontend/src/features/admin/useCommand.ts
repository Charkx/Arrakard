import { useState } from 'react';

/**
 * Envoie une commande au serveur et suit son sort : en cours, puis réussie ou
 * refusée, avec l'explication du serveur. Le serveur décide (ADR 0026).
 */
export function useCommand(onChanged: () => void) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const send = (action: () => Promise<void>, onSuccess?: () => void) => {
    setBusy(true);
    setFailure(null);
    action().then(
      () => {
        setBusy(false);
        onSuccess?.();
        onChanged();
      },
      (error: unknown) => {
        setBusy(false);
        setFailure(error instanceof Error ? error.message : String(error));
      },
    );
  };

  return { busy, failure, send };
}
