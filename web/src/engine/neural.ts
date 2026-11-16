import * as ort from 'onnxruntime-web';

export type TensorLayout = 'NHWC' | 'NCHW';

export interface NeuralModelInfo {
  id: string;
  name: string;
  path: string;
  inputSize: [number, number]; // [width, height], e.g. [256, 256] or [512, 512]
  layout: TensorLayout;
  description: string;
}

export const AVAILABLE_NEURAL_MODELS: NeuralModelInfo[] = [
  {
    id: 'animegan_hayao',
    name: 'AnimeGANv2 (Hayao / Ghibli)',
    path: '/models/animegan2_hayao.onnx',
    inputSize: [256, 256],
    layout: 'NHWC',
    description: 'Vibrant Miyazaki / Studio Ghibli painterly aesthetic.'
  },
  {
    id: 'animegan_paprika',
    name: 'AnimeGANv2 (Paprika)',
    path: '/models/animegan2_paprika.onnx',
    inputSize: [256, 256],
    layout: 'NHWC',
    description: 'Satoshi Kon style with bold color palettes.'
  },
  {
    id: 'animegan_facepaint',
    name: 'AnimeGANv2 (Face Paint)',
    path: '/models/animegan2_facepaint.onnx',
    inputSize: [512, 512],
    layout: 'NCHW',
    description: 'Tuned specifically for portraits and clean facial features.'
  }
];

export class NeuralEngine {
  private session: ort.InferenceSession | null = null;
  private currentModelId: string | null = null;
  private isInferencing: boolean = false;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private outputCanvas: HTMLCanvasElement;
  private outputCtx: CanvasRenderingContext2D;
  private activeExecutionProvider: string = 'unknown';

  constructor() {
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true })!;

    this.outputCanvas = document.createElement('canvas');
    this.outputCtx = this.outputCanvas.getContext('2d')!;

    // Point WASM paths to our static assets in public/ort/
    ort.env.wasm.wasmPaths = '/ort/';
    if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
      ort.env.wasm.numThreads = Math.min(4, Math.max(1, navigator.hardwareConcurrency));
    }
  }

  public getExecutionProvider(): string {
    return this.activeExecutionProvider;
  }

  public async loadModel(modelInfo: NeuralModelInfo, progressCb?: (status: string) => void): Promise<boolean> {
    if (this.currentModelId === modelInfo.id && this.session) {
      return true;
    }

    progressCb?.('Checking WebGPU / WASM execution providers...');

    // Resize offscreen canvases
    this.offscreenCanvas.width = modelInfo.inputSize[0];
    this.offscreenCanvas.height = modelInfo.inputSize[1];
    this.outputCanvas.width = modelInfo.inputSize[0];
    this.outputCanvas.height = modelInfo.inputSize[1];

    progressCb?.(`Loading ${modelInfo.name}...`);

    // First verify file exists
    try {
      const resp = await fetch(modelInfo.path, { method: 'HEAD' });
      if (!resp.ok) {
        throw new Error(`Model file not found at ${modelInfo.path}.`);
      }
    } catch (e: any) {
      throw new Error(`Could not access ${modelInfo.path}: ${e.message}`);
    }

    // Try WebGPU first, then WASM fallback
    let session: ort.InferenceSession | null = null;
    let chosenEP = 'webgpu';

    try {
      progressCb?.('Initializing session with WebGPU...');
      session = await ort.InferenceSession.create(modelInfo.path, {
        executionProviders: ['webgpu'],
        graphOptimizationLevel: 'all'
      });
      chosenEP = 'WebGPU';
    } catch (gpuErr) {
      console.warn('WebGPU EP unavailable or failed, falling back to WASM:', gpuErr);
      try {
        progressCb?.('Falling back to WASM execution provider...');
        session = await ort.InferenceSession.create(modelInfo.path, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all'
        });
        chosenEP = 'WASM';
      } catch (wasmErr: any) {
        throw new Error(`Both WebGPU and WASM initialization failed: ${wasmErr.message}`);
      }
    }

    this.session = session;
    this.currentModelId = modelInfo.id;
    this.activeExecutionProvider = chosenEP;

    progressCb?.(`Model loaded successfully using ${chosenEP}!`);
    return true;
  }

  public isReady(): boolean {
    return this.session !== null;
  }

  public getOutputCanvas(): HTMLCanvasElement {
    return this.outputCanvas;
  }

  public canProcess(): boolean {
    return this.session !== null && !this.isInferencing;
  }

  public async processFrame(
    video: HTMLVideoElement,
    modelInfo: NeuralModelInfo,
    mirror: boolean
  ): Promise<HTMLCanvasElement | null> {
    if (!this.session || this.isInferencing) {
      // Drop frame to ensure zero queue backlog
      return null;
    }

    this.isInferencing = true;
    try {
      const [width, height] = modelInfo.inputSize;
      const ctx = this.offscreenCtx;

      // Draw and scale video frame to model input dimensions
      ctx.save();
      if (mirror) {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, width, height);
      ctx.restore();

      const imgData = ctx.getImageData(0, 0, width, height);
      const rgba = imgData.data;
      const totalPixels = width * height;

      let inputTensor: ort.Tensor;

      if (modelInfo.layout === 'NHWC') {
        // [1, height, width, 3] layout: RGB interleaved normalized to [-1.0, 1.0]
        const floatData = new Float32Array(totalPixels * 3);
        for (let i = 0, p = 0; i < rgba.length; i += 4, p += 3) {
          floatData[p]     = (rgba[i] / 127.5) - 1.0;
          floatData[p + 1] = (rgba[i + 1] / 127.5) - 1.0;
          floatData[p + 2] = (rgba[i + 2] / 127.5) - 1.0;
        }
        inputTensor = new ort.Tensor('float32', floatData, [1, height, width, 3]);
      } else {
        // [1, 3, height, width] layout (NCHW): Planar RGB normalized to [-1.0, 1.0]
        const floatData = new Float32Array(3 * totalPixels);
        const rOffset = 0;
        const gOffset = totalPixels;
        const bOffset = 2 * totalPixels;

        for (let i = 0, p = 0; i < rgba.length; i += 4, p++) {
          floatData[rOffset + p] = (rgba[i] / 127.5) - 1.0;
          floatData[gOffset + p] = (rgba[i + 1] / 127.5) - 1.0;
          floatData[bOffset + p] = (rgba[i + 2] / 127.5) - 1.0;
        }
        inputTensor = new ort.Tensor('float32', floatData, [1, 3, height, width]);
      }

      const inputName = this.session.inputNames[0] || 'input';
      const feeds: Record<string, ort.Tensor> = {};
      feeds[inputName] = inputTensor;

      const results = await this.session.run(feeds);
      const outputName = this.session.outputNames[0] || 'output';
      const outputTensor = results[outputName];

      if (!outputTensor) {
        throw new Error('Inference returned empty tensor');
      }

      const outputData = outputTensor.data as Float32Array;
      const dims = outputTensor.dims;

      // Create output image buffer
      const outImgData = this.outputCtx.createImageData(width, height);
      const outPixels = outImgData.data;

      // Determine output layout from tensor dimensions
      const isNHWC = dims.length === 4 && dims[3] === 3;

      if (isNHWC) {
        // [1, height, width, 3]
        for (let p = 0, i = 0; p < totalPixels; p++, i += 3) {
          const dst = p * 4;
          outPixels[dst]     = Math.min(255, Math.max(0, (outputData[i] + 1.0) * 127.5));
          outPixels[dst + 1] = Math.min(255, Math.max(0, (outputData[i + 1] + 1.0) * 127.5));
          outPixels[dst + 2] = Math.min(255, Math.max(0, (outputData[i + 2] + 1.0) * 127.5));
          outPixels[dst + 3] = 255;
        }
      } else {
        // [1, 3, height, width] (NCHW)
        const rOffset = 0;
        const gOffset = totalPixels;
        const bOffset = 2 * totalPixels;

        for (let p = 0; p < totalPixels; p++) {
          const dst = p * 4;
          outPixels[dst]     = Math.min(255, Math.max(0, (outputData[rOffset + p] + 1.0) * 127.5));
          outPixels[dst + 1] = Math.min(255, Math.max(0, (outputData[gOffset + p] + 1.0) * 127.5));
          outPixels[dst + 2] = Math.min(255, Math.max(0, (outputData[bOffset + p] + 1.0) * 127.5));
          outPixels[dst + 3] = 255;
        }
      }

      this.outputCtx.putImageData(outImgData, 0, 0);
      return this.outputCanvas;
    } finally {
      this.isInferencing = false;
    }
  }

  public dispose() {
    if (this.session) {
      this.session.release();
      this.session = null;
    }
  }
}
