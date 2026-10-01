/** −1 884 wie in der Companion: schmales Leerzeichen als Tausender-Trennung, echtes Minus */
export function zahl(n: number): string {
  const betrag = Math.abs(Math.trunc(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return n < 0 ? `−${betrag}` : betrag;
}
