/** Compromissos/tarefas trazem a demanda com os números dos seus processos: expõe o primeiro como numero_processo (usado nas listas). */
export function comNumeroDoProcesso<T extends { caso?: any }>(rows: T[] | null): T[] {
  return (rows ?? []).map((r) => {
    const caso = r.caso
    if (caso && Array.isArray(caso.processos)) return { ...r, caso: { ...caso, numero_processo: caso.processos.find((p: { numero: string | null }) => p.numero)?.numero ?? null } }
    return r
  })
}
