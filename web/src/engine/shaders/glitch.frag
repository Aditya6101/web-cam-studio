#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_glitchIntensity; // Tape tearing & jitter (0.0 to 2.0, default 0.8)
uniform float u_chromaOffset;    // RGB separation in pixels (1.0 to 18.0, default 6.0)
uniform float u_scanlines;       // Scanline visibility (0.0 to 1.0, default 0.4)

// Pseudo-random hash
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
    vec2 uv = v_texCoord;
    vec2 texel = 1.0 / u_resolution;

    // Horizontal slice tearing / VHS tracking jump
    float sliceY = floor(uv.y * 32.0);
    float sliceNoise = hash(vec2(sliceY, floor(u_time * 8.0)));
    
    float shift = 0.0;
    if (sliceNoise > (1.0 - 0.25 * u_glitchIntensity)) {
        shift = (hash(vec2(sliceY, u_time)) - 0.5) * 0.04 * u_glitchIntensity;
    }

    // Micro jitter
    shift += (hash(vec2(uv.y, u_time)) - 0.5) * 0.003 * u_glitchIntensity;
    vec2 glitchUV = uv + vec2(shift, 0.0);

    // Chromatic aberration (RGB splitting)
    float offset = u_chromaOffset * texel.x;
    float r = texture(u_texture, glitchUV + vec2(offset, 0.0)).r;
    float g = texture(u_texture, glitchUV).g;
    float b = texture(u_texture, glitchUV - vec2(offset, 0.0)).b;

    vec3 col = vec3(r, g, b);

    // Cyberpunk color grading (boost contrast + neon cyan/magenta shadows)
    col = pow(col, vec3(1.15));
    col.r = mix(col.r, 1.0 - col.r * 0.2, 0.08);
    col.b *= 1.15;

    // CRT scanlines
    float scanline = 1.0 - (sin(uv.y * u_resolution.y * 3.14159) * 0.5 + 0.5) * (0.28 * u_scanlines);
    col *= scanline;

    // Analog tape static noise
    float staticNoise = (hash(uv * u_resolution + vec2(u_time * 123.45)) - 0.5) * 0.06;
    col += vec3(staticNoise);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
