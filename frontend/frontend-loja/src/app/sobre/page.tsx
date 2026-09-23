import type { Metadata } from "next";
import Link from "next/link";
import { InstitutionalDocument } from "../../components/institutional-document";

export const metadata: Metadata = {
  title: "Sobre",
  description: "Conheça a VivaMente: aproximamos pessoas em busca de cuidado e profissionais da área terapêutica.",
  alternates: { canonical: "/sobre" },
};

export default function SobrePage() {
  return (
    <InstitutionalDocument
      title="Cuidado começa com conexão."
      introduction="A VivaMente aproxima pessoas que buscam atendimento e profissionais que escolheram cuidar. Nosso papel é tornar esse primeiro encontro mais simples, com espaço para conhecer, perguntar e decidir."
      sections={[
        { id: "quem-somos", title: "Quem somos", content: <><p>A VivaMente Terapias é um projeto de conexão entre pessoas e profissionais da área terapêutica. Reunimos perfis, áreas de atuação e apresentações de atendimentos para ajudar você a encontrar com quem conversar.</p><p>Acreditamos em um começo com informação clara e respeito à história de cada pessoa. Você pode explorar os perfis no seu tempo ou pedir ajuda à equipe para conhecer as possibilidades da rede.</p></> },
        { id: "para-voce", title: "Para quem busca cuidado", content: <><p>No <Link href="/terapeutas">catálogo de terapeutas</Link>, você encontra a apresentação de cada profissional, suas especialidades e modalidades de atendimento. Ao escolher um perfil, pode enviar uma solicitação diretamente para aquele profissional.</p><p>Se ainda não sabe por onde começar, <Link href="/contato?interesse=atendimento">peça uma indicação à VivaMente</Link>. Basta uma apresentação breve do que procura; não é necessário enviar diagnósticos ou detalhes íntimos.</p></> },
        { id: "primeiro-contato", title: "Como o encontro acontece", content: <ul><li><strong>Você conhece as possibilidades.</strong> Explore os perfis ou converse com nossa equipe.</li><li><strong>Você envia uma solicitação.</strong> O pedido direcionado a um terapeuta pode ser feito sem escolher serviço ou horário.</li><li><strong>Os detalhes são combinados em conversa.</strong> O envio do formulário inicia o contato; a consulta só é confirmada depois do acordo com o profissional.</li></ul> },
        { id: "para-profissionais", title: "Para quem escolheu cuidar", content: <><p>A VivaMente oferece um espaço para apresentar seu trabalho e organizar as conexões que surgem a partir dele. O perfil público reúne sua trajetória, especialidades e atendimentos; a plataforma de acesso reúne a gestão dos contatos e da rotina profissional.</p><p><Link href="/contato?interesse=terapeuta">Apresente seu trabalho à equipe</Link> para conhecer as possibilidades de participação. A manifestação de interesse não cria uma conta nem publica um perfil automaticamente.</p></> },
        { id: "nossos-compromissos", title: "O que orienta este projeto", content: <ul><li><strong>Clareza:</strong> diferenciar uma conversa inicial de uma consulta confirmada.</li><li><strong>Autonomia:</strong> dar espaço para você conhecer o profissional e esclarecer suas dúvidas antes de decidir.</li><li><strong>Respeito:</strong> solicitar apenas as informações necessárias para iniciar o contato.</li></ul> },
      ]}
    />
  );
}
