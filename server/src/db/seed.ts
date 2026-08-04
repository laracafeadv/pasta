import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, schema } from "./index.js";
import { slugify } from "../lib/slugify.js";

async function seed() {
  console.log("Seeding database...");

  const existingCategories = await db.select().from(schema.blogCategories);
  let categoryIds: Record<string, number> = {};

  if (existingCategories.length === 0) {
    const categoriesData = [
      {
        name: "Direito de Família",
        description:
          "Casamento, divórcio, guarda de filhos, pensão alimentícia e mediação familiar.",
      },
      {
        name: "Sucessões",
        description:
          "Planejamento sucessório, testamentos, inventário e partilha de bens.",
      },
      {
        name: "Direito Patrimonial",
        description:
          "Proteção e gestão de patrimônio, contratos imobiliários e direitos reais.",
      },
    ];

    for (const cat of categoriesData) {
      const [inserted] = await db
        .insert(schema.blogCategories)
        .values({ name: cat.name, slug: slugify(cat.name), description: cat.description })
        .returning();
      categoryIds[cat.name] = inserted.id;
    }
    console.log("Categories seeded.");
  } else {
    for (const cat of existingCategories) {
      categoryIds[cat.name] = cat.id;
    }
    console.log("Categories already exist, skipping.");
  }

  const existingArticles = await db.select().from(schema.blogArticles);
  if (existingArticles.length === 0) {
    const articlesData = [
      {
        title: "Guarda Compartilhada: Como Funciona na Prática",
        category: "Direito de Família",
        excerpt:
          "Entenda os direitos e deveres de cada genitor na guarda compartilhada e como ela protege o melhor interesse da criança.",
        content: `<h2>O que é a guarda compartilhada?</h2><p>A guarda compartilhada é a regra geral no ordenamento jurídico brasileiro desde 2014, e determina que ambos os genitores dividam a responsabilidade legal pelas decisões sobre a vida do filho, mesmo quando a criança reside predominantemente com um deles.</p><h3>Principais direitos e deveres</h3><ul><li>Participação conjunta nas decisões sobre educação e saúde</li><li>Convivência ampla e equilibrada com ambos os genitores</li><li>Divisão proporcional das despesas conforme a capacidade financeira</li></ul><p>Cada caso possui particularidades que devem ser avaliadas por um profissional especializado, garantindo que o acordo firmado realmente atenda às necessidades da família.</p><blockquote>O foco de qualquer decisão sobre guarda deve ser sempre o melhor interesse da criança.</blockquote><h3>Quando buscar orientação jurídica</h3><p>Se você está passando por uma separação e tem dúvidas sobre guarda, convivência ou pensão alimentícia, procure orientação especializada antes de firmar qualquer acordo.</p>`,
      },
      {
        title: "Pensão Alimentícia: Como é Calculado o Valor?",
        category: "Direito de Família",
        excerpt:
          "Descubra os principais critérios usados pela Justiça para fixar o valor da pensão alimentícia entre pais e filhos.",
        content: `<h2>Critérios para fixação da pensão</h2><p>O valor da pensão alimentícia é definido com base no binômio necessidade-possibilidade: a necessidade de quem recebe e a possibilidade financeira de quem paga.</p><h3>Fatores considerados</h3><ul><li>Renda comprovada do alimentante</li><li>Despesas essenciais do alimentado (educação, saúde, moradia)</li><li>Padrão de vida da família antes da separação</li></ul><p>Não existe uma fórmula fixa em lei, o que torna essencial uma análise individualizada de cada situação para propor um valor justo e sustentável.</p>`,
      },
      {
        title: "Testamento: Por Que Todo Mundo Deveria Ter Um",
        category: "Sucessões",
        excerpt:
          "Planejar a sucessão em vida evita conflitos familiares e garante que sua vontade seja respeitada.",
        content: `<h2>A importância do testamento</h2><p>Muitas pessoas acreditam que testamento é assunto apenas para grandes fortunas, mas essa ferramenta é útil para qualquer patrimônio, por menor que seja.</p><h3>Vantagens do planejamento sucessório</h3><ul><li>Reduz conflitos entre herdeiros</li><li>Permite direcionar bens para pessoas ou causas específicas, dentro dos limites legais</li><li>Agiliza o processo de inventário</li></ul><p>Existem diferentes modalidades de testamento previstas em lei, cada uma com requisitos formais próprios. Um advogado especialista pode indicar a mais adequada ao seu caso.</p><blockquote>O planejamento que você faz hoje, protege o seu futuro amanhã.</blockquote>`,
      },
      {
        title: "Inventário Extrajudicial: Quando é Possível?",
        category: "Sucessões",
        excerpt:
          "Conheça os requisitos para realizar o inventário em cartório, de forma mais rápida e econômica.",
        content: `<h2>Requisitos do inventário extrajudicial</h2><p>O inventário extrajudicial pode ser feito diretamente em cartório quando há consenso entre todos os herdeiros e nenhum deles é menor de idade ou incapaz.</p><h3>Vantagens</h3><ul><li>Processo mais rápido que o judicial</li><li>Menor custo com honorários e taxas processuais</li><li>Maior flexibilidade de agenda</li></ul><p>É indispensável a presença de um advogado para assessorar as partes durante todo o procedimento, garantindo a correta partilha dos bens.</p>`,
      },
      {
        title: "Como Proteger seu Patrimônio em uma União Estável",
        category: "Direito Patrimonial",
        excerpt:
          "Contratos de convivência e planejamento patrimonial são aliados importantes para casais em união estável.",
        content: `<h2>Planejamento patrimonial na união estável</h2><p>A união estável gera efeitos patrimoniais entre os companheiros, semelhantes aos do casamento, salvo estipulação em contrário por meio de contrato de convivência.</p><h3>Ferramentas de proteção</h3><ul><li>Contrato de convivência com escolha do regime de bens</li><li>Cláusulas de incomunicabilidade patrimonial</li><li>Planejamento sucessório integrado</li></ul><p>Formalizar essas questões evita disputas futuras e garante segurança jurídica para ambos os parceiros.</p>`,
      },
      {
        title: "Contratos Imobiliários: Cuidados Essenciais Antes de Assinar",
        category: "Direito Patrimonial",
        excerpt:
          "Veja os pontos de atenção antes de fechar negócio na compra, venda ou locação de imóveis.",
        content: `<h2>Antes de assinar o contrato</h2><p>Contratos imobiliários envolvem valores expressivos e riscos jurídicos que podem ser evitados com uma análise prévia cuidadosa.</p><h3>Pontos de atenção</h3><ul><li>Verificação de certidões do imóvel e das partes</li><li>Cláusulas de rescisão e multas</li><li>Condições de pagamento e reajuste</li></ul><p>A revisão contratual por um advogado especializado é um investimento que evita prejuízos muito maiores no futuro.</p>`,
      },
    ];

    for (const art of articlesData) {
      await db.insert(schema.blogArticles).values({
        title: art.title,
        slug: slugify(art.title),
        content: art.content,
        excerpt: art.excerpt,
        categoryId: categoryIds[art.category],
        author: "Dra. Lara Café",
        imageUrl: "/assets/blog-cover-default.jpg",
        status: "published",
        publishedAt: new Date(),
      });
    }
    console.log("Articles seeded.");
  } else {
    console.log("Articles already exist, skipping.");
  }

  const existingTestimonials = await db.select().from(schema.testimonials);
  if (existingTestimonials.length === 0) {
    await db.insert(schema.testimonials).values([
      {
        authorName: "Maria Silva",
        profession: "Empresária",
        content:
          "A Dra. Lara foi fundamental na resolução do meu caso. Muito profissional e atenciosa.",
        rating: 5,
      },
      {
        authorName: "João Santos",
        profession: "Médico",
        content: "Excelente orientação jurídica. Recomendo para todos os meus amigos.",
        rating: 5,
      },
      {
        authorName: "Ana Costa",
        profession: "Professora",
        content: "Muito satisfeita com o resultado. Profissional competente e dedicada.",
        rating: 5,
      },
    ]);
    console.log("Testimonials seeded.");
  } else {
    console.log("Testimonials already exist, skipping.");
  }

  const adminEmail = process.env.ADMIN_EMAIL || "admin@laracafeadvocacia.com.br";
  const adminPassword = process.env.ADMIN_PASSWORD || "TrocarSenha123!";
  const existingAdmin = await db
    .select()
    .from(schema.adminUsers)
    .where(eq(schema.adminUsers.email, adminEmail));

  if (existingAdmin.length === 0) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await db.insert(schema.adminUsers).values({
      email: adminEmail,
      passwordHash,
      name: "Dra. Lara Café",
    });
    console.log(`Admin user created: ${adminEmail}`);
    if (!process.env.ADMIN_PASSWORD) {
      console.log(
        `⚠️  Using default password "${adminPassword}". Set ADMIN_EMAIL/ADMIN_PASSWORD env vars before deploying.`
      );
    }
  } else {
    console.log("Admin user already exists, skipping.");
  }

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
