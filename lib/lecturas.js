import { Bad } from './http';

const fmt = (n) => Number(n).toLocaleString('es-MX');

/* Revisa que una lectura no sea menor que las anteriores ni mayor que las posteriores.
   mismoDia: también la compara con las lecturas del mismo día (el chofer siempre agrega la más nueva). */
export async function revisarKm(sql, { cam, f, km, mismoDia, excluir = 0 }) {
  const [antes] = mismoDia
    ? await sql`SELECT max(km) AS km FROM lecturas WHERE camioneta_id = ${cam} AND fecha <= ${f} AND id <> ${excluir}`
    : await sql`SELECT max(km) AS km FROM lecturas WHERE camioneta_id = ${cam} AND fecha < ${f} AND id <> ${excluir}`;
  if (antes?.km != null && km < antes.km) throw new Bad(`La lectura no puede ser menor que la anterior (${fmt(antes.km)} km).`);
  const [despues] = await sql`SELECT min(km) AS km FROM lecturas WHERE camioneta_id = ${cam} AND fecha > ${f} AND id <> ${excluir}`;
  if (despues?.km != null && km > despues.km) throw new Bad(`La lectura no puede ser mayor que una de un día posterior (${fmt(despues.km)} km).`);
}
