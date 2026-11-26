// Permite "Agregar a pantalla de inicio" y abrir la bitácora como app, sin barra del navegador.
export default function manifest() {
  return {
    name: 'Bitácora del Chofer',
    short_name: 'Bitácora',
    description: 'Vueltas, gasolina y medidor de cada camioneta.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#060D1A',
    theme_color: '#1D63E6',
    lang: 'es-MX',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
