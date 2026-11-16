import vertexShaderSource from './shaders/vertex.vert?raw';
import passthroughFragSource from './shaders/passthrough.frag?raw';
import legoFragSource from './shaders/lego.frag?raw';
import cartoonFragSource from './shaders/cartoon.frag?raw';
import sketchFragSource from './shaders/sketch.frag?raw';
import pixelFragSource from './shaders/pixel.frag?raw';
import halftoneFragSource from './shaders/halftone.frag?raw';
import oilFragSource from './shaders/oil.frag?raw';
import stainedGlassFragSource from './shaders/stained_glass.frag?raw';
import asciiFragSource from './shaders/ascii.frag?raw';
import watercolorFragSource from './shaders/watercolor.frag?raw';
import glitchFragSource from './shaders/glitch.frag?raw';
import thermalFragSource from './shaders/thermal.frag?raw';

export type ShaderStyleId =
  | 'passthrough'
  | 'lego'
  | 'cartoon'
  | 'sketch'
  | 'pixel'
  | 'halftone'
  | 'oil'
  | 'stained_glass'
  | 'ascii'
  | 'watercolor'
  | 'glitch'
  | 'thermal';

interface ProgramInfo {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

export class WebGLRenderer {
  private gl: WebGL2RenderingContext;
  private programs: Map<ShaderStyleId, ProgramInfo> = new Map();
  private vao: WebGLVertexArrayObject | null = null;
  private texture: WebGLTexture | null = null;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      depth: false,
      antialias: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });

    if (!gl) {
      throw new Error('WebGL2 is not supported in this browser.');
    }
    this.gl = gl;
    this.initGeometry();
    this.initTexture();
    this.initPrograms();
  }

  private createShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type);
    if (!shader) {
      throw new Error('Failed to create shader');
    }
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const info = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error(`Shader compile error: ${info}`);
    }
    return shader;
  }

  private createProgram(vertSrc: string, fragSrc: string): WebGLProgram {
    const vertShader = this.createShader(this.gl.VERTEX_SHADER, vertSrc);
    const fragShader = this.createShader(this.gl.FRAGMENT_SHADER, fragSrc);

    const program = this.gl.createProgram();
    if (!program) {
      throw new Error('Failed to create program');
    }
    this.gl.attachShader(program, vertShader);
    this.gl.attachShader(program, fragShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const info = this.gl.getProgramInfoLog(program);
      this.gl.deleteProgram(program);
      throw new Error(`Program link error: ${info}`);
    }

    this.gl.deleteShader(vertShader);
    this.gl.deleteShader(fragShader);
    return program;
  }

  private initGeometry() {
    const gl = this.gl;
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    // Quad geometry: positions (x, y) and UVs (u, v)
    // 2 triangles strip: [-1,-1], [1,-1], [-1,1], [1,1]
    const vertices = new Float32Array([
      // pos.x, pos.y, uv.x, uv.y
      -1.0, -1.0, 0.0, 1.0,
       1.0, -1.0, 1.0, 1.0,
      -1.0,  1.0, 0.0, 0.0,
       1.0,  1.0, 1.0, 0.0,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Attribute 0: position
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);

    // Attribute 1: texCoord
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

    gl.bindVertexArray(null);
  }

  private initTexture() {
    const gl = this.gl;
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  private initPrograms() {
    const shaderMap: Record<ShaderStyleId, string> = {
      passthrough: passthroughFragSource,
      lego: legoFragSource,
      cartoon: cartoonFragSource,
      sketch: sketchFragSource,
      pixel: pixelFragSource,
      halftone: halftoneFragSource,
      oil: oilFragSource,
      stained_glass: stainedGlassFragSource,
      ascii: asciiFragSource,
      watercolor: watercolorFragSource,
      glitch: glitchFragSource,
      thermal: thermalFragSource
    };

    for (const [key, fragSrc] of Object.entries(shaderMap)) {
      const styleId = key as ShaderStyleId;
      const program = this.createProgram(vertexShaderSource, fragSrc);
      
      this.gl.useProgram(program);
      const uniforms: Record<string, WebGLUniformLocation | null> = {
        u_texture: this.gl.getUniformLocation(program, 'u_texture'),
        u_resolution: this.gl.getUniformLocation(program, 'u_resolution'),
        u_mirror: this.gl.getUniformLocation(program, 'u_mirror'),
        u_time: this.gl.getUniformLocation(program, 'u_time'),
        // Lego
        u_brickSize: this.gl.getUniformLocation(program, 'u_brickSize'),
        u_studStrength: this.gl.getUniformLocation(program, 'u_studStrength'),
        u_paletteSnap: this.gl.getUniformLocation(program, 'u_paletteSnap'),
        // Cartoon
        u_edgeSensitivity: this.gl.getUniformLocation(program, 'u_edgeSensitivity'),
        u_colorBands: this.gl.getUniformLocation(program, 'u_colorBands'),
        u_saturation: this.gl.getUniformLocation(program, 'u_saturation'),
        // Sketch
        u_strokeIntensity: this.gl.getUniformLocation(program, 'u_strokeIntensity'),
        u_hatchDensity: this.gl.getUniformLocation(program, 'u_hatchDensity'),
        // Pixel
        u_pixelSize: this.gl.getUniformLocation(program, 'u_pixelSize'),
        u_ditherAmount: this.gl.getUniformLocation(program, 'u_ditherAmount'),
        // Halftone
        u_dotSize: this.gl.getUniformLocation(program, 'u_dotSize'),
        // Oil Painting
        u_radius: this.gl.getUniformLocation(program, 'u_radius'),
        u_paintLevels: this.gl.getUniformLocation(program, 'u_paintLevels'),
        // Stained Glass
        u_facetSize: this.gl.getUniformLocation(program, 'u_facetSize'),
        u_leadWidth: this.gl.getUniformLocation(program, 'u_leadWidth'),
        u_glassLight: this.gl.getUniformLocation(program, 'u_glassLight'),
        // ASCII
        u_charSize: this.gl.getUniformLocation(program, 'u_charSize'),
        u_colorMode: this.gl.getUniformLocation(program, 'u_colorMode'),
        // Watercolor
        u_bleed: this.gl.getUniformLocation(program, 'u_bleed'),
        u_edgeDeposition: this.gl.getUniformLocation(program, 'u_edgeDeposition'),
        u_paperGrain: this.gl.getUniformLocation(program, 'u_paperGrain'),
        // Glitch
        u_glitchIntensity: this.gl.getUniformLocation(program, 'u_glitchIntensity'),
        u_chromaOffset: this.gl.getUniformLocation(program, 'u_chromaOffset'),
        u_scanlines: this.gl.getUniformLocation(program, 'u_scanlines'),
        // Thermal
        u_paletteMode: this.gl.getUniformLocation(program, 'u_paletteMode'),
        u_thermalContrast: this.gl.getUniformLocation(program, 'u_thermalContrast'),
        u_noiseAmount: this.gl.getUniformLocation(program, 'u_noiseAmount')
      };

      if (uniforms.u_texture) {
        this.gl.uniform1i(uniforms.u_texture, 0);
      }

      this.programs.set(styleId, { program, uniforms });
    }
  }

  public render(
    source: TexImageSource,
    style: ShaderStyleId,
    params: Record<string, number>,
    mirror: boolean
  ) {
    const gl = this.gl;
    const progInfo = this.programs.get(style);
    if (!progInfo) return;

    // Resize viewport if canvas dimensions changed
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    // Upload video frame to texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

    // Use current style program
    gl.useProgram(progInfo.program);

    // Common uniforms
    if (progInfo.uniforms.u_resolution) {
      gl.uniform2f(progInfo.uniforms.u_resolution, this.canvas.width, this.canvas.height);
    }
    if (progInfo.uniforms.u_mirror) {
      gl.uniform1f(progInfo.uniforms.u_mirror, mirror ? 1.0 : 0.0);
    }
    if (progInfo.uniforms.u_time) {
      gl.uniform1f(progInfo.uniforms.u_time, performance.now() / 1000.0);
    }

    // Set style-specific uniforms if defined
    for (const [paramName, value] of Object.entries(params)) {
      const loc = progInfo.uniforms[paramName];
      if (loc) {
        gl.uniform1f(loc, value);
      }
    }

    // Draw full-screen quad
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  public destroy() {
    const gl = this.gl;
    for (const { program } of this.programs.values()) {
      gl.deleteProgram(program);
    }
    if (this.texture) gl.deleteTexture(this.texture);
    if (this.vao) gl.deleteVertexArray(this.vao);
  }
}
