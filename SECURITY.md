# Seguridad

## Estado

Aegis Vault es un proyecto público en desarrollo y no ha pasado una auditoría independiente. Publicar el código permite revisarlo; no constituye una certificación de seguridad. Las bóvedas personales se conservan localmente y no forman parte del repositorio ni del instalador.

La versión 1.1.0 usa AES-256-GCM con IV aleatorio de 12 bytes y sal aleatoria de 16 bytes. Las nuevas escrituras usan PBKDF2-HMAC-SHA-256 con 600.000 iteraciones; la autenticación GCM verifica la contraseña sin guardar un verificador de menor coste. La lectura del formato 1 conserva las 310.000 iteraciones originales para poder abrir bóvedas existentes.

Referencia para el coste de PBKDF2: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

La ventana Electron usa aislamiento de contexto, sandbox y Node deshabilitado en el renderer. La navegación dentro de la ventana está bloqueada y no se cargan fuentes externas. Referencia: https://www.electronjs.org/docs/latest/tutorial/security

## Datos y respaldos

Android reutiliza el mismo formato cifrado. El archivo vive en almacenamiento privado, usa `AtomicFile` y conserva el guardado anterior. Los fallos de lectura impiden ofrecer una bóveda nueva sobre el archivo existente. La app bloquea la sesión al pasar a segundo plano y oculta la WebView hasta confirmar el bloqueo. El selector de documentos del sistema tiene una excepción durante importaciones y exportaciones iniciadas por el usuario. `FLAG_SECURE` protege las capturas y las miniaturas; las copias automáticas de Android están deshabilitadas. El APK no solicita permisos de red ni acceso general a archivos.

La firma del APK permite instalar actualizaciones con la misma clave; no representa una auditoría del producto. Las claves de firma se conservan fuera del repositorio. Las pruebas instrumentadas usan una aplicación de depuración separada y datos sintéticos, nunca bóvedas personales.

## Biometría de Android

La activación es opcional y requiere una sesión desbloqueada y una autenticación del sistema. Una clave AES-256-GCM no exportable de Android Keystore cifra la contraseña maestra. Los datos privados contienen únicamente el IV y el texto cifrado; la clave requiere biometría fuerte en cada operación, sin ventana de validez ni alternativa con el PIN del dispositivo. El desbloqueo usa `BiometricPrompt` con `CryptoObject` y descifra después la bóveda con su contraseña original.

Al registrar nuevas huellas Android invalida la clave; cambiar la contraseña maestra, reiniciar la bóveda o desactivar la función elimina el acceso biométrico. Una cancelación o un resultado recibido después de pasar a segundo plano no desbloquea la app. La contraseña maestra permite volver a entrar y reactivar la función. La clave biométrica no se exporta con los respaldos ni se transfiere a otro teléfono.

Cualquier biometría fuerte registrada en el teléfono puede autorizar este acceso. Activa la función solo si confías en quienes tienen huellas o rostros registrados. La contraseña se descifra en memoria durante el desbloqueo; Java y JavaScript no garantizan borrar físicamente todas las copias. La aplicación no lee ni almacena plantillas de huellas.

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
