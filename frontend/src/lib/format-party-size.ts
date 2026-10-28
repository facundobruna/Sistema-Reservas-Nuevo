/**
 * Texto del tamaño del grupo para mostrar en pantalla: "1 persona", "4 personas".
 * Una cantidad menor a 1 no es un grupo válido y se rechaza.
 */
export function formatPartySize(cantidad: number): string {
  if (cantidad < 1) {
    throw new Error("El grupo tiene que ser de al menos 1 persona");
  }
  return cantidad === 1 ? "1 persona" : `${cantidad} personas`;
}
