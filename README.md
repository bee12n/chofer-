# Bitácora del Chofer

App web para registrar las vueltas, la gasolina y el medidor (kilometraje) de cada camioneta.

## Perfiles

| Perfil | Contraseña | Qué puede hacer |
| --- | --- | --- |
| Ximena | `PASS_XIMENA` | Administración: ve, edita y borra todo; flota, dashboard, Excel y mantenimientos |
| Ana | `PASS_ANA` | Administración: lo mismo que Ximena |
| Chofer | Sin contraseña | Elige su nombre de la lista de empleados y registra vueltas, medidor y gasolina del día. No puede editar ni borrar |

El servidor revisa los permisos: el perfil de chofer solo ve y registra lo del día, y no ve mantenimientos ni costos.

## Secciones de administración

- **Día**: resumen del día, movimientos (editar / borrar), medidor por camioneta y agregar registros de cualquier fecha.
- **Dashboard**: vueltas, gasolina, km, rendimiento y mantenimiento por periodo, por camioneta y por empleado. Botón **Exportar a Excel**.
- **Mantenimiento**: servicios por camioneta con costo, kilometraje, próximo servicio (avisa cuando se acerca) y comentarios.
- **Flota**: camionetas y empleados, y qué empleados usan cada camioneta.

## Publicar en Vercel

1. Entra a [vercel.com/new](https://vercel.com/new) e importa este repositorio de GitHub. Vercel detecta Next.js solo.
2. Antes de darle **Deploy**, abre **Environment Variables** y agrega:
   - `SESSION_SECRET`: una frase larga y secreta (32 caracteres o más).
   - `PASS_XIMENA` y `PASS_ANA`: la contraseña de cada administradora.
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
