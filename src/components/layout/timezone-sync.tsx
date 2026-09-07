"use client";

/**
 * Reporta o fuso horário do browser ao servidor, uma vez (Fase 6, §21).
 *
 * Sem isto, o Calendar escreve sempre no fuso do SERVIDOR — um evento
 * marcado para as 15h podia aparecer noutra hora no telemóvel de quem o
 * criou. `storedTimeZone` vem do servidor (evita chamar sempre que o fuso
 * já bate certo); só há um pedido quando muda (viagem, mudança de sistema).
 */
import * as React from "react";

import { setUserTimeZone } from "@/app/actions/preferences";

export function TimeZoneSync({ storedTimeZone }: { storedTimeZone: string | null }) {
  React.useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!detected || detected === storedTimeZone) return;
    void setUserTimeZone(detected);
  }, [storedTimeZone]);

  return null;
}
