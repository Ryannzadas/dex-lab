/** Traduz os códigos de erro do Firebase para algo que dá pra entender. */
export function messageFor(error: unknown): string {
  const code = (error as { code?: string }).code ?? "";
  switch (code) {
    case "auth/invalid-email":
      return "Esse e-mail não parece certo.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "E-mail ou senha incorretos. Se você entrou antes com o Google, use o botão do Google.";
    case "auth/email-already-in-use":
      return "Já existe uma conta com esse e-mail. Entre com ela ou use o Google.";
    case "auth/account-exists-with-different-credential":
      return "Esse e-mail já entra por outro jeito. Tente com e-mail e senha.";
    case "auth/weak-password":
      return "A senha precisa ter pelo menos 6 caracteres.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Espere um pouco e tente de novo.";
    case "auth/requires-recent-login":
      return "Por segurança, saia e entre de novo antes de fazer isso.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "A confirmação foi cancelada.";
    case "auth/popup-blocked":
      return "O navegador bloqueou a janela do Google. Libere pop-ups para este site e tente de novo.";
    case "auth/user-mismatch":
      return "Confirme com a mesma conta Google que está conectada.";
    case "auth/network-request-failed":
      return "Sem conexão. Confira a internet e tente de novo.";
    default:
      return "Não deu para entrar. Tente de novo.";
  }
}
