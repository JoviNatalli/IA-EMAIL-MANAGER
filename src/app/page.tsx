import { BackPage } from "@/components/marketing/back-page";
import { EditionIndex } from "@/components/marketing/edition-index";
import { Editorial } from "@/components/marketing/editorial";
import { FrontPage } from "@/components/marketing/front-page";
import { Letters } from "@/components/marketing/letters";
import { Masthead } from "@/components/marketing/masthead";
import { Plates } from "@/components/marketing/plates";
import { Report } from "@/components/marketing/report";
import { Subscriptions } from "@/components/marketing/subscriptions";
import { Verification } from "@/components/marketing/verification";

/**
 * Homepage — composta como uma EDIÇÃO IMPRESSA, não como uma landing de SaaS.
 *
 * A premissa: um produto de email é correspondência, e a forma natural de
 * apresentar correspondência é um jornal. Daí o esqueleto ser o de uma
 * edição — cabeçalho com data, primeira página, sumário, cadernos, editorial,
 * tabela de assinaturas, correio dos leitores e colofão — em vez do
 * hero → features → testemunhos → preços → FAQ que qualquer template tem.
 *
 * `.landing` fixa a paleta de PAPEL só para esta página, mesmo quando a app
 * está em tema escuro. São os mesmos tokens da app, apenas re-escopados
 * (ver globals.css).
 */
export default function LandingPage() {
  const editionDate = new Intl.DateTimeFormat("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="landing paper relative flex min-h-svh flex-col bg-background text-foreground">
      <Masthead editionDate={editionDate} />
      <main className="flex-1">
        <FrontPage />
        <EditionIndex />
        <Report />
        <Plates />
        <Verification />
        <Editorial />
        <Subscriptions />
        <Letters />
      </main>
      <BackPage />
    </div>
  );
}
