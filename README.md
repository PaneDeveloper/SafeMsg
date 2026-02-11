# SafeMsg

Chat P2P com foco em privacidade, feito em HTML + JS puro.

## O que já tem

- Salas P2P com PeerJS (host e participantes).
- Mensagens criptografadas com **AES-GCM**.
- Compartilhamento de arquivos com criptografia mais forte.
- Preview de mídia sob clique (sem auto-render).
- Sanitização de entradas e limites básicos anti-abuso.

## Estrutura

- `index.html`: app principal (UI + lógica de chat/cripto).
- `service-worker.js`: cache/offline básico.
- `signaling_server.js`: servidor de sinalização opcional.

## Como rodar local

```bash
python3 -m http.server 4173 --directory .
```

Depois abra:

- `http://127.0.0.1:4173/index.html`

## Observações

- Este repositório está sendo trabalhado na branch `work` neste ambiente.
- Para publicar no GitHub (`main`), normalmente é feito push `work:main` no seu terminal local.
