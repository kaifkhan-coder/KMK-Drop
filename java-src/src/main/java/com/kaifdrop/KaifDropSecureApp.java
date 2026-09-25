package com.kaifdrop;

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
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
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

    // Stealth lock field
    private JPasswordField secretInputField;

    // Server
    private HttpTransferServer server;
    private int port = 8080;

    // UI Components in Dashboard
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

        // Check Stealth Shield state (default false for simple direct password-free start)
        boolean stealthShieldActive = prefs.getBoolean(PREF_STEALTH_SHIELD, false);
        if (stealthShieldActive) {
            cardLayout.show(rootPanel, "LOCKED");
        } else {
            // Direct password-free dashboard start
            unlockDashboard();
        }
    }

    /**
     * Stealth Screen: completely restricted, blank state.
     * Single, un-labeled secure input field.
     */
    private JPanel createStealthLockScreen() {
        JPanel panel = new JPanel(new GridBagLayout());
        panel.setBackground(new Color(8, 8, 10));

        GridBagConstraints gbc = new GridBagConstraints();
        gbc.gridx = 0;
        gbc.gridy = 0;
        gbc.insets = new Insets(10, 10, 10, 10);
        gbc.anchor = GridBagConstraints.CENTER;

        // Un-labeled secure input field with minimalist styling
        secretInputField = new JPasswordField(18);
        secretInputField.setFont(new Font("Monospaced", Font.PLAIN, 15));
        secretInputField.setForeground(new Color(220, 220, 225));
        secretInputField.setBackground(new Color(18, 18, 22));
        secretInputField.setCaretColor(new Color(0, 210, 255));
        secretInputField.setBorder(new LineBorder(new Color(40, 40, 48), 1, true));
        secretInputField.setHorizontalAlignment(JTextField.CENTER);

        secretInputField.addKeyListener(new KeyAdapter() {
            @Override
            public void keyPressed(KeyEvent e) {
                if (e.getKeyCode() == KeyEvent.VK_ENTER) {
                    verifySecretCode();
                }
            }
        });

        panel.add(secretInputField, gbc);
        return panel;
    }

    private void verifySecretCode() {
        String entered = new String(secretInputField.getPassword());
        if (MASTER_SECRET.equals(entered)) {
            secretInputField.setText("");
            unlockDashboard();
        } else {
            // Subtle visual feedback without revealing label
            secretInputField.setBorder(new LineBorder(new Color(200, 30, 30), 1, true));
            Timer t = new Timer(800, ev -> {
                secretInputField.setBorder(new LineBorder(new Color(40, 40, 48), 1, true));
                secretInputField.setText("");
            });
            t.setRepeats(false);
            t.start();
        }
    }

    private void unlockDashboard() {
        // Initialize Micro-HTTP container on unlock if not running
        startLocalServer();

        // Slide/Switch to main dashboard
        cardLayout.show(rootPanel, "DASHBOARD");

        // Generate permanent pairing QR for mobile portal
        updateMobilePairingQR();
    }

    private void startLocalServer() {
        if (server == null || !server.isRunning()) {
            try {
                server = new HttpTransferServer(port);
                server.setListener(new HttpTransferServer.ServerEventListener() {
                    @Override
                    public void onFileReceived(String fileName, long sizeBytes, String senderIp) {
                        SwingUtilities.invokeLater(() -> {
                            String item = String.format("%s (%d KB) from %s", fileName, sizeBytes / 1024, senderIp);
                            receivedFilesListModel.addElement(item);
                            operationsStatusLabel.setText("Active Transfer: Received " + fileName);
                        });
                    }

                    @Override
                    public void onBandwidthUpdate(long bytesPerSec, long totalServed, long totalReceived) {
                        SwingUtilities.invokeLater(() -> {
                            double mbps = (bytesPerSec * 8.0) / (1024 * 1024);
                            bandwidthSpeedLabel.setText(String.format("Bandwidth: %.2f Mbps (%.1f MB/s)", mbps, bytesPerSec / (1024.0 * 1024.0)));
                        });
                    }
                });
                server.start();
                operationsStatusLabel.setText("Micro-HTTP Listening at " + server.getBaseUrl());
            } catch (Exception e) {
                operationsStatusLabel.setText("Port Error: " + e.getMessage());
            }
        }
    }

    /**
     * Main Split-Pane Minimalist Dashboard
     */
    private JPanel createDashboardPanel() {
        JPanel panel = new JPanel(new BorderLayout());
        panel.setBackground(new Color(12, 12, 15));

        // Top Navigation Header
        JPanel topBar = new JPanel(new BorderLayout());
        topBar.setBackground(new Color(18, 18, 22));
        topBar.setBorder(new EmptyBorder(12, 20, 12, 20));

        JLabel titleLabel = new JLabel("KaifDrop-Secure");
        titleLabel.setFont(new Font("SansSerif", Font.BOLD, 17));
        titleLabel.setForeground(new Color(245, 245, 250));

        JPanel topActions = new JPanel(new FlowLayout(FlowLayout.RIGHT, 12, 0));
        topActions.setOpaque(false);

        // Stealth Shield Master Switch
        stealthShieldToggle = new JCheckBox("Stealth Shield", prefs.getBoolean(PREF_STEALTH_SHIELD, true));
        stealthShieldToggle.setFont(new Font("SansSerif", Font.PLAIN, 12));
        stealthShieldToggle.setForeground(new Color(200, 200, 210));
        stealthShieldToggle.setOpaque(false);
        stealthShieldToggle.addActionListener(e -> {
            boolean active = stealthShieldToggle.isSelected();
            prefs.putBoolean(PREF_STEALTH_SHIELD, active);
            operationsStatusLabel.setText("Stealth Shield: " + (active ? "ACTIVE (Code required on boot)" : "BYPASS ENABLED"));
        });
        topActions.add(stealthShieldToggle);

        JButton lockNowBtn = new JButton("Lock Terminal");
        styleButton(lockNowBtn, new Color(30, 30, 36), new Color(200, 200, 210));
        lockNowBtn.addActionListener(e -> cardLayout.show(rootPanel, "LOCKED"));
        topActions.add(lockNowBtn);

        topBar.add(titleLabel, BorderLayout.WEST);
        topBar.add(topActions, BorderLayout.EAST);
        panel.add(topBar, BorderLayout.NORTH);

        // Split Pane: Left (PC to Mobile Drop Zone) & Right (Mobile to PC Sync Portal)
        JSplitPane splitPane = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT);
        splitPane.setDividerLocation(540);
        splitPane.setResizeWeight(0.5);
        splitPane.setBackground(new Color(12, 12, 15));
        splitPane.setBorder(null);

        // Left Control Panel (PC to Mobile Drop Zone)
        JPanel leftPanel = createLeftDropZonePanel();
        splitPane.setLeftComponent(leftPanel);

        // Right Control Panel (Mobile to PC Sync Portal)
        JPanel rightPanel = createRightSyncPortalPanel();
        splitPane.setRightComponent(rightPanel);

        panel.add(splitPane, BorderLayout.CENTER);

        // System Integration Hub (Bottom Console Strip)
        JPanel bottomStrip = createSystemIntegrationHub();
        panel.add(bottomStrip, BorderLayout.SOUTH);

        return panel;
    }

    /**
     * Left Control Panel (PC to Mobile Drop Zone)
     */
    private JPanel createLeftDropZonePanel() {
        JPanel panel = new JPanel(new BorderLayout(10, 10));
        panel.setBackground(new Color(14, 14, 18));
        panel.setBorder(new EmptyBorder(16, 16, 16, 16));

        JLabel title = new JLabel("PC to Mobile Drop Zone");
        title.setFont(new Font("SansSerif", Font.BOLD, 14));
        title.setForeground(new Color(230, 230, 235));
        panel.add(title, BorderLayout.NORTH);

        // Center: Large High-Contrast Drag & Drop Zone
        JPanel dropArea = new JPanel(new BorderLayout());
        dropArea.setBackground(new Color(20, 20, 26));
        dropArea.setBorder(new LineBorder(new Color(50, 50, 62), 2, true));

        JLabel dropPrompt = new JLabel("<html><center><b>Drag & Drop Local Files Here</b><br><small style='color:#888;'>Text/.kaif · PDF Documents · 3D Meshes (.obj, .fbx, .stl, .blend)</small></center></html>", SwingConstants.CENTER);
        dropPrompt.setForeground(new Color(160, 160, 175));
        dropPrompt.setFont(new Font("SansSerif", Font.PLAIN, 13));
        dropArea.add(dropPrompt, BorderLayout.CENTER);

        // Enable Drag and Drop
        new DropTarget(dropArea, new DropTargetAdapter() {
            @Override
            public void drop(DropTargetDropEvent dtde) {
                try {
                    dtde.acceptDrop(DnDConstants.ACTION_COPY);
                    List<?> list = (List<?>) dtde.getTransferable().getTransferData(DataFlavor.javaFileListFlavor);
                    List<File> files = new ArrayList<>();
                    for (Object o : list) {
                        if (o instanceof File) files.add((File) o);
                    }
                    if (!files.isEmpty()) {
                        processDroppedFiles(files);
                    }
                } catch (Exception ex) {
                    operationsStatusLabel.setText("Drop Error: " + ex.getMessage());
                }
            }
        });

        // Staged Files list & Dynamic QR View
        JPanel lowerArea = new JPanel(new GridLayout(1, 2, 10, 0));
        lowerArea.setBackground(new Color(14, 14, 18));
        lowerArea.setPreferredSize(new Dimension(480, 200));

        stagedFilesListModel = new DefaultListModel<>();
        JList<String> stagedList = new JList<>(stagedFilesListModel);
        stagedList.setBackground(new Color(18, 18, 22));
        stagedList.setForeground(new Color(210, 210, 220));
        stagedList.setFont(new Font("Monospaced", Font.PLAIN, 11));
        JScrollPane listScroll = new JScrollPane(stagedList);
        listScroll.setBorder(new LineBorder(new Color(35, 35, 42), 1));
        lowerArea.add(listScroll);

        // High-contrast QR Vector Label
        pcQrCodeLabel = new JLabel("No Asset Staged", SwingConstants.CENTER);
        pcQrCodeLabel.setForeground(new Color(100, 100, 115));
        pcQrCodeLabel.setBackground(new Color(18, 18, 22));
        pcQrCodeLabel.setOpaque(true);
        pcQrCodeLabel.setBorder(new LineBorder(new Color(35, 35, 42), 1));
        lowerArea.add(pcQrCodeLabel);

        JPanel centerContainer = new JPanel(new BorderLayout(0, 10));
        centerContainer.setOpaque(false);
        centerContainer.add(dropArea, BorderLayout.CENTER);
        centerContainer.add(lowerArea, BorderLayout.SOUTH);

        panel.add(centerContainer, BorderLayout.CENTER);
        return panel;
    }

    /**
     * Right Control Panel (Mobile to PC Sync Portal)
     */
    private JPanel createRightSyncPortalPanel() {
        JPanel panel = new JPanel(new BorderLayout(10, 10));
        panel.setBackground(new Color(14, 14, 18));
        panel.setBorder(new EmptyBorder(16, 16, 16, 16));

        JLabel title = new JLabel("Mobile to PC Sync Portal");
        title.setFont(new Font("SansSerif", Font.BOLD, 14));
        title.setForeground(new Color(230, 230, 235));
        panel.add(title, BorderLayout.NORTH);

        // Top QR pairing container
        JPanel qrContainer = new JPanel(new BorderLayout(10, 10));
        qrContainer.setBackground(new Color(20, 20, 26));
        qrContainer.setBorder(new LineBorder(new Color(40, 40, 50), 1, true));
        qrContainer.setPreferredSize(new Dimension(480, 220));

        mobilePairingQrLabel = new JLabel("Generating Pairing Vector...", SwingConstants.CENTER);
        qrContainer.add(mobilePairingQrLabel, BorderLayout.CENTER);

        JLabel pairingHint = new JLabel("<html><center><small style='color:#00d2ff;'>Scan with mobile phone camera to open peer upload interface</small></center></html>", SwingConstants.CENTER);
        pairingHint.setBorder(new EmptyBorder(0, 0, 10, 0));
        qrContainer.add(pairingHint, BorderLayout.SOUTH);

        // Lower area: Received files ledger
        JPanel receivedArea = new JPanel(new BorderLayout(5, 5));
        receivedArea.setOpaque(false);

        JLabel recHeader = new JLabel("Incoming Mobile Sync Ledger:");
        recHeader.setFont(new Font("SansSerif", Font.PLAIN, 12));
        recHeader.setForeground(new Color(160, 160, 175));
        receivedArea.add(recHeader, BorderLayout.NORTH);

        receivedFilesListModel = new DefaultListModel<>();
        JList<String> receivedList = new JList<>(receivedFilesListModel);
        receivedList.setBackground(new Color(18, 18, 22));
        receivedList.setForeground(new Color(210, 210, 220));
        receivedList.setFont(new Font("Monospaced", Font.PLAIN, 11));
        JScrollPane recScroll = new JScrollPane(receivedList);
        recScroll.setBorder(new LineBorder(new Color(35, 35, 42), 1));
        receivedArea.add(recScroll, BorderLayout.CENTER);

        JPanel rightCenter = new JPanel(new BorderLayout(0, 10));
        rightCenter.setOpaque(false);
        rightCenter.add(qrContainer, BorderLayout.NORTH);
        rightCenter.add(receivedArea, BorderLayout.CENTER);

        panel.add(rightCenter, BorderLayout.CENTER);
        return panel;
    }

    /**
     * System Integration Hub (Bottom Console Strip)
     */
    private JPanel createSystemIntegrationHub() {
        JPanel strip = new JPanel(new BorderLayout(12, 0));
        strip.setBackground(new Color(18, 18, 22));
        strip.setBorder(new EmptyBorder(8, 16, 8, 16));

        // Operations status & bandwidth
        JPanel statusBox = new JPanel(new FlowLayout(FlowLayout.LEFT, 16, 0));
        statusBox.setOpaque(false);

        operationsStatusLabel = new JLabel("System: Ready · Isolated IPv4 Node: " + NetworkDiscovery.isolatePrimaryIPv4());
        operationsStatusLabel.setFont(new Font("SansSerif", Font.PLAIN, 12));
        operationsStatusLabel.setForeground(new Color(180, 180, 195));
        statusBox.add(operationsStatusLabel);

        bandwidthSpeedLabel = new JLabel("Bandwidth: 0.00 Mbps");
        bandwidthSpeedLabel.setFont(new Font("Monospaced", Font.PLAIN, 12));
        bandwidthSpeedLabel.setForeground(new Color(0, 210, 255));
        statusBox.add(bandwidthSpeedLabel);

        strip.add(statusBox, BorderLayout.WEST);

        // Secure text input container labeled "Authorization Bypass"
        JPanel bypassContainer = new JPanel(new FlowLayout(FlowLayout.RIGHT, 8, 0));
        bypassContainer.setOpaque(false);

        JLabel bypassLabel = new JLabel("Authorization Bypass:");
        bypassLabel.setFont(new Font("SansSerif", Font.PLAIN, 12));
        bypassLabel.setForeground(new Color(140, 140, 155));
        bypassContainer.add(bypassLabel);

        authBypassField = new JTextField(12);
        authBypassField.setFont(new Font("Monospaced", Font.PLAIN, 11));
        authBypassField.setBackground(new Color(24, 24, 30));
        authBypassField.setForeground(new Color(230, 230, 235));
        authBypassField.setCaretColor(new Color(0, 210, 255));
        authBypassField.setBorder(new LineBorder(new Color(50, 50, 60), 1));
        authBypassField.addActionListener(e -> {
            String val = authBypassField.getText().trim();
            if (MASTER_SECRET.equals(val)) {
                operationsStatusLabel.setText("Authorization Verified via Bypass · Full Access Granted");
            } else if (JwtSecurity.verifyToken(val)) {
                operationsStatusLabel.setText("Valid JWT Token Verified for Peer Handshake");
            } else {
                operationsStatusLabel.setText("Authorization Bypass Rejected: Invalid Signature");
            }
            authBypassField.setText("");
        });
        bypassContainer.add(authBypassField);

        strip.add(bypassContainer, BorderLayout.EAST);
        return strip;
    }

    private void processDroppedFiles(List<File> files) {
        new Thread(() -> {
            try {
                List<WatermarkPipeline.ProcessedFile> processed = new ArrayList<>();
                for (File f : files) {
                    WatermarkPipeline.ProcessedFile pf = WatermarkPipeline.processFile(f);
                    processed.add(pf);
                }

                byte[] transferPayload;
                String transferName;
                String contentType;

                if (processed.size() == 1 && !processed.get(0).is3D) {
                    WatermarkPipeline.ProcessedFile pf = processed.get(0);
                    transferPayload = pf.content;
                    transferName = pf.originalName;
                    contentType = "application/octet-stream";
                } else {
                    // Package into ZIP matrix (with animation_manifest.kaif if 3D formats are included)
                    transferPayload = WatermarkPipeline.createZipMatrix(processed);
                    transferName = "KaifDrop_Bundle_" + System.currentTimeMillis() + ".zip";
                    contentType = "application/zip";
                }

                // Stage in micro-HTTP server
                String stageId = server.stageAsset(transferName, transferPayload, contentType);
                HttpTransferServer.StagedItem stagedItem = server.getStagedItem(stageId);

                // Build download endpoint with JWT handshake
                String endpointUrl = server.getBaseUrl() + "/api/download?id=" + stageId + "&jwt=" + stagedItem.jwtToken;

                // Generate vector QR code
                BufferedImage qrImage = generateQRCodeImage(endpointUrl, 160, 160);

                SwingUtilities.invokeLater(() -> {
                    stagedFilesListModel.clear();
                    for (WatermarkPipeline.ProcessedFile pf : processed) {
                        stagedFilesListModel.addElement(String.format("%s [%s] (%d KB)", pf.originalName, pf.stampType, pf.content.length / 1024));
                    }
                    if (qrImage != null) {
                        pcQrCodeLabel.setIcon(new ImageIcon(qrImage));
                        pcQrCodeLabel.setText("");
                    }
                    operationsStatusLabel.setText("Staged Package Ready · " + transferName + " (" + (transferPayload.length / 1024) + " KB)");
                });
            } catch (Exception ex) {
                SwingUtilities.invokeLater(() -> operationsStatusLabel.setText("Pipeline Error: " + ex.getMessage()));
            }
        }).start();
    }

    private void updateMobilePairingQR() {
        if (server == null) return;
        new Thread(() -> {
            try {
                String pairingUrl = server.getBaseUrl() + "/mobile";
                BufferedImage qr = generateQRCodeImage(pairingUrl, 170, 170);
                SwingUtilities.invokeLater(() -> {
                    if (qr != null) {
                        mobilePairingQrLabel.setIcon(new ImageIcon(qr));
                        mobilePairingQrLabel.setText("");
                    }
                });
            } catch (Exception e) {
                System.err.println("QR Generation Error: " + e.getMessage());
            }
        }).start();
    }

    private BufferedImage generateQRCodeImage(String text, int width, int height) {
        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            BitMatrix bitMatrix = qrCodeWriter.encode(text, BarcodeFormat.QR_CODE, width, height);
            return MatrixToImageWriter.toBufferedImage(bitMatrix);
        } catch (Exception e) {
            return null;
        }
    }

    private void styleButton(JButton btn, Color bg, Color fg) {
        btn.setBackground(bg);
        btn.setForeground(fg);
        btn.setFont(new Font("SansSerif", Font.PLAIN, 12));
        btn.setFocusPainted(false);
        btn.setBorder(new EmptyBorder(6, 12, 6, 12));
        btn.setCursor(new Cursor(Cursor.HAND_CURSOR));
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            try {
                // Apply modern dark look and feel if available
                UIManager.setLookAndFeel("com.formdev.flatlaf.FlatDarkLaf");
            } catch (Exception ignored) {
                // Fallback to system look and feel
                try {
                    UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
                } catch (Exception ignored2) {}
            }
            new KaifDropSecureApp().setVisible(true);
        });
    }
}
