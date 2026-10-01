// Serviços do escritório: fases operacionais e checklist de documentos por tipo de serviço.
// Baseado nos POPs e checklists reais do escritório (adaptado pra prática solo).

export interface FaseServico { titulo: string; texto: string }
export interface GrupoDocumentos { grupo: string | null; itens: string[] }
export interface VarianteServico { id: string; nome: string; fases: FaseServico[] }
export interface Servico {
  id: string
  nome: string
  resumo: string
  variantes: VarianteServico[]
  documentos: GrupoDocumentos[]
}

export const SERVICOS: Servico[] = [
  {
    id: 'divorcio',
    nome: 'Divórcio',
    resumo: 'Pode ser judicial (com filhos menores, litígio ou sem acordo) ou extrajudicial (consensual, em cartório).',
    variantes: [
      {
        id: 'extrajudicial',
        nome: 'Extrajudicial (cartório)',
        fases: [
          { titulo: '1. Levantamento da documentação', texto: 'Verifique a lista do checklist. Oriente o cliente a tirar o certificado digital logo no início — se a lavratura for virtual (e-notariado), a emissão pode demorar.' },
          { titulo: '2. Elaboração da minuta', texto: 'Redija a minuta de divórcio extrajudicial a ser levada ao cartório.' },
          { titulo: '3. Protocolo', texto: 'Acompanhe o procedimento no cartório até finalizar o mais rápido possível.' },
          { titulo: '4. SEFAZ (se houver partilha desigual)', texto: 'O cartório dá "ok" à documentação e carimba a petição; o recolhimento do imposto é feito no sistema próprio da SEFAZ do estado, com os mesmos documentos enviados ao cartório.' },
          { titulo: '5. Averbações', texto: 'Depois da assinatura e lavratura da escritura: 1º Cartório de Registro Civil (divórcio na certidão de casamento; retorno ao sobrenome de solteira, se houver, para a pessoa e os filhos); 2º Registro de Imóveis (bens imóveis); 3º Junta Comercial (empresas); 4º DETRAN (automóveis).' },
        ],
      },
      {
        id: 'judicial',
        nome: 'Judicial',
        fases: [
          { titulo: '1. Levantamento da documentação', texto: 'Identifique se é consensual ou litigioso e verifique a lista do checklist correspondente.' },
          { titulo: '2. Redação da inicial', texto: 'Redija o documento a ser protocolado.' },
          { titulo: '3. Protocolo', texto: 'Acompanhe o processo e as diligências até finalizar o mais rápido possível.' },
          { titulo: '4. SEFAZ (se houver partilha desigual)', texto: 'Dê entrada no procedimento no sistema próprio da SEFAZ do estado.' },
          { titulo: '5. Averbações', texto: 'Depois da sentença ou homologação: 1º Cartório de Registro Civil (divórcio + alteração de nome, se houver, para a pessoa e os filhos); 2º Registro de Imóveis; 3º Junta Comercial; 4º DETRAN.' },
        ],
      },
    ],
    documentos: [
      { grupo: 'Judicial', itens: ['Documento de identificação original com foto (CNH ou RG)', 'Comprovante de residência do mês corrente', 'Imposto de renda dos últimos 3 anos', '3 últimos extratos bancários', 'Certidão de casamento', 'Sentença homologatória do divórcio de casamento anterior, se houver', 'Certidão de nascimento dos filhos', 'Escritura dos imóveis', 'CRLV dos automóveis', 'Extratos (aplicações, poupanças, previdência)', 'Registros fotográficos e de conversas, se relevantes', 'Atas notariais', 'Procuração'] },
      { grupo: 'Extrajudicial', itens: ['Documento de identificação original com foto das partes', 'Certidão de casamento emitida há no máximo 90 dias', 'Comprovante de residência de cada parte', 'Escritura dos imóveis', 'CRLV dos automóveis', 'Extratos (aplicações, poupanças, previdência)', 'Documentação de outros bens', 'Minuta ao cartório assinada digitalmente pelos ex-cônjuges', 'Certificado digital notarizado'] },
    ],
  },
  {
    id: 'dissolucao-ue',
    nome: 'Dissolução de União Estável',
    resumo: 'Mesma lógica do divórcio, mas para quem nunca casou — judicial (litígio ou sem acordo) ou extrajudicial (consensual, em cartório).',
    variantes: [
      {
        id: 'extrajudicial',
        nome: 'Extrajudicial (cartório)',
        fases: [
          { titulo: '1. Levantamento da documentação', texto: 'Oriente o cliente a tirar o certificado digital logo no início, caso a lavratura seja virtual (e-notariado).' },
          { titulo: '2. Elaboração da minuta', texto: 'Redija a minuta de dissolução extrajudicial.' },
          { titulo: '3. Protocolo', texto: 'Acompanhe o procedimento no cartório.' },
          { titulo: '4. SEFAZ (se houver partilha desigual)', texto: 'O cartório dá "ok" à documentação e carimba a petição inicial para o recolhimento do imposto no sistema da SEFAZ.' },
          { titulo: '5. Averbações', texto: 'Depois da assinatura: 1º Registro de Imóveis (bens imóveis); 2º Junta Comercial (empresas); 3º DETRAN (automóveis). Não há registro civil, pois não houve casamento.' },
        ],
      },
      {
        id: 'judicial',
        nome: 'Judicial',
        fases: [
          { titulo: '1. Levantamento da documentação', texto: 'Verifique se é litigiosa ou consensual e a lista do checklist correspondente.' },
          { titulo: '2. Redação da inicial', texto: 'Redija o documento a ser protocolado.' },
          { titulo: '3. Protocolo', texto: 'Acompanhe o processo e as diligências até finalizar.' },
          { titulo: '4. SEFAZ (se houver partilha desigual)', texto: 'Dê entrada no sistema próprio da SEFAZ.' },
          { titulo: '5. Averbações', texto: 'Depois da sentença/homologação: 1º Registro de Imóveis; 2º Junta Comercial; 3º DETRAN.' },
        ],
      },
    ],
    documentos: [
      { grupo: 'Judicial', itens: ['Documento de identificação original com foto', 'Comprovante de residência do mês corrente', 'Imposto de renda dos últimos 3 anos', '3 últimos extratos bancários', 'Contrato particular ou escritura de união estável, se houver', 'Certidão de nascimento dos filhos', 'Escritura dos imóveis', 'CRLV dos automóveis', 'Extratos (aplicações, poupanças, previdência)', 'Registros fotográficos e de conversas, se relevantes', 'Atas notariais', 'Procuração'] },
      { grupo: 'Extrajudicial', itens: ['Documento de identificação original com foto das partes', 'Contrato particular ou escritura de união estável, se houver, emitida há no máximo 90 dias', 'Comprovante de residência de cada parte', 'Escritura dos imóveis', 'CRLV dos automóveis', 'Extratos (aplicações, poupanças, previdência)', 'Documentação de outros bens', 'Minuta ao cartório assinada digitalmente', 'Certificado digital notarizado'] },
    ],
  },
  {
    id: 'registro-ue',
    nome: 'Registro de União Estável',
    resumo: 'Formalizar a união — por escritura pública em cartório ou por contrato particular registrado.',
    variantes: [
      {
        id: 'cartorio',
        nome: 'Escritura pública (cartório)',
        fases: [
          { titulo: '1. Levantamento da documentação', texto: 'Onde: qualquer tabelionato de notas. Oriente o certificado digital logo no início, se a assinatura for virtual pelo e-notariado.' },
          { titulo: '2. Reunião de alinhamento', texto: 'Depois de analisar os documentos, alinhe expectativas com o cliente: estratégia, consequências, documentos complementares. Se o regime de bens for diferente do legal ou tiver cláusulas específicas, elabore a minuta antes da reunião e guarde na pasta do cliente.' },
          { titulo: '3. Lavratura da escritura', texto: 'Envie por e-mail ao cartório: minuta, documentos do checklist, DAJE pago, e a data/horário para assinatura. O cartório retorna a escritura transcrita para revisão antes da assinatura pelo e-notariado.' },
        ],
      },
      {
        id: 'contrato-particular',
        nome: 'Contrato particular registrado',
        fases: [
          { titulo: '1. Levantamento da documentação', texto: 'Oriente o certificado digital logo no início, se o registro no cartório de títulos for virtual.' },
          { titulo: '2. Reunião de alinhamento', texto: 'Valide com o cliente as cláusulas sobre regime de bens e demais disposições patrimoniais e extrapatrimoniais.' },
          { titulo: '3. Registro do contrato', texto: 'Redija o contrato; colete assinatura das partes e de 2 testemunhas com firma reconhecida; registre no cartório de títulos.' },
        ],
      },
    ],
    documentos: [
      { grupo: null, itens: ['Documento de identificação com CPF e RG', 'Certidão conforme o estado civil: divorciado (com averbação, até 90 dias) / solteiro (nascimento, até 90 dias) / viúvo (com averbação de óbito, até 90 dias) / casado (casamento, até 90 dias)', 'Comprovante de residência', 'Telefone e e-mail', 'Profissão', 'Data do início da convivência', 'Certidão de nascimento dos filhos em comum, se houver', 'Definição do regime de bens e das cláusulas desejadas'] },
    ],
  },
  {
    id: 'pacto-antenupcial',
    nome: 'Pacto Antenupcial',
    resumo: 'Instrumento consultivo: regime de bens e cláusulas definidos antes do casamento, por escritura pública. Não envolve processo.',
    variantes: [
      {
        id: 'padrao',
        nome: 'Padrão',
        fases: [
          { titulo: '1. Levantamento da documentação e do patrimônio', texto: 'Peça os documentos das partes e a lista de bens (matrículas atualizadas, participações em empresas, investimentos). Confira com o formulário respondido pelo casal.' },
          { titulo: '2. Análise patrimonial e reunião de alinhamento', texto: 'Analise o patrimônio de cada um e as consequências de cada regime. Alinhe com o casal o regime e as cláusulas desejadas (incomunicabilidade, administração, doação, sucessão).' },
          { titulo: '3. Elaboração e ajustes da minuta', texto: 'Elabore a minuta, envie ao casal, colete os ajustes e guarde a versão final na pasta do cliente.' },
          { titulo: '4. Escritura no cartório de notas', texto: 'Agende a lavratura da escritura pública com o casal. O pacto só vale por escritura pública, antes do casamento.' },
          { titulo: '5. Registro após o casamento', texto: 'Depois da celebração, o pacto é averbado no registro civil e registrado no Registro de Imóveis do domicílio do casal (se houver imóveis). Confirme a conclusão com o casal e encerre a demanda.' },
        ],
      },
    ],
    documentos: [
      { grupo: 'Das partes', itens: ['Documentos de identificação com RG e CPF', 'Certidão de nascimento ou casamento anterior (com averbação de divórcio, se houver)', 'Pacto antenupcial ou escritura de união estável anterior, se houver'] },
      { grupo: 'Dos bens', itens: ['Lista dos bens e data de aquisição', 'Matrículas atualizadas (até 90 dias)', 'Extratos de bens mobiliários (contas, previdência, investimentos)', 'CNPJ e atos constitutivos, se houver empresa'] },
    ],
  },
  {
    id: 'casamento',
    nome: 'Casamento Completo',
    resumo: 'Do pacto antenupcial (se houver) até o registro do pacto no cartório de imóveis, passando pela habilitação e celebração.',
    variantes: [
      {
        id: 'padrao',
        nome: 'Padrão',
        fases: [
          { titulo: '1. Pacto antenupcial (se o regime for diferente do legal)', texto: 'Verifique se o casal quer regime diferente do legal ou outras cláusulas — se sim, faça o pacto. Oriente o certificado digital desde já (pode demorar, faça primeiro). O escritório envia a documentação ao cartório por e-mail e aguarda agendamento; o casamento pode ser à distância. Você (advogada) acompanha a videochamada apenas como telespectadora.' },
          { titulo: '2. Habilitação', texto: 'Envie por e-mail apenas fotos dos documentos; o cartório redige as petições e envia os DAJEs para pagamento, e agenda a entrega presencial dos originais e a data do casamento. Se a celebração for em cartório diferente da habilitação, avise isso desde o início — muda o procedimento.' },
          { titulo: '3. Casamento', texto: 'Celebração presencial no Registro Civil da circunscrição do domicílio dos noivos, com documento de identificação original. Precisam estar presentes os noivos e 2 testemunhas (podem ser diferentes das da habilitação, avisando com antecedência). Casamento por procuração pública é permitido, com poderes especiais e prazo de 90 dias.' },
          { titulo: '4. Registro de imóveis', texto: 'Depois da celebração, registre o pacto antenupcial no Registro de Imóveis da circunscrição do endereço do casal, com o DAJE de prenotação pago (presencial ou pelo site dos registradores).' },
        ],
      },
    ],
    documentos: [
      { grupo: null, itens: ['Petição do edital de proclamas assinada (manual com firma reconhecida, ou digital pelo cartório)', 'Petição das testemunhas assinada', 'Documento de identificação dos noivos (CNH ou RG)', 'Certidão de nascimento dos noivos, original e cópia, emitida nos últimos 90 dias', 'Comprovante de residência', 'Documento de identificação das testemunhas', 'Boletos de pagamento, todos impressos', 'Pacto antenupcial, se houver'] },
    ],
  },
  {
    id: 'alteracao-regime-bens',
    nome: 'Alteração de Regime de Bens',
    resumo: 'Judicial, para quem é casado, ou extrajudicial em cartório, para união estável.',
    variantes: [
      {
        id: 'judicial-casamento',
        nome: 'Judicial (casamento)',
        fases: [
          { titulo: '1. Levantamento da documentação', texto: 'Certidões o próprio escritório emite; só peça ao cliente os documentos pessoais que dependem dele. Guarde tudo na pasta do cliente antes de continuar.' },
          { titulo: '2. Análise e reunião de alinhamento', texto: 'Analise os documentos e alinhe expectativas com o cliente: estratégia, consequências, documentos complementares. Se for alteração de comunhão para separação, é obrigatório verificar se a partilha será feita agora ou depois, e se há previsão de imposto por partilha desigual.' },
          { titulo: '3. Elaboração de peça e protocolo judicial', texto: 'Se houver partilha, ajuste o valor da causa e monte uma planilha com os valores e divisões. Competência: comarca de residência do casal. Não há polo passivo — é ação de jurisdição voluntária.' },
          { titulo: '4. Execução do caso', texto: 'Rito comum: primeiro despacho → Ministério Público para parecer (pode pedir esclarecimentos ou novas certidões) → edital (30 dias úteis) → sentença. É um processo relativamente rápido por não ter litígio; faça diligências se demorar demais.' },
          { titulo: '5. Sentença', texto: 'Confira: se o regime foi alterado corretamente, se a partilha foi determinada corretamente, e se foi expedida a certidão de trânsito em julgado.' },
          { titulo: '6. Pacto pós-nupcial em cartório', texto: 'Etapa final em cartório para efetivar a alteração. Não entra na proposta de honorários por padrão (o cliente pode fazer sozinho) — confira se está incluída na proposta deste caso antes de assumir.' },
          { titulo: '7. SEFAZ (se houver partilha desigual)', texto: 'O cônjuge que ficou com valor acima do quinhão recolhe ITCMD ou ITBI, direto nas plataformas da fazenda. Também não entra na proposta por padrão — confira antes.' },
        ],
      },
      {
        id: 'extrajudicial-ue',
        nome: 'Extrajudicial (união estável)',
        fases: [
          { titulo: 'Atenção antes de começar', texto: 'Se houver certidão positiva de interdições no 1º ofício de registro civil das pessoas naturais do local de residência dos interessados, dos últimos 5 anos, o procedimento tem que ser judicial, não extrajudicial.' },
          { titulo: '1. Levantamento da documentação', texto: 'Certidões o próprio escritório emite; só peça ao cliente os documentos pessoais que dependem dele. Guarde tudo na pasta do cliente antes de continuar.' },
          { titulo: '2. Análise e reunião de alinhamento', texto: 'Mesma lógica do judicial: analisar, alinhar expectativas e verificar se há partilha desigual e previsão de imposto.' },
          { titulo: '3. Elaboração da minuta e protocolo', texto: 'Direto no Cartório de Registro Civil (livro E), de livre escolha dos companheiros. Envie a documentação levantada + a minuta com as disposições do regime e a partilha. Confira antes com o cartório se exigem algum documento fora da lista padrão.' },
          { titulo: '4. SEFAZ (se houver partilha desigual)', texto: 'O cônjuge com valor acima do quinhão recolhe ITCMD ou ITBI, normalmente antes de finalizar em cartório. Não entra na proposta por padrão — confira antes.' },
          { titulo: '5. Finalização', texto: 'Feito o recolhimento do imposto (se houver), a alteração de regime é finalizada em cartório.' },
        ],
      },
    ],
    documentos: [
      { grupo: 'Das partes', itens: ['Documento de identificação original com foto, CPF e RG', 'Comprovante de residência do mês corrente', 'Imposto de renda dos últimos 3 anos', '3 últimos extratos bancários', 'Certidão de casamento ou escritura/contrato de UE', 'Sentença de partilha de bens do casamento anterior, se houver', 'Sentença de partilha de bens de inventário, se houver'] },
      { grupo: 'Dos bens', itens: ['Lista de bens comuns do casal', 'Escritura dos imóveis', 'CRLV dos automóveis', 'Extratos (aplicações, poupanças, previdência)', 'Contrato social e todas as alterações, se houver empresa'] },
      { grupo: 'Certidões (últimos 5 anos)', itens: ['Distribuidor cível e criminal do local de residência (estadual/federal)', 'Execução fiscal do local de residência (estadual/federal)', 'Tabelionatos de protesto do local de residência', 'Justiça do Trabalho do local de residência', 'Interdições perante o 1º ofício de registro civil das pessoas naturais do local de residência'] },
    ],
  },
  {
    id: 'alteracao-nome',
    nome: 'Alteração de Nome',
    resumo: 'Em cartório (extrajudicial, mais rápido) ou pelo juiz (judicial, quando a lei exige).',
    variantes: [
      {
        id: 'padrao',
        nome: 'Padrão',
        fases: [
          { titulo: '1. Solicitação e análise de documentos', texto: 'Peça os documentos conforme o checklist. Certidões e documentos que o escritório pode emitir, emita direto pra ganhar tempo.' },
          { titulo: '2. Em cartório (extrajudicial)', texto: 'Depois de conferir o cumprimento dos artigos 55 e seguintes da Lei de Registros Públicos, envie os documentos ao cartório. Onde: cartório de registro civil — o ideal é o mesmo onde foi feito o registro de nascimento, mas pode ser feito em qualquer um do país. A parte precisa ir presencialmente assinar o requerimento.' },
          { titulo: '3. Pelo juiz (judicial)', texto: 'Quando o caso exigir via judicial: depois de conferir os mesmos artigos, elabore a inicial e protocole. Onde: comarca de competência do domicílio.' },
          { titulo: '4. Averbação', texto: 'Depois de finalizado (em cartório ou por sentença), averbe a alteração de nome em: certidões de nascimento dos filhos, certidão de casamento, CNH, passaporte.' },
        ],
      },
    ],
    documentos: [
      { grupo: 'Das partes', itens: ['Documento de identificação com CPF e RG', 'Comprovante de residência do mês corrente', 'Imposto de renda dos últimos 3 anos', '3 últimos extratos bancários', 'Certidão de casamento ou escritura/contrato de UE'] },
      { grupo: 'Dos filhos', itens: ['Certidão de nascimento'] },
    ],
  },
  {
    id: 'doacao',
    nome: 'Doação',
    resumo: 'Lavratura da escritura de doação em cartório, com recolhimento do imposto (ITCMD).',
    variantes: [
      {
        id: 'padrao',
        nome: 'Padrão',
        fases: [
          { titulo: '1. Solicitação de documentos', texto: 'Oriente o certificado digital desde o início, se a lavratura for virtual. Se alguma parte for representada por procuração, confira se ela tem poderes específicos para a doação, com o imóvel e a matrícula identificados, e o donatário nomeado. Os DAEs dos impostos são emitidos pelo próprio cartório depois da apresentação da documentação.' },
          { titulo: '2. Reunião de alinhamento', texto: 'Depois de analisar os documentos, alinhe expectativas: estratégia, consequências, documentos complementares. Depois da reunião, elabore a minuta com as disposições a serem levadas ao cartório.' },
          { titulo: '3. Lavratura da escritura', texto: 'Envie por e-mail ao cartório: minuta, documentos do checklist, DAE (imposto) pago, DAJE (custas) pago, e a data/horário para assinatura. O procedimento é feito pelo e-notariado.' },
          { titulo: '4. SEFAZ', texto: 'Obrigatoriamente, encaminhe o procedimento ao sistema da Fazenda Estadual pra cálculo e recolhimento do imposto.' },
          { titulo: '5. Averbação', texto: 'Depois de finalizado, averbe no Cartório de Registro de Imóveis.' },
        ],
      },
    ],
    documentos: [
      { grupo: 'Do doador pessoa física', itens: ['Documento de identificação com RG e CPF', 'Comprovante de residência', 'Certidão conforme o estado civil (casamento com averbação de divórcio/óbito, ou nascimento, conforme o caso — até 90 dias)', 'Escritura de pacto antenupcial, se houver', 'Escritura de união estável, se houver', 'Telefone, e-mail e profissão', 'Certidão CNDT', 'Certidão de débitos federais (CND)', 'Certidão negativa de débitos Sefaz/BA', 'Certidão de óbito do proprietário, em caso de cessão de direitos hereditários'] },
      { grupo: 'Do doador pessoa jurídica', itens: ['Contrato social consolidado e última alteração registrada (ou ata de assembleia e estatuto)', 'Comprovante de inscrição e situação cadastral (Receita Federal)', 'Documento de identificação do representante'] },
      { grupo: 'Se representado por procuração', itens: ['Instrumento público de procuração original ou certidão (validade 90 dias)', 'Documento de identificação do procurador'] },
      { grupo: 'Do imóvel', itens: ['Certidão de ônus atualizada (validade 30 dias)', 'Certidão negativa de IPTU', 'Certidão de dados cadastrais (site da Prefeitura)', 'Declaração de condomínio com firma reconhecida do síndico (validade 30 dias)', 'Cópia da ata de eleição do síndico registrada', 'Se rural: ITR dos últimos 5 anos, CCIR, certidão negativa de débitos rurais'] },
      { grupo: 'Das cláusulas', itens: ['Definir as cláusulas da doação: reversão, incomunicabilidade, reserva de usufruto, dispensa de colação etc.'] },
    ],
  },
  {
    id: 'guarda-alimentos',
    nome: 'Guarda e Alimentos',
    resumo: 'Ação de guarda e/ou pensão alimentícia, com cálculo do valor com base na renda e despesas.',
    variantes: [
      {
        id: 'padrao',
        nome: 'Padrão',
        fases: [
          { titulo: '1. Levantamento de informações', texto: 'Envie ao cliente o formulário prévio de despesas e renda. Preencha a planilha com as informações e calcule a pensão: divida a despesa comum pelo número de pessoas da casa, separe a parcela da criança, some com a despesa exclusiva dela, e verifique a proporção do que cada genitor ganha pra chegar no valor e no percentual do salário.' },
          { titulo: '2. Solicitação de documentos', texto: 'Peça os documentos conforme o checklist. Certidões que o escritório pode emitir, emita direto.' },
          { titulo: '3. Análise dos documentos e protocolo', texto: 'Analise a documentação e dê entrada no processo.' },
        ],
      },
    ],
    documentos: [
      { grupo: 'Do representante legal da criança', itens: ['Documento de identificação', 'Comprovante de residência', 'Documentos que comprovem renda (CTPS, contracheque, contrato, extratos, CNPJ etc.)'] },
      { grupo: 'Do genitor que será demandado', itens: ['Nome completo', 'Documento de identificação', 'Telefone e e-mail', 'Endereço completo (residência ou trabalho)', 'Documentos que comprovem renda', 'Documentos atípicos pra comprovar renda pela teoria da aparência (fotos, mensagens etc.)'] },
      { grupo: 'Demais documentos', itens: ['Certidão de nascimento ou RG da criança', 'Documentos que comprovem as despesas da criança', 'Cópias de decisões de processos correlatos (guarda, divórcio/dissolução, medida protetiva)', 'Documentos de eventual condição de saúde da criança (laudos, receitas)', 'Comprovantes de valores já depositados pelo genitor', 'Certidão de nascimento e documentos de outros filhos dos genitores, se houver'] },
    ],
  },
  {
    id: 'inventario',
    nome: 'Inventário e Sobrepartilha',
    resumo: 'Partilha dos bens depois do falecimento — em cartório (extrajudicial, sem litígio) ou judicial.',
    variantes: [
      {
        id: 'extrajudicial',
        nome: 'Extrajudicial (cartório)',
        fases: [
          { titulo: '1. Solicitação de documentos', texto: 'Peça conforme o checklist. Oriente o certificado digital desde o início, se a lavratura for virtual.' },
          { titulo: '2. Análise dos documentos e protocolo', texto: 'Onde: qualquer tabelionato de notas do país (presencial) ou pelo e-notariado, se algum bem ou herdeiro estiver fora do local.' },
          { titulo: '3. SEFAZ', texto: 'Encaminhe ao sistema da Fazenda Estadual (SEI, na Bahia) pra cálculo e recolhimento do imposto de transmissão. Se houver parcelamento, o inventário só finaliza depois da quitação total.' },
          { titulo: '4. Averbação', texto: 'Depois de finalizado: Registro de Imóveis (bens imóveis), Junta Comercial (empresas), DETRAN (automóveis).' },
        ],
      },
      {
        id: 'judicial',
        nome: 'Judicial',
        fases: [
          { titulo: '1. Solicitação de documentos', texto: 'Peça conforme o checklist. Há herdeiro menor/incapaz, testamento ou litígio entre herdeiros? É o que leva o inventário ao Judiciário.' },
          { titulo: '2. Petição inicial e nomeação do inventariante', texto: 'Redija a inicial (abertura do inventário), indique o inventariante e junte a certidão de óbito e a prova do parentesco.' },
          { titulo: '3. Primeiras declarações e citação dos herdeiros', texto: 'Acompanhe as citações e o prazo de impugnação; junte as primeiras declarações com a relação de bens.' },
          { titulo: '4. Avaliação e últimas declarações', texto: 'Avaliação dos bens, cálculo do imposto e últimas declarações.' },
          { titulo: '5. ITCMD (SEFAZ)', texto: 'Recolhimento do imposto de transmissão conforme o cálculo homologado.' },
          { titulo: '6. Partilha e sentença', texto: 'Esboço da partilha, homologação e expedição do formal de partilha.' },
          { titulo: '7. Registro / averbação', texto: 'Com o formal de partilha: Registro de Imóveis, Junta Comercial e DETRAN.' },
        ],
      },
    ],
    documentos: [
      { grupo: 'Do falecido', itens: ['Certidão de óbito', 'Documento de identificação (RG ou CNH)', 'Certidão de casamento ou nascimento expedida após o óbito', 'Último endereço', 'Certidão de testamento (CENSEC)', 'Certidão de habilitados (INSS)', 'Certidões negativas de débitos municipal, estadual e federal'] },
      { grupo: 'Dos herdeiros e cônjuge sobrevivente', itens: ['Documento de identificação com CPF e RG', 'Documento de identificação dos cônjuges/companheiros dos herdeiros, se for o caso', 'Certidão de estado civil (modelo novo, com selo de autenticidade) ou escritura de união estável (até 90 dias)'] },
      { grupo: 'Do imóvel', itens: ['Certidão de ônus atualizada', 'Contrato de compra e venda ou escritura pública de aquisição', 'Matrícula do imóvel', 'Certidão de IPTU do ano vigente'] },
      { grupo: 'Demais', itens: ['Em caso de sobrepartilha: o inventário já realizado e a comprovação do recolhimento do imposto'] },
    ],
  },
  {
    id: 'planejamento',
    nome: 'Planejamento Matrimonial, Patrimonial e Sucessório',
    resumo: 'Organizar o patrimônio e a sucessão com antecedência, usando as ferramentas jurídicas disponíveis.',
    variantes: [
      {
        id: 'padrao',
        nome: 'Padrão',
        fases: [
          { titulo: '1. Solicitação de documentos', texto: 'Peça conforme o checklist.' },
          { titulo: '2. Reunião de alinhamento', texto: 'Depois de analisar os documentos, alinhe expectativas: estratégia, consequências, documentos complementares. Se o casal optar por regime diferente do legal ou cláusulas específicas, elabore a minuta (a mesma que vai ao cartório) antes da reunião e guarde na pasta do cliente.' },
          { titulo: '3. Aplicação das ferramentas', texto: 'Depois do aceite do cliente, comece a aplicar as ferramentas apresentadas (holding, testamento, doação, pacto, etc., conforme o caso).' },
        ],
      },
    ],
    documentos: [
      { grupo: 'Das partes', itens: ['Documentos de identificação com RG e CPF', 'Declaração de IR', 'Certidão de casamento e pacto antenupcial anterior, se houver', 'Contrato/escritura de UE anterior, se houver', 'Sentença de partilha de bens de casamento anterior, se houver'] },
      { grupo: 'Dos bens', itens: ['Lista dos bens e data de aquisição', 'Matrículas atualizadas (até 90 dias)', 'Extratos de bens mobiliários (contas, previdência, investimentos)', 'Apólice securitária', 'Acesso a bens digitais com valor econômico (criptomoedas, NFTs)', 'CNPJ, atos constitutivos e alterações, regulamentos empresariais, pactos parassociais, se houver empresa'] },
      { grupo: 'Atos anteriores', itens: ['Testamentos anteriores', 'Atos de alienação ou doação patrimonial anteriores', 'Documentos sobre a situação dos bens antes da união'] },
      { grupo: 'Só para planejamento sucessório', itens: ['Termo de curatela/TDA, se houver', 'Documentos que comprovem impedimento de sustento pelo próprio esforço', 'Se residente no exterior: procuração, verificar apostilamento', 'Documentos que comprovem limitação de autonomia privada'] },
    ],
  },
  {
    id: 'testamento',
    nome: 'Testamento',
    resumo: 'Elaboração e registro do testamento em cartório, com testemunhas.',
    variantes: [
      {
        id: 'padrao',
        nome: 'Padrão',
        fases: [
          { titulo: '1. Solicitação de documentos', texto: 'Peça conforme o checklist. Oriente o certificado digital desde o início, se a lavratura for virtual.' },
          { titulo: '2. Reunião de alinhamento', texto: 'Alinhe estratégia, consequências e documentos complementares. Depois, elabore a minuta a ser levada ao cartório e guarde na pasta do cliente.' },
          { titulo: '3. Registro em cartório', texto: 'Onde: qualquer tabelionato de notas do país. Envie: documentos do checklist, minuta, comprovante de pagamento do DAJE. Os documentos podem ser cópia simples, com apresentação do original no momento da leitura e assinatura.' },
          { titulo: '4. Assinatura', texto: 'Depois do "ok" do cartório, agende a data (presencial ou e-notariado). Precisam comparecer: testador, testamenteiro e 2 testemunhas (que não podem ser parentes do testador nem dos beneficiários).' },
        ],
      },
    ],
    documentos: [
      { grupo: 'Do testador', itens: ['Documento de identificação', 'Comprovante de residência', 'Certidão de nascimento ou casamento (até 90 dias)', 'Profissão, estado civil, e-mail, telefone', 'Se maior de 65 anos: atestado médico de lucidez, com até 30 dias, assinado digitalmente', 'Informar se os pais são vivos e se há descendentes'] },
      { grupo: 'Do testamenteiro', itens: ['Documento de identificação', 'Comprovante de residência', 'Profissão e estado civil'] },
      { grupo: 'Das testemunhas (não podem ser parentes do testador nem dos beneficiários)', itens: ['Documento de identificação', 'Comprovante de residência', 'Profissão, estado civil, e-mail, telefone'] },
      { grupo: 'Dos bens (cópia simples)', itens: ['Qualquer documento que identifique o imóvel: IPTU atualizado, escritura, certidão de ônus'] },
      { grupo: 'Das cláusulas', itens: ['Definir as cláusulas do testamento: reversão, incomunicabilidade, reserva de usufruto, dispensa de colação etc.'] },
    ],
  },
  {
    id: 'adocao',
    nome: 'Adoção',
    resumo: 'Processo sempre judicial: habilitação, avaliação, cadastro nacional, estágio de convivência e ação de adoção.',
    variantes: [
      {
        id: 'padrao',
        nome: 'Padrão',
        fases: [
          { titulo: '1. Solicitação de documentos', texto: 'Peça conforme o checklist. Certidões que o escritório pode emitir, emita direto.' },
          { titulo: '2. Análise dos documentos e protocolo', texto: 'Onde: Vara da Infância e Juventude da comarca de residência dos postulantes.' },
          { titulo: '3. Avaliação interprofissional', texto: 'Equipe técnica multidisciplinar do Judiciário avalia motivações, expectativas e a realidade sociofamiliar dos postulantes.' },
          { titulo: '4. Participação em programa de adoção', texto: 'Preparo jurídico e psicossocial dos postulantes para a convivência inicial com a criança/adolescente.' },
          { titulo: '5. Análise judicial do pedido', texto: 'O juiz decide, com base no estudo psicossocial, na certificação de preparação e no parecer do Ministério Público, sobre deferir ou não a habilitação. A habilitação vale 3 anos, renovável. Prazo máximo: 120 dias, prorrogável uma vez.' },
          { titulo: '6. CNA — Cadastro Nacional de Adoção', texto: 'Depois de deferida a habilitação, os dados dos postulantes entram no cadastro nacional, na ordem cronológica da decisão.' },
          { titulo: '7. Busca pela família', texto: 'O Judiciário busca uma criança/adolescente com o perfil definido; se houver interesse, permite aproximação — o estágio de convivência é monitorado pela Justiça e pela equipe técnica.' },
          { titulo: '8. Estágio de convivência', texto: 'A criança passa a morar com a família, acompanhada pela equipe técnica. Prazo máximo: 90 dias, prorrogável por igual período.' },
          { titulo: '9. Adoção', texto: 'A partir do fim do estágio de convivência, os pretendentes têm 15 dias para propor a ação de adoção. Prazo máximo: 120 dias, prorrogável uma vez.' },
        ],
      },
    ],
    documentos: [
      { grupo: null, itens: ['Cópias autenticadas da certidão de nascimento ou casamento, ou declaração de união estável', 'Cópias de RG e CPF', 'Comprovante de renda e de residência', 'Atestados de sanidade física e mental', 'Certidão negativa de distribuição cível', 'Certidão de antecedentes criminais'] },
    ],
  },
]
