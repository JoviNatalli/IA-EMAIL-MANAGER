import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Bricolage_Grotesque, Instrument_Sans, Martian_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

/*
 * Duas vozes tipográficas, de propósito:
 * - App (Geist): neutra e compacta, é a que aguenta uma inbox densa.
 * - Landing: trio de fontes VARIÁVEIS, escolhido para a página se poder
 *   comportar como um espécime tipográfico vivo (ver `variable-headline.tsx`).
 *     · Bricolage Grotesque — display com eixos `wdth` (75–100) e `opsz`
 *       (12–96): dá a energia de cartaz condensado das referências sem trocar
 *       de ficheiro de fonte.
 *     · Instrument Sans — corpo contemporâneo, nítido em ecrã.
 *     · Martian Mono — mono larga e "de engenharia" para rótulos e números.
 * Todas auto-hospedadas via `next/font` — sem pedidos a terceiros, sem CLS.
 */
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz", "wdth"],
  variable: "--font-bricolage",
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  display: "swap",
});

const martianMono = Martian_Mono({
  subsets: ["latin"],
  weight: "variable",
  axes: ["wdth"],
  variable: "--font-martian-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Nuvoly — Your inbox, intelligently managed.",
    template: "%s · Nuvoly",
  },
  description:
    "Nuvoly conecta-se à sua inbox e usa IA para resumir, priorizar, responder e organizar os seus emails — um copiloto, não apenas mais um chatbot.",
  openGraph: {
    title: "Nuvoly — Your inbox, intelligently managed.",
    description:
      "Ruído a entrar, sinal a sair. Um copiloto de IA que resume, prioriza e responde — sempre com a sua confirmação.",
    locale: "pt_PT",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-PT"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} ${bricolage.variable} ${instrumentSans.variable} ${martianMono.variable}`}
    >
      <head>
        {/*
          As animações de entrada da landing partem de `opacity: 0` — que o
          framer-motion também escreve no HTML do servidor. Sem JavaScript
          ninguém as dispara e o texto ficaria invisível (não só sem
          animação: invisível). Isto devolve-o ao estado final.
        */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body className="min-h-svh bg-background font-sans text-foreground antialiased">
        <ThemeProvider>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
