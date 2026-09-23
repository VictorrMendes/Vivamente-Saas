import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Search, UserRound } from "lucide-react";
import { loadCatalogSpecialties, loadProfessionalsCatalog } from "@/lib/api/professionals-catalog";
import { backendErrorMessage } from "@/lib/api/professionals";
import { ProfessionalPortrait } from "@/components/professional-portrait";
import { LIMITS } from "@/lib/field-limits";

export const metadata: Metadata = {
  title: "Terapeutas da VivaMente",
  description: "Conheça os profissionais da rede VivaMente e encontre um caminho para o atendimento que você procura.",
  alternates: { canonical: "/terapeutas" },
};

type Props = {
  searchParams: Promise<{ q?: string; page?: string; especialidade?: string }>;
};

export default async function TherapistsCatalogPage({ searchParams }: Props) {
  const { q: qParam, page: pageParam, especialidade } = await searchParams;
  // A URL é livre: o maxLength do input não vale pra quem monta o link na mão.
  const q = qParam?.slice(0, LIMITS.search);
  const page = Math.max(1, Number(pageParam) || 1);
  const specialtyId = Number(especialidade) || undefined;
  const [result, specialties] = await Promise.all([
    loadProfessionalsCatalog({ page, search: q, specialty: specialtyId }),
    loadCatalogSpecialties(),
  ]);

  return (
    <div className="landing-container catalog-page">
      <div className="catalog-header" data-reveal>
        <p className="eyebrow"><span className="eyebrow-dot" /> REDE VIVAMENTE</p>
        <h1 className="section-title">Conheça os<br /><em>terapeutas.</em></h1>
        <p className="section-description">Cada profissional tem uma trajetória própria. Explore os perfis e encontre um caminho que faça sentido para você.</p>
        <form className="catalog-search" role="search" action="/terapeutas">
          <Search size={18} aria-hidden />
          <label htmlFor="catalog-q" className="sr-only">Buscar por nome</label>
          <input id="catalog-q" type="search" name="q" maxLength={LIMITS.search} placeholder="Buscar por nome" defaultValue={q ?? ""} />
          {specialties.length > 0 && (
            <>
              <label htmlFor="catalog-especialidade" className="sr-only">Filtrar por especialidade</label>
              <select id="catalog-especialidade" name="especialidade" defaultValue={especialidade ?? ""}>
                <option value="">Todas as especialidades</option>
                {specialties.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </>
          )}
          <button type="submit" className="landing-button">Buscar</button>
        </form>
      </div>

      {!result.ok ? (
        <div role="alert" className="rounded-lg border border-error bg-error-bg px-4 py-3 text-body text-error">
          {backendErrorMessage(result.reason)}
        </div>
      ) : result.catalog.data.length === 0 ? (
        <div className="catalog-empty">
          <UserRound size={27} strokeWidth={1.3} aria-hidden />
          <h2>{q || specialtyId ? "Nenhum terapeuta encontrado" : "Nenhum terapeuta publicado no momento"}</h2>
          <p>{q || specialtyId ? "Tente ajustar a busca ou a especialidade, ou " : "Ainda não há perfis públicos para exibir. "}
            <Link href="/contato?interesse=atendimento">peça uma indicação diretamente à equipe <ArrowUpRight size={15} aria-hidden /></Link>.
          </p>
        </div>
      ) : (
        <>
          <ul className="catalog-grid">
            {result.catalog.data.map((professional) => (
              <li key={professional.slug} data-reveal>
                <Link href={`/${professional.slug}`} className="catalog-card">
                  <div className="catalog-card-portrait"><ProfessionalPortrait name={professional.full_name} photoUrl={professional.photo_url} /></div>
                  <h2>{professional.full_name}</h2>
                  {professional.registration && <p className="catalog-card-registration">{professional.registration}</p>}
                  {professional.specialties.length > 0 && (
                    <ul className="specialty-list">
                      {professional.specialties.slice(0, 3).map((specialty) => <li key={specialty.id}>{specialty.name}</li>)}
                    </ul>
                  )}
                  <span className="catalog-card-cta">Conhecer o perfil <ArrowUpRight size={16} aria-hidden /></span>
                </Link>
              </li>
            ))}
          </ul>

          {result.catalog.pagination.total_pages > 1 && (
            <nav aria-label="Paginação" className="catalog-pagination">
              {page > 1 && (
                <Link href={`/terapeutas?${new URLSearchParams({ ...(q ? { q } : {}), ...(especialidade ? { especialidade } : {}), page: String(page - 1) })}`}>Anterior</Link>
              )}
              <span aria-current="page">Página {page} de {result.catalog.pagination.total_pages}</span>
              {page < result.catalog.pagination.total_pages && (
                <Link href={`/terapeutas?${new URLSearchParams({ ...(q ? { q } : {}), ...(especialidade ? { especialidade } : {}), page: String(page + 1) })}`}>Próxima</Link>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
