package io.github.aldojoss.aegisvault;

import android.util.AtomicFile;
import org.json.JSONObject;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.HashSet;
import java.util.Arrays;
import java.util.UUID;

final class VaultStore {
    static final int MAX_BYTES = 20 * 1024 * 1024;
    private final File file;
    private final AtomicFile atomic;
    VaultStore(File directory) {
        file = new File(directory, "aegis_vault_v1.enc");
        atomic = new AtomicFile(file);
    }
    static void validate(String content) throws Exception {
        if (content == null || content.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) throw new IOException("Invalid size");
        JSONObject payload = new JSONObject(content);
        int version = payload.getInt("version");
        if (version != 1 && version != 2) throw new IOException("Invalid version");
        for (String key : new String[]{"salt", "iv", "cipherText"}) {
            if (!(payload.get(key) instanceof String) || payload.getString(key).isEmpty()) throw new IOException("Invalid ciphertext");
        }
        Set<String> allowed = new HashSet<>(Arrays.asList("version", "salt", "iv", "cipherText", "iterations", "testHash"));
        var keys = payload.keys();
        while (keys.hasNext()) if (!allowed.contains(keys.next())) throw new IOException("Unexpected plaintext fields");
    }
    static String readText(InputStream input) throws IOException {
        try (InputStream in = input; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            if (in == null) throw new IOException("Missing stream");
            byte[] buffer = new byte[8192];
            int size;
            while ((size = in.read(buffer)) != -1) {
                if (out.size() + size > MAX_BYTES) throw new IOException("File too large");
                out.write(buffer, 0, size);
            }
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }
    synchronized String read() throws Exception {
        if (!file.exists() && !new File(file + ".bak").exists() && !new File(file + ".new").exists()) return null;
        String content = readText(atomic.openRead());
        validate(content);
        return content;
    }
    synchronized void write(String content) throws Exception {
        validate(content);
        String previous = read(); // A corrupt existing file must never be overwritten.
        if (previous != null) {
            AtomicFile backup = new AtomicFile(new File(file.getParentFile(), "aegis_vault_previous.enc"));
            FileOutputStream stream = null;
            try { stream = backup.startWrite(); stream.write(previous.getBytes(StandardCharsets.UTF_8)); backup.finishWrite(stream); }
            catch (Exception error) { if (stream != null) backup.failWrite(stream); throw error; }
        }
        FileOutputStream stream = null;
        try { stream = atomic.startWrite(); stream.write(content.getBytes(StandardCharsets.UTF_8)); atomic.finishWrite(stream); }
        catch (Exception error) { if (stream != null) atomic.failWrite(stream); throw error; }
    }
    synchronized void archive() throws Exception {
        // Preserve even damaged files, including remnants of interrupted writes.
        String suffix = ".reset-" + System.currentTimeMillis() + "-" + UUID.randomUUID() + ".bak";
        for (String extra : new String[]{"", ".bak", ".new"}) {
            File existing = new File(file + extra);
            if (existing.exists()) Files.move(existing.toPath(), new File(file + extra + suffix).toPath(), StandardCopyOption.ATOMIC_MOVE);
        }
    }
}
