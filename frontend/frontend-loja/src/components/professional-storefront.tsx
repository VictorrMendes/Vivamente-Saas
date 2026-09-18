import Link from "next/link";
import { ArrowDown, ArrowUpRight, Clock3, HeartHandshake, Leaf, MapPin, MessageCircle, Plus, Video } from "lucide-react";
import type { PublicProfessional, PublicService } from "@/lib/api/types";
import { formatPrice, getInitials } from "@/lib/format";
import { ProfessionalPortrait } from "./professional-portrait";
import styles from "./professional-storefront.module.css";

const modalityLabels: Record<PublicService["modality"], string> = {
  ONLINE: "Online", IN_PERSON: "Presencial", BOTH: "Online ou presencial",
};

const questions = [
  ["Preciso saber qual atendimento escolher?", "Não. Você pode enviar uma solicitação sem escolher um serviço ou horário. Conte brevemente o que procura e converse com o profissional sobre as possibilidades."],
  ["A solicitação já confirma minha consulta?", "Ainda não. O formulário inicia o contato. A consulta só fica confirmada depois que você e o profissional combinam os detalhes."],
  ["Como saber a modalidade e o valor?", "Cada atendimento informa sua modalidade, duração e valor quando cadastrados. Se o valor estiver sob consulta, combine os detalhes diretamente com o profissional antes de confirmar."],
];

export function ProfessionalStorefront({ professional }: { professional: PublicProfessional }) {
  const contactHref = `/${encodeURIComponent(professional.slug)}/agendar`;
  return (
    <div className={styles.storefront}>
      <div className={styles.identityBar}>
        <div className={`landing-container ${styles.identityInner}`}>
          <a href="#sobre" className={styles.identity}>
            <span className={styles.avatar} aria-hidden>{getInitials(professional.full_name)}</span>
            <span><small>SEU ESPAÇO DE CUIDADO</small><strong>{professional.full_name}</strong></span>
          </a>
          <Link href={contactHref} className={styles.contactLink}><MessageCircle size={18} aria-hidden /><span>Falar com o profissional</span><ArrowUpRight size={16} aria-hidden /></Link>
        </div>
      </div>

      <nav className={styles.sectionNav} aria-label="Explore o perfil">
        <div className="landing-container">
          <a href="#servicos"><HeartHandshake size={18} aria-hidden />Atendimentos</a>
          <a href="#sobre"><Leaf size={18} aria-hidden />Conheça o profissional</a>
          <a href="#como-funciona"><Clock3 size={18} aria-hidden />Como começar</a>
          <a href="#duvidas"><MessageCircle size={18} aria-hidden />Dúvidas frequentes</a>
        </div>
      </nav>

      <section className={styles.hero} aria-labelledby="profile-heading">
        <div className={`landing-container ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><Leaf size={16} aria-hidden /> VIVAMENTE · CONEXÕES PARA O CUIDADO</p>
            <h1 id="profile-heading">Cuidar de você começa com <em>uma boa conversa.</em></h1>
            <p>Um encontro com {professional.full_name}. Conheça os atendimentos e encontre um primeiro passo que faça sentido para o seu momento.</p>
            <div className={styles.heroActions}>
              <Link href={contactHref} className={styles.lightButton}>Quero conversar <ArrowUpRight size={18} aria-hidden /></Link>
              <a href="#servicos">Explorar atendimentos <ArrowDown size={17} aria-hidden /></a>
            </div>
            <span className={styles.heroNote}>No seu tempo. Com espaço para as suas perguntas.</span>
          </div>
          <div className={styles.profileCard}>
            <ProfessionalPortrait name={professional.full_name} photoUrl={professional.photo_url} />
            <div className={styles.profileCaption}>
              <span>CONHEÇA QUEM VAI TE ATENDER</span>
              <h2>{professional.full_name}</h2>
              {professional.registration && <p>{professional.registration}</p>}
            </div>
          </div>
        </div>
      </section>

      <div className={styles.introStrip}>
        <div className="landing-container"><p><Leaf size={20} aria-hidden /> Uma pessoa, uma história.</p><p><HeartHandshake size={20} aria-hidden /> Cuidado que começa na escuta.</p><p><MessageCircle size={20} aria-hidden /> Converse antes de decidir.</p></div>
      </div>

      <section id="servicos" className={`landing-container ${styles.services} ${styles.anchor}`} aria-labelledby="services-heading">
        <div className={styles.sectionHeading}>
          <div><p className={styles.eyebrow}>POSSIBILIDADES PARA O SEU MOMENTO</p><h2 id="services-heading">Encontre seu caminho<br />para o cuidado.</h2></div>
          <p>Explore os atendimentos de {professional.full_name}. Os detalhes são combinados diretamente com o profissional.</p>
        </div>
        {professional.services.length > 0 ? (
          <ul className={styles.serviceGrid}>
            {professional.services.map((service) => (
              <li key={service.id} className={styles.serviceCard}>
                <div className={styles.serviceTop}><span className={styles.serviceIcon}>{service.modality === "IN_PERSON" ? <MapPin size={26} aria-hidden /> : <Video size={26} aria-hidden />}</span><span>{modalityLabels[service.modality]}</span></div>
                <h3>{service.name}</h3>
                {service.description && <p className={styles.serviceDescription}>{service.description}</p>}
                <div className={styles.serviceDetails}><span><Clock3 size={16} aria-hidden /> {service.duration_minutes} minutos</span><strong>{formatPrice(service.price)}</strong></div>
                <Link className={styles.serviceAction} href={contactHref} aria-label={`Conversar sobre ${service.name}`}>Quero saber mais <ArrowUpRight size={17} aria-hidden /></Link>
              </li>
            ))}
          </ul>
        ) : <div className={styles.emptyServices}><MessageCircle size={26} aria-hidden /><p>Os atendimentos ainda não foram publicados. Você pode conversar com o profissional para conhecer as possibilidades.</p><Link href={contactHref} className="landing-text-link">Pedir informações <ArrowUpRight size={17} aria-hidden /></Link></div>}
        <div className={styles.guidance}><span>Não sabe por onde começar?</span><Link href={contactHref}>Conte o que você procura <ArrowUpRight size={16} aria-hidden /></Link></div>
      </section>

      <section id="sobre" className={`${styles.about} ${styles.anchor}`} aria-labelledby="about-heading">
        <div className={`landing-container ${styles.aboutGrid}`}>
          <div><p className={styles.eyebrow}>POR TRÁS DO ATENDIMENTO</p><h2 id="about-heading">Prazer,<br />{professional.full_name}.</h2>{professional.registration && <p className={styles.registration}>{professional.registration}</p>}</div>
          <div><p className={styles.bio}>{professional.bio || "Conheça o trabalho deste profissional em uma primeira conversa. Tire suas dúvidas sobre os atendimentos e as possibilidades de cuidado."}</p>
            {professional.specialties.length > 0 && <><h3 className={styles.specialtiesLabel}>Áreas de atuação</h3><ul className={styles.specialties}>{professional.specialties.map(specialty => <li key={specialty.id}>{specialty.name}</li>)}</ul></>}
            <Link href={contactHref} className="landing-text-link">Vamos conversar? <ArrowUpRight size={18} aria-hidden /></Link>
          </div>
        </div>
      </section>

      <section id="como-funciona" className={`landing-container ${styles.process} ${styles.anchor}`} aria-labelledby="process-heading">
        <p className={styles.eyebrow}>SIMPLES, DESDE O PRIMEIRO PASSO</p><h2 id="process-heading">Do seu jeito. No seu tempo.</h2>
        <ol className={styles.steps}>
          <li><span>01</span><h3>Conte o que procura</h3><p>Envie uma solicitação. Serviço e horário de preferência são opcionais.</p></li>
          <li><span>02</span><h3>Converse com o profissional</h3><p>Alinhe modalidade, disponibilidade, valores e suas dúvidas sobre o atendimento.</p></li>
          <li><span>03</span><h3>Combinem o encontro</h3><p>A consulta fica confirmada quando os detalhes forem acordados entre vocês.</p></li>
        </ol>
      </section>

      <section id="duvidas" className={`landing-container ${styles.faq} ${styles.anchor}`} aria-labelledby="faq-heading">
        <div><p className={styles.eyebrow}>ANTES DE COMEÇAR</p><h2 id="faq-heading">Podemos esclarecer<br />algumas dúvidas.</h2></div>
        <div>{questions.map(([question, answer]) => <details key={question}><summary>{question}<Plus size={19} aria-hidden /></summary><p>{answer}</p></details>)}</div>
      </section>

      <section className={`landing-container ${styles.invitation}`} aria-labelledby="invitation-heading">
        <div><p className={styles.eyebrow}>O PRÓXIMO PASSO É SEU</p><h2 id="invitation-heading">Uma conversa pode<br />ser um bom começo.</h2><p>Fale com {professional.full_name} para conhecer as possibilidades.</p></div>
        <div><Link href={contactHref} className={styles.lightButton}>Solicitar atendimento <ArrowUpRight size={18} aria-hidden /></Link><small>Enviar uma solicitação não confirma uma consulta.</small></div>
      </section>
    </div>
  );
}
