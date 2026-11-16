import type { StyleConfig } from '../engine/pipeline';

export const STYLE_DEFINITIONS: StyleConfig[] = [
  {
    id: 'passthrough',
    name: 'Normal',
    type: 'shader',
    shaderId: 'passthrough',
    icon: 'camera',
    badge: 'Raw',
    params: {}
  },
  {
    id: 'lego',
    name: 'Lego Mosaic',
    type: 'shader',
    shaderId: 'lego',
    icon: 'blocks',
    badge: '60 FPS',
    params: {
      u_brickSize: {
        label: 'Brick Size',
        min: 8,
        max: 40,
        step: 2,
        default: 18,
        value: 18
      },
      u_studStrength: {
        label: 'Stud 3D Depth',
        min: 0.0,
        max: 2.0,
        step: 0.1,
        default: 1.0,
        value: 1.0
      },
      u_paletteSnap: {
        label: 'Lego Color Snap',
        min: 0,
        max: 1,
        step: 1,
        default: 1,
        value: 1
      }
    }
  },
  {
    id: 'cartoon',
    name: 'Anime Cel',
    type: 'shader',
    shaderId: 'cartoon',
    icon: 'palette',
    badge: '60 FPS',
    params: {
      u_edgeSensitivity: {
        label: 'Outline Strength',
        min: 0.2,
        max: 2.0,
        step: 0.1,
        default: 0.7,
        value: 0.7
      },
      u_colorBands: {
        label: 'Color Bands',
        min: 3,
        max: 12,
        step: 1,
        default: 5,
        value: 5
      },
      u_saturation: {
        label: 'Vibrance',
        min: 0.8,
        max: 2.0,
        step: 0.1,
        default: 1.3,
        value: 1.3
      }
    }
  },
  {
    id: 'oil',
    name: 'Oil Painting',
    type: 'shader',
    shaderId: 'oil',
    icon: 'brush',
    badge: '60 FPS',
    params: {
      u_radius: {
        label: 'Brush Radius',
        min: 2,
        max: 6,
        step: 1,
        default: 4,
        value: 4
      },
      u_paintLevels: {
        label: 'Palette Posterize',
        min: 4,
        max: 16,
        step: 1,
        default: 8,
        value: 8
      }
    }
  },
  {
    id: 'stained_glass',
    name: 'Stained Glass',
    type: 'shader',
    shaderId: 'stained_glass',
    icon: 'glass',
    badge: '60 FPS',
    params: {
      u_facetSize: {
        label: 'Glass Shard Size',
        min: 15,
        max: 55,
        step: 2,
        default: 28,
        value: 28
      },
      u_leadWidth: {
        label: 'Lead Solder Width',
        min: 0.03,
        max: 0.14,
        step: 0.01,
        default: 0.06,
        value: 0.06
      },
      u_glassLight: {
        label: 'Sun Sheen',
        min: 0.5,
        max: 2.0,
        step: 0.1,
        default: 1.2,
        value: 1.2
      }
    }
  },
  {
    id: 'ascii',
    name: 'Matrix ASCII',
    type: 'shader',
    shaderId: 'ascii',
    icon: 'terminal',
    badge: '60 FPS',
    params: {
      u_charSize: {
        label: 'Character Size',
        min: 8,
        max: 22,
        step: 2,
        default: 12,
        value: 12
      },
      u_colorMode: {
        label: 'Color (0:Green, 1:Amber, 2:Color)',
        min: 0,
        max: 2,
        step: 1,
        default: 0,
        value: 0
      }
    }
  },
  {
    id: 'watercolor',
    name: 'Watercolor',
    type: 'shader',
    shaderId: 'watercolor',
    icon: 'droplet',
    badge: '60 FPS',
    params: {
      u_bleed: {
        label: 'Water Bleed',
        min: 0.2,
        max: 2.0,
        step: 0.1,
        default: 1.0,
        value: 1.0
      },
      u_edgeDeposition: {
        label: 'Edge Pigment Pooling',
        min: 0.5,
        max: 2.2,
        step: 0.1,
        default: 1.3,
        value: 1.3
      },
      u_paperGrain: {
        label: 'Paper Tooth Grain',
        min: 0.0,
        max: 1.0,
        step: 0.1,
        default: 0.4,
        value: 0.4
      }
    }
  },
  {
    id: 'glitch',
    name: 'Cyberpunk VHS',
    type: 'shader',
    shaderId: 'glitch',
    icon: 'zap',
    badge: '60 FPS',
    params: {
      u_glitchIntensity: {
        label: 'Tape Tearing Jitter',
        min: 0.0,
        max: 2.0,
        step: 0.1,
        default: 0.8,
        value: 0.8
      },
      u_chromaOffset: {
        label: 'RGB Split Offset',
        min: 1.0,
        max: 16.0,
        step: 1.0,
        default: 6.0,
        value: 6.0
      },
      u_scanlines: {
        label: 'CRT Scanlines',
        min: 0.0,
        max: 1.0,
        step: 0.1,
        default: 0.5,
        value: 0.5
      }
    }
  },
  {
    id: 'thermal',
    name: 'Thermal & NV',
    type: 'shader',
    shaderId: 'thermal',
    icon: 'flame',
    badge: '60 FPS',
    params: {
      u_paletteMode: {
        label: 'Mode (0:Ironbow, 1:NV Green, 2:Rainbow)',
        min: 0,
        max: 2,
        step: 1,
        default: 0,
        value: 0
      },
      u_thermalContrast: {
        label: 'Thermal Sensitivity',
        min: 0.6,
        max: 2.5,
        step: 0.1,
        default: 1.3,
        value: 1.3
      },
      u_noiseAmount: {
        label: 'Sensor Grain',
        min: 0.0,
        max: 1.0,
        step: 0.05,
        default: 0.25,
        value: 0.25
      }
    }
  },
  {
    id: 'sketch',
    name: 'Pencil Sketch',
    type: 'shader',
    shaderId: 'sketch',
    icon: 'edit-3',
    badge: '60 FPS',
    params: {
      u_strokeIntensity: {
        label: 'Graphite Stroke',
        min: 0.5,
        max: 2.5,
        step: 0.1,
        default: 1.2,
        value: 1.2
      },
      u_hatchDensity: {
        label: 'Hatch Density',
        min: 4,
        max: 20,
        step: 1,
        default: 8,
        value: 8
      }
    }
  },
  {
    id: 'pixel',
    name: 'Retro 8-Bit',
    type: 'shader',
    shaderId: 'pixel',
    icon: 'grid',
    badge: '60 FPS',
    params: {
      u_pixelSize: {
        label: 'Pixel Size',
        min: 4,
        max: 28,
        step: 2,
        default: 10,
        value: 10
      },
      u_ditherAmount: {
        label: 'Bayer Dither',
        min: 0.0,
        max: 1.5,
        step: 0.1,
        default: 0.8,
        value: 0.8
      }
    }
  },
  {
    id: 'halftone',
    name: 'Pop Halftone',
    type: 'shader',
    shaderId: 'halftone',
    icon: 'disc',
    badge: '60 FPS',
    params: {
      u_dotSize: {
        label: 'Dot Matrix Size',
        min: 6,
        max: 32,
        step: 2,
        default: 12,
        value: 12
      }
    }
  },
  {
    id: 'animegan_hayao',
    name: 'Ghibli (Hayao)',
    type: 'neural',
    neuralModelId: 'animegan_hayao',
    icon: 'sparkles',
    badge: 'Neural',
    params: {}
  },
  {
    id: 'animegan_paprika',
    name: 'Paprika',
    type: 'neural',
    neuralModelId: 'animegan_paprika',
    icon: 'film',
    badge: 'Neural',
    params: {}
  },
  {
    id: 'animegan_facepaint',
    name: 'Face Paint',
    type: 'neural',
    neuralModelId: 'animegan_facepaint',
    icon: 'smile',
    badge: 'Neural',
    params: {}
  }
];
