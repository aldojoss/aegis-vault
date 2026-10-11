# Aegis Vault para Android

## Instalar

Descarga el APK de Android, ábrelo en el teléfono y permite la instalación desde el navegador o gestor de archivos que utilizaste. Después puedes revocar ese permiso. Se requiere Android 8.0 o posterior y un Android System WebView actualizado.

La primera configuración crea una bóveda vacía y pide tu propia contraseña maestra. El contenido se cifra antes de escribirlo en el almacenamiento privado de Android. La app no solicita acceso general a archivos, contactos, cámara, ubicación ni red. No incorpora anuncios ni analítica.

Al salir de la aplicación se bloquea. La selección de archivos mediante el selector del sistema es parte del flujo de importación o exportación. La captura de pantalla y las miniaturas en aplicaciones recientes están protegidas. La limpieza del portapapeles depende de que Android permita acceder a él; algunas versiones restringen el acceso en segundo plano.

Guarda un respaldo cifrado antes de desinstalar, borrar los datos de la app o cambiar de teléfono. Las copias automáticas del sistema están deshabilitadas; Aegis no recupera una bóveda si pierdes su contraseña maestra.

## Pasar registros desde Windows

1. En Windows, desbloquea Aegis Vault y abre Configuración. Exporta una copia cifrada `.aegis`.
2. Pasa ese archivo al teléfono por el medio que prefieras. Conserva la contraseña maestra que protege esa copia.
3. En Android, configura tu bóveda y abre el menú, Configuración e Importar copia.
4. Selecciona el archivo y escribe la contraseña de la copia. Puede ser diferente de la contraseña de tu nueva bóveda móvil.

Solo se añaden los registros con identificadores nuevos. Los existentes no se sustituyen. Esta operación es una migración manual; no sincroniza las modificaciones entre Windows y Android. También puedes exportar un respaldo desde Android mediante el selector del sistema.

## Compilar

Requisitos: Node.js 24, JDK 21 y Android SDK con plataforma 36 y Build Tools 36.0.0. Configura la ubicación del SDK en `android/local.properties` o en `ANDROID_HOME`.

```powershell
npm ci
npm run check
npm run android:sync
cd android
.\gradlew.bat assembleDebug
```

La compilación de depuración usa un identificador distinto (`.debug`) para poder probarla sin alterar los datos de una instalación normal. Las pruebas instrumentadas se ejecutan en esta app separada, con registros sintéticos.

```powershell
.\gradlew.bat :app:connectedDebugAndroidTest
```

## Firma y actualizaciones directas

El APK entregado se compila como release y está firmado con una clave local. Conserva la clave y `android/keystore.properties` en privado: son necesarios para firmar futuras actualizaciones compatibles. El repositorio excluye ambos archivos. No compartas las claves ni las contraseñas de firma.

La configuración local de firma contiene `storeFile`, `storePassword`, `keyAlias` y `keyPassword`. Cuando existe, Gradle firma `assembleRelease`; sin ella, el resultado release es un APK sin firma que no se puede instalar directamente.

```powershell
.\gradlew.bat :app:assembleRelease
```

Google Play no forma parte de esta entrega. La aplicación aún requiere pruebas en teléfonos físicos y una revisión independiente antes de considerarse un producto auditado.
