# Cambios

## 1.2.1 Android

- Desbloqueo opcional con huella mediante el diálogo de Android y una clave de Keystore que exige biometría fuerte en cada uso.
- Activación y desactivación desde Ajustes, contraseña maestra como alternativa y descarte de resultados tras bloquear la sesión.
- Cambio de contraseña maestra desactiva la huella anterior para evitar conservar una credencial obsoleta.
- Diseño móvil renovado: navegación inferior, controles táctiles más amplios, filas limpias y mejor distribución del detalle y Ajustes.
- Crédito «Creado por Aldo Aviles» en la configuración inicial, el desbloqueo y Ajustes.
- Iconos claros de las barras de Android sobre el tema oscuro.

## 1.2.0 Android

- Primera app Android gratuita y sin anuncios, con bóveda vacía y almacenamiento privado cifrado.
- Diseño adaptable al teléfono, menú lateral, lista y detalle independientes y navegación con el botón Atrás.
- Guardado atómico, respaldo anterior y bloqueo al salir, con protección de capturas de pantalla.
- Importación y exportación mediante el selector de archivos de Android. Las copias cifradas de Windows pueden usar una contraseña distinta de la bóveda móvil.
- Validación de copias y conservación de registros existentes cuando sus identificadores coinciden.
- APK firmado para instalación directa y actualizaciones; compilación reproducible y pruebas en una app de depuración separada.

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
