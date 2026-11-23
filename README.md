# Bitácora del Chofer

App web para registrar las vueltas, la gasolina y el medidor (kilometraje) de cada camioneta.

## Perfiles

| Perfil | Usuario | Qué puede hacer |
| --- | --- | --- |
| Ximena | `ximena` | Administración: ve y corrige todo, da de alta camionetas |
| Ana | `ana` | Administración: lo mismo que Ximena |
| Enoc | `enoc` | Chofer: registra sus vueltas, el medidor y la gasolina del día. Puede deshacer un registro en los primeros 10 minutos |

El servidor revisa los permisos, así que el perfil de chofer no puede editar ni borrar registros viejos aunque lo intente.

## Publicar en Vercel

1. Entra a [vercel.com/new](https://vercel.com/new) e importa este repositorio de GitHub. Vercel detecta Next.js solo.
2. Antes de darle **Deploy**, abre **Environment Variables** y agrega:
   - `SESSION_SECRET`: una frase larga y secreta (32 caracteres o más).
   - `PASS_XIMENA`, `PASS_ANA` y `PASS_ENOC`: la contraseña de cada persona.
3. Dale **Deploy**.
4. En el proyecto, entra a **Storage**, elige **Neon (Postgres)**, créala y conéctala al proyecto. Esto agrega `DATABASE_URL` sola.
5. Entra a **Deployments** y dale **Redeploy** para que la app tome la base de datos.

Las tablas se crean solas la primera vez que alguien entra.

Para cambiar una contraseña, edita su variable en Vercel y vuelve a hacer **Redeploy**.

## Probar en tu computadora

```bash
npm install
cp .env.example .env.local   # llena los valores
npm run dev
```
