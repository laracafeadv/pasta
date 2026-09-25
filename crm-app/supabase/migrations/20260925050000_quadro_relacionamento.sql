-- =============================================================================
-- CRM Lara Café — migração 6
-- Fluxo do quadro "Controle de relacionamento" (Trello): etiquetas de origem e de
-- motivo de não fechamento, pagamento da consulta e remarketing com opt-out.
-- =============================================================================

-- Quem pediu para não receber mensagens (LGPD: oposição ao legítimo interesse).
alter table public.contatos add column if not exists nao_contatar boolean not null default false;

-- Etiquetas de origem com os nomes do quadro.
update public.contatos set origem = 'Site' where origem in ('Formulário do site', 'Blog');
update public.contatos set origem = 'Indicação de parceiro/conhecido' where origem = 'Indicação de colega';
update public.contatos set origem = 'Outros' where origem = 'Outro';

-- Motivos de não fechamento com os nomes do quadro.
update public.contatos set motivo_perda = 'Achou caro' where motivo_perda = 'Honorários acima do orçamento';
update public.contatos set motivo_perda = 'Fechou com outro profissional' where motivo_perda = 'Escolheu outro escritório';
update public.contatos set motivo_perda = 'Não respondeu' where motivo_perda = 'Não respondeu mais';

insert into public.modelos_mensagem (categoria, titulo, atalho, texto, ordem) values
('7. Follow-up', 'Remarketing — conteúdo do interesse dela', '/remarketing', $t$Oi, [NOME]! Tudo bem? Lembrei de você quando vi este conteúdo sobre [TEMA DA DEMANDA]: [LINK]. Achei que poderia ser útil. Se um dia quiser retomar a conversa, estou por aqui. (Se preferir não receber mais mensagens, é só me avisar.)$t$, 40),
('7. Follow-up', 'Remarketing — retomar a conversa', '/remarketing-retomar', $t$Oi, [NOME]! Há alguns meses conversamos sobre [DEMANDA]. Como estão as coisas por aí? Se fizer sentido agora, posso te explicar como seria o caminho, sem compromisso.$t$, 50)
on conflict (atalho) do nothing;
