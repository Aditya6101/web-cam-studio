import { CameraManager } from './camera';
import { RenderPipeline } from './engine/pipeline';
import { UIManager } from './ui/controls';
import { STYLE_DEFINITIONS } from './ui/styles';

async function bootstrap() {
  const canvas = document.getElementById('viewport-canvas') as HTMLCanvasElement;
  const errorBanner = document.getElementById('error-banner');
  const errorTitle = document.getElementById('error-title');
  const errorDesc = document.getElementById('error-desc');
  const retryBtn = document.getElementById('retry-camera-btn');

  const camera = new CameraManager();

  // Initial style is Lego Mosaic (index 1)
  const initialStyle = STYLE_DEFINITIONS[1];

  let pipeline: RenderPipeline;
  let ui: UIManager;

  try {
    pipeline = new RenderPipeline(canvas, camera, initialStyle, stats => {
      ui?.updateStats(stats);
    });

    ui = new UIManager(camera, pipeline);
    ui.init();
  } catch (err: any) {
    console.error('Failed to initialize WebGL render engine:', err);
    if (errorBanner && errorTitle && errorDesc) {
      errorBanner.style.display = 'block';
      errorTitle.textContent = 'Graphics Initialization Error';
      errorDesc.textContent = err.message || 'WebGL2 is not supported or failed to initialize on this GPU.';
      if (retryBtn) retryBtn.style.display = 'none';
    }
    return;
  }

  async function startWebcam() {
    try {
      if (errorBanner) errorBanner.style.display = 'none';
      await camera.start();
      pipeline.start();
      ui.updateStreamStatus(true);
      ui.showToast('Webcam connected! Press 1-9 to switch styles.', 3500);
    } catch (err: any) {
      console.warn('Camera start failed:', err);
      ui.updateStreamStatus(false);
      if (errorBanner && errorTitle && errorDesc) {
        errorBanner.style.display = 'block';
        errorTitle.textContent = 'Camera Access Required';
        errorDesc.textContent = err.message;
      }
    }
  }

  retryBtn?.addEventListener('click', () => {
    startWebcam();
  });

  // Start webcam
  await startWebcam();

  // Register service worker for offline PWA capability
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('ServiceWorker registration failed:', err);
      });
    });
  }
}

bootstrap().catch(err => {
  console.error('Bootstrap error:', err);
});
