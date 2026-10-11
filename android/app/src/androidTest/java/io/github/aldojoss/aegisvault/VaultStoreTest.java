package io.github.aldojoss.aegisvault;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.*;
import org.junit.runner.RunWith;
import java.io.File;
import java.nio.file.Files;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class VaultStoreTest {
    private File folder;
    private VaultStore store;
    private final String first = "{\"version\":2,\"iterations\":600000,\"salt\":\"synthetic salt\",\"iv\":\"synthetic iv\",\"cipherText\":\"synthetic cipher\"}";
    @Before public void setup() {
        folder = new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getCacheDir(), "store-test-" + UUID.randomUUID());
        assertTrue(folder.mkdir()); store = new VaultStore(folder);
    }
    @After public void clean() { for (File file : folder.listFiles()) file.delete(); folder.delete(); }
    @Test public void saveReloadBackupAndArchive() throws Exception {
        assertNull(store.read());
        store.write(first);
        assertEquals(first, new VaultStore(folder).read());
        String second = first.replace("synthetic cipher", "next cipher");
        store.write(second);
        assertEquals(second, store.read());
        assertEquals(first, new String(Files.readAllBytes(new File(folder, "aegis_vault_previous.enc").toPath()), StandardCharsets.UTF_8));
        store.archive();
        assertNull(store.read());
        assertTrue(java.util.Arrays.stream(folder.listFiles()).anyMatch(file -> file.getName().contains(".reset-")));
    }
    @Test public void damagedExistingDataIsNotReplacedOrTreatedAsNew() throws Exception {
        File file = new File(folder, "aegis_vault_v1.enc");
        Files.write(file.toPath(), "broken data".getBytes(StandardCharsets.UTF_8));
        try { store.read(); fail("Corrupt files must fail"); } catch (Exception expected) {}
        try { store.write(first); fail("Corrupt files must not be overwritten"); } catch (Exception expected) {}
        assertEquals("broken data", new String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8));
    }
    @Test public void refusesPlaintextRecordsAndInterruptedFirstWrite() throws Exception {
        try { store.write("{\"items\":[]}"); fail("Plaintext must fail"); } catch (Exception expected) {}
        Files.write(new File(folder, "aegis_vault_v1.enc.new").toPath(), first.getBytes(StandardCharsets.UTF_8));
        try { store.read(); fail("Interrupted creation must not appear empty"); } catch (Exception expected) {}
    }
}
