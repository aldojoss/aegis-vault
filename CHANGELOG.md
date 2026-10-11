# Cambios

## 1.1.1

- Primera configuración con bóveda vacía y sin cuentas ni perfiles de demostración.
- Revisión opcional de registros de demostración conservados de versiones anteriores. El usuario selecciona cuáles mover a la papelera; no se eliminan definitivamente ni se alteran automáticamente los registros existentes.
- Comprobación de los archivos ejecutables durante la compilación para impedir publicar los datos de demostración originales o archivos de bóveda.
- Versión de la interfaz sincronizada con el paquete y descripción del cifrado actualizada.
- Instrucciones para instalar y compartir la aplicación desde un repositorio público.

## 1.1.0

- Escritura atómica, respaldo del archivo previo y espera de los guardados al cerrar.
- Compatibilidad con bóvedas del formato anterior y rechazo de archivos dañados sin ofrecer sustituirlos.
- Cifrado del formato 2 con AES-256-GCM y PBKDF2-HMAC-SHA-256 de 600.000 iteraciones.
- Diseño sobrio y mejoras en el generador de contraseñas.
