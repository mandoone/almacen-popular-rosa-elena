export const ROLES_OPERATIVOS = [
  'venta',
  'operacion',
  'administracion',
] as const;

export type RolOperativo = (typeof ROLES_OPERATIVOS)[number];

export const CAPACIDADES = [
  'pedidos:ver',
  'pedidos:confirmar',
  'pedidos:cancelar',
  'pedidos:entregar',
  'venta_presencial:registrar',
  'stock:ver',
  'stock:ajustar',
  'compras:gestionar',
  'abastecimiento:gestionar',
  'caja:gestionar',
  'gastos:gestionar',
  'reportes:ver',
  'aperturas:ver',
  'productos:gestionar',
  'precios:gestionar',
  'usuarios:gestionar',
  'configuracion:gestionar',
] as const;

export type Capacidad = (typeof CAPACIDADES)[number];

const CAPACIDADES_VENTA: readonly Capacidad[] = [
  'pedidos:ver',
  'pedidos:confirmar',
  'pedidos:cancelar',
  'pedidos:entregar',
  'venta_presencial:registrar',
  'stock:ver',
];

const CAPACIDADES_OPERACION: readonly Capacidad[] = [
  ...CAPACIDADES_VENTA,
  'stock:ajustar',
  'compras:gestionar',
  'abastecimiento:gestionar',
  'caja:gestionar',
  'gastos:gestionar',
  'reportes:ver',
  'aperturas:ver',
];

export const CAPACIDADES_POR_ROL: Readonly<Record<RolOperativo, readonly Capacidad[]>> = {
  venta: CAPACIDADES_VENTA,
  operacion: CAPACIDADES_OPERACION,
  administracion: CAPACIDADES,
};

export function esRolOperativo(valor: unknown): valor is RolOperativo {
  return typeof valor === 'string' &&
    (ROLES_OPERATIVOS as readonly string[]).includes(valor);
}

export function rolTieneCapacidad(rol: RolOperativo, capacidad: Capacidad): boolean {
  return CAPACIDADES_POR_ROL[rol].includes(capacidad);
}

const NIVEL_ROL: Readonly<Record<RolOperativo, number>> = {
  venta: 1,
  operacion: 2,
  administracion: 3,
};

export function rolCumpleNivel(rol: RolOperativo, minimo: RolOperativo): boolean {
  return NIVEL_ROL[rol] >= NIVEL_ROL[minimo];
}
