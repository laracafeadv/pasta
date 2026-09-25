# pasta

## CRM completo (recomendado) — `crm-app/`

Sistema com login, banco de dados (Supabase), assistente de IA no WhatsApp, honorários e relatórios. Veja `crm-app/README.md` para implantar.

## CRM simples (offline) — `crm/`

`crm/index.html` é um CRM de arquivo único para o escritório. Para usar, abra o arquivo no navegador. Não precisa de servidor nem de instalação.

- **Hoje**: ações atrasadas, ações do dia, casos sem próxima ação e a agenda dos próximos 7 dias.
- **Funil**: Novo contato → Consulta agendada → Diagnóstico → Proposta enviada → Cliente ativo → Concluído / Não contratou.
- **Contatos**: busca, filtros, exportação em CSV e backup/restauração em JSON.
- **Painel**: taxa de fechamento, honorários, origem dos contatos, áreas e motivos de perda.
- Aviso de possível conflito de interesses (parte contrária × clientes) e de contatos duplicados.

Os dados ficam no `localStorage` do navegador. Para não perder dados, faça backups periódicos.
