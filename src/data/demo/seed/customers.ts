/** Clientela ficticia de la demo: emails en el dominio reservado .example y teléfonos de patrón inventado. */
export interface Customer {
  name: string
  email: string
  phone: string
}

const NAMES = [
  'Ana López Serrano',
  'Pablo Ruiz Navarro',
  'Carmen Vidal Ortega',
  'Laura Martínez Gil',
  'Sofía Romero Blasco',
  'Elena Torres Sanchis',
  'Irene Castro Mora',
  'Marina Delgado Ferrer',
  'Claudia Herrera Pons',
  'Paula Jiménez Bosch',
  'Nuria Molina Esteve',
  'Alba Ramos Cano',
  'Cristina Iglesias Roig',
  'Beatriz Vega Climent',
  'Silvia Medina Llorens',
  'Raquel Garrido Peris',
  'Patricia Cortés Alonso',
  'Lucía Santos Mira',
  'Andrea Rubio Ventura',
  'Marta Prieto Sala',
  'Teresa Fuentes Grau',
  'Rocío Cabrera Moll',
  'Julia Campos Barberà',
  'Noelia Vázquez Soria',
  'Eva Calvo Montoro',
  'Inés Domínguez Ribes',
  'Celia Méndez Cuesta',
  'Rosa Aguilar Puig',
  'Lorena Pascual Benet',
  'Miriam León Tormo',
  'Sara Herrero Sempere',
  'Ainhoa Lorenzo Vila',
  'Natalia Gallego Martí',
  'Mónica Crespo Faus',
  'Begoña Marín Ibarra',
  'Pilar Sanz Escrivà',
  'Lidia Parra Albert',
  'Olga Nieto Ferrando',
  'Victoria Soler Arnau',
  'Gloria Cruz Mestre',
  'Aitana Reyes Pastor',
  'Carla Moreno Belda',
  'Judith Carmona Giner',
  'Susana Benítez Llopis',
  'Adriana Santana Cerdà',
  'Daniel Ortiz Ballester',
  'Javier Rojas Simó',
  'Sergio Gómez Tarín',
  'Álvaro Núñez Bonet',
  'Héctor Pérez Marco',
  'Diego Flores Camps',
  'Rubén Ferrer Andrés',
  'Marcos Serrano Vives',
  'Iván Morales Gisbert',
  'Óscar Sáez Juan',
  'Hugo Lozano Monzó',
  'Nicolás Gil Valls',
  'Tomás Ibáñez Roca',
  'Martina Mas Climent',
  'Valeria Rius Tena',
]

const slug = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

function toCustomer(name: string, index: number): Customer {
  const [first, surname] = name.split(' ')
  return {
    name,
    email: `${slug(first)}.${slug(surname)}@correo.example`,
    phone: `+34 600 000 ${String(index).padStart(3, '0')}`,
  }
}

export const CUSTOMERS: Customer[] = NAMES.map(toCustomer)
