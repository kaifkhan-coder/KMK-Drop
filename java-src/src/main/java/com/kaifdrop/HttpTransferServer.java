package com.kaifdrop;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Isolated Micro-HTTP Container Infrastructure using com.sun.net.httpserver.HttpServer.
 * Handles direct peer-to-peer web endpoints, JWT handshake, and mobile sync portal.
 * Architect: Khan Mohammed Kaif
 */
public class HttpTransferServer {

    private final int port;
    private final String localIp;
    private HttpServer server;
    private final File receivedDir;

    // Staged items registry
    public static class StagedItem {
        public final String id;
        public final String name;
        public final byte[] data;
        public final String contentType;
        public final String jwtToken;

        public StagedItem(String id, String name, byte[] data, String contentType, String jwtToken) {
            this.id = id;
            this.name = name;
            this.data = data;
            this.contentType = contentType;
            this.jwtToken = jwtToken;
        }
    }

    private final Map<String, StagedItem> stagedRegistry = new ConcurrentHashMap<>();
    private final List<Map<String, Object>> receivedRegistry = Collections.synchronizedList(new ArrayList<>());

    private final AtomicLong totalBytesServed = new AtomicLong(0);
    private final AtomicLong totalBytesReceived = new AtomicLong(0);
    private volatile long currentBandwidthBps = 0;
    private volatile long lastMetricTimestamp = System.currentTimeMillis();

    public interface ServerEventListener {
        void onFileReceived(String fileName, long sizeBytes, String senderIp);
        void onBandwidthUpdate(long bytesPerSec, long totalServed, long totalReceived);
    }

    private ServerEventListener listener;

    public HttpTransferServer(int port) {
        this.port = port;
        this.localIp = NetworkDiscovery.isolatePrimaryIPv4();
        this.receivedDir = new File(System.getProperty("user.home"), "KaifDrop_Received");
        if (!this.receivedDir.exists()) {
            this.receivedDir.mkdirs();
        }
    }

    public void setListener(ServerEventListener listener) {
        this.listener = listener;
    }

    public synchronized void start() throws IOException {
        if (server != null) return;

        server = HttpServer.create(new InetSocketAddress(port), 0);
        server.setExecutor(Executors.newFixedThreadPool(8));

        // Register endpoints
        server.createContext("/mobile", new MobileLandingHandler());
        server.createContext("/api/status", new StatusHandler());
        server.createContext("/api/download", new DownloadHandler());
        server.createContext("/api/upload", new UploadHandler());
        server.createContext("/api/received", new ReceivedListHandler());

        server.start();
        System.out.println("[HttpTransferServer] Micro-HTTP server active at http://" + localIp + ":" + port);
    }

    public synchronized void stop() {
        if (server != null) {
            server.stop(1);
            server = null;
            System.out.println("[HttpTransferServer] Server stopped.");
        }
    }

    public boolean isRunning() {
        return server != null;
    }

    public String getLocalIp() {
        return localIp;
    }

    public int getPort() {
        return port;
    }

    public String getBaseUrl() {
        return "http://" + localIp + ":" + port;
    }

    public String stageAsset(String name, byte[] data, String contentType) {
        String stageId = UUID.randomUUID().toString().substring(0, 8);
        String jwtToken = JwtSecurity.generateToken("mobile-client-" + stageId, "PEER_RECIPIENT", 3600);
        StagedItem item = new StagedItem(stageId, name, data, contentType, jwtToken);
        stagedRegistry.put(stageId, item);
        return stageId;
    }

    public StagedItem getStagedItem(String stageId) {
        return stagedRegistry.get(stageId);
    }

    private void recordTransfer(long bytes, boolean isSent) {
        if (isSent) totalBytesServed.addAndGet(bytes);
        else totalBytesReceived.addAndGet(bytes);

        long now = System.currentTimeMillis();
        long delta = now - lastMetricTimestamp;
        if (delta > 500) {
            currentBandwidthBps = (bytes * 1000) / Math.max(1, delta);
            lastMetricTimestamp = now;
            if (listener != null) {
                listener.onBandwidthUpdate(currentBandwidthBps, totalBytesServed.get(), totalBytesReceived.get());
            }
        }
    }

    // Handlers
    private class StatusHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String json = String.format(
                "{\"status\":\"RUNNING\",\"ip\":\"%s\",\"port\":%d,\"servedBytes\":%d,\"receivedBytes\":%d,\"bandwidthBps\":%d}",
                localIp, port, totalBytesServed.get(), totalBytesReceived.get(), currentBandwidthBps
            );
            byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) { os.write(bytes); }
        }
    }

    private class DownloadHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String query = exchange.getRequestURI().getQuery();
            String stageId = extractQueryParam(query, "id");
            String token = extractQueryParam(query, "jwt");

            if (stageId == null || !stagedRegistry.containsKey(stageId)) {
                sendString(exchange, 404, "Requested asset not found in active staging registry.");
                return;
            }

            // JWT handshake verification
            if (token != null && !JwtSecurity.verifyToken(token)) {
                sendString(exchange, 403, "JWT Security Handshake Verification Failed.");
                return;
            }

            StagedItem item = stagedRegistry.get(stageId);
            Headers headers = exchange.getResponseHeaders();
            headers.set("Content-Type", item.contentType);
            headers.set("Content-Disposition", "attachment; filename=\"" + item.name + "\"");
            exchange.sendResponseHeaders(200, item.data.length);

            try (OutputStream os = exchange.getResponseBody()) {
                os.write(item.data);
            }
            recordTransfer(item.data.length, true);
        }
    }

    private class UploadHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendString(exchange, 405, "Method Not Allowed");
                return;
            }

            String clientIp = exchange.getRemoteAddress().getAddress().getHostAddress();
            String fileName = exchange.getRequestHeaders().getFirst("X-File-Name");
            if (fileName == null || fileName.trim().isEmpty()) {
                fileName = "mobile_upload_" + System.currentTimeMillis() + ".dat";
            }

            File targetFile = new File(receivedDir, fileName);
            long bytesRead = 0;
            try (InputStream is = exchange.getRequestBody();
                 FileOutputStream fos = new FileOutputStream(targetFile)) {
                byte[] buffer = new byte[8192];
                int r;
                while ((r = is.read(buffer)) != -1) {
                    fos.write(buffer, 0, r);
                    bytesRead += r;
                }
            }

            recordTransfer(bytesRead, false);

            Map<String, Object> record = new HashMap<>();
            record.put("id", UUID.randomUUID().toString().substring(0, 6));
            record.put("fileName", fileName);
            record.put("size", bytesRead);
            record.put("senderIp", clientIp);
            record.put("timestamp", System.currentTimeMillis());
            record.put("path", targetFile.getAbsolutePath());
            receivedRegistry.add(0, record);

            if (listener != null) {
                listener.onFileReceived(fileName, bytesRead, clientIp);
            }

            String resp = "{\"success\":true,\"savedAs\":\"" + fileName + "\",\"bytes\":" + bytesRead + "}";
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            byte[] respBytes = resp.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, respBytes.length);
            try (OutputStream os = exchange.getResponseBody()) { os.write(respBytes); }
        }
    }

    private class ReceivedListHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            StringBuilder sb = new StringBuilder("[");
            synchronized (receivedRegistry) {
                for (int i = 0; i < receivedRegistry.size(); i++) {
                    Map<String, Object> r = receivedRegistry.get(i);
                    sb.append(String.format(
                        "{\"fileName\":\"%s\",\"size\":%d,\"senderIp\":\"%s\",\"timestamp\":%d}",
                        r.get("fileName"), r.get("size"), r.get("senderIp"), r.get("timestamp")
                    ));
                    if (i < receivedRegistry.size() - 1) sb.append(",");
                }
            }
            sb.append("]");
            byte[] bytes = sb.toString().getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) { os.write(bytes); }
        }
    }

    private class MobileLandingHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String query = exchange.getRequestURI().getQuery();
            String pkgId = extractQueryParam(query, "pkg");
            String jwt = extractQueryParam(query, "jwt");

            StringBuilder html = new StringBuilder();
            html.append("<!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>")
                .append("<title>KaifDrop-Secure Mobile Portal</title><style>")
                .append("body{background:#0a0a0c;color:#f0f0f2;font-family:sans-serif;padding:20px;text-align:center;}")
                .append(".card{background:#16161a;border:1px solid #2a2a30;border-radius:12px;padding:20px;margin:20px auto;max-width:400px;}")
                .append("button,.btn{background:#00d2ff;color:#000;font-weight:bold;padding:12px 20px;border-radius:8px;border:none;cursor:pointer;text-decoration:none;display:inline-block;margin-top:10px;}")
                .append("input[type=file]{margin:15px 0;}")
                .append("</style></head><body>")
                .append("<h2>KaifDrop-Secure</h2><p style='color:#888;'>Khan Mohammed Kaif Local Transfer Protocol</p>");

            if (pkgId != null && stagedRegistry.containsKey(pkgId)) {
                StagedItem item = stagedRegistry.get(pkgId);
                html.append("<div class='card'><h3>📥 Download From PC</h3>")
                    .append("<p>").append(item.name).append(" (").append(item.data.length / 1024).append(" KB)</p>")
                    .append("<a class='btn' href='/api/download?id=").append(pkgId).append("&jwt=").append(jwt != null ? jwt : item.jwtToken)
                    .append("'>Download Staged Package</a></div>");
            }

            html.append("<div class='card'><h3>📤 Send Files to PC Workstation</h3>")
                .append("<p style='font-size:12px;color:#aaa;'>Select camera capture or documents to stream directly into desktop memory.</p>")
                .append("<input type='file' id='f' multiple><br>")
                .append("<button onclick='upload()'>Push to PC Workstation</button>")
                .append("<div id='st' style='margin-top:10px;font-size:12px;'></div>")
                .append("</div>")
                .append("<script>")
                .append("async function upload(){")
                .append("const fi=document.getElementById('f');if(!fi.files.length)return alert('Select a file');")
                .append("const st=document.getElementById('st');st.innerText='Uploading via local micro-HTTP socket...';")
                .append("for(let f of fi.files){")
                .append("await fetch('/api/upload',{method:'POST',headers:{'X-File-Name':f.name},body:f});")
                .append("}")
                .append("st.innerText='✓ All files transmitted successfully!';fi.value='';")
                .append("}")
                .append("</script></body></html>");

            byte[] bytes = html.toString().getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "text/html; charset=UTF-8");
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) { os.write(bytes); }
        }
    }

    private void sendString(HttpExchange exchange, int status, String msg) throws IOException {
        byte[] b = msg.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(status, b.length);
        try (OutputStream os = exchange.getResponseBody()) { os.write(b); }
    }

    private String extractQueryParam(String query, String key) {
        if (query == null) return null;
        for (String pair : query.split("&")) {
            String[] kv = pair.split("=");
            if (kv.length == 2 && kv[0].equals(key)) return kv[1];
        }
        return null;
    }
}
