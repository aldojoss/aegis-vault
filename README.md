# Aegis Vault

Gestor local de contraseñas para Windows. Organiza inicios de sesión, tarjetas, notas, identidades y servidores en una bóveda cifrada. No requiere una cuenta ni un servidor.

## Instalar

Los instaladores se distribuyen en [Releases](https://github.com/aldojoss/aegis-vault/releases). El código fuente no incluye ejecutables, archivos de bóveda ni dependencias instaladas.

Después de instalar la versión 1.1.0, abre la aplicación y usa tu contraseña maestra habitual. Al cerrar la ventana, la bóveda se bloquea: al reabrir debe mostrar **Desbloquear Aegis Vault**, no pedir crear una contraseña nueva.

## Dónde se guardan los datos

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
