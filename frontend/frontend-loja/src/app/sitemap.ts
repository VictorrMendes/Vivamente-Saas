import type { MetadataRoute } from "next";
import { loadProfessionalsCatalog } from "@/lib/api/professionals-catalog";

/**
 * Rotas estáticas e indexáveis + perfis públicos, enumerados via
 * GET /api/v1/public/professionals (catálogo). /sobre, /privacidade e
 * /termos continuam de fora até terem conteúdo real (robots: noindex).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/terapeutas`, changeFrequency: "weekly", priority: 0.8 },
  ];

  const professionalRoutes: MetadataRoute.Sitemap = [];
  // ponytail: cap simples em 10 páginas (até 200 perfis) em vez de percorrer
  // um catálogo sem limite; promover pra paginação real se o número de
  // terapeutas publicados crescer além disso.
  for (let page = 1; page <= 10; page += 1) {
    const result = await loadProfessionalsCatalog({ page });
    if (!result.ok) break;
    for (const professional of result.catalog.data) {
      professionalRoutes.push({
        url: `${siteUrl}/${professional.slug}`,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
    if (page >= result.catalog.pagination.total_pages) break;
  }

  return [...staticRoutes, ...professionalRoutes];
}
