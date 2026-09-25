const llmsConfig = {
  domain: process.env.NUXT_PUBLIC_ORIGINAL_SITE_URL || process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  title: 'CRM Lara Café',
  description: 'Plataforma SaaS com autenticacao Supabase, gerenciamento de usuarios e painel administrativo. Construido com Nuxt 4, Tailwind CSS e Pinia.',
  sections: [
    {
      title: 'Autenticacao',
      description: 'Fluxos de login, cadastro e confirmacao de email via Supabase Auth.',
      links: [
        {
          title: 'Login e Cadastro',
          description: 'Pagina de autenticacao com tabs de login e cadastro. Validacao de senha forte, termos de uso e redirecionamento pos-auth.',
          href: '/login'
        },
        {
          title: 'Confirmacao de Email',
          description: 'Pagina de callback do Supabase para confirmar o email apos cadastro.',
          href: '/confirm'
        }
      ]
    },
    {
      title: 'API do Servidor',
      description: 'Rotas de API protegidas com validacao JWT e controle de role no servidor.',
      links: [
        {
          title: 'GET /api/me',
          description: 'Retorna o perfil do usuario autenticado. Cria o perfil automaticamente se nao existir na tabela profiles.',
          href: '/api/me'
        },
        {
          title: 'GET /api/admin/users',
          description: 'Lista todos os usuarios cadastrados. Restrito a usuarios com role admin.',
          href: '/api/admin/users'
        },
        {
          title: 'PUT /api/admin/users',
          description: 'Atualiza nome e/ou role de um usuario. Restrito a usuarios com role admin. Body: { id, name?, role? }.',
          href: '/api/admin/users'
        }
      ]
    },
    {
      title: 'Painel Principal',
      description: 'Area principal do app protegida por middleware de autenticacao.',
      links: [
        {
          title: 'Dashboard',
          description: 'Pagina principal com design system de componentes. Requer autenticacao via middleware auth.',
          href: '/'
        }
      ]
    }
  ],
  full: {
    title: 'CRM Lara Café - Documentação',
    description: 'Documentação técnica da plataforma. Stack: Nuxt 4, Tailwind CSS, Supabase Auth, Pinia.'
  }
}

export default llmsConfig
