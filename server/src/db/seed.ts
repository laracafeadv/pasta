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
          "Casamento, divórcio, união estável e mediação familiar.",
      },
      {
        name: "Sucessões",
        description:
          "Planejamento sucessório e patrimonial, testamentos, inventário e partilha de bens.",
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
        title: "Divórcio Consensual: Como Funciona o Processo",
        category: "Direito de Família",
        imageUrl: "/assets/blog-cover-divorcio.jpg",
        excerpt:
          "Entenda as etapas do divórcio consensual e como um acordo bem construído evita desgaste e economiza tempo.",
        content: `<h2>O que é o divórcio consensual?</h2><p>Quando o casal está de acordo sobre a separação e seus termos — partilha de bens, uso do nome —, o divórcio pode ser resolvido de forma consensual, judicial ou extrajudicialmente em cartório.</p><h3>Requisitos para a via extrajudicial</h3><ul><li>Consenso entre as partes sobre todos os termos</li><li>Ausência de filhos menores ou incapazes</li><li>Assistência de advogado, obrigatória em qualquer modalidade</li></ul><p>Cada caso possui particularidades que devem ser avaliadas por um profissional especializado, garantindo que o acordo firmado realmente reflita a vontade das partes.</p><blockquote>Um acordo bem construído protege tanto quanto uma sentença — e custa muito menos em tempo e desgaste.</blockquote><h3>Quando buscar orientação jurídica</h3><p>Se você está considerando uma separação, procure orientação especializada antes de firmar qualquer acordo, mesmo que a relação com o outro cônjuge esteja amigável.</p>`,
      },
      {
        title: "União Estável: Direitos e Deveres do Casal",
        category: "Direito de Família",
        imageUrl: "/assets/blog-cover-uniao-estavel.jpg",
        excerpt:
          "Conheça os efeitos jurídicos da união estável e por que formalizar a relação protege ambas as partes.",
        content: `<h2>O que caracteriza a união estável?</h2><p>A união estável é reconhecida quando há convivência pública, contínua e duradoura, com o objetivo de constituir família — independentemente de contrato formal.</p><h3>Efeitos jurídicos</h3><ul><li>Regime de bens equivalente ao da comunhão parcial, salvo contrato em contrário</li><li>Direitos sucessórios entre os companheiros</li><li>Possibilidade de conversão em casamento</li></ul><p>Formalizar a união por meio de um contrato de convivência permite às partes escolher o regime de bens e evitar disputas futuras sobre o que foi ou não acordado.</p>`,
      },
      {
        title: "Testamento: Por Que Todo Mundo Deveria Ter Um",
        category: "Sucessões",
        imageUrl: "/assets/blog-cover-testamento.jpg",
        excerpt:
          "Planejar a sucessão em vida evita conflitos familiares e garante que sua vontade seja respeitada.",
        content: `<h2>A importância do testamento</h2><p>Muitas pessoas acreditam que testamento é assunto apenas para grandes fortunas, mas essa ferramenta é útil para qualquer patrimônio, por menor que seja.</p><h3>Vantagens do planejamento sucessório</h3><ul><li>Reduz conflitos entre herdeiros</li><li>Permite direcionar bens para pessoas ou causas específicas, dentro dos limites legais</li><li>Agiliza o processo de inventário</li></ul><p>Existem diferentes modalidades de testamento previstas em lei, cada uma com requisitos formais próprios. Um advogado especialista pode indicar a mais adequada ao seu caso.</p><blockquote>O planejamento que você faz hoje, protege o seu futuro amanhã.</blockquote>`,
      },
      {
        title: "Inventário Extrajudicial: Quando é Possível?",
        category: "Sucessões",
        imageUrl: "/assets/blog-cover-inventario.jpg",
        excerpt:
          "Conheça os requisitos para realizar o inventário em cartório, de forma mais rápida e econômica.",
        content: `<h2>Requisitos do inventário extrajudicial</h2><p>O inventário extrajudicial pode ser feito diretamente em cartório quando há consenso entre todos os herdeiros e nenhum deles é menor de idade ou incapaz.</p><h3>Vantagens</h3><ul><li>Processo mais rápido que o judicial</li><li>Menor custo com honorários e taxas processuais</li><li>Maior flexibilidade de agenda</li></ul><p>É indispensável a presença de um advogado para assessorar as partes durante todo o procedimento, garantindo a correta partilha dos bens.</p>`,
      },
      {
        title: "Como Proteger seu Patrimônio em uma União Estável",
        category: "Sucessões",
        imageUrl: "/assets/blog-cover-patrimonio-uniao.jpg",
        excerpt:
          "Contratos de convivência e planejamento patrimonial são aliados importantes para casais em união estável.",
        content: `<h2>Planejamento patrimonial na união estável</h2><p>A união estável gera efeitos patrimoniais entre os companheiros, semelhantes aos do casamento, salvo estipulação em contrário por meio de contrato de convivência.</p><h3>Ferramentas de proteção</h3><ul><li>Contrato de convivência com escolha do regime de bens</li><li>Cláusulas de incomunicabilidade patrimonial</li><li>Planejamento sucessório integrado</li></ul><p>Formalizar essas questões evita disputas futuras e garante segurança jurídica para ambos os parceiros.</p>`,
      },
      {
        title: "Contratos Imobiliários: Cuidados Essenciais Antes de Assinar",
        category: "Sucessões",
        imageUrl: "/assets/blog-cover-imobiliario.jpg",
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
        author: "Lara Café",
        imageUrl: art.imageUrl,
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
          "A Lara foi fundamental na resolução do meu caso. Muito profissional e atenciosa.",
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
      name: "Lara Café",
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
