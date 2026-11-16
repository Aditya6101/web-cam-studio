#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_radius;       // Brush radius (2.0 to 7.0, default 4.0)
uniform float u_paintLevels;  // Color quantization (4.0 to 16.0, default 8.0)

// Relative luminance
float getLuma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

// 4-Sector Kuwahara Filter for painterly oil brush stroke simulation
void main() {
    vec2 srcTexel = 1.0 / u_resolution;
    int radius = int(clamp(u_radius, 2.0, 6.0));
    
    // 4 quadrants: m = mean color, s = variance (squared sum)
    vec3 m[4];
    vec3 s[4];
    
    for (int k = 0; k < 4; ++k) {
        m[k] = vec3(0.0);
        s[k] = vec3(0.0);
    }

    float n = float((radius + 1) * (radius + 1));

    // Quadrant 0: Top-Left [-radius, 0] x [-radius, 0]
    for (int j = -radius; j <= 0; ++j) {
        for (int i = -radius; i <= 0; ++i) {
            vec3 c = texture(u_texture, v_texCoord + vec2(float(i), float(j)) * srcTexel).rgb;
            m[0] += c;
            s[0] += c * c;
        }
    }

    // Quadrant 1: Top-Right [0, radius] x [-radius, 0]
    for (int j = -radius; j <= 0; ++j) {
        for (int i = 0; i <= radius; ++i) {
            vec3 c = texture(u_texture, v_texCoord + vec2(float(i), float(j)) * srcTexel).rgb;
            m[1] += c;
            s[1] += c * c;
        }
    }

    // Quadrant 2: Bottom-Right [0, radius] x [0, radius]
    for (int j = 0; j <= radius; ++j) {
        for (int i = 0; i <= radius; ++i) {
            vec3 c = texture(u_texture, v_texCoord + vec2(float(i), float(j)) * srcTexel).rgb;
            m[2] += c;
            s[2] += c * c;
        }
    }

    // Quadrant 3: Bottom-Left [-radius, 0] x [0, radius]
    for (int j = 0; j <= radius; ++j) {
        for (int i = -radius; i <= 0; ++i) {
            vec3 c = texture(u_texture, v_texCoord + vec2(float(i), float(j)) * srcTexel).rgb;
            m[3] += c;
            s[3] += c * c;
        }
    }

    // Find quadrant with minimum variance
    float minVar = 1e6;
    vec3 finalColor = texture(u_texture, v_texCoord).rgb;

    for (int k = 0; k < 4; ++k) {
        m[k] /= n;
        s[k] = abs(s[k] / n - m[k] * m[k]);
        float sigma = s[k].r + s[k].g + s[k].b;
        if (sigma < minVar) {
            minVar = sigma;
            finalColor = m[k];
        }
    }

    // Oil paint canvas texture & subtle color quantization
    float levels = max(u_paintLevels, 3.0);
    finalColor = floor(finalColor * levels + 0.5) / levels;

    // Subtle impasto canvas relief based on variance
    float relief = 1.0 + (minVar - 0.05) * 0.4;
    finalColor *= clamp(relief, 0.9, 1.15);

    fragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
}
