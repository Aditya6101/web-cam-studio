#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_paletteMode;     // 0 = Ironbow (Heatmap), 1 = Night Vision (Green), 2 = Rainbow
uniform float u_thermalContrast; // Contrast (0.5 to 2.5, default 1.3)
uniform float u_noiseAmount;     // Sensor noise (0.0 to 1.0, default 0.25)

float getLuma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

// Pseudo noise
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Scientific FLIR Ironbow color gradient (Dark Purple -> Violet -> Orange -> Yellow -> White Hot)
vec3 getIronbow(float t) {
    vec3 c0 = vec3(0.04, 0.02, 0.22); // Deep navy purple
    vec3 c1 = vec3(0.52, 0.05, 0.52); // Violet magenta
    vec3 c2 = vec3(0.90, 0.22, 0.05); // Flame red
    vec3 c3 = vec3(0.98, 0.82, 0.10); // Bright amber yellow
    vec3 c4 = vec3(1.00, 1.00, 0.98); // White hot

    if (t < 0.25) {
        return mix(c0, c1, t / 0.25);
    } else if (t < 0.55) {
        return mix(c1, c2, (t - 0.25) / 0.30);
    } else if (t < 0.85) {
        return mix(c2, c3, (t - 0.55) / 0.30);
    } else {
        return mix(c3, c4, (t - 0.85) / 0.15);
    }
}

// Military Gen-3 Night Vision Green Phosphor
vec3 getNightVision(float t, vec2 uv) {
    // Optical vignette (lens falloff)
    vec2 p = uv - vec2(0.5);
    float vignette = clamp(1.0 - dot(p, p) * 1.3, 0.0, 1.0);

    // Phosphor green spectrum
    vec3 phosphor = vec3(0.12, 0.98, 0.28);
    vec3 highlight = vec3(0.75, 1.00, 0.70);

    vec3 col = mix(phosphor * t * 1.4, highlight, smoothstep(0.75, 1.0, t));
    return col * vignette;
}

// Classic Rainbow Heatmap (Blue -> Cyan -> Green -> Yellow -> Red)
vec3 getRainbow(float t) {
    float r = clamp(1.5 - abs(t * 4.0 - 3.0), 0.0, 1.0);
    float g = clamp(1.5 - abs(t * 4.0 - 2.0), 0.0, 1.0);
    float b = clamp(1.5 - abs(t * 4.0 - 1.0), 0.0, 1.0);
    return vec3(r, g, b);
}

void main() {
    vec3 source = texture(u_texture, v_texCoord).rgb;
    float luma = getLuma(source);

    // Apply contrast
    float temp = clamp(pow(luma, u_thermalContrast), 0.0, 1.0);

    vec3 color;
    if (u_paletteMode < 0.5) {
        color = getIronbow(temp);
    } else if (u_paletteMode < 1.5) {
        color = getNightVision(temp, v_texCoord);
    } else {
        color = getRainbow(temp);
    }

    // High-ISO thermal sensor grain
    float noise = (hash(v_texCoord * u_resolution + vec2(u_time * 87.65)) - 0.5) * (0.12 * u_noiseAmount);
    color += vec3(noise);

    fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
