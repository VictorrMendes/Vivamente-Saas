import type { MetadataRoute } from "next";

/**
 * Só rotas estáticas e indexáveis. Sem endpoint público de listagem de
 * terapeutas no Back não há como enumerar slugs de /[slug] aqui — e
 * /sobre, /privacidade, /termos ainda são placeholders (`robots: noindex`),
 * então também ficam de fora até terem conteúdo real. Revisar quando o Back
 * expuser uma listagem pública.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return [
    {
      url: siteUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
