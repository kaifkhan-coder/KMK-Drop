import React, { useState } from 'react';
import { X, Code2, Download, Copy, Check, FileCode } from 'lucide-react';

interface JavaSourceViewerModalProps {
  onClose: () => void;
}

export const JavaSourceViewerModal: React.FC<JavaSourceViewerModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'app' | 'server' | 'pipeline' | 'network' | 'jwt' | 'pom'>('app');
  const [copied, setCopied] = useState(false);

  const filesContent: Record<string, { name: string; lang: string; content: string }> = {
    app: {
      name: 'KaifDropSecureApp.java',
      lang: 'java',
      content: `package com.kaifdrop;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import javax.swing.border.LineBorder;
import java.awt.*;
import java.awt.datatransfer.DataFlavor;
import java.awt.dnd.*;
import java.awt.event.KeyAdapter;
import java.awt.event.KeyEvent;
import java.awt.image.BufferedImage;
import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.prefs.Preferences;

/**
 * KaifDrop-Secure Desktop Application.
 * Stealth-protected local network data utility and 3D animation transfer engine.
 * Architect: Khan Mohammed Kaif
 */
public class KaifDropSecureApp extends JFrame {

    private static final String MASTER_SECRET = "BuildWithKMKaif";
    private static final String PREF_STEALTH_SHIELD = "stealth_shield_active";
    private final Preferences prefs = Preferences.userNodeForPackage(KaifDropSecureApp.class);

    private CardLayout cardLayout;
    private JPanel rootPanel;
    private JPanel lockScreenPanel;
    private JPanel dashboardPanel;

    private JPasswordField secretInputField;
    private HttpTransferServer server;
    private int port = 8080;

    private JLabel pcQrCodeLabel;
    private JLabel mobilePairingQrLabel;
    private DefaultListModel<String> stagedFilesListModel;
    private DefaultListModel<String> receivedFilesListModel;
    private JLabel bandwidthSpeedLabel;
    private JLabel operationsStatusLabel;
    private JTextField authBypassField;
    private JCheckBox stealthShieldToggle;

    public KaifDropSecureApp() {
        setTitle("KaifDrop-Secure");
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setSize(1100, 720);
        setMinimumSize(new Dimension(960, 640));
        setLocationRelativeTo(null);
        getContentPane().setBackground(new Color(10, 10, 12));

        initUI();
    }

    private void initUI() {
        cardLayout = new CardLayout();
        rootPanel = new JPanel(cardLayout);
        rootPanel.setBackground(new Color(10, 10, 12));

        // 1. Build Locked Stealth Screen
        lockScreenPanel = createStealthLockScreen();
        rootPanel.add(lockScreenPanel, "LOCKED");

        // 2. Build Dashboard Screen (initialized visually masked)
        dashboardPanel = createDashboardPanel();
        rootPanel.add(dashboardPanel, "DASHBOARD");

        add(rootPanel);

        // Check Stealth Shield state
        boolean stealthShieldActive = prefs.getBoolean(PREF_STEALTH_SHIELD, true);
        if (stealthShieldActive) {
            cardLayout.show(rootPanel, "LOCKED");
        } else {
            unlockDashboard();
        }
    }
    // ... [See complete source in repo]
}`
    },
    server: {
      name: 'HttpTransferServer.java',
      lang: 'java',
      content: `package com.kaifdrop;

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
 * Architect: Khan Mohammed Kaif
 */
public class HttpTransferServer {
    private final int port;
    private final String localIp;
    private HttpServer server;
    private final File receivedDir;

    public synchronized void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress(port), 0);
        server.setExecutor(Executors.newFixedThreadPool(8));

        server.createContext("/mobile", new MobileLandingHandler());
        server.createContext("/api/status", new StatusHandler());
        server.createContext("/api/download", new DownloadHandler());
        server.createContext("/api/upload", new UploadHandler());
        server.createContext("/api/received", new ReceivedListHandler());

        server.start();
        System.out.println("[HttpTransferServer] Micro-HTTP server active at http://" + localIp + ":" + port);
    }
}`
    },
    pipeline: {
      name: 'WatermarkPipeline.java',
      lang: 'java',
      content: `package com.kaifdrop;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.graphics.state.PDExtendedGraphicsState;

import java.awt.Color;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * File Interception, 3D Animation & Dynamic Watermark Pipeline.
 * Architect: Khan Mohammed Kaif
 */
public class WatermarkPipeline {
    public static final String TEXT_HEADER_COMMENT =
        "// [Created by Khan Mohammed Kaif] - 3D Animation & Local Secure Transfer Protocol\\n";

    public static final String PDF_STAMP_TEXT =
        "Build by Khan Kaif - Secured Local Protocol";

    public static final String ANIMATION_MANIFEST_NAME =
        "animation_manifest.kaif";

    public static final String ANIMATION_MANIFEST_CONTENT =
        "Project Architect: Khan Mohammed Kaif (3D Animation Suite)\\n" +
        "Pipeline: KaifDrop-Secure Active Mesh Guard\\n" +
        "Integrity: Verified Unaltered Binary Geometry\\n";

    public static byte[] stampPdfDocument(byte[] pdfBytes) {
        try (PDDocument doc = PDDocument.load(pdfBytes);
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            if (doc.getNumberOfPages() > 0) {
                PDPage firstPage = doc.getPage(0);
                try (PDPageContentStream cs = new PDPageContentStream(
                        doc, firstPage, PDPageContentStream.AppendMode.APPEND, true, true)) {
                    PDExtendedGraphicsState gs = new PDExtendedGraphicsState();
                    gs.setNonStrokingAlphaConstant(0.68f);
                    cs.setGraphicsStateParameters(gs);
                    cs.setNonStrokingColor(new Color(184, 20, 20));
                    cs.beginText();
                    cs.setFont(PDType1Font.HELVETICA_BOLD, 10);
                    cs.newLineAtOffset(28, 20); // Lower-left footer boundaries
                    cs.showText(PDF_STAMP_TEXT);
                    cs.endText();
                }
            }
            doc.save(baos);
            return baos.toByteArray();
        } catch (Exception e) {
            return pdfBytes;
        }
    }
}`
    },
    network: {
      name: 'NetworkDiscovery.java',
      lang: 'java',
      content: `package com.kaifdrop;

import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.util.*;

/**
 * Scans local platform NetworkInterface cards to isolate proper IPv4 address.
 * Architect: Khan Mohammed Kaif
 */
public class NetworkDiscovery {
    public static String isolatePrimaryIPv4() {
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            if (interfaces != null) {
                for (NetworkInterface netIf : Collections.list(interfaces)) {
                    if (!netIf.isUp()) continue;
                    for (InetAddress addr : Collections.list(netIf.getInetAddresses())) {
                        if (addr instanceof java.net.Inet4Address && !addr.isLoopbackAddress()) {
                            return addr.getHostAddress();
                        }
                    }
                }
            }
        } catch (SocketException ignored) {}
        return "127.0.0.1";
    }
}`
    },
    jwt: {
      name: 'JwtSecurity.java',
      lang: 'java',
      content: `package com.kaifdrop;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Standard HMAC-SHA256 JWT handshake generator and validator.
 * Architect: Khan Mohammed Kaif
 */
public class JwtSecurity {
    private static final String DEFAULT_SECRET = "KaifDrop_Secure_Master_Key_2026_KMK";

    public static String generateToken(String subject, String role, long expirySeconds) {
        long nowSec = System.currentTimeMillis() / 1000;
        long expSec = nowSec + expirySeconds;
        String header = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
        String payload = String.format("{\"sub\":\"%s\",\"role\":\"%s\",\"exp\":%d}", subject, role, expSec);
        // ... HMAC-SHA256 signature
        return "header.payload.sig";
    }
}`
    },
    pom: {
      name: 'pom.xml',
      lang: 'xml',
      content: `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.kaifdrop</groupId>
    <artifactId>kaifdrop-secure</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>

    <dependencies>
        <dependency>
            <groupId>org.apache.pdfbox</groupId>
            <artifactId>pdfbox</artifactId>
            <version>2.0.30</version>
        </dependency>
        <dependency>
            <groupId>com.google.zxing</groupId>
            <artifactId>javase</artifactId>
            <version>3.5.3</version>
        </dependency>
        <dependency>
            <groupId>com.formdev</groupId>
            <artifactId>flatlaf</artifactId>
            <version>3.4.1</version>
        </dependency>
    </dependencies>
</project>`
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(filesContent[activeTab].content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="relative flex flex-col w-full max-w-4xl h-[700px] bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/70">
          <div className="flex items-center gap-3">
            <Code2 className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">
                KaifDrop-Secure Java Desktop Application Source
              </h3>
              <p className="text-xs text-neutral-400">
                Production-Ready Java 17 + Swing / FlatLaf + Micro-HTTP + Apache PDFBox + ZXing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1 px-6 py-2.5 bg-neutral-950/40 border-b border-neutral-800 overflow-x-auto text-xs">
          {(['app', 'server', 'pipeline', 'network', 'jwt', 'pom'] as const).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setActiveTab(tabKey)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono transition-colors whitespace-nowrap ${
                activeTab === tabKey
                  ? 'bg-neutral-800 text-cyan-300 border border-neutral-700'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>{filesContent[tabKey].name}</span>
            </button>
          ))}
        </div>

        {/* Code Content View */}
        <div className="relative flex-1 p-4 bg-[#0a0a0d] overflow-auto font-mono text-xs text-neutral-300 leading-relaxed">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800/80 hover:bg-neutral-700 rounded border border-neutral-700 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="p-2 select-all whitespace-pre-wrap">{filesContent[activeTab].content}</pre>
        </div>

        {/* Footer with Download Zip */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <div className="text-xs text-neutral-400">
            Build command: <code className="font-mono text-cyan-300">mvn clean package &amp;&amp; java -jar target/kaifdrop-secure-1.0.0.jar</code>
          </div>
          <a
            href="/api/java-project/download"
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download Java Maven Project (.zip)</span>
          </a>
        </div>
      </div>
    </div>
  );
};
