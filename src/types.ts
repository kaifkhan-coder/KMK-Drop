export interface StagedFile {
  name: string;
  size: number;
  type: string;
  stampedType: 'text_kaif' | 'pdf' | '3d_animation' | 'standard';
  hasManifest?: boolean;
  contentPreview?: string;
  rawFile?: File;
}

export interface StagedPackageResult {
  stageId: string;
  name: string;
  totalBytes: number;
  files: {
    name: string;
    size: number;
    stampedType: 'text_kaif' | 'pdf' | '3d_animation' | 'standard';
    hasManifest?: boolean;
  }[];
  isZipMatrix: boolean;
  jwtToken: string;
  directDownloadUrl: string;
  mobileLandingUrl: string;
  publicBridgeUrl?: string;
  has3DAsset: boolean;
  manifestInjected: boolean;
}

export interface ReceivedFileItem {
  id: string;
  originalName: string;
  storedPath: string;
  size: number;
  receivedAt: number;
  senderIp: string;
  mimeType: string;
}

export interface NetworkStatus {
  status: string;
  port: number;
  simulatedJavaPort: number;
  networkInfo: {
    interfaces: {
      name: string;
      address: string;
      family: string;
      mac: string;
      internal: boolean;
    }[];
    primaryIpv4: string;
    hostname: string;
    platform: string;
  };
  activeUrl: string;
  stats: {
    totalBytesServed: number;
    totalBytesReceived: number;
    currentBandwidthBytesPerSec: number;
    stagedPackagesCount: number;
    receivedFilesCount: number;
  };
}
