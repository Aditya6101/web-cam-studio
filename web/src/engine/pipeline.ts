import { CameraManager } from '../camera';
import { WebGLRenderer, type ShaderStyleId } from './webgl';
import { NeuralEngine, type NeuralModelInfo, AVAILABLE_NEURAL_MODELS } from './neural';

export type ActiveStyleType = 'shader' | 'neural';

export interface StyleConfig {
  id: string;
  name: string;
  type: ActiveStyleType;
  shaderId?: ShaderStyleId;
  neuralModelId?: string;
  icon: string;
  badge?: string;
  params: Record<string, { label: string; min: number; max: number; step: number; default: number; value: number }>;
}

export interface PipelineStats {
  fps: number;
  avgFps: number;
  latencyMs: number;
  droppedFrames: number;
  resolution: string;
  backend: string;
}

export class RenderPipeline {
  private camera: CameraManager;
  private canvas: HTMLCanvasElement;
  private webgl: WebGLRenderer;
  private neural: NeuralEngine;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private videoCallbackHandle: number | null = null;

  // Active style state
  private activeStyleConfig: StyleConfig;
  private activeNeuralModel: NeuralModelInfo | null = null;

  // Performance metrics
  private frameCount: number = 0;
  private lastTimestamp: number = 0;
  private fpsHistory: number[] = [];
  private droppedFramesCount: number = 0;
  private lastLatencyMs: number = 0;
  private onStatsCallback?: (stats: PipelineStats) => void;

  constructor(
    canvas: HTMLCanvasElement,
    camera: CameraManager,
    initialStyle: StyleConfig,
    onStats?: (stats: PipelineStats) => void
  ) {
    this.canvas = canvas;
    this.camera = camera;
    this.activeStyleConfig = initialStyle;
    this.onStatsCallback = onStats;

    this.webgl = new WebGLRenderer(canvas);
    this.neural = new NeuralEngine();
  }

  public setStyle(style: StyleConfig, onProgress?: (msg: string) => void): Promise<void> {
    this.activeStyleConfig = style;

    if (style.type === 'neural' && style.neuralModelId) {
      const modelInfo = AVAILABLE_NEURAL_MODELS.find(m => m.id === style.neuralModelId);
      if (modelInfo) {
        this.activeNeuralModel = modelInfo;
        return this.neural.loadModel(modelInfo, onProgress).then(() => {});
      }
    }
    return Promise.resolve();
  }

  public getActiveStyle(): StyleConfig {
    return this.activeStyleConfig;
  }

  public updateParam(paramKey: string, value: number) {
    if (this.activeStyleConfig.params[paramKey]) {
      this.activeStyleConfig.params[paramKey].value = value;
    }
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTimestamp = performance.now();
    this.scheduleNextFrame();
  }

  public stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    const video = this.camera.getVideoElement();
    if (this.videoCallbackHandle !== null && 'cancelVideoFrameCallback' in video) {
      (video as any).cancelVideoFrameCallback(this.videoCallbackHandle);
      this.videoCallbackHandle = null;
    }
  }

  private scheduleNextFrame() {
    if (!this.isRunning) return;

    const video = this.camera.getVideoElement();
    // Prefer requestVideoFrameCallback for webcam stream synchronization
    if ('requestVideoFrameCallback' in video) {
      this.videoCallbackHandle = (video as any).requestVideoFrameCallback(() => {
        this.renderLoop();
        this.scheduleNextFrame();
      });
    } else {
      this.animationFrameId = requestAnimationFrame(() => {
        this.renderLoop();
        this.scheduleNextFrame();
      });
    }
  }

  private renderLoop() {
    if (!this.isRunning) return;

    const video = this.camera.getVideoElement();
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return;
    }

    const tStart = performance.now();

    // Resize canvas if needed
    const vWidth = video.videoWidth || 640;
    const vHeight = video.videoHeight || 480;
    if (this.canvas.width !== vWidth || this.canvas.height !== vHeight) {
      this.canvas.width = vWidth;
      this.canvas.height = vHeight;
    }

    const mirror = this.camera.getMirrored();
    const style = this.activeStyleConfig;

    if (style.type === 'shader' && style.shaderId) {
      // Gather uniform parameters
      const params: Record<string, number> = {};
      for (const [k, v] of Object.entries(style.params)) {
        params[k] = v.value;
      }
      this.webgl.render(video, style.shaderId, params, mirror);
    } else if (style.type === 'neural' && this.activeNeuralModel) {
      if (this.neural.isReady()) {
        // Render the latest neural frame via WebGL passthrough
        this.webgl.render(this.neural.getOutputCanvas(), 'passthrough', {}, false);

        if (this.neural.canProcess()) {
          this.neural.processFrame(video, this.activeNeuralModel, mirror).catch(err => {
            console.error('Neural processing error:', err);
          });
        } else {
          // Frame dropped because previous inference is still executing
          this.droppedFramesCount++;
        }
      }
    }

    const tEnd = performance.now();
    this.lastLatencyMs = tEnd - tStart;

    // Track FPS metrics
    this.calculateFps(tEnd);
  }

  private calculateFps(now: number) {
    this.frameCount++;
    const delta = now - this.lastTimestamp;
    
    if (delta >= 500) { // update every 500ms
      const instantFps = Math.round((this.frameCount * 1000) / delta);
      this.fpsHistory.push(instantFps);
      if (this.fpsHistory.length > 10) this.fpsHistory.shift();

      const avgFps = Math.round(
        this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
      );

      const backend = this.activeStyleConfig.type === 'neural'
        ? `Neural (${this.neural.getExecutionProvider()})`
        : 'WebGL2 (GPU Shaders)';

      const resolution = `${this.canvas.width}x${this.canvas.height}`;

      this.onStatsCallback?.({
        fps: instantFps,
        avgFps,
        latencyMs: Math.round(this.lastLatencyMs * 10) / 10,
        droppedFrames: this.droppedFramesCount,
        resolution,
        backend
      });

      this.frameCount = 0;
      this.lastTimestamp = now;
    }
  }

  public captureSnapshot(): string {
    return this.canvas.toDataURL('image/png');
  }

  public destroy() {
    this.stop();
    this.webgl.destroy();
    this.neural.dispose();
  }
}
