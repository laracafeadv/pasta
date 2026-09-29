<template>
  <Modal
    :is-open="isOpen"
    :title="dados?.contato.nome || telefoneFormatado(dados?.contato.telefone) || 'Carregando…'"
    :description="dados ? `${etapa(dados.contato.etapa).nome} · desde ${dataCurta(dados.contato.created_at)}` : ''"
    content-class="!p-0"
    max-width="4xl"
    @close="emit('close')"
  >
    <div v-if="loading && !dados" class="p-10 text-center text-sm text-gray-400">Carregando…</div>

    <template v-else-if="dados">
      <div class="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-zinc-800 sticky top-0 z-10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur">
        <button
          v-for="t in abas"
          :key="t.id"
          class="px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors"
          :class="aba === t.id ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800'"
          @click="aba = t.id"
        >
          {{ t.label }}<span v-if="t.badge" class="ml-1.5 opacity-70">{{ t.badge }}</span>
        </button>
        <div class="ml-auto flex gap-2">
          <Button size="sm" variant="outline" icon="ph:pencil-simple-bold" @click="emit('editar', dados.contato)">Editar</Button>
          <Button v-if="etapa(dados.contato.etapa).aberta" size="sm" icon="ph:check-bold" @click="emit('andamento', dados.contato)">Registrar andamento</Button>
        </div>
      </div>

      <!-- Caso -->
      <div v-if="aba === 'resumo'" class="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <p class="md:col-span-2 text-xs text-gray-500 -mb-2">Visão geral: dados de contato, situação do caso, relacionamento e o que ela já contou com as próprias palavras.</p>
        <div class="card">
          <h3>Contato</h3>
          <p><b>WhatsApp:</b> <a :href="whatsappLink(dados.contato.telefone)" target="_blank" rel="noopener" class="text-primary">{{ telefoneFormatado(dados.contato.telefone) }}</a></p>
          <p><b>E-mail:</b> {{ dados.contato.email || '—' }}</p>
          <p><b>Cidade:</b> {{ dados.contato.cidade || '—' }}</p>
          <p><b>Origem:</b> {{ dados.contato.origem || '—' }}</p>
          <p><b>Aviso LGPD:</b> {{ dados.contato.consentimento_em ? dataHora(dados.contato.consentimento_em) : 'não enviado' }}</p>
        </div>
        <div class="card">
          <h3>Caso</h3>
          <p><b>Área:</b> {{ dados.contato.area || '—' }} <span v-if="dados.contato.demanda">· {{ dados.contato.demanda }}</span></p>
          <p><b>Parte contrária:</b> {{ dados.contato.parte_contraria || '—' }}</p>
          <p><b>Urgência:</b> {{ dados.contato.urgencia || '—' }} · <b>Sentimento:</b> {{ dados.contato.sentimento || '—' }}</p>
          <p v-if="etapa(dados.contato.etapa).aberta">
            <b>Próxima ação:</b>
            <span v-if="dados.contato.proxima_acao">{{ dados.contato.proxima_acao }} — {{ dataCurta(dados.contato.proxima_data) }} ({{ diaRelativo(dados.contato.proxima_data) }})</span>
            <span v-else class="text-warning-dark font-semibold">não definida</span>
          </p>
          <p v-if="dados.contato.motivo_perda"><b>Motivo da perda:</b> {{ dados.contato.motivo_perda }}</p>
          <p><b>Na etapa há:</b> {{ diasNaEtapa }} dia(s)</p>
          <p v-if="dados.contato.consulta_em"><b>Consulta:</b> {{ dataHora(dados.contato.consulta_em) }}</p>
          <div class="flex flex-wrap items-center gap-2 mt-1">
            <button type="button" class="text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border border-primary/40 text-primary dark:text-zinc-200 hover:bg-primary hover:text-white"
                    :title="dados.contato.pre_form_respondido_em ? 'Já respondido — gerar de novo cria um link novo' : 'Um clique: gera o link e já copia pra você colar no WhatsApp'"
                    @click="enviarPreFormularioRapido">
              {{ dados.contato.pre_form_respondido_em ? 'Formulário pré-consulta respondido ✓' : 'Gerar e copiar link do formulário' }}
            </button>
            <button type="button" class="text-[11px] text-gray-400 hover:text-primary underline underline-offset-2" @click="abrirEditorPreFormulario">
              Escolher formulário
            </button>
            <a href="/pc/preview" target="_blank" rel="noopener" class="text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border border-gray-300 dark:border-zinc-700 text-gray-500 hover:border-primary hover:text-primary">
              Visualizar formulário
            </a>
          </div>
          <p v-if="avisoFormulario" class="text-xs mt-1" :class="avisoFormulario.erro ? 'text-danger' : 'text-success-dark'">{{ avisoFormulario.texto }}</p>
        </div>
        <div class="card">
          <h3>Relacionamento</h3>
          <p><b>Aniversário:</b> {{ dados.contato.data_nascimento ? dataCurta(dados.contato.data_nascimento) : '—' }}</p>
          <p>
            <b>Classificação:</b>
            <template v-if="dados.contato.classificacao">{{ CLASSIFICACOES[dados.contato.classificacao].nome }} <span class="text-xs text-gray-500">— {{ CLASSIFICACOES[dados.contato.classificacao].dica }}</span></template>
            <template v-else>—</template>
          </p>
          <div>
            <p><b>NPS:</b> {{ dados.contato.nps ?? '—' }} <span class="text-xs text-gray-500">— registrar a nota que a cliente deu:</span></p>
            <div class="flex flex-wrap gap-1 mt-1">
              <button v-for="n in 11" :key="n" type="button" class="w-7 h-7 rounded-full text-xs font-semibold border"
                      :class="dados.contato.nps === n - 1 ? 'bg-primary text-white border-primary' : n - 1 >= 9 ? 'border-success/50 text-success-dark' : n - 1 >= 7 ? 'border-warning/50 text-warning-dark' : 'border-danger/40 text-danger-dark'"
                      @click="registrarNps(n - 1)">{{ n - 1 }}</button>
            </div>
          </div>
          <p v-if="dados.contato.obs_relacionamento"><b>Observação:</b> {{ dados.contato.obs_relacionamento }}</p>
          <p v-if="dados.contato.ultimo_contato_em"><b>Último gesto:</b> {{ dataCurta(dados.contato.ultimo_contato_em) }}</p>
        </div>
        <div v-if="dados.contato.dor || dados.contato.objetivo || dados.contato.pre_form_respostas_extra?.length" class="card">
          <h3>Com as palavras dela</h3>
          <p v-if="dados.contato.dor"><b>O que preocupa:</b> “{{ dados.contato.dor }}”</p>
          <p v-if="dados.contato.objetivo"><b>O que quer que mude:</b> “{{ dados.contato.objetivo }}”</p>
          <template v-for="(r, i) in dados.contato.pre_form_respostas_extra ?? []" :key="i">
            <p v-if="r"><b>{{ dados.contato.pre_form_perguntas_extra?.[i] || 'Pergunta extra' }}:</b> “{{ r }}”</p>
          </template>
        </div>
        <div class="card md:col-span-2">
          <h3>Resumo do caso</h3>
          <p class="whitespace-pre-wrap">{{ dados.contato.resumo || 'Sem resumo ainda. Edite a ficha para escrever.' }}</p>
          <div v-if="dados.contato.interesses?.length" class="mt-3">
            <b class="text-xs uppercase tracking-wider text-gray-400">Pontos de atenção</b>
            <div class="flex flex-wrap gap-1.5 mt-1"><span v-for="t in dados.contato.interesses" :key="t" class="tag">{{ t }}</span></div>
          </div>
          <div v-if="dados.contato.objecoes?.length" class="mt-3">
            <b class="text-xs uppercase tracking-wider text-gray-400">Dúvidas / objeções</b>
            <div class="flex flex-wrap gap-1.5 mt-1"><span v-for="t in dados.contato.objecoes" :key="t" class="tag">{{ t }}</span></div>
          </div>
        </div>
      </div>

      <!-- Conversa -->
      <div v-else-if="aba === 'conversa'" class="flex flex-col">
        <p class="px-5 pt-3 text-xs text-gray-500">O histórico de WhatsApp com ela. Mensagens marcadas "Você" foram enviadas daqui.</p>
        <div ref="scrollBox" class="flex flex-col gap-3 p-5 max-h-[50vh] overflow-y-auto">
          <p v-if="!dados.mensagens.length" class="text-center text-sm text-gray-400 py-10">Nenhuma mensagem de WhatsApp.</p>
          <div
            v-for="m in dados.mensagens"
            :key="m.id"
            class="max-w-[80%] rounded-lg px-4 py-2 text-sm"
            :class="m.direcao === 'saida' ? 'self-end bg-primary text-white' : 'self-start bg-gray-100 dark:bg-zinc-800'"
          >
            <template v-if="m.midia_path">
              <audio v-if="m.midia_tipo?.startsWith('audio/')" controls preload="none" class="max-w-full my-1" :src="`/api/crm/mensagens/${m.id}/midia`" />
              <a v-else-if="m.midia_tipo?.startsWith('image/')" :href="`/api/crm/mensagens/${m.id}/midia`" target="_blank" rel="noopener">
                <img :src="`/api/crm/mensagens/${m.id}/midia`" alt="Imagem enviada" class="max-h-56 rounded-md my-1" loading="lazy" />
              </a>
              <a v-else :href="`/api/crm/mensagens/${m.id}/midia?baixar=1`" class="inline-flex items-center gap-1.5 underline underline-offset-2 my-1">
                <Icon name="ph:file-arrow-down-bold" /> {{ m.midia_nome || 'Baixar arquivo' }}
              </a>
            </template>
            <p v-if="m.midia_path && m.direcao === 'entrada' && !m.midia_tipo?.startsWith('audio/') && driveOk" class="text-[11px] my-1">
              <a v-if="m.drive_url" :href="m.drive_url" target="_blank" rel="noopener" class="underline underline-offset-2"><Icon name="ph:google-drive-logo-bold" class="align-middle" /> No Drive</a>
              <button v-else type="button" class="underline underline-offset-2" @click="enviarAoDrive(m)"><Icon name="ph:google-drive-logo-bold" class="align-middle" /> Enviar ao Drive</button>
            </p>
            <p v-if="m.transcricao" class="text-xs opacity-80 italic whitespace-pre-wrap break-words">Transcrição: {{ m.transcricao }}</p>
            <p v-else class="whitespace-pre-wrap break-words">{{ m.conteudo }}</p>
            <p class="mt-1 text-[10px] opacity-70 text-right">{{ m.autor === 'ia' ? 'IA · ' : m.autor === 'equipe' ? 'Você · ' : '' }}{{ dataHora(m.created_at) }}</p>
          </div>
        </div>
        <div v-if="dados.contato.sugestao_resposta" id="sugestao-claude" class="mx-4 mb-2 rounded-2xl border border-secondary/40 bg-secondary/10 p-3 text-sm">
          <p class="text-[10px] font-bold uppercase tracking-widest text-secondary-dark mb-1">
            <Icon name="ph:sparkle-bold" class="align-middle" /> Sugestão de resposta<template v-if="dados.contato.sugestao_em"> · {{ dataHora(dados.contato.sugestao_em) }}</template>
          </p>
          <p class="whitespace-pre-wrap break-words">{{ dados.contato.sugestao_resposta }}</p>
          <div class="flex gap-2 mt-2">
            <button type="button" class="px-3 py-1 rounded-full bg-primary text-white text-[11px] font-semibold uppercase tracking-wider" @click="resposta = dados.contato.sugestao_resposta || ''">Usar (revisar antes)</button>
            <button type="button" class="px-3 py-1 rounded-full border border-gray-300 dark:border-zinc-700 text-[11px] font-semibold uppercase tracking-wider" @click="descartarSugestao">Descartar</button>
          </div>
        </div>
        <div class="relative border-t border-gray-100 dark:border-zinc-800">
          <ModeloPicker
            v-if="pickerAberto"
            class="absolute bottom-full left-4 right-4 mb-2 z-20"
            :filtro="resposta.startsWith('/') ? resposta : undefined"
            :nome-contato="dados.contato.nome"
            :sugerido="modeloSugerido"
            :extras="extrasContato"
            @usar="(t, m) => { pickerAberto = false; if (m?.atalho === '/formulario') enviarFormulario(); else resposta = t }"
            @fechar="pickerAberto = false"
          />
          <div class="flex items-center gap-3 px-4 pt-3 text-xs">
            <button type="button" class="font-semibold uppercase tracking-wider text-secondary-dark hover:underline" @click="pickerAberto = !pickerAberto">
              <Icon name="ph:lightning-bold" class="align-middle" /> Mensagens prontas
            </button>
            <span class="text-gray-400">ou digite <b>/</b> para buscar</span>
            <button v-if="resposta.trim()" type="button" class="ml-auto text-gray-500 hover:underline" @click="copiar">{{ copiado ? 'Copiado!' : 'Copiar texto' }}</button>
          </div>
          <form class="flex items-end gap-2 p-4 pt-2" @submit.prevent="enviar">
            <textarea v-model="resposta" :rows="Math.min(10, Math.max(3, resposta.split('\n').length + 1))" class="modal-input flex-1" placeholder="Responder pelo WhatsApp do escritório…" @keydown.enter.exact.prevent="enviar" @input="aoDigitar" />
            <Button type="submit" :loading="enviando" icon="ph:paper-plane-right-bold" :disabled="!resposta.trim() || resposta.startsWith('/')">Enviar</Button>
          </form>
        </div>
        <p v-if="erroEnvio" class="px-5 pb-3 text-sm text-danger">{{ erroEnvio }}</p>
        <p class="px-5 pb-4 text-xs text-gray-400">O WhatsApp só permite mensagens livres até 24h após a última mensagem do cliente.</p>
      </div>

      <!-- Atividades -->
      <div v-else-if="aba === 'atividades'" class="p-5">
        <p class="text-xs text-gray-500 mb-3">Linha do tempo de tudo que foi feito ou decidido neste caso — registre ligações, decisões e combinados aqui pra não perder o fio depois.</p>
        <form class="flex flex-col sm:flex-row gap-2 mb-5" @submit.prevent="anotar">
          <select v-model="nota.tipo" class="modal-input sm:w-40">
            <option v-for="t in TIPOS_ATIVIDADE" :key="t">{{ t }}</option>
          </select>
          <input v-model="nota.texto" class="modal-input flex-1" placeholder="O que foi conversado ou decidido?" />
          <input v-model="nota.minutos" type="number" min="0" max="1440" class="modal-input sm:w-28" placeholder="min" title="Tempo gasto (minutos) — alimenta a rentabilidade" />
          <Button type="submit" :loading="anotando" :disabled="!nota.texto.trim()">Registrar</Button>
        </form>
        <p v-if="!dados.atividades.length" class="text-sm text-gray-400">Sem registros ainda.</p>
        <ol class="border-l-2 border-gray-100 dark:border-zinc-800 ml-1">
          <li v-for="a in dados.atividades" :key="a.id" class="pl-4 pb-4 relative text-sm">
            <span class="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full" :class="a.tipo === 'Sistema' ? 'bg-gray-300' : 'bg-primary'" />
            <p class="text-xs text-gray-400">{{ dataHora(a.created_at) }} · {{ a.tipo }}<span v-if="a.autor?.name"> · {{ a.autor.name }}</span><span v-if="a.minutos"> · {{ a.minutos }} min</span></p>
            <p class="whitespace-pre-wrap" :class="a.tipo === 'Sistema' ? 'text-gray-500' : ''">{{ a.texto }}</p>
          </li>
        </ol>
      </div>

      <!-- Diagnóstico -->
      <DiagnosticoPanel v-else-if="aba === 'diagnostico'" :key="`d${dados.contato.id}`" :contato-id="dados.contato.id" :nome="dados.contato.nome" :area="dados.contato.area" :demanda="dados.contato.demanda" @mensagem="usarMensagem" />

      <!-- Caso: processos e prazos, documentos, qualificação -->
      <div v-else-if="aba === 'processo'">
      <div class="flex flex-wrap gap-1 px-5 pt-4">
        <button v-for="x in subAbas" :key="x.id" class="px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider border"
                :class="sub === x.id ? 'border-primary text-primary dark:text-zinc-100 bg-primary/5' : 'border-transparent text-gray-500 hover:border-gray-200'" @click="sub = x.id">
          {{ x.label }}<span v-if="x.badge" class="ml-1 opacity-70">{{ x.badge }}</span>
        </button>
      </div>
      <QualificacaoForm v-if="sub === 'qualificacao'" :key="dados.contato.id" :contato-id="dados.contato.id" :nome-sugerido="dados.contato.nome" />

      <div v-else-if="sub === 'casos'" class="p-5 space-y-5">
        <p class="text-xs text-gray-500 -mt-1">O processo em si: número CNJ, fase, valor da causa, a pasta de documentos no Drive e os prazos vinculados.</p>
        <div v-if="dados.contato.etapa === 'ativo' && !dados.casos.length" class="rounded-2xl bg-secondary/10 border border-secondary/30 p-4 text-sm">
          Cliente ativo sem caso aberto. Abra o caso para registrar o processo, os prazos e gerar a procuração.
        </div>
        <div class="flex flex-wrap gap-2">
          <Button size="sm" icon="ph:folder-plus-bold" @click="editarCaso(null)">Abrir caso</Button>
          <NuxtLink :to="`/crm?aba=hoje&ver=calendario&contato=${dados.contato.id}`" class="text-[11px] font-semibold uppercase tracking-wider px-4 py-1.5 rounded-full border border-primary/40 text-primary dark:text-zinc-200 hover:bg-primary hover:text-white">+ Prazo ou compromisso</NuxtLink>
          <a v-if="dados.contato.drive_pasta_url" :href="dados.contato.drive_pasta_url" target="_blank" rel="noopener" class="text-[11px] font-semibold uppercase tracking-wider px-4 py-1.5 rounded-full border border-primary/40 text-primary dark:text-zinc-200 hover:bg-primary hover:text-white"><Icon name="ph:google-drive-logo-bold" class="align-middle" /> Pasta no Drive</a>
          <button v-else-if="driveOk" type="button" class="text-[11px] font-semibold uppercase tracking-wider px-4 py-1.5 rounded-full border border-primary/40 text-primary dark:text-zinc-200 hover:bg-primary hover:text-white" :disabled="criandoPasta" @click="criarPastaDrive">
            <Icon name="ph:google-drive-logo-bold" class="align-middle" /> {{ criandoPasta ? 'Criando…' : 'Criar pasta no Drive' }}
          </button>
          <button v-if="ehAdmin" type="button" class="text-[11px] font-semibold uppercase tracking-wider px-4 py-1.5 rounded-full border border-primary/40 text-primary dark:text-zinc-200 hover:bg-primary hover:text-white" @click="peca(`/api/pecas/procuracao?contato=${dados.contato.id}`)">Procuração (.docx)</button>
          <button type="button" class="text-[11px] font-semibold uppercase tracking-wider px-4 py-1.5 rounded-full border border-primary/40 text-primary dark:text-zinc-200 hover:bg-primary hover:text-white" @click="peca(`/api/pecas/relatorio-semanal?contato=${dados.contato.id}`)">Relatório semanal (.docx)</button>
          <button type="button" class="text-[11px] font-semibold uppercase tracking-wider px-4 py-1.5 rounded-full bg-primary text-white" :title="dados.contato.form_respondido_em ? 'Já respondido — gerar de novo cria um link novo' : 'Dados formais pra procuração e contrato (nome, CPF, endereço) — depois de fechar, não é o formulário pré-consulta'" @click="enviarFormulario">
            {{ dados.contato.form_respondido_em ? 'Dados do contrato ✓' : 'Gerar e copiar link dos dados do contrato' }}
          </button>
        </div>
        <label v-if="ehAdmin && driveOk" class="flex items-center gap-2 text-xs text-gray-600 dark:text-zinc-400 cursor-pointer">
          <input v-model="salvarNoDrive" type="checkbox" class="accent-[#3c2923]" /> Salvar as peças direto na pasta do cliente no Drive (em vez de baixar)
        </label>
        <p v-if="avisoDrive" class="text-xs" :class="avisoDrive.erro ? 'text-danger' : 'text-success-dark'">
          {{ avisoDrive.texto }} <a v-if="avisoDrive.url" :href="avisoDrive.url" target="_blank" rel="noopener" class="underline">abrir</a>
        </p>
        <p v-if="avisoFormulario" class="text-xs" :class="avisoFormulario.erro ? 'text-danger' : 'text-success-dark'">{{ avisoFormulario.texto }}</p>
        <p v-if="!dados.casos.length" class="text-sm text-gray-400">Nenhum caso aberto.</p>
        <article v-for="k in dados.casos" :key="k.id" class="card">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <p class="font-semibold">{{ k.titulo }}</p>
            <span class="tag">{{ STATUS_CASO[k.status] }}</span>
          </div>
          <p class="text-xs text-gray-500">{{ TIPOS_CASO[k.tipo] }}<span v-if="k.numero_processo"> · <span class="font-mono">{{ k.numero_processo }}</span></span><span v-if="k.orgao"> · {{ k.orgao }}</span><span v-if="k.comarca"> · {{ k.comarca }}/{{ k.uf }}</span></p>
          <p v-if="k.fase_processual || k.valor_causa" class="text-xs text-gray-500">
            <span v-if="k.fase_processual">Fase: {{ k.fase_processual }}</span>
            <span v-if="k.fase_processual && k.valor_causa"> · </span>
            <span v-if="k.valor_causa">Valor da causa: {{ brl(k.valor_causa) }}</span>
          </p>
          <p v-if="k.parte_contraria" class="text-xs">Parte contrária: {{ k.parte_contraria }}</p>
          <div class="flex gap-3 pt-1 text-xs">
            <button class="underline underline-offset-2" @click="editarCaso(k)">Editar</button>
            <NuxtLink :to="`/crm?aba=hoje&ver=calendario&contato=${dados.contato.id}&caso=${k.id}`" class="underline underline-offset-2">Novo prazo</NuxtLink>
            <button v-if="ehAdmin" type="button" class="underline underline-offset-2" @click="peca(`/api/pecas/procuracao?contato=${dados.contato.id}&caso=${k.id}`)">Procuração deste caso</button>
            <a v-if="k.link_tribunal" :href="k.link_tribunal" target="_blank" rel="noopener" class="underline underline-offset-2">Ver no tribunal</a>
          </div>
        </article>
        <div v-if="dados.compromissos.length">
          <h3 class="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Próximos prazos e compromissos</h3>
          <ul class="divide-y divide-gray-100 dark:divide-zinc-800 text-sm">
            <li v-for="c in dados.compromissos" :key="c.id" class="py-2 flex gap-3 items-center">
              <Icon :name="TIPOS_COMPROMISSO[c.tipo].icone" class="text-secondary" />
              <span class="font-medium w-24 shrink-0">{{ dataCurta(dataCompromisso(c)) }}</span>
              <span class="flex-1">{{ c.titulo }}</span>
              <span class="text-xs text-gray-500">{{ diaRelativo(dataCompromisso(c)) }}</span>
            </li>
          </ul>
        </div>
        <CasoFormModal :is-open="casoAberto" :contato="dados.contato" :caso="casoEditando" @close="casoAberto = false" @salvo="casoAberto = false; carregar()" />
      </div>

      <!-- Documentos -->
      <div v-else-if="sub === 'documentos'" class="p-5 space-y-4">
        <p class="text-xs text-gray-500 -mt-1">Checklist do que falta pedir pra cliente, já pronto por área de atuação — cobre quem ainda não mandou.</p>
        <div class="flex flex-wrap gap-2 items-center">
          <Button size="sm" variant="outline" icon="ph:list-checks-bold" :loading="gerandoDocs" @click="gerarChecklist">
            {{ dados.documentos.length ? 'Completar com a lista da área' : 'Gerar checklist da área' }}
          </Button>
          <Button v-if="pendentes.length" size="sm" icon="ph:whatsapp-logo-bold" @click="cobrarPendentes">Cobrar pendentes pelo WhatsApp</Button>
          <span class="ml-auto text-xs text-gray-500">{{ recebidos.length }} recebido(s) · {{ pendentes.length }} pendente(s)</span>
        </div>
        <p v-if="!dados.documentos.length" class="text-sm text-gray-400">Nenhum documento listado. Gere a lista padrão de {{ dados.contato.area || 'documentos' }}.</p>
        <ul class="divide-y divide-gray-100 dark:divide-zinc-800">
          <li v-for="d in dados.documentos" :key="d.id" class="flex items-center gap-3 py-2 text-sm">
            <Icon :name="d.status === 'recebido' ? 'ph:check-circle-fill' : d.status === 'dispensado' ? 'ph:minus-circle' : 'ph:circle'"
                  :class="d.status === 'recebido' ? 'text-success' : 'text-gray-400'" class="text-lg shrink-0" />
            <span class="flex-1" :class="d.status === 'dispensado' ? 'line-through text-gray-400' : ''">
              {{ d.descricao }} <span v-if="!d.obrigatorio" class="text-xs text-gray-400">(se houver)</span>
            </span>
            <select :value="d.status" class="text-xs rounded-full border border-gray-200 dark:border-zinc-700 bg-transparent px-2 py-1" @change="mudarDoc(d.id, ($event.target as HTMLSelectElement).value)">
              <option value="pendente">Pendente</option>
              <option value="recebido">Recebido</option>
              <option value="dispensado">Dispensado</option>
            </select>
            <button type="button" class="text-gray-400 hover:text-danger" title="Remover" @click="removerDoc(d.id)"><Icon name="ph:x-bold" /></button>
          </li>
        </ul>
        <form class="flex gap-2" @submit.prevent="adicionarDoc">
          <input v-model="novoDoc" class="modal-input flex-1" placeholder="Acrescentar documento…" />
          <Button type="submit" size="sm" :disabled="!novoDoc.trim()">Adicionar</Button>
        </form>
      </div>
      </div>

      <!-- Honorários -->
      <div v-else-if="aba === 'honorarios'" class="p-5 space-y-3">
        <p class="text-xs text-gray-500">Propostas e contratos de honorário fechados com esta cliente, e as parcelas em aberto — pra cobrança geral, use a tela Financeiro.</p>
        <div class="flex justify-end">
          <NuxtLink :to="`/honorarios?contato=${dados.contato.id}`" class="text-sm font-semibold text-primary">+ Registrar honorário</NuxtLink>
        </div>
        <div v-if="ehAdmin && parcelas.length" class="card">
          <h3>Parcelas em aberto</h3>
          <ul class="divide-y divide-gray-100 dark:divide-zinc-800 text-sm">
            <li v-for="l in parcelas" :key="l.id" class="py-2 flex flex-wrap items-center gap-2">
              <span class="w-24 font-medium tabular-nums" :class="l.vencimento < hojeIso ? 'text-danger' : ''">{{ dataCurta(l.vencimento) }}</span>
              <span class="flex-1">{{ l.descricao }} · <b>{{ brl(l.valor) }}</b></span>
              <button v-if="l.vencimento < hojeIso" type="button" class="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary text-white" @click="mensagemParcela(l, '/cobranca')">Cobrar</button>
              <button type="button" class="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border border-gray-300 dark:border-zinc-700 hover:border-primary" @click="mensagemParcela(l, '/boleto')">Enviar boleto</button>
            </li>
          </ul>
        </div>
        <p v-if="!dados.honorarios.length" class="text-sm text-gray-400">Nenhum honorário registrado para este contato.</p>
        <div v-for="h in dados.honorarios" :key="h.id" class="card flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="font-semibold">{{ brl(h.valor) }} <span class="text-xs text-gray-400">· {{ h.tipo }}<span v-if="h.parcelas > 1"> · {{ h.parcelas }}x</span></span></p>
            <p class="text-xs text-gray-500">{{ h.descricao || '—' }}</p>
          </div>
          <div class="flex items-center gap-2">
            <button v-if="ehAdmin" type="button" class="text-xs underline underline-offset-2" title="Gerar contrato em Word" @click="peca(`/api/pecas/contrato?honorario=${h.id}`)">Contrato (.docx)</button>
            <span class="tag">{{ h.status }}</span>
          </div>
        </div>
      </div>
    </template>
  </Modal>

  <PreFormularioEditor
    :is-open="editorPreFormAberto"
    @close="editorPreFormAberto = false"
    @gerar="gerarPreFormulario"
  />
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import Modal from '../Modal.vue'
import Button from '../Button.vue'
import PreFormularioEditor from './PreFormularioEditor.vue'
import { CADENCIA, CLASSIFICACOES, STATUS_CASO, TIPOS_ATIVIDADE, TIPOS_CASO, TIPOS_COMPROMISSO, dataCompromisso, etapa, type Atividade, type Caso, type Compromisso, type Contato, type Documento, type Honorario, type Lancamento, type MensagemWhatsapp } from '../../../shared/types/crm'
import QualificacaoForm from './QualificacaoForm.vue'
import CasoFormModal from './CasoFormModal.vue'
import DiagnosticoPanel from './DiagnosticoPanel.vue'
import { useProfileStore } from '../../stores/profile'
import ModeloPicker from './ModeloPicker.vue'
import { useModelos } from '../../composables/useModelos'
import { brl, dataCurta, dataHora, diaRelativo, telefoneFormatado, whatsappLink } from '../../utils/formatadores'
import { useCrmStore } from '../../stores/crm'

interface Detalhe { contato: Contato; honorarios: Honorario[]; mensagens: MensagemWhatsapp[]; atividades: Atividade[]; documentos: Documento[]; casos: Caso[]; compromissos: Compromisso[] }

const props = defineProps<{ isOpen: boolean; contatoId: number | null; abaInicial?: string; modeloInicial?: string | null }>()
const emit = defineEmits<{ close: []; editar: [c: Contato]; andamento: [c: Contato] }>()

const crm = useCrmStore()
const dados = ref<Detalhe | null>(null)
const loading = ref(false)
const aba = ref('resumo')
const scrollBox = ref<HTMLElement | null>(null)

// Seis abas na ordem do atendimento: quem é → conversa → diagnóstico → caso → financeiro → histórico.
const abas = computed(() => [
  { id: 'resumo', label: 'Resumo' },
  { id: 'conversa', label: 'Conversa', badge: dados.value?.mensagens.length || undefined },
  { id: 'diagnostico', label: 'Diagnóstico' },
  { id: 'processo', label: 'Caso', badge: pendentes.value.length ? `${pendentes.value.length} doc.` : dados.value?.casos.length || undefined },
  { id: 'honorarios', label: 'Financeiro', badge: dados.value?.honorarios.length || undefined },
  { id: 'atividades', label: 'Histórico', badge: dados.value?.atividades.length || undefined },
])
const subAbas = computed(() => [
  { id: 'casos', label: 'Processos e prazos', badge: dados.value?.casos.length || undefined },
  { id: 'documentos', label: 'Documentos', badge: pendentes.value.length ? `${pendentes.value.length} pend.` : undefined },
  { id: 'qualificacao', label: 'Qualificação' },
])
const sub = ref('casos')
// Nomes antigos de abas (links e atalhos) continuam funcionando.
function irPara(destino: string) {
  if (['casos', 'documentos', 'qualificacao'].includes(destino)) { sub.value = destino; aba.value = 'processo' }
  else aba.value = destino === 'caso' ? 'resumo' : destino
}

async function carregar() {
  if (!props.contatoId) return
  loading.value = true
  try {
    dados.value = await $fetch<Detalhe>(`/api/crm/contatos/${props.contatoId}`)
  } finally {
    loading.value = false
  }
}

watch(() => props.isOpen, (open) => {
  if (open) {
    sub.value = 'casos'
    irPara(props.abaInicial || 'resumo')
    dados.value = null
    resposta.value = ''
    carregar().then(async () => {
      // Aberto a partir da carteira com uma mensagem sugerida (ex.: /reconexao).
      if (props.modeloInicial && dados.value) {
        await carregarModelos()
        const m = modelos.value.find(x => x.atalho === props.modeloInicial)
        if (m?.atalho === '/formulario') await enviarFormulario()
        else if (m) resposta.value = preencher(m.texto, dados.value.contato.nome, extrasContato.value)
        aba.value = 'conversa'
      }
    })
  }
})

watch(aba, async (v) => {
  if (v === 'conversa') {
    await nextTick()
    scrollBox.value?.scrollTo({ top: scrollBox.value.scrollHeight })
  }
})

defineExpose({ recarregar: carregar })

// ─── Conversa ─────────────────────────────────────────────────────────────
const resposta = ref('')
const enviando = ref(false)
const erroEnvio = ref<string | null>(null)

async function enviar() {
  if (!resposta.value.trim() || !dados.value) return
  enviando.value = true
  erroEnvio.value = null
  try {
    await $fetch(`/api/crm/contatos/${dados.value.contato.id}/whatsapp`, { method: 'POST', body: { texto: resposta.value } })
    resposta.value = ''
    await carregar()
    aba.value = 'conversa'
    await nextTick()
    scrollBox.value?.scrollTo({ top: scrollBox.value.scrollHeight })
  } catch (e: any) {
    erroEnvio.value = e?.data?.message || 'Não foi possível enviar a mensagem.'
  } finally {
    enviando.value = false
  }
}

const diasNaEtapa = computed(() => dados.value ? Math.max(0, Math.floor((Date.now() - new Date(dados.value.contato.etapa_desde).getTime()) / 864e5)) : 0)

// ─── Mensagens prontas ────────────────────────────────────────────────────
const pickerAberto = ref(false)
const copiado = ref(false)
const { modelos, carregar: carregarModelos, preencher } = useModelos()
// Sugestão: atalho citado na próxima ação (ex.: "... — /opcoes") ou o da cadência da etapa.
const modeloSugerido = computed(() => {
  const c = dados.value?.contato
  if (!c) return null
  return c.proxima_acao?.match(/\/[a-z0-9-]+/)?.[0] ?? CADENCIA[c.etapa]?.modelo ?? null
})
// Dados desta cliente que as mensagens podem usar ([DATA DA PROPOSTA], [DEMANDA]).
const extrasContato = computed<Record<string, string | null>>(() => {
  const d = dados.value
  const prop = d?.honorarios.filter(h => h.tipo !== 'Consulta').sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  return {
    'DATA DA PROPOSTA': prop ? new Date(prop.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : null,
    'DEMANDA': d?.contato.demanda?.toLowerCase() ?? null,
  }
})
function aoDigitar() {
  pickerAberto.value = resposta.value.startsWith('/') && !resposta.value.includes(' ')
}
async function copiar() {
  await navigator.clipboard?.writeText(resposta.value)
  copiado.value = true
  setTimeout(() => { copiado.value = false }, 1500)
}

const ehAdmin = computed(() => useProfileStore().profile?.role === 'admin')

// ─── Casos ────────────────────────────────────────────────────────────────
const casoAberto = ref(false)
const casoEditando = ref<Caso | null>(null)
function editarCaso(k: Caso | null) {
  casoEditando.value = k
  casoAberto.value = true
}

// ─── Documentos ───────────────────────────────────────────────────────────
const pendentes = computed(() => (dados.value?.documentos ?? []).filter(d => d.status === 'pendente'))
const recebidos = computed(() => (dados.value?.documentos ?? []).filter(d => d.status === 'recebido'))
const gerandoDocs = ref(false)
const novoDoc = ref('')
async function gerarChecklist() {
  if (!dados.value) return
  gerandoDocs.value = true
  try {
    await $fetch(`/api/crm/contatos/${dados.value.contato.id}/documentos`, { method: 'POST', body: { gerar: true } })
    await carregar()
  } finally {
    gerandoDocs.value = false
  }
}
async function adicionarDoc() {
  if (!dados.value || !novoDoc.value.trim()) return
  await $fetch(`/api/crm/contatos/${dados.value.contato.id}/documentos`, { method: 'POST', body: { descricao: novoDoc.value } })
  novoDoc.value = ''
  await carregar()
}
async function mudarDoc(id: number, status: string) {
  await $fetch(`/api/documentos/${id}`, { method: 'PATCH', body: { status } })
  await carregar()
}
async function removerDoc(id: number) {
  await $fetch(`/api/documentos/${id}`, { method: 'DELETE' })
  await carregar()
}
// Monta a mensagem de cobrança (modelo /pendencia) com as listas reais.
async function cobrarPendentes() {
  if (!dados.value) return
  await carregarModelos()
  const base = modelos.value.find(m => m.atalho === '/pendencia')?.texto
    ?? 'Oi, [NOME]! Já recebi:\n[RECEBIDOS]\nPassando pra lembrar do envio de:\n[PENDENTES]\nQual prazo fica confortável pra você me enviar?'
  const lista = (ds: Documento[]) => ds.length ? ds.map(d => `📌 ${d.descricao}`).join('\n') : '—'
  resposta.value = preencher(base, dados.value.contato.nome)
    .replace('[RECEBIDOS]', lista(recebidos.value))
    .replace('[PENDENTES]', lista(pendentes.value))
  aba.value = 'conversa'
}

// ─── Parcelas (administração): cobrança e boleto já preenchidos ────────────
const parcelas = ref<Lancamento[]>([])
const hojeIso = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
watch(() => [aba.value, dados.value?.contato.id] as const, async ([a, id]) => {
  if (a !== 'honorarios' || !id || !ehAdmin.value) return
  const ls = await $fetch<Lancamento[]>('/api/financeiro/lancamentos', { params: { contato: id, tipo: 'receber' } }).catch(() => [])
  parcelas.value = ls.filter(l => !l.pago_em)
})
async function mensagemParcela(l: Lancamento, atalho: string) {
  if (!dados.value) return
  await carregarModelos()
  const base = modelos.value.find(m => m.atalho === atalho)?.texto
  if (!base) return
  resposta.value = preencher(base, dados.value.contato.nome, {
    'PARCELA': l.descricao.match(/\((\d+\/\d+)\)/)?.[1] ?? null,
    'VALOR DA PARCELA': brl(l.valor),
    'VENCIMENTO': l.vencimento.split('-').reverse().slice(0, 2).join('/'),
  })
  aba.value = 'conversa'
}

// NPS: registra a nota (a classificação da carteira muda sozinha) e já abre a resposta certa.
async function registrarNps(nota: number) {
  if (!dados.value) return
  await crm.salvar(dados.value.contato.id, { nps: nota })
  await carregar()
  await carregarModelos()
  const atalho = nota >= 9 ? '/nps-promotora' : nota >= 7 ? '/nps-neutra' : '/nps-detratora'
  const m = modelos.value.find(x => x.atalho === atalho)
  if (m && dados.value) { resposta.value = preencher(m.texto, dados.value.contato.nome, extrasContato.value); aba.value = 'conversa' }
}

function usarMensagem(texto: string) {
  resposta.value = texto
  aba.value = 'conversa'
}


// ─── Google Drive (repositório único de documentos) ───────────────────────
const driveOk = ref(false)
const salvarNoDrive = ref(false)
const criandoPasta = ref(false)
const avisoDrive = ref<{ texto: string; url?: string; erro?: boolean } | null>(null)
watch(() => props.isOpen, async (open) => {
  avisoDrive.value = null
  if (open) driveOk.value = (await $fetch<{ configurado: boolean }>('/api/drive/status').catch(() => ({ configurado: false }))).configurado
}, { immediate: true })
async function criarPastaDrive() {
  if (!dados.value) return
  criandoPasta.value = true
  try {
    const r = await $fetch<{ url: string }>(`/api/crm/contatos/${dados.value.contato.id}/drive`, { method: 'POST' })
    dados.value.contato.drive_pasta_url = r.url
    avisoDrive.value = { texto: 'Pasta criada com as subpastas padrão.', url: r.url }
  } catch (e: any) {
    avisoDrive.value = { texto: e?.data?.message || 'Não foi possível criar a pasta.', erro: true }
  } finally {
    criandoPasta.value = false
  }
}
async function descartarSugestao() {
  if (!dados.value) return
  await $fetch(`/api/crm/contatos/${dados.value.contato.id}`, { method: 'PUT', body: { sugestao_resposta: null } })
  dados.value.contato.sugestao_resposta = null
}
// Copia o texto pronto pra área de transferência e avisa — nunca depende do envio
// automático pelo WhatsApp (incerto), então funciona sempre: você mesma cola no seu WhatsApp.
const avisoFormulario = ref<{ texto: string; erro?: boolean } | null>(null)
async function copiarEAvisar(texto: string) {
  try {
    await navigator.clipboard.writeText(texto)
    avisoFormulario.value = { texto: 'Copiado! Agora é só colar no WhatsApp da cliente.' }
  } catch {
    avisoFormulario.value = { texto: 'Não deu pra copiar sozinho — selecione e copie o texto na aba Conversa.', erro: true }
  }
  setTimeout(() => { avisoFormulario.value = null }, 6000)
}

// Formulário da cliente (Módulo 1: depois de contratar, não antes da consulta).
async function enviarFormulario() {
  if (!dados.value) return
  if (dados.value.contato.form_respondido_em && !confirm('Ela já respondeu. Gerar um link novo para corrigir ou completar?')) return
  const r = await $fetch<{ caminho: string }>(`/api/crm/contatos/${dados.value.contato.id}/formulario`, { method: 'POST' })
  await carregarModelos()
  const m = modelos.value.find(x => x.atalho === '/formulario')
  const link = `${window.location.origin}${r.caminho}`
  const texto = m ? preencher(m.texto, dados.value.contato.nome, { ...extrasContato.value, 'LINK DO FORMULÁRIO': link }) : link
  resposta.value = texto
  await carregar()
  await copiarEAvisar(texto)
}
// Formulário pré-consulta: contexto leve, enviado antes da consulta (não substitui o de cima).
// O resumo livre já vai sempre; "Escolher formulário" deixa escolher um formulário do banco de perguntas.
const editorPreFormAberto = ref(false)
async function enviarPreFormularioRapido() {
  if (!dados.value) return
  if (dados.value.contato.pre_form_respondido_em && !confirm('Ela já respondeu. Gerar um link novo para corrigir ou completar?')) return
  await gerarPreFormulario(null)
}
function abrirEditorPreFormulario() {
  if (!dados.value) return
  if (dados.value.contato.pre_form_respondido_em && !confirm('Ela já respondeu. Gerar um link novo para corrigir ou completar?')) return
  editorPreFormAberto.value = true
}
async function gerarPreFormulario(formularioId: number | null) {
  if (!dados.value) return
  const r = await $fetch<{ caminho: string }>(`/api/crm/contatos/${dados.value.contato.id}/pre-formulario`, { method: 'POST', body: { formulario_id: formularioId } })
  editorPreFormAberto.value = false
  await carregarModelos()
  const m = modelos.value.find(x => x.atalho === '/pre-consulta')
  const link = `${window.location.origin}${r.caminho}`
  const texto = m ? preencher(m.texto, dados.value.contato.nome, { ...extrasContato.value, 'LINK DO FORMULÁRIO': link }) : link
  resposta.value = texto
  await carregar()
  await copiarEAvisar(texto)
}

async function enviarAoDrive(m: MensagemWhatsapp) {
  try {
    const r = await $fetch<{ url: string }>(`/api/crm/mensagens/${m.id}/drive`, { method: 'POST' })
    m.drive_url = r.url
    if (dados.value && !dados.value.contato.drive_pasta_url) carregar()
  } catch (e: any) {
    alert(e?.data?.message || 'Não foi possível enviar ao Drive.')
  }
}
/** Baixa a peça ou, se marcado, grava na pasta do cliente no Drive. */
async function peca(url: string) {
  if (!salvarNoDrive.value) { window.location.href = url; return }
  avisoDrive.value = { texto: 'Salvando no Drive…' }
  try {
    const r = await $fetch<{ url: string; nome: string }>(`${url}&drive=1`)
    avisoDrive.value = { texto: `Salvo no Drive: ${r.nome}`, url: r.url }
    if (dados.value && !dados.value.contato.drive_pasta_url) carregar()
  } catch (e: any) {
    avisoDrive.value = { texto: e?.data?.message || 'Não foi possível salvar no Drive.', erro: true }
  }
}

// ─── Atividades ───────────────────────────────────────────────────────────
const nota = reactive<{ tipo: string; texto: string; minutos: number | '' }>({ tipo: 'Anotação', texto: '', minutos: '' })
const anotando = ref(false)

async function anotar() {
  if (!nota.texto.trim() || !dados.value) return
  anotando.value = true
  try {
    await $fetch(`/api/crm/contatos/${dados.value.contato.id}/atividades`, { method: 'POST', body: { ...nota } })
    nota.texto = ''
    nota.minutos = ''
    await carregar()
  } finally {
    anotando.value = false
  }
}
</script>

<style scoped>
.card { @apply rounded-lg border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4 space-y-1.5; }
.card h3 { @apply text-[10px] font-bold uppercase tracking-widest text-primary mb-2; }
.tag { @apply text-[11px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300; }
</style>
