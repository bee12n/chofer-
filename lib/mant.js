import { fecha, fechaOpc, entero, entOpc, numOpc, texto, Bad } from './http';

export const ESTADOS = ['pendiente', 'hecho'];

export function leerMant(b) {
  const tipo = texto(b.tipo, 40);
  if (!tipo) throw new Bad('Elige el tipo de mantenimiento.');
  const estado = ESTADOS.includes(b.estado) ? b.estado : 'pendiente';
  return {
    camioneta: entero(b.camioneta, 'Elige una camioneta.'),
    fecha: fecha(b.fecha),
    tipo,
    descripcion: texto(b.descripcion, 1000),
    costo: numOpc(b.costo, 1e7),
    km: entOpc(b.km, 'Kilometraje inválido.'),
    estado,
    proximoFecha: fechaOpc(b.proximoFecha),
    proximoKm: entOpc(b.proximoKm, 'Kilometraje inválido.'),
  };
}
