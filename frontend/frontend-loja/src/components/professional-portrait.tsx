"use client";

import { useState } from "react";
import { getInitials } from "@/lib/format";

export function ProfessionalPortrait({ name, photoUrl }: { name: string; photoUrl: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return (
    <div className="professional-portrait">
      {photoUrl && failedUrl !== photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- URLs externas de profissionais nao tem um dominio fixo.
        <img src={photoUrl} alt={name} width={480} height={600} onError={() => setFailedUrl(photoUrl)} />
      ) : (
        <div className="portrait-placeholder" role="img" aria-label={`Perfil de ${name}`}><span aria-hidden>{getInitials(name)}</span><span className="portrait-caption" aria-hidden>Uma história.<br />Um encontro.</span></div>
      )}
    </div>
  );
}
