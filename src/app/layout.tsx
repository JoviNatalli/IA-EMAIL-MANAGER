import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Bodoni_Moda, Martian_Mono, Newsreader } from "next/font/google";

import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

/*
 * Duas vozes tipográficas, de propósito:
 * - App (Geist): neutra e compacta, é a que aguenta uma inbox densa.
 * - Landing: a homepage é composta como uma EDIÇÃO IMPRESSA (ver
 *   src/app/page.tsx), por isso usa o trio de uma redação:
 *     · Bodoni Moda — didone de manchete, com eixo óptico (`opsz`) para o
 *       desenho afinar entre o título de capa e o corpo pequeno.
 *     · Newsreader — desenhada para texto de notícia; é a fonte das colunas.
 *     · Martian Mono — a máquina: fólios, datas, números de edição. É a
 *       tensão que impede o conjunto de ser pastiche de jornal antigo.
 * Todas auto-hospedadas via `next/font` — sem pedidos a terceiros, sem CLS.
 */
const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-bodoni",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-newsreader",
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
      className={`${GeistSans.variable} ${GeistMono.variable} ${bodoni.variable} ${newsreader.variable} ${martianMono.variable}`}
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
