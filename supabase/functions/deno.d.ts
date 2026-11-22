// Le peu de Deno dont les fonctions se servent, pour que `tsc` les vérifie
// sous Node. Les vrais types viennent du moteur des Edge Functions.
declare namespace Deno {
  function serve(handler: (request: Request) => Response | Promise<Response>): unknown;
  namespace env {
    function toObject(): Record<string, string>;
  }
}
