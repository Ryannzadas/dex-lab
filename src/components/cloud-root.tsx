import { ClerkProvider } from "@clerk/react";
import { ptBR } from "@clerk/localizations";
import type { TeamsApi } from "@/lib/team";
import { CloudAccount } from "./cloud-account";

/**
 * Login e sincronização, carregados à parte depois que o app abre
 * (o Clerk só é usado pelo botão de conta, então não pesa no primeiro carregamento).
 */
export default function CloudRoot({ api, publishableKey }: { api: TeamsApi; publishableKey: string }) {
  return (
    <ClerkProvider publishableKey={publishableKey} localization={ptBR} afterSignOutUrl="/">
      <CloudAccount api={api} />
    </ClerkProvider>
  );
}
