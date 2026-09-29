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
          <Button size="sm" variant="outline" icon="ph:paper-plane-tilt-bold" data-testid="enviar-formulario-topo" title="Escolher um formulário e gerar o link para enviar no WhatsApp" @click="abrirEditorPreFormulario">Enviar formulário</Button>
          <Button size="sm" variant="outline" icon="ph:pencil-simple-bold" @click="emit('editar', dados.contato)">Editar</Button>
          <Button v-if="etapa(dados.contato.etapa).aberta" size="sm" icon="ph:check-bold" @click="emit('andamento', dados.contato)">Registrar andamento</Button>
        </div>
      </div>

      <!-- Cliente: quem é (permanente) -->
      <div v-if="aba === 'resumo'" class="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <!-- Visão geral: o que está acontecendo com este cliente, com acesso direto ao detalhe -->
        <div class="md:col-span-2 grid grid-cols-2 lg:grid-cols-5 gap-2">
          <button v-for="c in resumoFicha" :key="c.rotulo" type="button" class="text-left rounded-2xl border px-3 py-2.5 hover:border-primary transition-colors" :class="c.alerta ? 'border-warning/50 bg-warning/5' : 'border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50'" @click="aba = c.aba">
            <span class="block text-[10px] font-bold uppercase tracking-widest text-gray-400">{{ c.rotulo }}</span>
            <span class="block text-lg font-serif text-primary dark:text-zinc-100 leading-tight">{{ c.valor }}</span>
            <span class="block text-[11px] text-gray-500 truncate">{{ c.sub }}</span>
          </button>
        </div>
        <ChecklistPainel v-if="dados.checklist?.atendimento?.total" class="md:col-span-2" :escopo="dados.checklist.atendimento" @alternar="i => alternarChecklist(i, null)" />
        <div class="card">
          <h3>Contato</h3>
          <p><b>WhatsApp:</b> <a :href="whatsappLink(dados.contato.telefone)" target="_blank" rel="noopener" class="text-primary">{{ telefoneFormatado(dados.contato.telefone) }}</a></p>
          <p><b>E-mail:</b> {{ dados.contato.email || '—' }}</p>
          <p><b>Cidade:</b> {{ dados.contato.cidade || '—' }}</p>
          <p><b>Origem:</b> {{ dados.contato.origem || '—' }}</p>
          <p><b>Aviso LGPD:</b> {{ dados.contato.consentimento_em ? dataHora(dados.contato.consentimento_em) : 'não enviado' }}</p>
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
        <div v-if="!dados.casos.length" class="card">
          <h3>Atendimento</h3>
          <p><b>Área:</b> {{ dados.contato.area || '—' }} <span v-if="dados.contato.demanda">· {{ dados.contato.demanda }}</span></p>
          <p><b>Outra parte:</b> {{ dados.contato.parte_contraria || '—' }}</p>
          <p><b>Urgência:</b> {{ dados.contato.urgencia || '—' }} · <b>Sentimento:</b> {{ dados.contato.sentimento || '—' }}</p>
          <p v-if="etapa(dados.contato.etapa).aberta">
            <b>Próxima ação:</b>
            <span v-if="dados.contato.proxima_acao">{{ dados.contato.proxima_acao }} — {{ dataCurta(dados.contato.proxima_data) }} ({{ diaRelativo(dados.contato.proxima_data) }})</span>
            <span v-else class="text-warning-dark font-semibold">não definida</span>
          </p>
          <p v-if="dados.contato.motivo_perda"><b>Motivo da perda:</b> {{ dados.contato.motivo_perda }}</p>
          <p><b>Na etapa há:</b> {{ diasNaEtapa }} dia(s)</p>
          <p v-if="dados.contato.consulta_em"><b>Consulta:</b> {{ dataHora(dados.contato.consulta_em) }}</p>
          <div class="rounded-2xl border border-primary/20 bg-primary/5 p-3 mt-2 space-y-2" data-testid="enviar-formulario">
            <p class="text-[10px] font-bold uppercase tracking-widest text-primary dark:text-zinc-200">Formulário para a pessoa preencher</p>
            <div class="flex flex-wrap items-center gap-2">
              <button type="button" class="text-[11px] font-semibold uppercase tracking-wider px-4 py-2 rounded-full bg-primary text-white"
                      :title="dados.contato.pre_form_respondido_em ? 'Já respondido — gerar de novo cria um link novo' : 'Escolha o formulário; o link é gerado e copiado para você colar no WhatsApp'"
                      @click="abrirEditorPreFormulario">
                <Icon name="ph:paper-plane-tilt-bold" class="align-middle" /> {{ dados.contato.pre_form_respondido_em ? 'Enviar novamente' : 'Enviar formulário' }}
              </button>
              <button type="button" class="text-[11px] text-gray-500 hover:text-primary underline underline-offset-2" title="Sem perguntas extras: só o campo 'Conte um pouco da sua situação'" @click="enviarPreFormularioRapido">só o resumo livre (1 clique)</button>
              <a href="/pc/preview" target="_blank" rel="noopener" class="text-[11px] text-gray-500 hover:text-primary underline underline-offset-2">ver exemplo</a>
            </div>
            <p v-if="dados.contato.pre_form_respondido_em" class="text-xs text-success-dark">Formulário pré-consulta respondido ✓</p>
            <p v-else class="text-xs text-gray-500">Você escolhe qual formulário enviar (criados em <NuxtLink to="/formularios" class="underline">Formulários</NuxtLink>). O link fica copiado; é só colar no WhatsApp.</p>
          </div>
          <p v-if="avisoFormulario" class="text-xs mt-1" :class="avisoFormulario.erro ? 'text-danger' : 'text-success-dark'">{{ avisoFormulario.texto }}</p>
        </div>
        <InformacoesCliente :key="`i${dados.contato.id}`" class="md:col-span-2" :contato-id="dados.contato.id" iniciar-aberto />
        <details class="md:col-span-2 rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50" @toggle="qualificacaoAberta = ($event.target as HTMLDetailsElement).open">
          <summary class="cursor-pointer p-4 text-[10px] font-bold uppercase tracking-widest text-primary dark:text-zinc-200">Dados pessoais e qualificação (CPF, RG, endereço — usados nas peças)</summary>
          <QualificacaoForm v-if="qualificacaoAberta" :key="dados.contato.id" :contato-id="dados.contato.id" :nome-sugerido="dados.contato.nome" />
        </details>
        <div v-if="dados.contato.dor || dados.contato.objetivo || dados.contato.pre_form_respostas_extra?.length" class="card">
          <h3>Relato do cliente</h3>
          <p v-if="dados.contato.dor"><b>O que preocupa:</b> “{{ dados.contato.dor }}”</p>
          <p v-if="dados.contato.objetivo"><b>O que quer que mude:</b> “{{ dados.contato.objetivo }}”</p>
          <template v-for="(r, i) in dados.contato.pre_form_respostas_extra ?? []" :key="i">
            <p v-if="r"><b>{{ dados.contato.pre_form_perguntas_extra?.[i] || 'Pergunta extra' }}:</b> “{{ r }}”</p>
          </template>
        </div>
        <div class="card md:col-span-2">
          <h3>Resumo do atendimento</h3>
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
        <p class="text-xs text-gray-500 mb-3">Linha do tempo de tudo que foi feito ou decidido com este cliente (filtre por demanda acima) — registre ligações, decisões e combinados aqui pra não perder o fio depois.</p>
        <form class="flex flex-col sm:flex-row gap-2 mb-5" @submit.prevent="anotar">
          <select v-model="nota.tipo" class="modal-input sm:w-40">
            <option v-for="t in TIPOS_ATIVIDADE" :key="t">{{ t }}</option>
          </select>
          <input v-model="nota.texto" class="modal-input flex-1" placeholder="O que foi conversado ou decidido?" />
          <input v-model="nota.minutos" type="number" min="0" max="1440" class="modal-input sm:w-28" placeholder="min" title="Tempo gasto (minutos) — alimenta a rentabilidade" />
          <Button type="submit" :loading="anotando" :disabled="!nota.texto.trim()">Registrar</Button>
        </form>
        <div v-if="dados.casos.length" class="flex flex-wrap gap-1.5 mb-4">
          <button type="button" class="filtro-hist" :class="!filtroDemanda ? 'filtro-hist-ativo' : ''" @click="filtroDemanda = null">Tudo</button>
          <button v-for="k in dados.casos" :key="k.id" type="button" class="filtro-hist" :class="filtroDemanda === k.id ? 'filtro-hist-ativo' : ''" @click="filtroDemanda = k.id">{{ k.titulo }}</button>
        </div>
        <p v-if="!atividadesFiltradas.length" class="text-sm text-gray-400">Sem registros ainda.</p>
        <ol class="border-l-2 border-gray-100 dark:border-zinc-800 ml-1">
          <li v-for="a in atividadesFiltradas" :key="a.id" class="pl-4 pb-4 relative text-sm">
            <span class="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full" :class="a.tipo === 'Sistema' ? 'bg-gray-300' : 'bg-primary'" />
            <p class="text-xs text-gray-400">{{ dataHora(a.created_at) }} · {{ a.tipo }}<span v-if="a.autor?.name"> · {{ a.autor.name }}</span><span v-if="a.minutos"> · {{ a.minutos }} min</span><span v-if="a.caso_id && !filtroDemanda" class="ml-1 px-1.5 rounded bg-gray-100 dark:bg-zinc-800">{{ dados.casos.find(k => k.id === a.caso_id)?.titulo }}</span></p>
            <p class="whitespace-pre-wrap" :class="a.tipo === 'Sistema' ? 'text-gray-500' : ''">{{ a.texto }}</p>
          </li>
        </ol>
      </div>

      <!-- Demandas: o que este cliente contratou -->
      <div v-else-if="aba === 'processo'" class="p-5 space-y-5">
        <div v-if="!dados.casos.length" class="rounded-2xl bg-secondary/10 border border-secondary/30 p-4 text-sm">
          {{ dados.contato.etapa === 'ativo' ? 'Cliente ativo sem demanda aberta.' : 'Nenhuma demanda ainda.' }}
          Abra a demanda para registrar a análise da consulta, acompanhar as etapas, os documentos e os prazos daquele serviço.
          <div class="mt-3"><Button size="sm" icon="ph:chat-centered-text-bold" :loading="abrindoConsulta" @click="abrirDemandaDeConsulta">Abrir demanda de consulta</Button></div>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button size="sm" icon="ph:folder-plus-bold" @click="editarCaso(null)">Nova demanda</Button>
          <NuxtLink :to="`/agenda?contato=${dados.contato.id}`" class="text-[11px] font-semibold uppercase tracking-wider px-4 py-1.5 rounded-full border border-primary/40 text-primary dark:text-zinc-200 hover:bg-primary hover:text-white">+ Prazo ou compromisso</NuxtLink>
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
        <template v-for="k in demandasVisiveis" :key="k.id">
        <article class="card" :class="k.status === 'encerrado' ? 'opacity-75' : ''">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <p class="font-semibold">{{ k.titulo }}</p>
            <span class="flex items-center gap-2">
              <span v-if="k.status !== 'encerrado'" class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full" :class="situacaoComercial(k.id).cor">{{ situacaoComercial(k.id).nome }}</span>
              <span class="tag">{{ STATUS_DEMANDA[k.status] }}</span>
            </span>
          </div>
          <p class="text-xs text-gray-500">
            Atuação {{ TIPOS_DEMANDA[k.tipo].toLowerCase() }}<span v-if="k.procedimento"> · {{ PROCEDIMENTOS.find(p => p.valor === k.procedimento)?.rotulo }}</span>
          </p>
          <div class="flex flex-wrap gap-3 pt-1 text-xs">
            <button class="underline underline-offset-2" @click="editarCaso(k)">Editar demanda</button>
            <button type="button" class="underline underline-offset-2" @click="novoProcesso(k, 'judicial')">+ Processo judicial</button>
            <button type="button" class="underline underline-offset-2" @click="novoProcesso(k, 'extrajudicial')">+ Procedimento extrajudicial</button>
            <NuxtLink :to="`/agenda?contato=${dados.contato.id}&demanda=${k.id}`" class="underline underline-offset-2">Novo prazo / compromisso</NuxtLink>
            <NuxtLink v-if="k.status !== 'encerrado' && situacaoComercial(k.id).nome === 'Sem proposta'" :to="`/honorarios?contato=${dados.contato.id}&demanda=${k.id}`" class="underline underline-offset-2">Registrar proposta</NuxtLink>
            <button v-if="ehAdmin && k.tipo !== 'consultivo'" type="button" class="underline underline-offset-2" @click="peca(`/api/pecas/procuracao?contato=${dados.contato.id}&caso=${k.id}`)">Procuração desta demanda</button>
          </div>
          <div v-if="processosDaDemanda(k.id).length" class="mt-3 space-y-2">
            <ProcessoCard v-for="pr in processosDaDemanda(k.id)" :key="pr.id" :processo="pr" :movimentacoes="movsDoProcesso(pr.id)" @editar="editarProcesso" @mudou="carregar" />
          </div>
          <p v-else class="text-xs text-gray-400 pt-1">Sem processo ou procedimento: a demanda é {{ k.tipo === 'consultivo' ? 'consultiva/documental' : 'só um serviço a acompanhar' }}. Registre um quando existir.</p>
          <details class="mt-3" :open="partesDaDemanda(k.id).length > 0">
            <summary class="cursor-pointer text-[10px] font-bold uppercase tracking-widest text-gray-400">Partes e interessados <span class="normal-case tracking-normal font-normal">· {{ partesDaDemanda(k.id).length }}</span></summary>
            <PartesDemanda class="mt-2" :partes="partesDaDemanda(k.id)" :caso-id="k.id" @mudou="carregar" />
          </details>
          <details class="mt-3" :open="!!(k.analise || k.riscos || k.decisao)">
            <summary class="cursor-pointer text-[10px] font-bold uppercase tracking-widest text-gray-400">Análise do escritório <span v-if="k.decisao" class="normal-case tracking-normal font-normal">· {{ DECISOES_DEMANDA[k.decisao].nome }}</span></summary>
            <AnaliseDemanda class="mt-2" :demanda="k" @mudou="carregar" />
          </details>
          <ChecklistPainel v-if="dados.checklist?.casos[k.id]" class="mt-2" :escopo="dados.checklist.casos[k.id]!" @alternar="i => alternarChecklist(i, k.id)" />
          <p v-else class="text-xs text-gray-400 pt-1">Sem procedimento definido. <button type="button" class="underline underline-offset-2 hover:text-primary" @click="editarCaso(k)">Escolha o procedimento</button> para acompanhar as etapas desta demanda.</p>
          <InformacoesCliente :key="`d${k.id}`" class="mt-2" :contato-id="dados.contato.id" :caso-id="k.id" iniciar-aberto />
          <div v-if="prazosDaDemanda(k.id).length || tarefasDaDemanda(k.id).length" class="mt-3">
            <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Prazos e tarefas</p>
            <ul class="text-sm divide-y divide-gray-50 dark:divide-zinc-800/60">
              <li v-for="c in prazosDaDemanda(k.id)" :key="`c${c.id}`" class="py-1.5 flex gap-2 items-center"><Icon :name="TIPOS_COMPROMISSO[c.tipo].icone" class="text-secondary" /><span class="w-20 shrink-0 font-medium">{{ dataCurta(dataCompromisso(c)) }}</span><span class="flex-1">{{ c.titulo }}</span><span class="text-xs text-gray-500">{{ diaRelativo(dataCompromisso(c)) }}</span></li>
              <li v-for="t in tarefasDaDemanda(k.id)" :key="`t${t.id}`" class="py-1.5 flex gap-2 items-center"><Icon name="ph:check-square-bold" class="text-gray-400" /><span class="w-20 shrink-0 font-medium">{{ dataCurta(t.prazo) }}</span><span class="flex-1">{{ t.titulo }}</span><span class="text-xs text-gray-500">tarefa</span></li>
            </ul>
          </div>
          <details class="mt-3">
            <summary class="cursor-pointer text-[10px] font-bold uppercase tracking-widest text-gray-400">Documentos desta demanda <span class="normal-case tracking-normal font-normal">· {{ docsDaDemanda(k.id).filter(d => ['recebido', 'conferido', 'final'].includes(d.status)).length }}/{{ docsDaDemanda(k.id).length }} recebidos</span></summary>
            <DocumentosDemanda class="mt-2" :docs="docsDaDemanda(k.id)" :contato-id="dados.contato.id" :caso-id="k.id" :processos="processosDaDemanda(k.id)" :partes="partesDaDemanda(k.id)" @mudou="carregar" @cobrar="cobrarDocs" />
          </details>
        </article>
        </template>
        <button v-if="encerradas.length" type="button" class="text-xs text-gray-500 underline underline-offset-2" @click="verEncerradas = !verEncerradas">
          {{ verEncerradas ? 'Ocultar' : 'Mostrar' }} {{ encerradas.length }} demanda(s) encerrada(s)
        </button>
        <div v-if="docsGerais.length || prazosGerais.length || tarefasGerais.length" class="card">
          <h3>Gerais do cliente (sem demanda)</h3>
          <ul v-if="prazosGerais.length || tarefasGerais.length" class="text-sm divide-y divide-gray-50 dark:divide-zinc-800/60 mb-3">
            <li v-for="c in prazosGerais" :key="`c${c.id}`" class="py-1.5 flex gap-2 items-center"><Icon :name="TIPOS_COMPROMISSO[c.tipo].icone" class="text-secondary" /><span class="w-20 shrink-0 font-medium">{{ dataCurta(dataCompromisso(c)) }}</span><span class="flex-1">{{ c.titulo }}</span></li>
            <li v-for="t in tarefasGerais" :key="`t${t.id}`" class="py-1.5 flex gap-2 items-center"><Icon name="ph:check-square-bold" class="text-gray-400" /><span class="w-20 shrink-0 font-medium">{{ dataCurta(t.prazo) }}</span><span class="flex-1">{{ t.titulo }}</span></li>
          </ul>
          <DocumentosDemanda v-if="docsGerais.length" :docs="docsGerais" :contato-id="dados.contato.id" :caso-id="null" @mudou="carregar" @cobrar="cobrarDocs" />
        </div>
        <ProcessoFormModal :is-open="processoAberto" :caso-id="processoCaso" :natureza="processoNatureza" :processo="processoEditando" @close="processoAberto = false" @salvo="processoAberto = false; carregar()" />
        <DemandaFormModal :is-open="casoAberto" :contato="dados.contato" :demanda="casoEditando" @close="casoAberto = false" @salvo="casoAberto = false; carregar()" />
      </div>

      <!-- Honorários -->
      <div v-else-if="aba === 'honorarios'" class="p-5 space-y-3">
        <p class="text-xs text-gray-500">Propostas e contratos de honorário fechados com esta cliente, e as parcelas em aberto — pra cobrança geral, use a tela Financeiro.</p>
        <div class="flex flex-wrap justify-end gap-4">
          <button v-if="dados.honorarios.some(h => h.tipo !== 'Consulta')" type="button" class="text-sm font-semibold text-primary" @click="montarProposta">Montar mensagem de proposta</button>
          <NuxtLink :to="`/honorarios?contato=${dados.contato.id}`" class="text-sm font-semibold text-primary">+ Registrar honorário / proposta</NuxtLink>
        </div>
        <div v-if="ehAdmin && parcelas.length" class="card">
          <h3>Parcelas em aberto</h3>
          <ul class="divide-y divide-gray-100 dark:divide-zinc-800 text-sm">
            <li v-for="l in parcelas" :key="l.id" class="py-2 flex flex-wrap items-center gap-2">
              <span class="w-24 font-medium tabular-nums" :class="l.vencimento < hojeIso ? 'text-danger' : ''">{{ dataCurta(l.vencimento) }}</span>
              <span class="flex-1">{{ l.descricao }} · <b>{{ brl(l.valor) }}</b><span v-if="l.caso_id && dados.casos.length > 1" class="text-xs text-gray-400"> · {{ dados.casos.find(k => k.id === l.caso_id)?.titulo }}</span></span>
              <button v-if="l.vencimento < hojeIso" type="button" class="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary text-white" @click="mensagemParcela(l, '/cobranca')">Cobrar</button>
              <button type="button" class="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border border-gray-300 dark:border-zinc-700 hover:border-primary" @click="mensagemParcela(l, '/boleto')">Enviar boleto</button>
            </li>
          </ul>
        </div>
        <p v-if="!dados.honorarios.length" class="text-sm text-gray-400">Nenhum honorário registrado para este cliente.</p>
        <div v-if="dados.honorarios.length" class="grid grid-cols-3 gap-2 text-center">
          <div class="card !p-3"><p class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Contratado</p><p class="font-serif text-lg text-primary dark:text-zinc-100">{{ brl(totaisCliente.contratado) }}</p></div>
          <div class="card !p-3"><p class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Recebido</p><p class="font-serif text-lg text-primary dark:text-zinc-100">{{ brl(totaisCliente.pago) }}</p></div>
          <div class="card !p-3"><p class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Propostas em aberto</p><p class="font-serif text-lg text-primary dark:text-zinc-100">{{ brl(totaisCliente.proposta) }}</p></div>
        </div>
        <section v-for="g in financeiroPorDemanda" :key="g.id ?? 0" class="space-y-2">
          <p class="flex flex-wrap items-baseline gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            {{ g.titulo }} <span class="normal-case tracking-normal font-normal text-gray-400">· contratado {{ brl(g.contratado) }}<template v-if="g.proposta"> · proposta {{ brl(g.proposta) }}</template></span>
          </p>
          <div v-for="h in g.itens" :key="h.id" class="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="font-semibold">{{ brl(h.valor) }} <span class="text-xs text-gray-400">· {{ h.tipo }}<span v-if="h.parcelas > 1"> · {{ h.parcelas }}x</span></span></p>
              <p class="text-xs text-gray-500">{{ h.descricao || '—' }}</p>
            </div>
            <div class="flex items-center gap-2">
              <button v-if="ehAdmin" type="button" class="text-xs underline underline-offset-2" title="Gerar contrato em Word" @click="peca(`/api/pecas/contrato?honorario=${h.id}`)">Contrato (.docx)</button>
              <span class="tag">{{ h.status }}</span>
            </div>
          </div>
        </section>
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
import { PROCEDIMENTOS } from '~~/shared/data/checklist'
import { CADENCIA, CLASSIFICACOES, DECISOES_DEMANDA, STATUS_DEMANDA, TIPOS_ATIVIDADE, TIPOS_DEMANDA, TIPOS_COMPROMISSO, dataCompromisso, etapa, type Atividade, type Demanda, type Compromisso, type Contato, type Movimentacao, type Parte, type Processo, type Documento, type Honorario, type Lancamento, type MensagemWhatsapp } from '../../../shared/types/crm'
import QualificacaoForm from './QualificacaoForm.vue'
import DemandaFormModal from './DemandaFormModal.vue'
import ChecklistPainel from './ChecklistPainel.vue'
import InformacoesCliente from './InformacoesCliente.vue'
import type { ChecklistFicha, ItemChecklist } from '../../../shared/types/checklist'
import DocumentosDemanda from './DocumentosDemanda.vue'
import ProcessoCard from './ProcessoCard.vue'
import ProcessoFormModal from './ProcessoFormModal.vue'
import PartesDemanda from './PartesDemanda.vue'
import AnaliseDemanda from './AnaliseDemanda.vue'
import { useProfileStore } from '../../stores/profile'
import ModeloPicker from './ModeloPicker.vue'
import { useModelos } from '../../composables/useModelos'
import { brl, dataCurta, dataHora, diaRelativo, telefoneFormatado, whatsappLink } from '../../utils/formatadores'
import { useCrmStore } from '../../stores/crm'

interface Detalhe { processos: Processo[]; partes: Parte[]; movimentacoes: Movimentacao[]; tarefas: { id: number; titulo: string; prazo: string; prioridade: string; caso_id: number | null }[]; contato: Contato; honorarios: Honorario[]; mensagens: MensagemWhatsapp[]; atividades: Atividade[]; documentos: Documento[]; casos: Demanda[]; compromissos: Compromisso[]; checklist?: ChecklistFicha }

const props = defineProps<{ isOpen: boolean; contatoId: number | null; abaInicial?: string; modeloInicial?: string | null }>()
const emit = defineEmits<{ close: []; editar: [c: Contato]; andamento: [c: Contato] }>()

const crm = useCrmStore()
const dados = ref<Detalhe | null>(null)
const loading = ref(false)
const aba = ref('resumo')
const scrollBox = ref<HTMLElement | null>(null)

// Cliente (quem é, permanente) → Demandas (o que contratou: etapas, informações, documentos, prazos) → Conversa → Financeiro → Histórico.
const abas = computed(() => [
  { id: 'resumo', label: 'Cliente' },
  { id: 'processo', label: 'Demandas', badge: dados.value?.casos.filter(c => c.status !== 'encerrado').length || undefined },
  { id: 'conversa', label: 'Conversa', badge: dados.value?.mensagens.length || undefined },
  { id: 'honorarios', label: 'Financeiro', badge: dados.value?.honorarios.length || undefined },
  { id: 'atividades', label: 'Histórico', badge: dados.value?.atividades.length || undefined },
])
const qualificacaoAberta = ref(false)
// Nomes antigos de abas (links e atalhos) continuam funcionando.
function irPara(destino: string) {
  // Nomes antigos (links e atalhos) continuam levando ao lugar certo.
  if (['demandas', 'casos', 'documentos', 'diagnostico'].includes(destino)) aba.value = 'processo'
  else if (['qualificacao'].includes(destino)) aba.value = 'resumo'
  else aba.value = destino
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

// Checklist: só itens manuais são marcados aqui; os automáticos vêm dos dados que o CRM já tem.
async function alternarChecklist(item: ItemChecklist, casoId: number | null) {
  const d = dados.value
  if (!d?.checklist || item.tipo !== 'manual') return
  const escopo = casoId ? d.checklist.casos[casoId] : d.checklist.atendimento
  if (!escopo) return
  const marcar = !item.concluido
  const contar = () => { escopo.feitos = escopo.itens.filter(i => i.concluido).length }
  item.concluido = marcar // aparece na hora; volta atrás se o servidor recusar
  item.quando = marcar ? new Date().toISOString() : null
  item.quem = null
  contar()
  try {
    const url: string = `/api/crm/contatos/${d.contato.id}/checklist`
    const r = await $fetch<{ quando: string | null; quem: string | null }>(url, { method: 'PUT', body: { chave: item.chave, caso_id: casoId, concluido: marcar } })
    item.quando = r.quando
    item.quem = r.quem
  } catch (e: any) {
    item.concluido = !marcar
    item.quando = null
    contar()
    alert(e?.data?.message || 'Não foi possível atualizar o checklist.')
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
const processosDaDemanda = (id: number) => (dados.value?.processos ?? []).filter(p => p.caso_id === id)
const partesDaDemanda = (id: number) => (dados.value?.partes ?? []).filter(p => p.caso_id === id)
const movsDoProcesso = (id: number) => (dados.value?.movimentacoes ?? []).filter(m => m.processo_id === id)
const processoAberto = ref(false)
const processoCaso = ref<number>(0)
const processoNatureza = ref<'judicial' | 'extrajudicial'>('judicial')
const processoEditando = ref<Processo | null>(null)
function novoProcesso(k: Demanda, natureza: 'judicial' | 'extrajudicial') { processoCaso.value = k.id; processoNatureza.value = natureza; processoEditando.value = null; processoAberto.value = true }
function editarProcesso(p: Processo) { processoCaso.value = p.caso_id; processoNatureza.value = p.natureza; processoEditando.value = p; processoAberto.value = true }
// Resumo do cliente: só números e o próximo passo; o detalhe fica nas abas.
const resumoFicha = computed(() => {
  const d = dados.value
  if (!d) return []
  const ativas = d.casos.filter(c => c.status !== 'encerrado')
  const encerradas = d.casos.length - ativas.length
  const procs = d.processos.filter(p => p.status !== 'encerrado')
  const proximo = [...d.compromissos].sort((a, b) => dataCompromisso(a).localeCompare(dataCompromisso(b)))[0]
  const docsPend = d.documentos.filter(x => x.status === 'pendente' && x.obrigatorio).length
  const contratado = d.honorarios.filter(h => ['Contratado', 'Pago'].includes(h.status) && h.tipo !== 'Consulta').reduce((t, h) => t + Number(h.valor), 0)
  const propostas = d.honorarios.filter(h => h.status === 'Proposta' && h.tipo !== 'Consulta').length
  return [
    { rotulo: 'Demandas', valor: `${ativas.length} ativa${ativas.length === 1 ? '' : 's'}`, sub: encerradas ? `${encerradas} encerrada${encerradas === 1 ? '' : 's'}` : 'nenhuma encerrada', aba: 'processo', alerta: false },
    { rotulo: 'Processos', valor: String(procs.length), sub: procs.length ? `${procs.filter(p => p.natureza === 'judicial').length} judicial · ${procs.filter(p => p.natureza === 'extrajudicial').length} extrajudicial` : 'sem processo em andamento', aba: 'processo', alerta: false },
    { rotulo: 'Próximo prazo', valor: proximo ? dataCurta(dataCompromisso(proximo)) : '—', sub: proximo ? proximo.titulo : 'nada agendado', aba: 'processo', alerta: !!proximo && dataCompromisso(proximo) <= hojeIso },
    { rotulo: 'Pendências', valor: `${d.tarefas.length} tarefa${d.tarefas.length === 1 ? '' : 's'}`, sub: `${docsPend} documento${docsPend === 1 ? '' : 's'} a receber`, aba: 'processo', alerta: docsPend > 0 },
    { rotulo: 'Financeiro', valor: contratado ? brl(contratado) : '—', sub: propostas ? `${propostas} proposta(s) em aberto` : contratado ? 'contratado' : 'sem contratação', aba: 'honorarios', alerta: false },
  ]
})
// Um clique: a consulta é um serviço consultivo do cliente (a análise, os documentos e o honorário ficam nela).
const abrindoConsulta = ref(false)
async function abrirDemandaDeConsulta() {
  const d = dados.value
  if (!d) return
  abrindoConsulta.value = true
  try {
    await $fetch('/api/demandas', { method: 'POST', body: { contato_id: d.contato.id, titulo: `Consulta — ${d.contato.demanda || d.contato.area || d.contato.nome || 'análise inicial'}`, tipo: 'consultivo', area: d.contato.area || null, status: 'ativo', data_abertura: hojeIso } })
    await carregar()
  } finally {
    abrindoConsulta.value = false
  }
}
// Financeiro por demanda + consolidado do cliente.
const honorariosReais = computed(() => (dados.value?.honorarios ?? []).filter(h => h.status !== 'Cancelado'))
const somar = (hs: Honorario[], st: string[]) => hs.filter(h => st.includes(h.status) && h.tipo !== 'Consulta').reduce((t, h) => t + Number(h.valor), 0)
const totaisCliente = computed(() => ({ contratado: somar(honorariosReais.value, ['Contratado', 'Pago']), pago: somar(honorariosReais.value, ['Pago']), proposta: somar(honorariosReais.value, ['Proposta']) }))
const financeiroPorDemanda = computed(() => {
  const d = dados.value
  if (!d) return []
  const grupos: { id: number | null; titulo: string; itens: Honorario[]; contratado: number; proposta: number }[] = []
  for (const k of [...d.casos.map(c => ({ id: c.id as number | null, titulo: c.titulo })), { id: null, titulo: 'Sem demanda específica' }]) {
    const itens = honorariosReais.value.filter(h => (h.caso_id ?? null) === k.id)
    if (itens.length) grupos.push({ ...k, itens, contratado: somar(itens, ['Contratado', 'Pago']), proposta: somar(itens, ['Proposta']) })
  }
  return grupos
})
// Situação comercial da DEMANDA (não do cliente): cliente antigo abre demanda nova e ela tem a sua própria proposta/contratação.
function situacaoComercial(casoId: number) {
  const hs = honorariosReais.value.filter(h => h.caso_id === casoId && h.tipo !== 'Consulta')
  if (hs.some(h => ['Contratado', 'Pago'].includes(h.status))) return { nome: 'Contratada', cor: 'bg-success/15 text-success-dark' }
  if (hs.some(h => h.status === 'Proposta')) return { nome: 'Proposta enviada', cor: 'bg-warning/15 text-warning-dark' }
  return { nome: 'Sem proposta', cor: 'bg-gray-100 dark:bg-zinc-800 text-gray-500' }
}
const verEncerradas = ref(false)
const encerradas = computed(() => (dados.value?.casos ?? []).filter(c => c.status === 'encerrado'))
const demandasVisiveis = computed(() => (dados.value?.casos ?? []).filter(c => c.status !== 'encerrado' || verEncerradas.value))
const casoEditando = ref<Demanda | null>(null)
function editarCaso(k: Demanda | null) {
  casoEditando.value = k
  casoAberto.value = true
}

// ─── Documentos, prazos e tarefas: cada um dentro da sua demanda (ou "gerais") ───────────
const docsDaDemanda = (id: number) => (dados.value?.documentos ?? []).filter(d => d.caso_id === id)
const docsGerais = computed(() => (dados.value?.documentos ?? []).filter(d => !d.caso_id))
const prazosDaDemanda = (id: number) => (dados.value?.compromissos ?? []).filter(c => c.caso_id === id)
const tarefasDaDemanda = (id: number) => (dados.value?.tarefas ?? []).filter(t => t.caso_id === id)
const prazosGerais = computed(() => (dados.value?.compromissos ?? []).filter(c => !c.caso_id))
const tarefasGerais = computed(() => (dados.value?.tarefas ?? []).filter(t => !t.caso_id))
// Monta a mensagem de cobrança (modelo /pendencia) com as listas reais.
async function cobrarDocs(pendentes: Documento[], recebidos: Documento[]) {
  if (!dados.value) return
  await carregarModelos()
  const base = modelos.value.find(m => m.atalho === '/pendencia')?.texto
    ?? 'Oi, [NOME]! Já recebi:\n[RECEBIDOS]\nPassando pra lembrar do envio de:\n[PENDENTES]\nQual prazo fica confortável pra você me enviar?'
  const lista = (ds: Documento[]) => ds.length ? ds.map(d => `📌 ${d.descricao}`).join('\n') : '—'
  resposta.value = preencher(base, dados.value.contato.nome).replace('[RECEBIDOS]', lista(recebidos)).replace('[PENDENTES]', lista(pendentes))
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

// Proposta: modelo /proposta-valor com o honorário mais recente (o que está em jogo vem da análise da demanda).
async function montarProposta() {
  if (!dados.value) return
  await carregarModelos()
  const h = dados.value.honorarios.filter(x => x.tipo !== 'Consulta' && x.status !== 'Cancelado').sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  const base = modelos.value.find(m => m.atalho === '/proposta-valor')?.texto ?? ''
  let texto = preencher(base, dados.value.contato.nome)
  if (h) texto = texto.replace('R$ [VALOR]', brl(h.valor))
  usarMensagem(texto)
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
// Histórico: tudo do cliente, ou só o que aconteceu numa demanda (novas anotações já vão para a demanda escolhida).
const filtroDemanda = ref<number | null>(null)
const atividadesFiltradas = computed(() => (dados.value?.atividades ?? []).filter(a => !filtroDemanda.value || a.caso_id === filtroDemanda.value))
const anotando = ref(false)

async function anotar() {
  if (!nota.texto.trim() || !dados.value) return
  anotando.value = true
  try {
    await $fetch(`/api/crm/contatos/${dados.value.contato.id}/atividades`, { method: 'POST', body: { ...nota, caso_id: filtroDemanda.value } })
    nota.texto = ''
    nota.minutos = ''
    await carregar()
  } finally {
    anotando.value = false
  }
}
</script>

<style scoped>
.filtro-hist { @apply rounded-full border border-gray-300 dark:border-zinc-700 px-3 py-1 text-[11px] font-semibold text-gray-500 hover:text-primary transition-colors; }
.filtro-hist-ativo { @apply bg-primary text-white border-primary hover:text-white; }
.card { @apply rounded-lg border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4 space-y-1.5; }
.card h3 { @apply text-[10px] font-bold uppercase tracking-widest text-primary mb-2; }
.tag { @apply text-[11px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300; }
</style>
