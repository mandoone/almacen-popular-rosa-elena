export const NOMBRE_ALMACEN = 'Almacén Popular Rosa Elena Morales';

export const LUGAR_APERTURAS =
  'Espacio Recuperado Trenza La Río, Gamero 2670, Independencia';

export const HORARIO_APERTURAS = '11:00–15:00';

export const APERTURAS_PUBLICAS_2026 = [
  { fechaIso: '2026-09-19', fechaVisible: '19 de septiembre' },
  { fechaIso: '2026-10-03', fechaVisible: '3 de octubre' },
  { fechaIso: '2026-10-17', fechaVisible: '17 de octubre' },
  { fechaIso: '2026-11-07', fechaVisible: '7 de noviembre' },
  { fechaIso: '2026-11-21', fechaVisible: '21 de noviembre' },
  { fechaIso: '2026-12-05', fechaVisible: '5 de diciembre' },
  { fechaIso: '2026-12-19', fechaVisible: '19 de diciembre' },
] as const;

export const PASOS_COMO_FUNCIONA = [
  {
    numero: '1',
    titulo: 'Revisa el catálogo',
    descripcion:
      'Consulta los productos disponibles y sus formatos de venta antes de cada apertura.',
  },
  {
    numero: '2',
    titulo: 'Prepara tu pedido',
    descripcion:
      'Arma tu carrito durante el período habilitado para pedidos anticipados.',
  },
  {
    numero: '3',
    titulo: 'Retira en la apertura',
    descripcion:
      'Acércate al punto de retiro en la fecha y horario informados para esa apertura.',
  },
] as const;

export const FORMAS_DE_PARTICIPAR = [
  {
    titulo: 'Comprar en el almacén',
    descripcion:
      'Elegir el almacén ayuda a sostener un circuito comunitario de abastecimiento.',
  },
  {
    titulo: 'Participar en los turnos',
    descripcion:
      'Las aperturas se sostienen con organización y trabajo compartido entre vecinas y vecinos.',
  },
  {
    titulo: 'Difundir y aportar',
    descripcion:
      'Puedes compartir la información del proyecto y consultar por las formas vigentes de colaboración.',
  },
] as const;
