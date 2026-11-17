export interface CameraDeviceInfo {
  deviceId: string;
  label: string;
}

export interface CameraResolution {
  label: string;
  width: number;
  height: number;
}

export const PRESET_RESOLUTIONS: CameraResolution[] = [
  { label: '360p (Fast)', width: 640, height: 360 },
  { label: '480p (Standard)', width: 640, height: 480 },
  { label: '720p (HD)', width: 1280, height: 720 },
  { label: '1080p (Full HD)', width: 1920, height: 1080 }
];

export class CameraManager {
  private video: HTMLVideoElement;
  private currentStream: MediaStream | null = null;
  private currentDeviceId: string | null = null;
  private currentResolution: CameraResolution = PRESET_RESOLUTIONS[1]; // default 480p
  private isMirrored: boolean = true;
  private currentFacingMode: 'user' | 'environment' = 'user';

  constructor() {
    this.video = document.createElement('video');
    this.video.autoplay = true;
    this.video.playsInline = true;
    this.video.muted = true;
  }

  public getVideoElement(): HTMLVideoElement {
    return this.video;
  }

  public getMirrored(): boolean {
    return this.isMirrored;
  }

  public setMirrored(mirrored: boolean) {
    this.isMirrored = mirrored;
  }

  public getFacingMode(): 'user' | 'environment' {
    return this.currentFacingMode;
  }

  public async toggleFacingMode(): Promise<MediaStream> {
    this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
    // Front camera is mirrored like a selfie mirror; rear environment camera is unmirrored
    this.isMirrored = this.currentFacingMode === 'user';
    this.currentDeviceId = null;
    return this.start();
  }

  public async getAvailableCameras(): Promise<CameraDeviceInfo[]> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter(d => d.kind === 'videoinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${index + 1}`
        }));
    } catch (err) {
      console.warn('Failed to enumerate media devices:', err);
      return [];
    }
  }

  public async start(
    deviceId?: string,
    resolution: CameraResolution = this.currentResolution
  ): Promise<MediaStream> {
    this.stop();
    this.currentResolution = resolution;

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      throw new Error('Camera access requires HTTPS or localhost when viewing on mobile devices.');
    }

    const constraints: MediaStreamConstraints = {
      audio: false,
      video: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        facingMode: !deviceId ? { ideal: this.currentFacingMode } : undefined,
        width: { ideal: resolution.width },
        height: { ideal: resolution.height },
        frameRate: { ideal: 60, min: 15 }
      }
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.currentStream = stream;
      this.video.srcObject = stream;

      await new Promise<void>((resolve, reject) => {
        this.video.onloadedmetadata = () => {
          this.video.play()
            .then(() => resolve())
            .catch(reject);
        };
        this.video.onerror = () => reject(new Error('Video element failed to load stream'));
      });

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        if (settings.deviceId) {
          this.currentDeviceId = settings.deviceId;
        }
      }

      return stream;
    } catch (err: any) {
      let friendlyMessage = 'Failed to access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        friendlyMessage = 'Camera permission was denied. Please allow camera access in your browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        friendlyMessage = 'No camera device found on this system.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        friendlyMessage = 'Camera is currently in use by another application.';
      } else if (err.name === 'OverconstrainedError') {
        friendlyMessage = 'Requested resolution is not supported by your camera. Trying fallback...';
        // Fallback to basic video constraints
        return this.startFallback();
      }
      throw new Error(friendlyMessage);
    }
  }

  private async startFallback(): Promise<MediaStream> {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    this.currentStream = stream;
    this.video.srcObject = stream;
    await this.video.play();
    return stream;
  }

  public stop() {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }
    this.video.srcObject = null;
  }

  public isStreaming(): boolean {
    return this.currentStream !== null && this.currentStream.active;
  }

  public getCurrentDeviceId(): string | null {
    return this.currentDeviceId;
  }

  public getCurrentResolution(): CameraResolution {
    return this.currentResolution;
  }

  public getVideoDimensions(): { width: number; height: number } {
    return {
      width: this.video.videoWidth || this.currentResolution.width,
      height: this.video.videoHeight || this.currentResolution.height
    };
  }
}
