export interface Sucursal {
  id: string;
  name: string;
  address: string;
  zona: string; // departamento / ciudad agrupador
  lat: number;
  lng: number;
}

// Datos reales de sucursales (direcciones y coordenadas tomadas de farmatotal.com.py/sucursales)
export const SUCURSALES: Sucursal[] = [
  { id: "medicos-chaco", name: "Médicos del Chaco", address: "Av. Médicos del Chaco c/ Oscar Carreras Saguier", zona: "Asunción", lat: -25.298599, lng: -57.412433 },
  { id: "chiang-kai-shek", name: "Chiang Kai Shek", address: "Avda. Chiang Kai Shek y 16 proyectadas", zona: "Asunción", lat: -25.2928605, lng: -57.5601898 },
  { id: "choferes-chaco", name: "Choferes del Chaco", address: "Avda. Choferes del Chaco c/ Indiana Juliana", zona: "Asunción", lat: -25.2992783, lng: -57.5936368 },
  { id: "de-la-victoria", name: "De la Victoria", address: "Avda. de la Victoria esq. Araucanos", zona: "Asunción", lat: -25.3133524, lng: -57.5977235 },
  { id: "republica-argentina", name: "República Argentina", address: "Avda. República Argentina Nº 2670 c/ Concepción", zona: "Asunción", lat: -25.3194049, lng: -57.5923647 },
  { id: "eusebio-lillo", name: "Eusebio Lillo", address: "Eusebio Lillo c/ Denis Roa", zona: "Asunción", lat: -25.3261318, lng: -57.5826583 },
  { id: "loma-pyta", name: "Loma Pytâ", address: "Ruta Transchaco esq. Cnel Juan Porta O'Higgins", zona: "Asunción", lat: -25.282848, lng: -57.654058 },
  { id: "ytororo", name: "Ytororó", address: "R. I. 2 Ytororó 1098 esq. Facundo Machain", zona: "Asunción", lat: -25.3274298, lng: -57.5958535 },
  { id: "fdm-pitiantuta", name: "11 de Setiembre", address: "11 de Setiembre esq. Av. Pitiantuta", zona: "Fernando de la Mora", lat: -25.3390142, lng: -57.5569839 },
  { id: "fdm-estigarribia", name: "Mcal. Estigarribia", address: "Av. Mcal. José Félix Estigarribia c/ Soldado Ovelar", zona: "Fernando de la Mora", lat: -25.3219561, lng: -57.5573130 },
  { id: "fdm-acceso-sur", name: "Acceso Sur", address: "Avda. Acceso Sur casi Francisco Vergara", zona: "Fernando de la Mora", lat: -25.3549714, lng: -57.5939959 },
  { id: "lambare-defensores", name: "Defensores del Chaco", address: "Av. Defensores del Chaco c/ 8 de Marzo", zona: "Lambaré", lat: -25.3439161, lng: -57.5809814 },
  { id: "lambare-cacique", name: "Cacique Lambaré", address: "Avda. Cacique Lambaré c/ Santa Ana", zona: "Lambaré", lat: -25.3309506, lng: -57.5741499 },
  { id: "lambare-cerro", name: "Cerro Lambaré", address: "Avda. Cerro Lambaré c/ Herminio Giménez", zona: "Lambaré", lat: -25.3287956, lng: -57.5303194 },
  { id: "capiata-ruta1", name: "Capiatá Ruta 1", address: "Ruta 1 Km 17,5 c/ Juana María de Lara", zona: "Central", lat: -25.3703508, lng: -57.4796948 },
  { id: "limpio-aquino", name: "Limpio", address: "Ruta 3 Gral. Elizardo Aquino esq. Monseñor Moreno", zona: "Central", lat: -25.1693, lng: -57.4912 },
  { id: "luque-residentas", name: "Luque Residentas", address: "Av. Las Residentas c/ Los Excombatientes", zona: "Central", lat: -25.2667, lng: -57.4872 },
  { id: "aregua-residentas", name: "Areguá", address: "Avda. Las Residentas", zona: "Cordillera", lat: -25.3052, lng: -57.4031 },
];

/** Zonas únicas en orden de aparición (para filtros del modal) */
export const ZONAS: string[] = [...new Set(SUCURSALES.map((s) => s.zona))];

/** Distancia haversine en km entre dos puntos */
export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/** Devuelve la sucursal más cercana a una posición dada */
export function nearestSucursal(lat: number, lng: number): Sucursal {
  return SUCURSALES.reduce((best, s) =>
    haversineKm(lat, lng, s.lat, s.lng) < haversineKm(lat, lng, best.lat, best.lng) ? s : best,
  );
}
