import SEO from "../components/SEO";

export default function PrivacyPolicy() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <SEO title="Política de Privacidade | Lara Café Advocacia" />
      <h1 className="text-[1.85rem] font-normal tracking-tight text-coffee">
        Política de Privacidade
      </h1>
      <div className="prose-article mt-6 text-ink/80">
        <p>
          A Lara Café Advocacia respeita a sua privacidade e está comprometida com a proteção
          dos seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados
          (LGPD - Lei nº 13.709/2018).
        </p>
        <h2>Dados coletados</h2>
        <p>
          Coletamos apenas os dados fornecidos voluntariamente por você através do formulário
          de contato: nome, e-mail, telefone e mensagem.
        </p>
        <h2>Finalidade</h2>
        <p>
          Os dados são utilizados exclusivamente para retornar seu contato e prestar
          esclarecimentos sobre os serviços jurídicos oferecidos.
        </p>
        <h2>Compartilhamento</h2>
        <p>
          Seus dados não são compartilhados, vendidos ou cedidos a terceiros, salvo obrigação
          legal.
        </p>
        <h2>Seus direitos</h2>
        <p>
          Você pode solicitar a qualquer momento a confirmação, correção ou exclusão dos seus
          dados pessoais entrando em contato através dos nossos canais oficiais.
        </p>
      </div>
    </div>
  );
}
