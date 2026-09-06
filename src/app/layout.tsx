import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Archivo, Instrument_Serif, JetBrains_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

/*
 * Duas vozes tipográficas, de propósito:
 * - App (Geist): neutra e compacta, é a que aguenta uma inbox densa.
 * - Landing (Instrument Serif + Archivo + JetBrains Mono): editorial, com
 *   personalidade. Serifa de alto contraste para os títulos, grotesca para o
 *   corpo, mono para rótulos e números.
 * Todas auto-hospedadas via `next/font` — sem pedidos a terceiros, sem CLS.
 */
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
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
      className={`${GeistSans.variable} ${GeistMono.variable} ${instrumentSerif.variable} ${archivo.variable} ${jetbrainsMono.variable}`}
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
