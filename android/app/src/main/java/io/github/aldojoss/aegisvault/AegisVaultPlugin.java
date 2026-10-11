package io.github.aldojoss.aegisvault;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.os.PersistableBundle;
import android.provider.OpenableColumns;
import android.database.Cursor;
import android.view.View;
import androidx.activity.result.ActivityResult;
import androidx.biometric.BiometricPrompt;
import androidx.biometric.BiometricManager;
import androidx.core.content.ContextCompat;
import javax.crypto.Cipher;
import com.getcapacitor.*;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "AegisVault")
public class AegisVaultPlugin extends Plugin {
    private VaultStore store;
    private BiometricVault biometrics;
    private BiometricPrompt biometricPrompt;
    private long biometricEpoch = 0;
    private boolean biometricBusy = false;
    private final Handler clipboardHandler = new Handler(Looper.getMainLooper());
    private Runnable clearClipboard;
    private volatile boolean pickingFile = false;
    private volatile boolean resumed = true;
    private volatile boolean needsLock = false;
    @Override public void load() { store = new VaultStore(getContext().getFilesDir()); biometrics = new BiometricVault(getContext()); }
    private JSObject ok() { return new JSObject().put("success", true); }
    private void fail(PluginCall call, String message) { call.resolve(new JSObject().put("success", false).put("error", message)); }

    @PluginMethod public void loadVault(PluginCall call) {
        try { String data = store.read(); call.resolve(ok().put("data", data == null ? org.json.JSONObject.NULL : data)); }
        catch (Exception error) { fail(call, "No se pudo leer la bóveda. Conserva una copia y vuelve a intentarlo; no se ha reemplazado el archivo."); }
    }
    @PluginMethod public void saveVault(PluginCall call) {
        try { store.write(call.getString("content")); call.resolve(ok()); }
        catch (Exception error) { fail(call, "No se pudo guardar la bóveda. Comprueba el espacio disponible y reintenta."); }
    }
    @PluginMethod public void resetVault(PluginCall call) {
        try { biometrics.disable(); store.archive(); call.resolve(ok()); }
        catch (Exception error) { fail(call, "No se pudo conservar la bóveda anterior. No se creó otra."); }
    }
    @PluginMethod public void getInfo(PluginCall call) {
        call.resolve(new JSObject().put("version", BuildConfig.VERSION_NAME).put("vaultPath", "Almacenamiento privado de Android"));
    }
    @PluginMethod public void exit(PluginCall call) {
        getActivity().runOnUiThread(() -> { getActivity().finish(); call.resolve(); });
    }
    @PluginMethod public void confirmLocked(PluginCall call) {
        getActivity().runOnUiThread(() -> { needsLock = false; if (resumed) getBridge().getWebView().setVisibility(View.VISIBLE); call.resolve(); });
    }
    @Override protected void handleOnPause() {
        resumed = false;
        cancelBiometric();
        // The system document picker is part of a user-initiated import/export.
        // It does not display vault contents. All other backgrounding locks.
        if (!pickingFile) {
            needsLock = true;
            getActivity().runOnUiThread(() -> getBridge().getWebView().setVisibility(View.INVISIBLE));
            notifyListeners("background", new JSObject());
        }
    }
    @Override protected void handleOnResume() {
        resumed = true;
        if (needsLock) notifyListeners("background", new JSObject());
        else getBridge().getWebView().setVisibility(View.VISIBLE);
        notifyListeners("foreground", new JSObject());
    }
    void back() { notifyListeners("back", new JSObject()); }

    private void cancelBiometric() {
        biometricEpoch++;
        if (biometricPrompt != null) biometricPrompt.cancelAuthentication();
    }
    @PluginMethod public void biometricStatus(PluginCall call) { call.resolve(biometrics.status()); }
    @PluginMethod public void disableBiometric(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            cancelBiometric();
            try { biometrics.disable(); call.resolve(ok()); }
            catch (Exception error) { fail(call, "No se pudo desactivar la huella. Reintenta."); }
        });
    }
    @PluginMethod public void enableBiometric(PluginCall call) { authenticateBiometric(call, true); }
    @PluginMethod public void unlockBiometric(PluginCall call) { authenticateBiometric(call, false); }
    private void authenticateBiometric(PluginCall call, boolean enabling) {
        getActivity().runOnUiThread(() -> {
            if (!resumed || biometricBusy) { fail(call, "Espera a que termine el desbloqueo y vuelve a intentarlo."); return; }
            if (biometrics.availability() != BiometricManager.BIOMETRIC_SUCCESS) { fail(call, "La biometría no está disponible. Usa tu contraseña maestra."); return; }
            java.util.concurrent.atomic.AtomicReference<String> credential = new java.util.concurrent.atomic.AtomicReference<>(enabling ? call.getString("password") : null);
            call.getData().remove("password");
            if (enabling && (credential.get() == null || credential.get().isEmpty() || credential.get().getBytes(StandardCharsets.UTF_8).length > 8192)) { credential.set(null); fail(call, "No se pudo activar la huella con esta contraseña."); return; }
            final Cipher cipher;
            try {
                if (store.read() == null) throw new java.io.IOException("No vault");
                cipher = enabling ? biometrics.encryptCipher() : biometrics.decryptCipher();
            } catch (Exception error) {
                credential.set(null);
                try { biometrics.disable(); } catch (Exception ignored) {}
                fail(call, "Entra con tu contraseña maestra y activa la huella de nuevo en Configuración."); return;
            }
            biometricBusy = true;
            long epoch = ++biometricEpoch;
            biometricPrompt = new BiometricPrompt(getActivity(), ContextCompat.getMainExecutor(getContext()), new BiometricPrompt.AuthenticationCallback() {
                @Override public void onAuthenticationError(int errorCode, CharSequence message) {
                    credential.set(null);
                    biometricBusy = false; biometricPrompt = null;
                    if (enabling) { try { biometrics.disable(); } catch (Exception ignored) {} }
                    call.resolve(new JSObject().put("success", false).put("canceled", true));
                }
                @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                    biometricBusy = false; biometricPrompt = null;
                    if (!resumed || epoch != biometricEpoch) { credential.set(null); if (enabling) { try { biometrics.disable(); } catch (Exception ignored) {} } call.resolve(new JSObject().put("success", false).put("canceled", true)); return; }
                    try {
                        Cipher authenticated = result.getCryptoObject() == null ? null : result.getCryptoObject().getCipher();
                        if (authenticated == null) throw new java.io.IOException("Missing authenticated cipher");
                        if (enabling) { biometrics.storeCredential(authenticated, credential.getAndSet(null)); call.resolve(ok()); }
                        else call.resolve(ok().put("password", biometrics.unlock(authenticated)));
                    } catch (Exception error) {
                        credential.set(null);
                        try { biometrics.disable(); } catch (Exception ignored) {}
                        fail(call, "No se pudo abrir con la huella. Usa la contraseña maestra y activa la huella de nuevo.");
                    }
                }
            });
            BiometricPrompt.PromptInfo prompt = new BiometricPrompt.PromptInfo.Builder()
                .setTitle(enabling ? "Activar huella en Aegis Vault" : "Desbloquear Aegis Vault")
                .setSubtitle("Confirma con la biometría de este teléfono")
                .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
                .setNegativeButtonText("Usar contraseña maestra").build();
            try { biometricPrompt.authenticate(prompt, new BiometricPrompt.CryptoObject(cipher)); }
            catch (Exception error) { credential.set(null); biometricBusy = false; biometricPrompt = null; if (enabling) { try { biometrics.disable(); } catch (Exception ignored) {} } fail(call, "No se pudo abrir el diálogo de huella. Usa tu contraseña maestra."); }
        });
    }

    @PluginMethod public void copyWithAutoClear(PluginCall call) {
        String text = call.getString("text");
        if (text == null) { fail(call, "No hay contenido para copiar."); return; }
        int seconds = Math.max(0, Math.min(3600, call.getInt("clearSeconds", 30)));
        getActivity().runOnUiThread(() -> {
            try {
                ClipboardManager manager = (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
                ClipData clip = ClipData.newPlainText("Aegis Vault", text);
                PersistableBundle extras = new PersistableBundle();
                extras.putBoolean("android.content.extra.IS_SENSITIVE", true);
                clip.getDescription().setExtras(extras);
                manager.setPrimaryClip(clip);
                if (clearClipboard != null) clipboardHandler.removeCallbacks(clearClipboard);
                if (seconds > 0) {
                    clearClipboard = () -> {
                        try {
                            ClipData current = manager.getPrimaryClip();
                            if (current != null && current.getItemCount() == 1 && text.contentEquals(current.getItemAt(0).coerceToText(getContext()))) {
                                if (android.os.Build.VERSION.SDK_INT >= 28) manager.clearPrimaryClip();
                                else manager.setPrimaryClip(ClipData.newPlainText("", ""));
                            }
                        } catch (Exception ignored) { /* Android may restrict access while in background. */ }
                    };
                    clipboardHandler.postDelayed(clearClipboard, seconds * 1000L);
                }
                call.resolve(ok());
            } catch (Exception error) { fail(call, "Android no permitió copiar al portapapeles."); }
        });
    }
    @PluginMethod public void importVault(PluginCall call) {
        if (pickingFile) { fail(call, "Ya hay una selección de archivo abierta."); return; }
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
        pickingFile = true;
        try { startActivityForResult(call, intent, "importResult"); }
        catch (Exception error) { pickingFile = false; fail(call, "No se pudo abrir el selector de archivos."); }
    }
    @ActivityCallback private void importResult(PluginCall call, ActivityResult result) {
        pickingFile = false;
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) { call.resolve(ok().put("canceled", true)); return; }
        try {
            var uri = result.getData().getData();
            String name = "Copia de Aegis";
            try (Cursor cursor = getContext().getContentResolver().query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int column = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    if (column >= 0) name = cursor.getString(column);
                }
            }
            String content = VaultStore.readText(getContext().getContentResolver().openInputStream(uri));
            call.resolve(ok().put("content", content).put("fileName", name));
        } catch (Exception error) { fail(call, "No se pudo leer la copia. El límite es 20 MB."); }
    }
    @PluginMethod public void exportVault(PluginCall call) {
        if (pickingFile) { fail(call, "Ya hay una selección de archivo abierta."); return; }
        String content = call.getString("content");
        if (content == null || content.getBytes(StandardCharsets.UTF_8).length > VaultStore.MAX_BYTES) { fail(call, "La copia está vacía o excede 20 MB."); return; }
        String name = call.getString("defaultName", "aegis-backup.aegis").replaceAll("[^a-zA-Z0-9._-]", "_");
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/octet-stream").putExtra(Intent.EXTRA_TITLE, name);
        pickingFile = true;
        try { startActivityForResult(call, intent, "exportResult"); }
        catch (Exception error) { pickingFile = false; fail(call, "No se pudo abrir el selector de destino."); }
    }
    @ActivityCallback private void exportResult(PluginCall call, ActivityResult result) {
        pickingFile = false;
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) { call.resolve(ok().put("canceled", true)); return; }
        try (OutputStream stream = getContext().getContentResolver().openOutputStream(result.getData().getData(), "wt")) {
            if (stream == null) throw new java.io.IOException("Missing output stream");
            stream.write(call.getString("content", "").getBytes(StandardCharsets.UTF_8));
            stream.flush();
        } catch (Exception error) { fail(call, "No se pudo exportar la copia. Elige otro destino."); return; }
        call.resolve(ok());
    }
}
