# SelestialHub Mobile (Android e iOS)

Este projeto foi preparado com Capacitor para empacotar o site como aplicativo nativo.

## Estrategia adotada

- O app mobile abre a versao web hospedada em `https://selestialhub.com` dentro de um container nativo.
- Isso acelera publicacao para Android e iOS sem reescrever frontend.
- Fluxos de checkout e autenticacao continuam os mesmos da web.

## Requisitos

- Node.js instalado
- Android Studio (para Android)
- Xcode (para iOS, apenas macOS)

## Comandos principais

- Sincronizar plugins/config no nativo:

```bash
npm run mobile:sync
```

- Criar projeto Android (primeira vez):

```bash
npm run mobile:add:android
```

- Abrir Android Studio:

```bash
npm run mobile:open:android
```

- Criar projeto iOS (primeira vez, somente macOS):

```bash
npm run mobile:add:ios
```

- Abrir Xcode (somente macOS):

```bash
npm run mobile:open:ios
```

## Publicacao Android (resumo)

1. Rode `npm run mobile:add:android` (uma vez).
2. Rode `npm run mobile:sync`.
3. Abra com `npm run mobile:open:android`.
4. No Android Studio, gere `AAB` (Build > Generate Signed Bundle / APK).
5. Envie o `AAB` para a Google Play Console.

## Publicacao iOS (resumo)

1. Em um Mac, rode `npm run mobile:add:ios` (uma vez).
2. Rode `npm run mobile:sync`.
3. Abra com `npm run mobile:open:ios`.
4. Configure assinatura (Signing & Capabilities).
5. Archive e envie pelo Xcode para App Store Connect.

## Ajustes recomendados antes de publicar

- Criar icones nativos (1024x1024 para stores e tamanhos por plataforma).
- Configurar splash screen nativa.
- Definir privacy policy e termos (obrigatorio nas lojas).
- Validar login, notificacoes e checkout em dispositivos reais.

## Arquivos de configuracao

- `capacitor.config.ts`: configuracao principal do app nativo
- `app/manifest.ts`: manifest PWA/web app
- `public/sw.js`: service worker da versao web
