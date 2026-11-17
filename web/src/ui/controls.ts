import { CameraManager, type CameraResolution, PRESET_RESOLUTIONS } from '../camera';
import { RenderPipeline, type PipelineStats } from '../engine/pipeline';
import { STYLE_DEFINITIONS } from './styles';
import { getIconSvg } from './icons';

export class UIManager {
  private camera: CameraManager;
  private pipeline: RenderPipeline;
  private currentStyleIndex: number = 1; // default to Lego Mosaic!
  private isParamsOpen: boolean = true;

  constructor(camera: CameraManager, pipeline: RenderPipeline) {
    this.camera = camera;
    this.pipeline = pipeline;
  }

  public init() {
    this.renderHeaderControls();
    this.renderStyleCards();
    this.renderParametersPanel();
    this.setupKeyboardShortcuts();
  }

  public showToast(message: string, durationMs = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, durationMs);
  }

  public updateStats(stats: PipelineStats) {
    const fpsEl = document.getElementById('stat-fps');
    const latencyEl = document.getElementById('stat-latency');
    const resEl = document.getElementById('stat-resolution');
    const backendEl = document.getElementById('stat-backend');

    if (fpsEl) fpsEl.textContent = `${stats.fps} (${stats.avgFps} avg)`;
    if (latencyEl) latencyEl.textContent = `${stats.latencyMs} ms`;
    if (resEl) resEl.textContent = stats.resolution;
    if (backendEl) backendEl.textContent = stats.backend;
  }

  private async renderHeaderControls() {
    // Camera Device Selector
    const cameraSelect = document.getElementById('camera-select') as HTMLSelectElement;
    if (cameraSelect) {
      const devices = await this.camera.getAvailableCameras();
      cameraSelect.innerHTML = '';
      if (devices.length === 0) {
        cameraSelect.innerHTML = '<option value="">Default Camera</option>';
      } else {
        devices.forEach(dev => {
          const opt = document.createElement('option');
          opt.value = dev.deviceId;
          opt.textContent = dev.label;
          cameraSelect.appendChild(opt);
        });
      }

      cameraSelect.addEventListener('change', async () => {
        try {
          await this.camera.start(cameraSelect.value);
          this.showToast('Camera switched');
        } catch (err: any) {
          this.showToast(`Camera switch error: ${err.message}`);
        }
      });
    }

    // Resolution Selector
    const resSelect = document.getElementById('resolution-select') as HTMLSelectElement;
    if (resSelect) {
      resSelect.innerHTML = '';
      PRESET_RESOLUTIONS.forEach(res => {
        const opt = document.createElement('option');
        opt.value = `${res.width}x${res.height}`;
        opt.textContent = res.label;
        if (res.width === 640 && res.height === 480) {
          opt.selected = true;
        }
        resSelect.appendChild(opt);
      });

      resSelect.addEventListener('change', async () => {
        const [w, h] = resSelect.value.split('x').map(Number);
        const targetRes: CameraResolution = {
          label: resSelect.selectedOptions[0].text,
          width: w,
          height: h
        };
        try {
          await this.camera.start(this.camera.getCurrentDeviceId() || undefined, targetRes);
          this.showToast(`Resolution set to ${resSelect.value}`);
        } catch (err: any) {
          this.showToast(`Resolution error: ${err.message}`);
        }
      });
    }

    // Mirror Toggle
    const mirrorBtn = document.getElementById('mirror-btn');
    if (mirrorBtn) {
      mirrorBtn.innerHTML = getIconSvg('flip');
      mirrorBtn.classList.toggle('active', this.camera.getMirrored());
      mirrorBtn.addEventListener('click', () => {
        const newState = !this.camera.getMirrored();
        this.camera.setMirrored(newState);
        mirrorBtn.classList.toggle('active', newState);
        this.showToast(newState ? 'Mirror: On' : 'Mirror: Off');
      });
    }

    // Flip Front / Rear Camera Button (especially for mobile)
    const switchCameraBtn = document.getElementById('switch-camera-btn');
    if (switchCameraBtn) {
      switchCameraBtn.innerHTML = getIconSvg('switchCamera');
      switchCameraBtn.addEventListener('click', async () => {
        try {
          await this.camera.toggleFacingMode();
          const mode = this.camera.getFacingMode();
          mirrorBtn?.classList.toggle('active', this.camera.getMirrored());
          this.showToast(mode === 'user' ? 'Front Camera (Mirrored)' : 'Rear Camera (Unmirrored)');
        } catch (err: any) {
          this.showToast(`Camera switch: ${err.message}`);
        }
      });
    }

    // Fullscreen Toggle
    const fsBtn = document.getElementById('fullscreen-btn');
    if (fsBtn) {
      fsBtn.innerHTML = getIconSvg('expand');
      fsBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
      });
    }

    // Stream Toggle Button (Start / Stop)
    const streamToggleBtn = document.getElementById('stream-toggle-btn');
    const resumeBtn = document.getElementById('resume-stream-btn');
    const pausedIcon = document.getElementById('paused-icon');

    if (pausedIcon) {
      pausedIcon.innerHTML = getIconSvg('videoOff', 28);
    }

    const toggleStreamAction = async () => {
      const isCurrentlyStreaming = this.camera.isStreaming();
      if (isCurrentlyStreaming) {
        this.pipeline.stop();
        this.camera.stop();
        this.updateStreamStatus(false);
        this.showToast('Webcam stream stopped');
      } else {
        try {
          const btnText = document.getElementById('stream-btn-text');
          if (btnText) btnText.textContent = 'Starting...';
          await this.camera.start(this.camera.getCurrentDeviceId() || undefined);
          this.pipeline.start();
          this.updateStreamStatus(true);
          this.showToast('Webcam stream started');
        } catch (err: any) {
          this.updateStreamStatus(false);
          this.showToast(`Failed to start camera: ${err.message}`, 4000);
        }
      }
    };

    streamToggleBtn?.addEventListener('click', toggleStreamAction);
    resumeBtn?.addEventListener('click', toggleStreamAction);

    // Parameters panel toggle button
    const toggleParamsBtn = document.getElementById('toggle-params-btn');
    if (toggleParamsBtn) {
      toggleParamsBtn.innerHTML = getIconSvg('sliders');
      toggleParamsBtn.addEventListener('click', () => {
        this.isParamsOpen = !this.isParamsOpen;
        const panel = document.getElementById('parameters-panel');
        if (panel) {
          panel.classList.toggle('hidden', !this.isParamsOpen);
        }
      });
    }

    // Snapshot Button
    const snapshotBtn = document.getElementById('snapshot-btn');
    if (snapshotBtn) {
      snapshotBtn.innerHTML = `${getIconSvg('camera', 16)} Capture`;
      snapshotBtn.addEventListener('click', () => {
        this.takeSnapshot();
      });
    }
  }

  private renderStyleCards() {
    const dock = document.getElementById('style-dock');
    if (!dock) return;

    dock.innerHTML = '';
    STYLE_DEFINITIONS.forEach((style, index) => {
      const card = document.createElement('div');
      card.className = `style-card ${index === this.currentStyleIndex ? 'active' : ''}`;
      card.dataset.styleId = style.id;

      const tagClass = style.type === 'neural' ? 'tag-neural' : (style.shaderId === 'passthrough' ? 'tag-raw' : 'tag-shader');

      const keyHint = index < 9 ? `[${index + 1}]` : (index === 9 ? '[0]' : '');

      card.innerHTML = `
        <div class="style-card-icon">
          ${getIconSvg(style.icon, 18)}
        </div>
        <div class="style-card-info">
          <span class="style-card-name">${style.name}</span>
          <div class="style-card-meta">
            <span class="style-tag ${tagClass}">${style.badge || style.type}</span>
            ${keyHint ? `<span class="key-hint">${keyHint}</span>` : ''}
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        this.selectStyle(index);
      });

      dock.appendChild(card);
    });
  }

  public async selectStyle(index: number) {
    if (index < 0 || index >= STYLE_DEFINITIONS.length) return;
    this.currentStyleIndex = index;
    const style = STYLE_DEFINITIONS[index];

    // Update active class on cards
    const cards = document.querySelectorAll('.style-card');
    cards.forEach((c, idx) => {
      c.classList.toggle('active', idx === index);
    });

    // Scroll card into view if needed
    const activeCard = cards[index] as HTMLElement;
    if (activeCard) {
      activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    try {
      await this.pipeline.setStyle(style, msg => {
        this.showToast(msg, 2000);
      });
      this.renderParametersPanel();
    } catch (err: any) {
      this.showToast(`Style switch error: ${err.message}`, 4000);
    }
  }

  private renderParametersPanel() {
    const panel = document.getElementById('parameters-panel');
    if (!panel) return;

    const style = STYLE_DEFINITIONS[this.currentStyleIndex];
    const paramEntries = Object.entries(style.params);

    if (paramEntries.length === 0) {
      panel.innerHTML = `
        <div class="panel-header">
          <span>${style.name} Settings</span>
        </div>
        <p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 6px;">No adjustable parameters for this style.</p>
      `;
      return;
    }

    let html = `
      <div class="panel-header">
        <span>${style.name} Settings</span>
      </div>
    `;

    paramEntries.forEach(([key, config]) => {
      html += `
        <div class="slider-group">
          <div class="slider-label-row">
            <span>${config.label}</span>
            <span class="slider-val" id="val-${key}">${config.value}</span>
          </div>
          <input type="range" id="input-${key}" min="${config.min}" max="${config.max}" step="${config.step}" value="${config.value}" />
        </div>
      `;
    });

    panel.innerHTML = html;

    // Attach listeners
    paramEntries.forEach(([key, config]) => {
      const input = document.getElementById(`input-${key}`) as HTMLInputElement;
      const labelVal = document.getElementById(`val-${key}`);
      if (input && labelVal) {
        input.addEventListener('input', () => {
          const numVal = parseFloat(input.value);
          config.value = numVal;
          labelVal.textContent = input.value;
          this.pipeline.updateParam(key, numVal);
        });
      }
    });
  }

  private takeSnapshot() {
    const dataUrl = this.pipeline.captureSnapshot();
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const styleName = STYLE_DEFINITIONS[this.currentStyleIndex].id;
    link.download = `style-cam-${styleName}-${timestamp}.png`;
    link.href = dataUrl;
    link.click();
    this.showToast('Snapshot saved to Downloads!');
  }

  public updateStreamStatus(isStreaming: boolean) {
    const streamToggleBtn = document.getElementById('stream-toggle-btn');
    const btnText = document.getElementById('stream-btn-text');
    const pausedOverlay = document.getElementById('paused-overlay');

    if (isStreaming) {
      streamToggleBtn?.classList.add('active');
      streamToggleBtn?.classList.remove('stopped');
      if (btnText) btnText.textContent = 'Stop Stream';
      if (pausedOverlay) pausedOverlay.style.display = 'none';
    } else {
      streamToggleBtn?.classList.remove('active');
      streamToggleBtn?.classList.add('stopped');
      if (btnText) btnText.textContent = 'Start Stream';
      if (pausedOverlay) pausedOverlay.style.display = 'flex';

      const fpsEl = document.getElementById('stat-fps');
      const latencyEl = document.getElementById('stat-latency');
      if (fpsEl) fpsEl.textContent = '0 fps (Paused)';
      if (latencyEl) latencyEl.textContent = '0 ms';
    }
  }

  private setupKeyboardShortcuts() {
    window.addEventListener('keydown', e => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 1 && num <= 9) {
        this.selectStyle(num - 1);
      } else if (e.key === '0') {
        this.selectStyle(9);
      } else if (e.key === 'ArrowRight') {
        const next = (this.currentStyleIndex + 1) % STYLE_DEFINITIONS.length;
        this.selectStyle(next);
      } else if (e.key === 'ArrowLeft') {
        const prev = (this.currentStyleIndex - 1 + STYLE_DEFINITIONS.length) % STYLE_DEFINITIONS.length;
        this.selectStyle(prev);
      } else if (e.key === 'm' || e.key === 'M') {
        const mirrorBtn = document.getElementById('mirror-btn');
        mirrorBtn?.click();
      } else if (e.key === 'f' || e.key === 'F') {
        const switchCameraBtn = document.getElementById('switch-camera-btn');
        switchCameraBtn?.click();
      } else if (e.key === 's' || e.key === 'S') {
        this.takeSnapshot();
      } else if (e.key === 'p' || e.key === 'P') {
        const toggleParamsBtn = document.getElementById('toggle-params-btn');
        toggleParamsBtn?.click();
      } else if (e.code === 'Space') {
        e.preventDefault();
        const streamToggleBtn = document.getElementById('stream-toggle-btn');
        streamToggleBtn?.click();
      }
    });
  }
}
