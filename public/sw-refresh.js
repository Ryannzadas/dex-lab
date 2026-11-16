// Ao ativar uma nova versão do Service Worker, recarrega as abas abertas
// para não continuar exibindo o bundle antigo guardado em cache.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("navigate" in client) {
          client.navigate(client.url).catch(() => {});
        }
      }
    }),
  );
});
