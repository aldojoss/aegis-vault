package io.github.aldojoss.aegisvault;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.*;
import org.junit.runner.RunWith;
import javax.crypto.SecretKeyFactory;
import android.security.keystore.KeyInfo;
import java.security.KeyStore;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class BiometricVaultTest {
    private BiometricVault vault;
    @Before public void setup() throws Exception {
        var context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertTrue(context.getPackageName().endsWith(".debug"));
        vault = new BiometricVault(context); vault.disable();
    }
    @After public void finish() throws Exception { vault.disable(); }
    @Test public void keystoreRequiresAuthenticationForEveryCryptographicOperation() throws Exception {
        assertEquals(0, vault.availability());
        var cipher = vault.encryptCipher();
        KeyStore keys = KeyStore.getInstance("AndroidKeyStore"); keys.load(null);
        var key = (javax.crypto.SecretKey) keys.getKey("aegis.biometric.v1", null);
        assertNull("The key must not be exportable", key.getEncoded());
        KeyInfo info = (KeyInfo) SecretKeyFactory.getInstance("AES", "AndroidKeyStore").getKeySpec(key, KeyInfo.class);
        assertTrue(info.isUserAuthenticationRequired());
        assertEquals(android.os.Build.VERSION.SDK_INT >= 30 ? 0 : -1, info.getUserAuthenticationValidityDurationSeconds());
        assertTrue(info.isInvalidatedByBiometricEnrollment());
        try { vault.storeCredential(cipher, "synthetic guarded credential"); fail("Unauthenticated encryption must fail"); }
        catch (java.security.GeneralSecurityException expected) {}
        assertFalse(vault.enabled());
    }
    @Test public void damagedWrappedMetadataIsDiscardedWithoutTouchingVaultData() throws Exception {
        var context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        vault.encryptCipher();
        context.getSharedPreferences("aegis_biometric", 0).edit().putString("wrapped", "{damaged").commit();
        assertFalse(vault.status().getBoolean("enabled"));
        assertFalse(context.getSharedPreferences("aegis_biometric", 0).contains("wrapped"));
    }
}
