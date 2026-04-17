import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.selestialhub.app",
  appName: "SelestialHub",
  webDir: "public",
  server: {
    url: "https://selestialhub.com",
    cleartext: false,
    androidScheme: "https",
    allowNavigation: [
      "selestialhub.com",
      "www.selestialhub.com",
      "*.mercadopago.com",
      "*.mercadopago.com.br",
    ],
  },
}

export default config
