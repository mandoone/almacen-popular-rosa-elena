import { permiteLoginLegacy } from '../session.ts';
import {
  leerUsuariosAdmin,
  MAX_USUARIOS_ADMIN,
  MAX_VERSION_SESION_ADMIN,
  type ConfiguracionUsuarios,
} from './identidades.ts';

type EntornoAccesoAdmin = {
  NODE_ENV?: string;
  NEXT_PUBLIC_APP_ENV?: string;
  VERCEL_ENV?: string;
  VERCEL_TARGET_ENV?: string;
  VERCEL_GIT_COMMIT_REF?: string;
  ADMIN_USERS_JSON?: string;
  ADMIN_USERS_PREVIEW_ADDITIONAL_JSON?: string;
  ADMIN_LEGACY_RECOVERY_ENABLED?: string;
};

function incorporarOmarTest(
  original: ConfiguracionUsuarios,
  valor: string | undefined
): ConfiguracionUsuarios {
  if (original.estado !== 'valida' || original.usuarios.length >= MAX_USUARIOS_ADMIN) {
    return original;
  }

  const complemento = leerUsuariosAdmin(valor);
  if (complemento.estado !== 'valida' || complemento.usuarios.length !== 1) {
    return original;
  }

  // Un complemento inválido nunca afecta el acceso de las cuentas vigentes.
  const [omar] = complemento.usuarios;
  if (omar.actor_id !== 'omar-test' || omar.rol !== 'administracion' ||
      original.usuarios.some(({ actor_id }) => actor_id === omar.actor_id)) {
    return original;
  }

  // La sesión del complemento ocupa un rango que el registro original no puede
  // emitir. Un cambio de registro no puede revalidar una cookie de la otra fuente.
  const omarConVersionEfectiva = {
    ...omar,
    session_version: MAX_VERSION_SESION_ADMIN + omar.session_version,
  };
  return { estado: 'valida', usuarios: [...original.usuarios, omarConVersionEfectiva] };
}

export function leerAccesoAdmin(env: EntornoAccesoAdmin = {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV,
  VERCEL_TARGET_ENV: process.env.VERCEL_TARGET_ENV,
  VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
  ADMIN_USERS_JSON: process.env.ADMIN_USERS_JSON,
  ADMIN_USERS_PREVIEW_ADDITIONAL_JSON: process.env.ADMIN_USERS_PREVIEW_ADDITIONAL_JSON,
  ADMIN_LEGACY_RECOVERY_ENABLED: process.env.ADMIN_LEGACY_RECOVERY_ENABLED,
}): { usuarios: ConfiguracionUsuarios; legacyPermitido: boolean } {
  const original = leerUsuariosAdmin(env.ADMIN_USERS_JSON);
  const previewOperativo = env.NEXT_PUBLIC_APP_ENV === 'test' &&
    env.VERCEL_ENV === 'preview' &&
    env.VERCEL_TARGET_ENV === 'preview' &&
    env.VERCEL_GIT_COMMIT_REF === 'feature/fase-3a-operativa';

  if (previewOperativo) {
    return {
      usuarios: incorporarOmarTest(original, env.ADMIN_USERS_PREVIEW_ADDITIONAL_JSON),
      legacyPermitido: false,
    };
  }

  return {
    usuarios: original,
    legacyPermitido: original.estado !== 'invalida' && permiteLoginLegacy(
      env.NODE_ENV,
      env.NEXT_PUBLIC_APP_ENV,
      original.estado === 'valida',
      env.ADMIN_LEGACY_RECOVERY_ENABLED === 'true'
    ),
  };
}
