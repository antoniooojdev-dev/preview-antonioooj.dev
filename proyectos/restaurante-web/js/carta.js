// Datos del restaurante. En un proyecto real podrían venir de una API o de un panel.
window.RESTAURANTE = {
  // 0 = domingo … 6 = sábado. Cada día puede tener varios turnos [apertura, cierre].
  horario: {
    0: [["13:00", "16:30"]],
    1: [],
    2: [["13:00", "16:00"], ["20:00", "23:30"]],
    3: [["13:00", "16:00"], ["20:00", "23:30"]],
    4: [["13:00", "16:00"], ["20:00", "23:30"]],
    5: [["13:00", "16:30"], ["20:00", "00:00"]],
    6: [["13:00", "16:30"], ["20:00", "00:00"]],
  },
  // minutos entre huecos de reserva y antelación mínima
  intervaloReserva: 30,
  antelacionMinutos: 60,
  // última reserva X minutos antes del cierre de cada turno
  margenCierre: 90,
};

window.ALERGENOS = {
  gluten: "Gluten",
  lactosa: "Lactosa",
  huevo: "Huevo",
  pescado: "Pescado",
  marisco: "Marisco",
  frutos_secos: "Frutos secos",
  soja: "Soja",
};

window.CARTA = [
  { cat: "Entrantes", nombre: "Croquetas de jamón ibérico", desc: "Bechamel cremosa, 6 unidades.", precio: 9.5, alergenos: ["gluten", "lactosa", "huevo"] },
  { cat: "Entrantes", nombre: "Pimientos asados a la brasa", desc: "Con ajo confitado y sal en escamas.", precio: 8, alergenos: [], veg: true },
  { cat: "Entrantes", nombre: "Ensalada de tomate de temporada", desc: "Ventresca, cebolla morada y aceite de arbequina.", precio: 11, alergenos: ["pescado"] },
  { cat: "Entrantes", nombre: "Provolone a la parrilla", desc: "Orégano, miel y nueces.", precio: 9, alergenos: ["lactosa", "frutos_secos"], veg: true },
  { cat: "Carnes", nombre: "Chuletón de vaca madurada (1 kg)", desc: "45 días de maduración. Para dos.", precio: 62, alergenos: [] },
  { cat: "Carnes", nombre: "Secreto ibérico", desc: "Con chimichurri casero y patatas.", precio: 19, alergenos: [] },
  { cat: "Carnes", nombre: "Hamburguesa de la casa", desc: "Vaca, queso curado, cebolla caramelizada y brioche.", precio: 15.5, alergenos: ["gluten", "lactosa", "huevo", "soja"] },
  { cat: "Pescados", nombre: "Lubina salvaje a la brasa", desc: "Pescado del día, abierta a la espalda.", precio: 26, alergenos: ["pescado"] },
  { cat: "Pescados", nombre: "Pulpo a la parrilla", desc: "Parmentier de patata y pimentón de la Vera.", precio: 22, alergenos: ["marisco", "lactosa"] },
  { cat: "Pescados", nombre: "Gambas de Huelva", desc: "A la sal, 200 g.", precio: 24, alergenos: ["marisco"] },
  { cat: "Postres", nombre: "Tarta de queso al horno", desc: "Cremosa, con frutos rojos.", precio: 7, alergenos: ["lactosa", "huevo", "gluten"], veg: true },
  { cat: "Postres", nombre: "Piña a la brasa", desc: "Con helado de coco.", precio: 6.5, alergenos: ["lactosa"], veg: true },
  { cat: "Postres", nombre: "Coulant de chocolate", desc: "Con helado de vainilla.", precio: 7.5, alergenos: ["lactosa", "huevo", "gluten", "frutos_secos"], veg: true },
];
