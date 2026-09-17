import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, HeartHandshake, Leaf, MessageCircle, UserRound } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "VivaMente Terapias | Conexões que acolhem" },
  description: "Conheça a VivaMente: conectamos pessoas em busca de atendimento a profissionais da área terapêutica. Encontre seu caminho de cuidado ou venha fazer parte.",
  alternates: { canonical: "/" },
};

const patientSteps = [
  { title: "Conte o que você procura", text: "Você pode começar com uma conversa sobre o atendimento que está buscando." },
  { title: "Conheça as possibilidades", text: "A VivaMente ajuda a encontrar um caminho entre os profissionais da nossa rede." },
  { title: "Dê o próximo passo", text: "Conheça o profissional, tire suas dúvidas e combine os detalhes do atendimento." },
];

const questions = [
  { question: "Ainda não sei qual profissional procurar. Por onde começo?", answer: "Você não precisa chegar com todas as respostas. A proposta da VivaMente é aproximar você dos profissionais da nossa rede e ajudar a encontrar um caminho para o atendimento que procura." },
  { question: "Posso entrar em contato diretamente com um terapeuta?", answer: "Sim. Se você recebeu o link de um profissional, pode conhecer seu perfil, consultar os serviços e enviar uma solicitação diretamente pela página dele." },
  { question: "Enviar uma solicitação confirma uma consulta?", answer: "Não. A solicitação é o início de uma conversa. O profissional entra em contato para alinhar os detalhes e confirmar o atendimento com você." },
  { question: "Sou terapeuta. Como posso fazer parte?", answer: "Apresente seu trabalho à equipe VivaMente para conhecer as possibilidades de participação. O interesse em fazer parte é diferente de uma solicitação de atendimento como paciente." },
];

export default function Home() {
  return (
    <div className="company-landing">
      <section className="landing-container company-hero" aria-labelledby="company-title">
        <div className="company-hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> VIVAMENTE TERAPIAS</p>
          <h1 id="company-title" className="hero-title">Cuidar começa<br />com uma boa<br /><em>conexão.</em></h1>
          <p className="hero-description">Entre quem busca acolhimento e quem escolheu cuidar, existe um encontro. A VivaMente ajuda esse encontro a acontecer.</p>
          <div className="landing-actions">
            <a className="landing-button" href="#para-voce">Busco atendimento <ArrowUpRight size={18} aria-hidden /></a>
            <a className="landing-text-link" href="#para-terapeutas">Sou terapeuta <ArrowRight size={17} aria-hidden /></a>
          </div>
          <a className="hero-explore" href="#a-vivamente"><ArrowDown size={16} aria-hidden /> Conheça o nosso propósito</a>
        </div>
        <div className="connection-art" aria-hidden="true">
          <div className="connection-art-grid" />
          <span className="art-caption">PESSOAS, ANTES DE TUDO.</span>
          <div className="connection-arches"><span /><span /></div>
          <div className="art-message">Escuta.<br />Encontro.<br /><em>Cuidado.</em></div>
          <div className="art-bottom"><span>Há espaço para<br />a sua história.</span><Leaf size={30} strokeWidth={1.1} /></div>
        </div>
      </section>

      <section id="a-vivamente" className="company-purpose section-anchor" aria-labelledby="purpose-title">
        <div className="landing-container purpose-layout">
          <p className="eyebrow">NOSSO PROPÓSITO</p>
          <div>
            <h2 id="purpose-title" className="section-title">Pessoas que precisam de cuidado.<br /><span className="text-text-muted">Pessoas que fazem do cuidado seu trabalho.</span></h2>
            <div className="purpose-description"><p>A VivaMente conecta essas histórias. Somos uma empresa que aproxima pessoas e profissionais da área terapêutica, com uma presença digital que torna esse primeiro encontro mais simples.</p><p>De um lado, um caminho para buscar atendimento. Do outro, espaço para apresentar seu trabalho e organizar novas conexões.</p></div>
          </div>
        </div>
      </section>

      <section id="para-voce" className="landing-container audience-section section-anchor" aria-labelledby="patient-title">
        <div className="audience-intro">
          <span className="section-symbol"><HeartHandshake size={25} strokeWidth={1.4} aria-hidden /></span>
          <p className="eyebrow">PARA QUEM BUSCA ATENDIMENTO</p>
          <h2 id="patient-title" className="section-title">O primeiro passo<br />não precisa ser<br /><em>sozinho.</em></h2>
          <p className="section-description">Cada pessoa chega com uma história. Se você procura uma consulta e ainda não sabe com quem conversar, a VivaMente pode ajudar a conhecer os profissionais da nossa rede.</p>
          <Link href="/contato?interesse=atendimento" className="landing-button">Quero uma indicação <ArrowUpRight size={18} aria-hidden /></Link>
        </div>
        <ol id="como-funciona" className="patient-steps section-anchor">
          {patientSteps.map((step, index) => (
            <li key={step.title}><span className="step-number">0{index + 1}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></li>
          ))}
          <li className="steps-note"><MessageCircle size={18} aria-hidden /><p>Um pedido de atendimento abre uma conversa. A consulta é confirmada depois, com o profissional.</p></li>
        </ol>
      </section>

      <section id="para-terapeutas" className="therapist-invitation section-anchor" aria-labelledby="therapist-title">
        <div className="landing-container invitation-layout">
          <div>
            <p className="eyebrow">PARA QUEM ESCOLHEU CUIDAR</p>
            <h2 id="therapist-title" className="section-title">Seu trabalho merece<br /><em>novas conexões.</em></h2>
            <p className="section-description">Você é terapeuta e se identifica com o propósito da VivaMente? Conheça uma rede que aproxima seu trabalho de quem está buscando atendimento.</p>
            <Link href="/contato?interesse=terapeuta" className="landing-button landing-button-light">Quero fazer parte <ArrowUpRight size={18} aria-hidden /></Link>
          </div>
          <div className="invitation-features">
            <div><UserRound size={23} strokeWidth={1.4} aria-hidden /><h3>Um espaço para sua identidade</h3><p>Uma página própria para apresentar sua trajetória, suas especialidades e seus serviços.</p></div>
            <div><MessageCircle size={23} strokeWidth={1.4} aria-hidden /><h3>Um primeiro contato mais simples</h3><p>Receba solicitações de pessoas que conheceram seu trabalho e querem conversar.</p></div>
            <div><CalendarDays size={23} strokeWidth={1.4} aria-hidden /><h3>Organização para o dia a dia</h3><p>Tenha seus contatos e atendimentos reunidos na plataforma VivaMente.</p></div>
          </div>
        </div>
      </section>

      <section id="perguntas" className="landing-container faq-section section-anchor" aria-labelledby="faq-title">
        <div><p className="eyebrow">ANTES DO PRIMEIRO PASSO</p><h2 id="faq-title" className="section-title">Vamos esclarecer<br />algumas dúvidas?</h2></div>
        <div className="faq-list">{questions.map(({ question, answer }) => <details key={question}><summary>{question}<span className="faq-indicator" aria-hidden>+</span></summary><p>{answer}</p></details>)}</div>
      </section>
      <div className="landing-container company-signoff"><span>Uma conexão de cada vez.</span><Leaf size={25} strokeWidth={1.3} aria-hidden /></div>
    </div>
  );
}
