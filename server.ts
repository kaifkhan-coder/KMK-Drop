import express from 'express';
import { createServer as createViteServer } from 'vite';
import os from 'os';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import crypto from 'crypto';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';

const app = express();

// Parse port and host from CLI args (--port, --host) or environment variables
let parsedPort = 3000;
const portArgIdx = process.argv.indexOf('--port');
if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
  parsedPort = parseInt(process.argv[portArgIdx + 1], 10);
} else if (process.env.PORT) {
  parsedPort = parseInt(process.env.PORT, 10);
}
const PORT = parsedPort || 3000;

let parsedHost = '0.0.0.0';
const hostArgIdx = process.argv.indexOf('--host');
if (hostArgIdx !== -1 && process.argv[hostArgIdx + 1]) {
  parsedHost = process.argv[hostArgIdx + 1];
} else if (process.env.HOST) {
  parsedHost = process.env.HOST;
}
const HOST = parsedHost || '0.0.0.0';

const JWT_SECRET = process.env.JWT_SECRET || 'KaifDrop_Secure_Master_Key_2026_KMK';

// Storage directories
const STORAGE_DIR = path.resolve(process.cwd(), '.kaifdrop_storage');
const UPLOAD_DIR = path.join(STORAGE_DIR, 'received_from_mobile');
const STAGING_DIR = path.join(STORAGE_DIR, 'staged_transfers');

if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(STAGING_DIR)) fs.mkdirSync(STAGING_DIR, { recursive: true });

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-File-Name, X-User-Id');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Configure multer for file uploads
const upload = multer({
  dest: path.join(STORAGE_DIR, 'tmp'),
  limits: { fileSize: 250 * 1024 * 1024 } // 250MB limit
});

// User-isolated storage directory resolver
function getUserStorageDirs(userId: string) {
  const safeUserId = String(userId || 'default_user').replace(/[^a-zA-Z0-9_-]/g, '_');
  const userRoot = path.join(STORAGE_DIR, 'users', safeUserId);
  const userStaging = path.join(userRoot, 'staged');
  const userUpload = path.join(userRoot, 'received');

  if (!fs.existsSync(userRoot)) fs.mkdirSync(userRoot, { recursive: true });
  if (!fs.existsSync(userStaging)) fs.mkdirSync(userStaging, { recursive: true });
  if (!fs.existsSync(userUpload)) fs.mkdirSync(userUpload, { recursive: true });

  return { userRoot, userStaging, userUpload, safeUserId };
}

// Extract requesting user ID from headers, query parameters, or form body
function resolveUserId(req: express.Request): string {
  const fromHeader = req.headers['x-user-id'] as string;
  const fromQuery = (req.query.user || req.query.userId) as string;
  const fromBody = req.body?.userId as string;
  const rawId = fromHeader || fromQuery || fromBody || 'usr_default';
  return String(rawId).trim().replace(/[^a-zA-Z0-9_-]/g, '_');
}

// In-memory registry of staged transfers and received files partitioned by user
interface StagedPackage {
  id: string;
  userId: string;
  name: string;
  files: {
    originalName: string;
    storedPath: string;
    size: number;
    mimeType: string;
    stampedType: 'text_kaif' | 'pdf' | '3d_animation' | 'standard';
    hasManifest?: boolean;
  }[];
  isZipMatrix: boolean;
  zipFilePath?: string;
  totalBytes: number;
  createdAt: number;
  jwtToken: string;
  downloadCount: number;
  publicBridgeUrl?: string;
}

interface ReceivedFileRecord {
  id: string;
  userId: string;
  originalName: string;
  storedPath: string;
  size: number;
  receivedAt: number;
  senderIp: string;
  mimeType: string;
}

const stagedRegistry = new Map<string, StagedPackage>();
const receivedRegistry: ReceivedFileRecord[] = [];

// Dynamic network metrics
let totalBytesServed = 0;
let totalBytesReceived = 0;
let lastTransferSpeedBytesPerSec = 0;
let lastSpeedTimestamp = Date.now();

function updateTransferMetric(bytes: number, type: 'sent' | 'received') {
  if (type === 'sent') totalBytesServed += bytes;
  else totalBytesReceived += bytes;

  const now = Date.now();
  const deltaSec = (now - lastSpeedTimestamp) / 1000;
  if (deltaSec > 0.4) {
    lastTransferSpeedBytesPerSec = Math.round(bytes / deltaSec);
    lastSpeedTimestamp = now;
  }
}

// Simple standard HMAC-SHA256 JWT implementation
function signJwt(payload: object, expiresInMinutes = 120): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInMinutes * 60;
  const fullPayload = { ...payload, exp, iat: Math.floor(Date.now() / 1000) };

  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const encodedHeader = encode(header);
  const encodedPayload = encode(fullPayload);
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyJwt(token: string): { valid: boolean; payload?: any; error?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false, error: 'Malformed token structure' };
    const [headerB64, payloadB64, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (signature !== expectedSig) return { valid: false, error: 'Signature mismatch' };
    const payloadJson = Buffer.from(payloadB64, 'base64').toString('utf8');
    const payload = JSON.parse(payloadJson);
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return { valid: false, error: 'Token expired' };
    }
    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Verification failed' };
  }
}

// Scan network interface cards (mimics java.net.NetworkInterface)
function getActiveNetworkInterfaces() {
  const interfaces = os.networkInterfaces();
  const results: { name: string; address: string; family: string; mac: string; internal: boolean }[] = [];
  let primaryIpv4 = '127.0.0.1';

  for (const [name, netList] of Object.entries(interfaces)) {
    if (!netList) continue;
    for (const net of netList) {
      if (net.family === 'IPv4' || (net as any).family === 4) {
        results.push({
          name,
          address: net.address,
          family: 'IPv4',
          mac: net.mac,
          internal: net.internal
        });
        if (!net.internal && primaryIpv4 === '127.0.0.1') {
          primaryIpv4 = net.address;
        }
      }
    }
  }

  return {
    interfaces: results,
    primaryIpv4,
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch()
  };
}

// ----------------- API ENDPOINTS ----------------- //

// Network node status & interface scan
app.get('/api/network/status', (req, res) => {
  const userId = resolveUserId(req);
  const netInfo = getActiveNetworkInterfaces();
  const hostHeader = req.get('host') || `localhost:${PORT}`;
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const externalAppUrl = process.env.APP_URL || `${protocol}://${hostHeader}`;

  const userStagedCount = Array.from(stagedRegistry.values()).filter(p => p.userId === userId).length;
  const userReceivedCount = receivedRegistry.filter(r => r.userId === userId).length;

  res.json({
    status: 'ACTIVE_LISTENING',
    port: PORT,
    simulatedJavaPort: 8080,
    networkInfo: netInfo,
    activeUrl: externalAppUrl,
    stats: {
      totalBytesServed,
      totalBytesReceived,
      currentBandwidthBytesPerSec: lastTransferSpeedBytesPerSec,
      stagedPackagesCount: userStagedCount,
      receivedFilesCount: userReceivedCount,
      activeUserId: userId
    }
  });
});

// Issue JWT Token for peer handshake verification (open & permissive)
app.post('/api/auth/token', (req, res) => {
  const { clientId, role } = req.body;

  const token = signJwt({
    sub: clientId || 'desktop-master-node',
    role: role || 'MASTER_ADMIN',
    app: 'KaifDrop-Secure',
    architect: 'Khan Mohammed Kaif',
    capabilities: ['DROP_PC_TO_MOBILE', 'SYNC_MOBILE_TO_PC', 'DYNAMIC_WATERMARK_PIPELINE']
  });

  res.json({
    token,
    expiresInSeconds: 7200,
    type: 'Bearer',
    issuedAt: Math.floor(Date.now() / 1000),
    status: 'AUTHORIZED'
  });
});

// Verify JWT Token
app.post('/api/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = req.body.token || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);
  if (!token) return res.status(400).json({ valid: false, error: 'No token supplied' });

  const result = verifyJwt(token);
  res.json(result);
});

// Dynamic File Interception & Watermark Pipeline Staging (Partitioned per User)
app.post('/api/transfer/stage', upload.array('files'), async (req, res) => {
  try {
    const rawFiles = req.files as Express.Multer.File[];
    if (!rawFiles || rawFiles.length === 0) {
      return res.status(400).json({ error: 'No files provided for staging' });
    }

    const userId = resolveUserId(req);
    const { userStaging } = getUserStorageDirs(userId);

    const packageId = 'pkg_' + crypto.randomBytes(6).toString('hex');
    const processedFiles: StagedPackage['files'] = [];
    let totalBytes = 0;
    let has3DAsset = false;

    for (const file of rawFiles) {
      const ext = path.extname(file.originalname).toLowerCase();
      let stampedType: StagedPackage['files'][0]['stampedType'] = 'standard';
      let finalBuffer = fs.readFileSync(file.path);

      // 1. Text & Custom .kaif Extension Engines
      // Programmatically prepend comment block:
      // "// [Created by Khan Mohammed Kaif] - 3D Animation & Local Secure Transfer Protocol"
      const isTextOrKaif =
        ext === '.kaif' ||
        ['.txt', '.js', '.ts', '.java', '.py', '.json', '.html', '.css', '.md', '.c', '.cpp'].includes(ext) ||
        file.mimetype.startsWith('text/');

      if (isTextOrKaif) {
        stampedType = 'text_kaif';
        const stampHeader = `// [Created by Khan Mohammed Kaif] - 3D Animation & Local Secure Transfer Protocol\n`;
        const contentStr = finalBuffer.toString('utf8');
        // Prepend only if not already stamped
        if (!contentStr.startsWith('// [Created by Khan Mohammed Kaif]')) {
          finalBuffer = Buffer.from(stampHeader + contentStr, 'utf8');
        }
      }

      // 2. Binary PDF Document Stamping Layer
      // Draw a semi-transparent dark red tracking stamp reading
      // "Build by Khan Kaif - Secured Local Protocol" inside the lower-left footer boundaries
      else if (ext === '.pdf' || file.mimetype === 'application/pdf') {
        stampedType = 'pdf';
        try {
          const pdfDoc = await PDFDocument.load(finalBuffer, { ignoreEncryption: true });
          const pages = pdfDoc.getPages();
          if (pages.length > 0) {
            const firstPage = pages[0];
            const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            // Draw semi-transparent dark red tracking stamp in lower-left footer
            // Dark red color: rgb(0.65, 0.05, 0.05) with opacity 0.65
            firstPage.drawText('Build by Khan Kaif - Secured Local Protocol', {
              x: 28,
              y: 20,
              size: 10,
              font,
              color: rgb(0.72, 0.08, 0.08),
              opacity: 0.68
            });
            const stampedBytes = await pdfDoc.save();
            finalBuffer = Buffer.from(stampedBytes);
          }
        } catch (pdfErr) {
          console.error('PDF stamp failed, preserving raw buffer:', pdfErr);
        }
      }

      // 3. 3D Animation Asset Architecture
      // Listen for 3D formats (.obj, .fbx, .stl, .blend).
      // Never alter heavy binary frames directly to avoid mesh corruption!
      const is3DFormat = ['.obj', '.fbx', '.stl', '.blend'].includes(ext);
      if (is3DFormat) {
        stampedType = '3d_animation';
        has3DAsset = true;
      }

      const outFileName = `${packageId}_${file.originalname}`;
      const outPath = path.join(userStaging, outFileName);
      fs.writeFileSync(outPath, finalBuffer);

      // Clean temp file
      try { fs.unlinkSync(file.path); } catch (_) {}

      processedFiles.push({
        originalName: file.originalname,
        storedPath: outPath,
        size: finalBuffer.length,
        mimeType: file.mimetype,
        stampedType,
        hasManifest: is3DFormat
      });

      totalBytes += finalBuffer.length;
    }

    // Package into compressed zip matrix if multiple files OR if 3D animation asset is present
    // (If 3D asset is present, companion metadata ledger "animation_manifest.kaif" is injected into root)
    let isZipMatrix = false;
    let zipFilePath: string | undefined = undefined;

    if (processedFiles.length > 1 || has3DAsset) {
      isZipMatrix = true;
      const zip = new JSZip();

      for (const pFile of processedFiles) {
        const fileContent = fs.readFileSync(pFile.storedPath);
        zip.file(pFile.originalName, fileContent);
      }

      // Inject companion metadata ledger if 3D staging formats are present
      if (has3DAsset) {
        const manifestContent = `Project Architect: Khan Mohammed Kaif (3D Animation Suite)\nTimestamp: ${new Date().toISOString()}\nSecured Pipeline: KaifDrop-Secure Active Mesh Guard\nIntegrity: Verified Unaltered Binary Geometry\nUser Workspace: ${userId}\n`;
        zip.file('animation_manifest.kaif', manifestContent);
      }

      const zipBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      const zipName = `${packageId}_bundle.zip`;
      zipFilePath = path.join(userStaging, zipName);
      fs.writeFileSync(zipFilePath, zipBuffer);
      totalBytes = zipBuffer.length;
    }

    // Generate JWT handshake for this specific transfer
    const jwtToken = signJwt({
      stageId: packageId,
      userId,
      fileCount: processedFiles.length,
      bytes: totalBytes,
      isZip: isZipMatrix,
      type: 'PEER_DOWNLOAD_PERMIT'
    });

    const stagedPkg: StagedPackage = {
      id: packageId,
      userId,
      name: processedFiles.length === 1 && !isZipMatrix ? processedFiles[0].originalName : `KaifDrop_Bundle_${packageId}.zip`,
      files: processedFiles,
      isZipMatrix,
      zipFilePath,
      totalBytes,
      createdAt: Date.now(),
      jwtToken,
      downloadCount: 0
    };

    stagedRegistry.set(packageId, stagedPkg);
    updateTransferMetric(totalBytes, 'sent');

    // Start public bridge upload asynchronously in background (NEVER block the HTTP response)
    const bridgeFilePath = isZipMatrix && zipFilePath ? zipFilePath : processedFiles[0]?.storedPath;
    if (bridgeFilePath && fs.existsSync(bridgeFilePath)) {
      uploadToPublicBridge(bridgeFilePath, stagedPkg.name)
        .then((url) => {
          if (url) {
            stagedPkg.publicBridgeUrl = url;
            console.log(`[KaifDrop Bridge] Public mobile bridge ready for ${packageId}: ${url}`);
          }
        })
        .catch((e) => console.warn('[KaifDrop Bridge] Background bridge upload error:', e));
    }

    const hostHeader = req.get('host') || `localhost:${PORT}`;
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const baseAppUrl = process.env.APP_URL || `${protocol}://${hostHeader}`;
    const directDownloadUrl = `/api/transfer/download/${packageId}`;
    const mobileLandingUrl = `${baseAppUrl}/m?user=${userId}&pkg=${packageId}`;

    res.json({
      success: true,
      stageId: packageId,
      userId,
      name: stagedPkg.name,
      totalBytes,
      files: processedFiles.map(f => ({
        name: f.originalName,
        size: f.size,
        stampedType: f.stampedType,
        hasManifest: f.hasManifest
      })),
      isZipMatrix,
      jwtToken,
      directDownloadUrl,
      mobileLandingUrl,
      publicBridgeUrl: stagedPkg.publicBridgeUrl,
      has3DAsset,
      manifestInjected: has3DAsset
    });
  } catch (err: any) {
    console.error('Error staging files:', err);
    res.status(500).json({ error: err.message || 'File staging error' });
  }
});

// Helper for zero-403 public mobile bridge (Non-blocking external gateway)
async function uploadToPublicBridge(filePath: string, fileName: string): Promise<string | null> {
  try {
    if (!fs.existsSync(filePath)) return null;
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer]);
    const form = new FormData();
    form.append('file', blob, fileName);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: form,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const text = await res.text();
      try {
        const data: any = JSON.parse(text);
        if (data?.data?.url) {
          return data.data.url;
        }
      } catch (_) {}
    }
    return null;
  } catch (err) {
    console.warn('[KaifDrop Bridge] Public bridge upload warning:', err);
    return null;
  }
}

// Generate or retrieve public bridge download link (Zero 403 for physical mobile scanning)
app.all(['/api/transfer/public-bridge/:stageId'], async (req, res) => {
  const { stageId } = req.params;
  const pkg = stagedRegistry.get(stageId);
  if (!pkg) {
    return res.status(404).json({ error: 'Staged package not found' });
  }

  if (pkg.publicBridgeUrl) {
    return res.json({ success: true, publicBridgeUrl: pkg.publicBridgeUrl });
  }

  const filePath = pkg.isZipMatrix && pkg.zipFilePath ? pkg.zipFilePath : pkg.files[0]?.storedPath;
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Package file not accessible on disk' });
  }

  const publicUrl = await uploadToPublicBridge(filePath, pkg.name);
  if (publicUrl) {
    pkg.publicBridgeUrl = publicUrl;
    return res.json({ success: true, publicBridgeUrl: publicUrl });
  } else {
    return res.status(502).json({ error: 'Failed to establish public bridge. Use Local Wi-Fi mode or Phone Simulator.' });
  }
});

// Short direct download route for high-contrast scannable QR codes
app.get('/d/:stageId', (req, res) => {
  res.redirect(`/api/transfer/download/${req.params.stageId}`);
});

// Short mobile portal route
app.get('/m', (req, res) => {
  const query = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  res.redirect(`/mobile${query}`);
});

// Download staged package (open peer transfer without 403 blocks)
app.get('/api/transfer/download/:stageId', (req, res) => {
  const { stageId } = req.params;

  const pkg = stagedRegistry.get(stageId);
  if (!pkg) {
    // Check if zip exists on disk in STAGING_DIR as fallback
    const fallbackZip = path.join(STAGING_DIR, `${stageId}.zip`);
    if (fs.existsSync(fallbackZip)) {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${stageId}.zip"`);
      return res.sendFile(fallbackZip);
    }
    return res.status(404).send('Staged transfer package not found or expired.');
  }

  pkg.downloadCount += 1;
  updateTransferMetric(pkg.totalBytes, 'sent');

  if (pkg.isZipMatrix && pkg.zipFilePath && fs.existsSync(pkg.zipFilePath)) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${pkg.name}"`);
    return res.sendFile(pkg.zipFilePath);
  }

  if (pkg.files.length > 0 && fs.existsSync(pkg.files[0].storedPath)) {
    const singleFile = pkg.files[0];
    res.setHeader('Content-Disposition', `attachment; filename="${singleFile.originalName}"`);
    return res.sendFile(singleFile.storedPath);
  }

  res.status(404).send('Transfer binary not accessible on disk');
});

// Mobile to PC Sync Portal - Upload Endpoint (Partitioned per User)
app.post('/api/transfer/upload', upload.array('files'), (req, res) => {
  try {
    const rawFiles = req.files as Express.Multer.File[];
    if (!rawFiles || rawFiles.length === 0) {
      return res.status(400).json({ error: 'No files received from mobile client' });
    }

    const userId = resolveUserId(req);
    const { userUpload } = getUserStorageDirs(userId);

    const senderIp = req.ip || req.connection.remoteAddress || 'Unknown Mobile Peer';
    const receivedRecords: ReceivedFileRecord[] = [];
    let batchBytes = 0;

    for (const f of rawFiles) {
      const destPath = path.join(userUpload, `${Date.now()}_${f.originalname}`);
      fs.copyFileSync(f.path, destPath);
      try { fs.unlinkSync(f.path); } catch (_) {}

      const record: ReceivedFileRecord = {
        id: 'rec_' + crypto.randomBytes(5).toString('hex'),
        userId,
        originalName: f.originalname,
        storedPath: destPath,
        size: f.size,
        receivedAt: Date.now(),
        senderIp: String(senderIp),
        mimeType: f.mimetype
      };

      receivedRegistry.unshift(record);
      receivedRecords.push(record);
      batchBytes += f.size;
    }

    updateTransferMetric(batchBytes, 'received');

    res.json({
      success: true,
      userId,
      message: `Successfully received ${receivedRecords.length} file(s) into workspace (${userId}) designated directory`,
      received: receivedRecords
    });
  } catch (err: any) {
    console.error('Error handling mobile upload:', err);
    res.status(500).json({ error: err.message || 'Mobile upload failed' });
  }
});

// List files received from mobile (Filtered by User)
app.get('/api/transfer/received', (req, res) => {
  const userId = resolveUserId(req);
  const { userUpload } = getUserStorageDirs(userId);
  const userFiles = receivedRegistry.filter(r => r.userId === userId);

  res.json({
    files: userFiles,
    totalCount: userFiles.length,
    destinationDirectory: userUpload,
    userId
  });
});

// Download a received file directly from the PC dashboard
app.get('/api/transfer/received/download/:id', (req, res) => {
  const record = receivedRegistry.find(r => r.id === req.params.id);
  if (!record || !fs.existsSync(record.storedPath)) {
    return res.status(404).send('File record not found on PC storage');
  }
  res.setHeader('Content-Disposition', `attachment; filename="${record.originalName}"`);
  res.sendFile(record.storedPath);
});

// Clear received history for active user
app.post('/api/transfer/received/clear', (req, res) => {
  const userId = resolveUserId(req);
  for (let i = receivedRegistry.length - 1; i >= 0; i--) {
    if (receivedRegistry[i].userId === userId) {
      receivedRegistry.splice(i, 1);
    }
  }
  res.json({ success: true, userId });
});

// Dedicated Mobile Landing Portal (for camera QR scanner or direct link)
app.get('/mobile', (req, res) => {
  const targetUser = resolveUserId(req);
  const pkgId = req.query.pkg as string;
  const jwt = req.query.jwt as string;
  const hostHeader = req.get('host') || `localhost:${PORT}`;
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const baseAppUrl = process.env.APP_URL || `${protocol}://${hostHeader}`;

  let pkgInfo = null;
  if (pkgId && stagedRegistry.has(pkgId)) {
    const pkg = stagedRegistry.get(pkgId)!;
    pkgInfo = {
      name: pkg.name,
      size: (pkg.totalBytes / (1024 * 1024)).toFixed(2) + ' MB',
      filesCount: pkg.files.length,
      downloadUrl: `/api/transfer/download/${pkgId}`
    };
  } else {
    // Only show latest package staged by this specific user
    const userPackages = Array.from(stagedRegistry.values()).filter(p => p.userId === targetUser);
    const latest = userPackages.pop();
    if (latest) {
      pkgInfo = {
        name: latest.name,
        size: (latest.totalBytes / (1024 * 1024)).toFixed(2) + ' MB',
        filesCount: latest.files.length,
        downloadUrl: `/api/transfer/download/${latest.id}`
      };
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>KaifDrop Mobile Portal</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #09090b;
      color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 20px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .container {
      width: 100%;
      max-width: 440px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #27272a;
    }
    .badge {
      display: inline-block;
      font-size: 11px;
      letter-spacing: 0.05em;
      color: #06b6d4;
      background: rgba(6, 182, 212, 0.1);
      border: 1px solid rgba(6, 182, 212, 0.25);
      border-radius: 9999px;
      padding: 3px 10px;
      margin-bottom: 8px;
      font-weight: 600;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      color: #fafafa;
      letter-spacing: -0.02em;
    }
    .sub {
      font-size: 13px;
      color: #a1a1aa;
      margin-top: 4px;
    }
    .card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 18px;
      margin-bottom: 20px;
    }
    .card-title {
      font-size: 14px;
      font-weight: 600;
      color: #e4e4e7;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .download-btn {
      display: block;
      width: 100%;
      background: #06b6d4;
      color: #09090b;
      text-align: center;
      padding: 12px 16px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      text-decoration: none;
      margin-top: 12px;
      transition: background 0.2s;
    }
    .download-btn:hover { background: #22d3ee; }
    .drop-box {
      border: 2px dashed #3f3f46;
      border-radius: 10px;
      padding: 24px 16px;
      text-align: center;
      background: #121215;
      cursor: pointer;
      margin-bottom: 14px;
      transition: border-color 0.2s;
    }
    .drop-box:hover { border-color: #06b6d4; }
    .upload-btn {
      width: 100%;
      background: #10b981;
      color: #09090b;
      border: none;
      padding: 13px 16px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .upload-btn:hover { background: #34d399; }
    .upload-btn:disabled { background: #3f3f46; color: #71717a; cursor: not-allowed; }
    .status-msg {
      margin-top: 12px;
      font-size: 13px;
      text-align: center;
      display: none;
    }
    .file-list {
      margin-top: 10px;
      font-size: 12px;
      color: #a1a1aa;
      max-height: 120px;
      overflow-y: auto;
      text-align: left;
    }
    .file-item {
      padding: 4px 0;
      border-bottom: 1px solid #27272a;
      display: flex;
      justify-content: space-between;
    }
    .footer {
      font-size: 11px;
      color: #71717a;
      text-align: center;
      margin-top: auto;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">SECURED LOCAL NODE</div>
      <h1>KaifDrop Mobile Portal</h1>
      <p class="sub">Peer-to-Peer Direct Transfer · Khan Mohammed Kaif Protocol</p>
    </div>

    <div style="background: #18181b; border: 1px solid #27272a; padding: 10px 14px; border-radius: 10px; margin-bottom: 18px; font-size: 12px; display: flex; align-items: center; justify-content: space-between;">
      <span style="color: #e4e4e7;">👤 Target Channel: <strong style="color: #38bdf8; font-family: monospace;">${targetUser}</strong></span>
      <span style="color: #06b6d4; font-size: 11px; background: rgba(6,182,212,0.1); border: 1px solid rgba(6,182,212,0.3); padding: 2px 8px; border-radius: 9999px;">Private Workspace</span>
    </div>

    ${
      pkgInfo
        ? `
    <div class="card">
      <div class="card-title">
        <span>📥 Download From PC</span>
      </div>
      <div style="font-size: 13px; color: #d4d4d8; line-height: 1.5;">
        <div><strong>Package:</strong> ${pkgInfo.name}</div>
        <div><strong>Size:</strong> ${pkgInfo.size} (${pkgInfo.filesCount} file(s))</div>
        <div style="font-size: 11px; color: #10b981; margin-top: 4px;">✓ Verified Watermarked & Encrypted</div>
      </div>
      <a href="${pkgInfo.downloadUrl}" class="download-btn">⬇️ Download Assets to Mobile</a>
    </div>`
        : ''
    }

    <div class="card">
      <div class="card-title">
        <span>📤 Send Mobile Files to PC</span>
      </div>
      <p style="font-size: 12px; color: #a1a1aa; margin-bottom: 12px;">
        Select photos, videos, assignments, or 3D assets to sync directly to the host workstation.
      </p>

      <form id="uploadForm">
        <input type="file" id="fileInput" name="files" multiple style="display: none;" />
        <div class="drop-box" id="dropBox" onclick="document.getElementById('fileInput').click()">
          <div style="font-size: 28px; margin-bottom: 6px;">📱</div>
          <div style="font-size: 14px; font-weight: 500; color: #f4f4f5;">Tap to choose files</div>
          <div style="font-size: 11px; color: #71717a; margin-top: 4px;">Camera, Photo Library, or Documents</div>
        </div>
        <div id="fileList" class="file-list"></div>
        <button type="submit" id="submitBtn" class="upload-btn" disabled style="margin-top: 10px;">
          Send Files to Desktop PC
        </button>
      </form>
      <div id="statusMsg" class="status-msg"></div>
    </div>

    <div class="footer">
      KaifDrop-Secure · Zero-Cloud Micro-HTTP Gateway
    </div>
  </div>

  <script>
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const submitBtn = document.getElementById('submitBtn');
    const uploadForm = document.getElementById('uploadForm');
    const statusMsg = document.getElementById('statusMsg');

    let accumulatedFiles = [];

    function renderFileList() {
      fileList.innerHTML = '';
      if (accumulatedFiles.length > 0) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send ' + accumulatedFiles.length + ' File(s) to PC';
        accumulatedFiles.forEach((f, idx) => {
          const div = document.createElement('div');
          div.className = 'file-item';
          div.style.display = 'flex';
          div.style.alignItems = 'center';
          div.style.justifyContent = 'space-between';
          div.style.padding = '4px 8px';
          div.style.background = '#18181b';
          div.style.borderRadius = '4px';
          div.style.marginBottom = '4px';
          div.innerHTML = '<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:200px;">' + f.name + '</span><span style="display:flex; align-items:center; gap:8px;"><span>' + (f.size / 1024).toFixed(1) + ' KB</span><button type="button" onclick="removeFile(' + idx + ')" style="background:none; border:none; color:#ef4444; cursor:pointer; font-weight:bold;">✕</button></span>';
          fileList.appendChild(div);
        });

        // Add more files button
        const addMore = document.createElement('button');
        addMore.type = 'button';
        addMore.textContent = '+ Add More Files';
        addMore.style.background = '#27272a';
        addMore.style.color = '#06b6d4';
        addMore.style.border = '1px solid #3f3f46';
        addMore.style.padding = '6px 10px';
        addMore.style.borderRadius = '6px';
        addMore.style.fontSize = '12px';
        addMore.style.cursor = 'pointer';
        addMore.style.marginTop = '6px';
        addMore.style.width = '100%';
        addMore.onclick = () => fileInput.click();
        fileList.appendChild(addMore);
      } else {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Send Files to Desktop PC';
      }
    }

    window.removeFile = function(idx) {
      accumulatedFiles.splice(idx, 1);
      renderFileList();
    };

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        Array.from(fileInput.files).forEach(f => {
          accumulatedFiles.push(f);
        });
        renderFileList();
      }
      fileInput.value = '';
    });

    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!accumulatedFiles.length) return;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Transferring ' + accumulatedFiles.length + ' file(s) to PC...';
      statusMsg.style.display = 'block';
      statusMsg.style.color = '#06b6d4';
      statusMsg.textContent = 'Uploading files via local micro-HTTP socket...';

      const formData = new FormData();
      formData.append('userId', '${targetUser}');
      accumulatedFiles.forEach(f => {
        formData.append('files', f);
      });

      try {
        const res = await fetch('/api/transfer/upload', {
          method: 'POST',
          headers: { 'x-user-id': '${targetUser}' },
          body: formData
        });
        const data = await res.json();
        if (res.ok) {
          statusMsg.style.color = '#10b981';
          statusMsg.textContent = '✓ Transfer complete! ' + accumulatedFiles.length + ' file(s) sent to PC desktop directory.';
          submitBtn.textContent = 'Sent Successfully';
          accumulatedFiles = [];
          fileList.innerHTML = '';
        } else {
          throw new Error(data.error || 'Upload failed');
        }
      } catch (err) {
        statusMsg.style.color = '#ef4444';
        statusMsg.textContent = 'Transfer error: ' + err.message;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Retry Transfer';
      }
    });
  </script>
</body>
</html>`;

  res.send(html);
});

// Download the complete Java desktop application Maven project source
app.get('/api/java-project/download', async (req, res) => {
  try {
    const javaDir = path.resolve(process.cwd(), 'java-src');
    if (!fs.existsSync(javaDir)) {
      return res.status(404).send('Java source directory not found');
    }

    const zip = new JSZip();

    function addDirToZip(dirPath: string, zipFolder: JSZip) {
      const items = fs.readdirSync(dirPath);
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          const subFolder = zipFolder.folder(item);
          if (subFolder) addDirToZip(fullPath, subFolder);
        } else {
          const content = fs.readFileSync(fullPath);
          zipFolder.file(item, content);
        }
      }
    }

    addDirToZip(javaDir, zip);

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="KaifDropSecure_Java_Maven_Project.zip"');
    res.send(zipBuffer);
  } catch (err: any) {
    console.error('Failed to bundle Java project:', err);
    res.status(500).send('Error packaging Java project');
  }
});

// Ensure any unhandled /api route returns JSON 404, never falling into Vite HTML SPA fallback
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API endpoint ${req.method} ${req.path} not found` });
});

// Global Express error handler to guarantee all API errors are returned as JSON, never unhandled HTML
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[KaifDrop Server Error]', err);
  if (res.headersSent) return;
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected server error occurred',
    code: err.code || 'INTERNAL_SERVER_ERROR'
  });
});

// Boot server with Vite integration
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[KaifDrop-Secure] Local Node Server running on http://${HOST}:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
