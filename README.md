# Aegis Vault

Gestor local de contraseñas para Windows y Android. Organiza inicios de sesión, tarjetas, notas, identidades y servidores en una bóveda cifrada. No requiere una cuenta ni un servidor.

## Instalar

**Android:** descarga `Aegis-Vault-1.2.0-Android.apk` desde [las versiones publicadas](https://github.com/aldojoss/aegis-vault/releases). Requiere Android 8.0 o posterior. La primera versión móvil es gratuita, funciona sin conexión y empieza con una bóveda vacía. Consulta [ANDROID.md](ANDROID.md) para instalar, hacer respaldos y pasar registros desde Windows. La transferencia es manual; los dispositivos no se sincronizan automáticamente.

**Windows:**

Descarga el instalador de Windows desde la [última versión publicada](https://github.com/aldojoss/aegis-vault/releases/latest). Abre el archivo `Aegis-Vault-Setup-1.1.1.exe` y sigue el asistente. El instalador todavía no tiene firma digital.

En un equipo sin bóveda previa, crea y confirma tu propia contraseña maestra. La bóveda empieza vacía: no incluye cuentas de ejemplo, contraseñas predeterminadas ni perfiles personales. Usa **Nuevo elemento** para añadir tus registros. Cada persona conserva su propia bóveda local; descargar la aplicación no comparte datos con otros usuarios.

Si ya usabas Aegis Vault, abre la aplicación con tu contraseña maestra habitual. Al cerrar la ventana, la bóveda se bloquea: al reabrir debe mostrar **Desbloquear Aegis Vault**, no pedir crear una contraseña nueva. Instalar una actualización conserva los registros existentes.

Algunas versiones antiguas incluían registros de demostración. Si están guardados en tu bóveda, la versión 1.1.1 ofrece **Revisar ejemplos antiguos**: selecciona los que quieras mover a la papelera. Ninguno se selecciona ni elimina automáticamente; conserva los que hayas editado para uso real. Los registros permanecen en la papelera y en los respaldos cifrados hasta que decidas gestionarlos.

El código fuente publicado no incluye bóvedas, exportaciones ni datos personales. Los binarios se distribuyen solo en Releases. Para compartir la app, envía el enlace de la última versión, nunca tu archivo de bóveda.

## Dónde se guardan los datos

Android guarda el archivo cifrado en el almacenamiento privado de la aplicación, con escritura atómica y una copia del guardado anterior. No usa el almacenamiento local del navegador. Las copias automáticas de Android están deshabilitadas: exporta un respaldo cifrado antes de desinstalar, borrar los datos o cambiar de teléfono.

La aplicación de escritorio guarda el archivo en:

```text
%APPDATA%\aegis-vault\aegis_vault_v1.enc
```

El nombre del archivo se conserva por compatibilidad; la versión del formato está dentro del archivo. Las nuevas escrituras usan el formato 2. Cada guardado conserva el archivo anterior como `.bak` y reemplaza el archivo mediante una escritura temporal sincronizada. Los errores de lectura no habilitan la creación de una bóveda nueva. La ventana espera los guardados pendientes antes de cerrar.

Si una versión antigua guardó datos en `%APPDATA%\Aegis Vault`, la app puede leer esa ubicación y usa la ubicación estable en el siguiente guardado. Los registros anteriores no se pueden recuperar sin la contraseña que los cifró.

El modo navegador es una vista de desarrollo: usa el almacenamiento local de ese navegador y ese origen. No comparte la bóveda de la aplicación instalada. Cambiar de navegador, puerto o perfil puede mostrar una bóveda diferente.

## Desarrollo

Requiere Node.js 24 y npm. El instalador NSIS se genera en Windows.

```sh
npm ci
npm run dev              # Vista web para desarrollo
npm run electron:dev     # Compila y abre la app de escritorio
npm run check            # TypeScript, pruebas y compilación
npm run dist             # Genera el instalador Windows en dist-electron/
```

Para compilar Android, consulta [los requisitos de compilación y firma](ANDROID.md#compilar).

## Cambios en 1.1.0

- Ubicación de datos estable, creación del directorio, guardado atómico y comprobación de la respuesta de escritura.
- Guardados en orden y espera al cerrar; no se anuncia éxito ante un fallo de disco.
- Carga inicial explícita; un archivo dañado o una conexión de escritorio fallida no se trata como una bóveda inexistente.
- Al bloquear, se cierran el editor y los diálogos que pueden contener datos sensibles.
- AES-256-GCM y PBKDF2-HMAC-SHA-256 con 600.000 iteraciones para nuevos guardados. Se eliminó el verificador barato de la contraseña y se mantiene lectura del formato antiguo.
- Frases de paso con la lista EFF de 7.776 palabras, seis palabras como mínimo y selección uniforme con rechazo de valores sesgados.
- Interfaz en tonos grafito, acento discreto, controles más simples y tipografía del sistema sin descargar fuentes.
- Electron, Vite y Tailwind actualizados, pruebas de regresión y comprobaciones automáticas en GitHub.

## Seguridad y límites

El proyecto todavía no ha pasado una auditoría independiente. Los medidores de fortaleza de contraseñas escritas manualmente son heurísticos. La exportación JSON contiene secretos en texto claro; úsala solo cuando sea necesario y custodia el archivo. Mantén respaldos cifrados en una ubicación segura.

Los respaldos antiguos de formato 1 conservan su criptografía original y su verificador antiguo: actualizar la app no transforma automáticamente todas las copias que ya existan. El instalador local no está firmado con un certificado comercial.

Consulta [SECURITY.md](SECURITY.md) y [las atribuciones de terceros](THIRD_PARTY_NOTICES.md). El código propio usa la [licencia MIT](LICENSE).
