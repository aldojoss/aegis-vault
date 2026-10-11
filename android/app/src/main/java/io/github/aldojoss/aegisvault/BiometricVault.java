package io.github.aldojoss.aegisvault;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import androidx.biometric.BiometricManager;
import com.getcapacitor.JSObject;
import org.json.JSONObject;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import java.security.KeyStore;
import java.nio.charset.StandardCharsets;
import java.io.IOException;

/** Stores only a credential wrapped by a per-use, biometric-bound Keystore key. */
final class BiometricVault {
    private static final String ALIAS = "aegis.biometric.v1";
    private final Context context;
    private final SharedPreferences preferences;
    BiometricVault(Context context) {
        this.context = context;
        preferences = context.getSharedPreferences("aegis_biometric", Context.MODE_PRIVATE);
    }
    private KeyStore keyStore() throws Exception {
        KeyStore keys = KeyStore.getInstance("AndroidKeyStore"); keys.load(null); return keys;
    }
    int availability() { return BiometricManager.from(context).canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG); }
    boolean enabled() throws Exception { return preferences.contains("wrapped") && keyStore().containsAlias(ALIAS); }
    JSObject status() {
        int code = availability();
        boolean enabled = false;
        try {
            enabled = enabled();
            if (enabled) decryptCipher(); // Detect damaged metadata or invalidated keys without decrypting.
        } catch (Exception error) { try { disable(); } catch (Exception ignored) {} enabled = false; }
        String reason = code == BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED ? "Registra una huella en los ajustes de Android."
            : code == BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE ? "La biometría no está disponible en este momento. Usa tu contraseña maestra."
            : "Este teléfono no ofrece biometría de la clase de seguridad necesaria. Usa tu contraseña maestra.";
        return new JSObject().put("available", code == BiometricManager.BIOMETRIC_SUCCESS).put("enabled", enabled)
            .put("reason", code == BiometricManager.BIOMETRIC_SUCCESS ? "" : reason);
    }
    Cipher encryptCipher() throws Exception {
        disable();
        KeyGenParameterSpec.Builder spec = new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setKeySize(256).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setUserAuthenticationRequired(true).setInvalidatedByBiometricEnrollment(true);
        if (Build.VERSION.SDK_INT >= 30) spec.setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG);
        else spec.setUserAuthenticationValidityDurationSeconds(-1);
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(spec.build());
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, generator.generateKey());
        return cipher;
    }
    void storeCredential(Cipher authenticated, String password) throws Exception {
        byte[] encrypted = authenticated.doFinal(password.getBytes(StandardCharsets.UTF_8));
        String wrapped = new JSONObject().put("version", 1)
            .put("iv", Base64.encodeToString(authenticated.getIV(), Base64.NO_WRAP))
            .put("ciphertext", Base64.encodeToString(encrypted, Base64.NO_WRAP)).toString();
        if (!preferences.edit().putString("wrapped", wrapped).commit()) throw new IOException("Credential write failed");
    }
    private JSONObject wrapped() throws Exception {
        String value = preferences.getString("wrapped", null);
        if (value == null || value.length() > 20000) throw new IOException("Missing credential");
        JSONObject data = new JSONObject(value);
        if (data.getInt("version") != 1) throw new IOException("Invalid credential version");
        return data;
    }
    Cipher decryptCipher() throws Exception {
        JSONObject data = wrapped();
        byte[] iv = Base64.decode(data.getString("iv"), Base64.NO_WRAP);
        byte[] encrypted = Base64.decode(data.getString("ciphertext"), Base64.NO_WRAP);
        if (iv.length != 12 || encrypted.length < 16) throw new IOException("Invalid credential");
        SecretKey key = (SecretKey) keyStore().getKey(ALIAS, null);
        if (key == null) throw new IOException("Missing key");
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, iv));
        return cipher;
    }
    String unlock(Cipher authenticated) throws Exception {
        byte[] plain = authenticated.doFinal(Base64.decode(wrapped().getString("ciphertext"), Base64.NO_WRAP));
        try { return new String(plain, StandardCharsets.UTF_8); }
        finally { java.util.Arrays.fill(plain, (byte) 0); }
    }
    void disable() throws Exception {
        KeyStore keys = keyStore();
        if (keys.containsAlias(ALIAS)) keys.deleteEntry(ALIAS);
        if (!preferences.edit().clear().commit()) throw new IOException("Credential removal failed");
    }
}
