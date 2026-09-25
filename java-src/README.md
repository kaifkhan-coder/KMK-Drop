# KaifDrop-Secure (Java Edition)
**Stealth-Protected Local Network Data Utility & 3D Animation Transfer Engine**
*Architect: Khan Mohammed Kaif*

---

## 🔒 Security & Architecture Overview
KaifDrop-Secure is a hyper-focused local network data utility built in Java (Swing + FlatLaf) engineered with a strict isolated stealth security model:

1. **Stealth Runtime Engine (Secret Code Lock)**:
   - Starts in a blank, restricted state with no visible network sockets or staging controls.
   - Master unlock code: `BuildWithKMKaif`.
   - "Stealth Shield" master switch in Settings allows toggling mandatory lock screen on boot.

2. **Split-Pane Minimalist Dashboard**:
   - **Left Control Panel (PC to Mobile Drop Zone)**: Native drag-and-drop file staging area with live ZXing vector QR Code generation.
   - **Right Control Panel (Mobile to PC Sync Portal)**: Permanent pairing QR code and micro-HTTP landing interface for receiving files from student/peer mobile devices.
   - **System Integration Hub**: Real-time console tracking active network interfaces, port status, live bandwidth meter, and Authorization Bypass container.

3. **Dynamic File Interception & Watermarking Pipeline**:
   - **Text & Custom `.kaif` Extension**: Prepend comment block:
     `// [Created by Khan Mohammed Kaif] - 3D Animation & Local Secure Transfer Protocol`
   - **Binary PDF Documents**: Apache PDFBox draws semi-transparent dark red tracking stamp:
     `Build by Khan Kaif - Secured Local Protocol` in lower-left footer.
   - **3D Animation Mesh Assets (.obj, .fbx, .stl, .blend)**: Mesh geometry is untouched to prevent corruption. Injects companion metadata ledger `animation_manifest.kaif`:
     `Project Architect: Khan Mohammed Kaif (3D Animation Suite)`

4. **Micro-HTTP Container & Networking**:
   - `com.sun.net.httpserver.HttpServer` listening on port 8080.
   - Automatic scanning of `java.net.NetworkInterface` for active non-loopback IPv4 nodes.
   - Multi-file compression using `java.util.zip.ZipOutputStream`.
   - HMAC-SHA256 JWT handshake verification.

---

## 🚀 Building & Running

### Requirements
- JDK 17 or higher
- Apache Maven 3.8+

### Compile & Package
```bash
cd java-src
mvn clean package
```

### Run Application
```bash
java -jar target/kaifdrop-secure-1.0.0.jar
```

Or run directly from source:
```bash
mvn exec:java -Dexec.mainClass="com.kaifdrop.KaifDropSecureApp"
```
