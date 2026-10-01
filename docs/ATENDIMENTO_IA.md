# Atendimento com IA como núcleo (menu Atendimento)

A IA **lê o material real** de cada Pessoa/Demanda, organiza, aponta lacunas e contradições e sugere próximos passos. Você revisa e decide.
Nada é enviado, finalizado ou gravado sem a sua ação.

## Fluxo
```
Pessoa chega → você conversa → importa a conversa (WhatsApp exportado, com ou sem mídias)
→ IA analisa a conversa → mostra o que falta → sugere perguntas (você revisa)
→ formulário (Google Forms) → respostas voltam pela planilha → documentos entram em Materiais
→ IA lê tudo (conversa + formulário + documentos) e aponta divergências → Preparar consulta
→ consulta: anotações + transcrição (colada) → IA lê a reunião → pendências, tarefas, contexto
→ Parecer (rascunho de IA, 12 seções, edita/revisa/finaliza) com a identidade visual → DOCX/PDF
→ Follow-up (rascunho; você envia) → tarefas e acompanhamento
```

## O que existe (tudo real, testado)
| Parte | Como funciona |
|---|---|
| **Painel comercial** | 13 estados (Novo contato … Não avançou). O CRM **sugere** o próximo estado a partir do que aconteceu; só muda quando você aplica. |
| **Núcleo de IA** | Monta o contexto da Pessoa (e da Demanda em foco): ficha (sem CPF/RG/endereço/telefone/e-mail), contexto já confirmado, materiais, respostas de formulário, consultas, anotações, tarefas e a conversa. **Isolado**: nunca entra outra pessoa; com Demanda em foco, entra a dela + o que é da pessoa “sem demanda”. |
| **Rótulos e fontes** | A IA rotula `[INFORMADO] [DOCUMENTO] [INFERÊNCIA] [HIPÓTESE] [AUSENTE] [CONFIRMAR] [PESQUISAR]` e cita a fonte (`[W12]` mensagem, `[M3]` material, `[R5]` formulário, `[C2]` consulta, `[X7]` contexto confirmado). Clicar abre o original. |
| **Mídias** | `.zip` do WhatsApp **com mídia**: cada arquivo é ligado à sua mensagem. Arquivo citado mas ausente → “não disponibilizado”. “Mídia oculta” → sinalizada. Originais podem ser guardados no Drive do cliente (≤ 8 MB). |
| **Leitura de arquivos** | `.txt/.md/.csv`, **Word (.docx)** e **PDF com texto** são lidos no próprio navegador (sem enviar a ninguém). **Imagem e PDF escaneado**: leitura pela IA de visão **só onde o ambiente aceita imagens** (marcada “lido por IA — confira”). **Áudio/vídeo**: o Artifact **não transcreve** → você cola a transcrição. Sem texto = **NÃO LIDO**, e a IA é proibida de descrever. |
| **Análises** | Analisar conversa · Gerar perguntas para o formulário · Analisar todo o material (cruza conversa × formulário × documentos) · Preparar consulta (13 seções) · Cronologia · Inconsistências · Tarefas · Follow-up. Saem como **rascunho** e você salva/revisa. |
| **Formulário inteligente** | A IA lista perguntas já respondidas, o que falta e **só** perguntas úteis. Você marca/edita; as escolhidas ficam como “perguntas planejadas” do formulário. **O Google Forms não pode ser editado pelo CRM**: você cria as perguntas lá (há botão “copiar lista”). |
| **Contexto do caso** | Memória revisada: fatos, pessoas, cronologia, patrimônio, documentos, questões, dúvidas, confirmado, pendente, contradições, decisões, próximos passos. A IA propõe; entra só o que você aceita; depois a IA usa como memória (e aponta se algo novo a contradiz). |
| **Consultas e transcrições** | Registro por Pessoa/Demanda/data/participantes; transcrição colada, de arquivo (texto/Word/PDF) ou do Drive; botões: Resumir, Extrair fatos/questões, Pendências, Documentos, Cronologia, Processar consulta (resumo, pendências, docs faltantes, próximos passos, tarefas, pesquisa, confirmação, follow-up, estrutura do parecer), Gerar parecer, Follow-up, Atualizar contexto, perguntas livres. |
| **Parecer e outros documentos** | 12 seções; também orientação pós-consulta, resumo de reunião, follow-up, solicitação de documentos, checklist e relatório interno. Modelos editáveis (seções + instruções). Rascunho → revisado → finalizado (avisa se sobrar `[PESQUISAR]/[CONFIRMAR]/[AUSENTE]`). |
| **Identidade visual** | Logo, nome, OAB, contatos, cores, cabeçalho, rodapé, assinatura (texto/imagem). Aplicada na pré-visualização e na exportação **DOCX e PDF** (geradas no navegador). |
| **Linha do tempo** | Montada das fontes reais (conversa, IA, materiais, formulários, consultas, transcrições, pareceres, tarefas). |
| **Chat da IA no caso** | Conversa persistente por Pessoa/Demanda, com o contexto real a cada pergunta e atalhos para as perguntas comuns. |
| **Persistência** | O banco do Artifact limita cada documento a 256 KiB: as coleções são gravadas em partes e textos longos em documentos próprios (testado com 2.500 mensagens e texto de 640 mil caracteres). |

## Limites e dependências externas
- **Áudio/vídeo**: sem transcrição no Artifact. Futuro: serviço de transcrição fora do Artifact que grave o texto e o CRM leia.
- **Imagem/PDF escaneado**: dependem de o ambiente aceitar imagens na IA; senão, transcrever.
- **WhatsApp**: continua por exportação/importação (sem API). Futuro: API oficial da Meta + servidor que receba o webhook (não existe no Artifact).
- **Formulário público**: Google Forms. Futuro: formulário próprio exigiria hospedagem fora do Artifact.
- **IA**: usa a sua conta Claude, com consentimento; cada análise gasta uso. O texto das mensagens/documentos vai à IA como está.
- O limite de entrada da IA é ~256 KiB por pedido: conversas muito longas usam as mensagens mais recentes + um **resumo da parte antiga** (gerado a seu pedido e identificado como resumo).
- Rascunhos de IA podem errar: confira as fontes. O CRM não faz pesquisa jurídica: o que depender disso vem marcado `[PESQUISAR]`.
