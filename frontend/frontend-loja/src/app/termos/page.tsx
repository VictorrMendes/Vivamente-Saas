import type { Metadata } from "next";
import Link from "next/link";
import { InstitutionalDocument } from "../../components/institutional-document";
import { LegalIdentity } from "../../components/legal-identity";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Como consultar perfis, solicitar atendimento e manifestar interesse em participar da VivaMente.",
  alternates: { canonical: "/termos" },
  robots: { index: false },
};

export default function TermosPage() {
  return (
    <InstitutionalDocument
      title="Termos de Uso"
      introduction="Clareza desde o primeiro contato. Entenda o funcionamento do site público da VivaMente e os cuidados para usar o catálogo e os formulários."
      updatedAt="22 de setembro de 2026"
      sections={[
        { id: "proposta", title: "A proposta da VivaMente", content: <><p>A VivaMente apresenta profissionais da área terapêutica e facilita o contato entre quem procura atendimento e quem oferece serviços. A Loja permite conhecer perfis, explorar especialidades e enviar solicitações, sem exigir uma conta de acesso.</p><LegalIdentity /></> },
        { id: "solicitacoes", title: "Pedidos de atendimento", content: <><p>Você pode pedir uma indicação à equipe ou entrar em contato a partir do perfil de um profissional. O pedido de indicação pode ser encaminhado a um profissional da rede para que ele converse com você.</p><p><strong>Enviar um formulário não confirma uma consulta nem reserva um horário.</strong> Serviço e horário indicados são preferências. A confirmação depende da conversa e do acordo com o profissional. O site não promete um prazo de resposta ou disponibilidade específica.</p><p>A solicitação de contato não efetua pagamento nem contratação automática. Antes de contratar, esclareça diretamente com o profissional as condições de atendimento, cancelamento e remarcação.</p></> },
        { id: "profissionais", title: "Informações dos profissionais", content: <><p>Os perfis apresentam informações fornecidas no cadastro, como trajetória, especialidades, registro quando informado e modalidades de atendimento. Você pode pedir esclarecimentos sobre formação, habilitação e adequação do serviço ao que procura.</p><p>A presença no catálogo não é uma promessa de resultado terapêutico. A atuação de cada profissional deve respeitar as exigências aplicáveis à sua atividade. Estes termos não afastam responsabilidades legais da VivaMente ou do profissional.</p></> },
        { id: "participacao", title: "Interesse em participar", content: <><p>O formulário para terapeutas registra uma manifestação de interesse. Ele não aprova automaticamente a participação, não cria uma conta e não publica um perfil.</p><p>A equipe entra em contato para conhecer o trabalho e explicar as próximas etapas. Condições específicas de participação e uso da plataforma profissional deverão ser apresentadas nesse processo.</p></> },
        { id: "uso-responsavel", title: "Uso responsável", content: <ul><li>Informe dados de contato corretos e use os formulários para solicitações relacionadas à finalidade do serviço.</li><li>Não se passe por outra pessoa, não envie mensagens abusivas, spam, código malicioso ou conteúdo que viole direitos de terceiros.</li><li>Não tente acessar informações restritas nem prejudicar o funcionamento do site.</li><li>Use apenas os dados necessários ao primeiro contato. Não envie diagnósticos, documentos ou detalhes íntimos no campo de mensagem.</li></ul> },
        { id: "limites", title: "Limites do contato pelo site", content: <><p>O site público não realiza diagnóstico, avaliação clínica ou atendimento imediato. Em uma situação de urgência ou risco, procure os serviços de emergência disponíveis na sua região; não aguarde retorno de um formulário.</p><p>Quando o contato envolver uma criança ou adolescente, ele deve ser conduzido pelo responsável legal, respeitando a proteção e os interesses da pessoa atendida.</p></> },
        { id: "privacidade", title: "Privacidade e conteúdo", content: <><p>O tratamento das informações enviadas é descrito na <Link href="/privacidade">Política de Privacidade</Link>, incluindo as finalidades e o encaminhamento das solicitações. A leitura destes termos não substitui um consentimento específico quando ele for necessário.</p><p>Textos, identidade visual e materiais do site devem ser utilizados com respeito aos direitos de seus titulares. O envio de uma mensagem não autoriza sua publicação como depoimento ou publicidade.</p></> },
        { id: "disponibilidade", title: "Disponibilidade e demonstração", content: <><p>O site pode passar por manutenção ou sofrer interrupções. Se ocorrer um erro no envio, confira a mensagem apresentada antes de tentar novamente. A confirmação de recebimento de uma solicitação é diferente da confirmação de uma consulta.</p><p>Quando um formulário estiver identificado como ambiente de demonstração, os resultados são simulados e não representam um pedido real. Perfis sinalizados como fictícios servem apenas para apresentar o funcionamento do projeto.</p></> },
        { id: "atualizacoes", title: "Atualizações e dúvidas", content: <><p>A versão mais recente será identificada pela data no início da página. Mudanças relevantes no funcionamento do serviço deverão ser comunicadas com clareza, preservando os direitos aplicáveis.</p><p>As relações decorrentes do uso do site estão sujeitas à legislação brasileira. Nada neste documento limita direitos assegurados por lei. O canal definitivo de atendimento será informado com os dados reais da responsável.</p><p>Conheça a proposta e os caminhos disponíveis em <Link href="/sobre">Sobre a VivaMente</Link>.</p></> },
      ]}
    />
  );
}
