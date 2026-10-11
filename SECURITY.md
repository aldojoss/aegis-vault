# Seguridad

## Estado

Aegis Vault es un proyecto en desarrollo y no ha pasado una auditoría independiente. El repositorio se mantiene privado mientras se revisan y prueban las funciones que manejan secretos.

La versión 1.1.0 usa AES-256-GCM con IV aleatorio de 12 bytes y sal aleatoria de 16 bytes. Las nuevas escrituras usan PBKDF2-HMAC-SHA-256 con 600.000 iteraciones; la autenticación GCM verifica la contraseña sin guardar un verificador de menor coste. La lectura del formato 1 conserva las 310.000 iteraciones originales para poder abrir bóvedas existentes.

Referencia para el coste de PBKDF2: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

La ventana Electron usa aislamiento de contexto, sandbox y Node deshabilitado en el renderer. La navegación dentro de la ventana está bloqueada y no se cargan fuentes externas. Referencia: https://www.electronjs.org/docs/latest/tutorial/security

## Datos y respaldos

- Nunca adjuntes contraseñas, bóvedas, exportaciones, claves privadas ni datos personales a reportes de errores o commits.
- La exportación JSON carece de cifrado. Los respaldos `.aegis`, `.enc` y `.bak` siguen siendo sensibles aunque estén cifrados.
- Las copias del formato 1 pueden incluir el verificador antiguo de 2.000 iteraciones. Una nueva escritura elimina ese verificador en el archivo actual; las copias anteriores deben gestionarse por separado.
- La contraseña maestra está en memoria durante la sesión desbloqueada. JavaScript no ofrece garantías de borrado físico de todas sus copias en memoria.
- Un equipo comprometido puede capturar datos mientras la bóveda está abierta.

## Validación

`npm run check` comprueba tipos, regresiones de cifrado y compatibilidad, errores de disco, lectura inicial, guardados serializados y generación de claves. Estas pruebas no sustituyen una auditoría ni garantizan recuperación tras todos los tipos de fallos eléctricos o de hardware.

`npm audit --omit=dev` no reportó vulnerabilidades de dependencias de producción en la revisión inicial. El árbol de herramientas de empaquetado conserva avisos moderados; deben reevaluarse con `npm audit` antes de publicar cada versión. Dependabot propone actualizaciones periódicas.

## Reportar fallos

Usa un reporte privado en GitHub con pasos de reproducción y datos ficticios. No publiques registros o archivos reales de bóveda.
