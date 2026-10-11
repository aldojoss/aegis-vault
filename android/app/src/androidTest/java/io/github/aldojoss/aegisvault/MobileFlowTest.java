package io.github.aldojoss.aegisvault;

import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.lifecycle.Lifecycle;
import android.view.WindowManager;
import android.view.View;
import org.junit.*;
import org.junit.runner.RunWith;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import android.graphics.Bitmap;
import java.io.FileOutputStream;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class MobileFlowTest {
    private ActivityScenario<MainActivity> scenario;
    private final String password = "synthetic mobile test password";
    @Before public void setup() throws Exception {
        var context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertTrue("Only the isolated debug app may run these tests", context.getPackageName().endsWith(".debug"));
        new BiometricVault(context).disable();
        for (File file : context.getFilesDir().listFiles()) if (file.getName().startsWith("aegis_vault")) assertTrue(file.delete());
        scenario = ActivityScenario.launch(MainActivity.class);
    }
    @After public void finish() { if (scenario != null) scenario.close(); }
    private String js(String expression) throws Exception {
        CountDownLatch done = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>();
        scenario.onActivity(activity -> activity.getBridge().getWebView().evaluateJavascript(expression, value -> { result.set(value); done.countDown(); }));
        assertTrue("WebView did not answer", done.await(8, TimeUnit.SECONDS));
        return result.get();
    }
    private void await(String expression) throws Exception {
        long until = System.currentTimeMillis() + 45000;
        while (System.currentTimeMillis() < until) {
            if ("true".equals(js(expression))) return;
            Thread.sleep(200);
        }
        fail("Mobile condition did not become true: " + expression);
    }
    private void fill(String selector, String value) throws Exception {
        js("(()=>{const e=document.querySelector(" + org.json.JSONObject.quote(selector) + ");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e," + org.json.JSONObject.quote(value) + ");e.dispatchEvent(new Event('input',{bubbles:true}));return true;})()");
    }
    private void clickText(String text) throws Exception {
        js("(()=>{const e=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===" + org.json.JSONObject.quote(text) + ");if(!e)return false;e.click();return true;})()");
    }
    private void screenshot(String name) throws Exception {
        // Only this isolated debug test temporarily allows captures, containing
        // synthetic records. Production always retains FLAG_SECURE.
        scenario.onActivity(activity -> activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE));
        scenario.onActivity(activity -> assertTrue("The native WebView must be displayed", activity.getBridge().getWebView().isShown()));
        Thread.sleep(1000);
        Bitmap bitmap = InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
        assertNotNull(bitmap);
        File folder = new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null), "screenshots");
        folder.mkdirs();
        try (FileOutputStream output = new FileOutputStream(new File(folder, name))) { bitmap.compress(Bitmap.CompressFormat.PNG, 100, output); }
        bitmap.recycle();
        scenario.onActivity(activity -> activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE));
    }
    @Test public void emptySetupSaveReopenAndBackgroundLock() throws Exception {
        await("document.body.innerText.includes('Configurar Bóveda Aegis')");
        assertEquals("true", js("document.body.innerText.includes('Creado por Aldo Aviles')"));
        screenshot("android-setup.png");
        assertEquals("false", js("document.body.innerText.includes('Google / Gmail')"));
        fill("#master-password", password); fill("#confirm-master", password);
        clickText("Crear bóveda");
        await("document.body.innerText.includes('Tu bóveda está vacía')");
        assertEquals("true", js("crypto.subtle !== undefined && window.electronAPI !== undefined"));
        js("document.querySelector('[aria-label=\"Añadir registro\"]').click()");
        await("!!document.querySelector('input[placeholder=\"p. ej. Google, GitHub, Banco...\"]')");
        fill("input[placeholder='p. ej. Google, GitHub, Banco...']", "Synthetic phone record");
        fill("input[placeholder='usuario@correo.com']", "test@example.com");
        fill("input[placeholder='Introduce o genera una contraseña...']", "synthetic secret in emulator only");
        clickText("Guardar elemento");
        await("document.querySelector('.app-shell').dataset.view==='detail' && document.body.innerText.includes('Todos los cambios guardados')");
        await("!document.querySelector('.item-editor-panel')");
        assertEquals("true", js("document.documentElement.scrollWidth <= window.innerWidth"));
        screenshot("android-record.png");
        var context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        String encrypted = new String(Files.readAllBytes(new File(context.getFilesDir(), "aegis_vault_v1.enc").toPath()), StandardCharsets.UTF_8);
        assertFalse(encrypted.contains("synthetic secret")); assertFalse(encrypted.contains(password));
        scenario.onActivity(activity -> {
            assertTrue((activity.getWindow().getAttributes().flags & WindowManager.LayoutParams.FLAG_SECURE) != 0);
            activity.getOnBackPressedDispatcher().onBackPressed();
        });
        await("document.querySelector('.app-shell').dataset.view==='list'");
        scenario.close(); scenario = ActivityScenario.launch(MainActivity.class);
        await("document.body.innerText.includes('Desbloquear Aegis Vault')");
        fill("#master-password", password); clickText("Desbloquear bóveda");
        await("document.body.innerText.includes('Synthetic phone record')");
        scenario.moveToState(Lifecycle.State.CREATED); scenario.moveToState(Lifecycle.State.RESUMED);
        await("document.body.innerText.includes('Desbloquear Aegis Vault')");
        scenario.onActivity(activity -> assertEquals(View.VISIBLE, activity.getBridge().getWebView().getVisibility()));
        assertEquals("false", js("document.body.innerText.includes('Synthetic phone record')"));
    }

    @Test public void biometricCredentialPersistsReopensAndCanBeDisabled() throws Exception {
        var context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals("Enroll a synthetic fingerprint in the isolated emulator first", 0, new BiometricVault(context).availability());
        await("document.body.innerText.includes('Configurar Bóveda Aegis')");
        fill("#master-password", password); fill("#confirm-master", password); clickText("Crear bóveda");
        await("document.body.innerText.includes('Tu bóveda está vacía')");
        js("document.querySelector('[aria-label=\"Abrir ajustes\"]').click()");
        await("document.body.innerText.includes('Activar huella')");
        clickText("Activar huella");
        // The external emulator driver supplies a synthetic finger touch to
        // the actual system prompt; no mocked authentication bypass is used.
        await("document.body.innerText.includes('Activado en este teléfono')");
        assertEquals("true", js("[...document.querySelectorAll('.settings-panel *')].every(e=>e.getBoundingClientRect().right<=window.innerWidth)"));
        screenshot("android-biometric-settings.png");
        String wrapped = context.getSharedPreferences("aegis_biometric", 0).getString("wrapped", "");
        assertTrue(wrapped.contains("ciphertext")); assertFalse(wrapped.contains(password));
        clickText("Guardar y Cerrar");
        scenario.close(); scenario = ActivityScenario.launch(MainActivity.class);
        await("document.body.innerText.includes('Desbloquear con huella')");
        screenshot("android-biometric-unlock.png");
        clickText("Desbloquear con huella");
        await("document.body.innerText.includes('Tu bóveda está vacía')");
        scenario.moveToState(Lifecycle.State.CREATED); scenario.moveToState(Lifecycle.State.RESUMED);
        await("document.body.innerText.includes('Desbloquear con huella')");
        clickText("Desbloquear con huella");
        await("document.body.innerText.includes('Tu bóveda está vacía')");
        js("document.querySelector('[aria-label=\"Abrir ajustes\"]').click()");
        await("document.body.innerText.includes('Desactivar huella')");
        clickText("Desactivar huella");
        await("document.body.innerText.includes('Activar huella')");
        assertFalse(new BiometricVault(context).enabled());
        assertFalse(context.getSharedPreferences("aegis_biometric", 0).contains("wrapped"));
        scenario.close(); scenario = ActivityScenario.launch(MainActivity.class);
        await("document.body.innerText.includes('Desbloquear Aegis Vault')");
        assertEquals("false", js("document.body.innerText.includes('Desbloquear con huella')"));
        fill("#master-password", password); clickText("Desbloquear bóveda");
        await("document.body.innerText.includes('Tu bóveda está vacía')");
    }
}
