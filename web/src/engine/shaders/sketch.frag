#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_strokeIntensity; // e.g. 1.0 to 2.5
uniform float u_hatchDensity;    // e.g. 6.0 to 16.0

float getLuma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

// Pseudo paper grain noise
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
    vec2 texel = 1.0 / u_resolution;
    vec2 fragCoord = v_texCoord * u_resolution;

    // Sobel edge detection for main contours
    float l00 = getLuma(texture(u_texture, v_texCoord + vec2(-1.0, -1.0) * texel).rgb);
    float l01 = getLuma(texture(u_texture, v_texCoord + vec2( 0.0, -1.0) * texel).rgb);
    float l02 = getLuma(texture(u_texture, v_texCoord + vec2( 1.0, -1.0) * texel).rgb);
    float l10 = getLuma(texture(u_texture, v_texCoord + vec2(-1.0,  0.0) * texel).rgb);
    float l11 = getLuma(texture(u_texture, v_texCoord).rgb);
    float l12 = getLuma(texture(u_texture, v_texCoord + vec2( 1.0,  0.0) * texel).rgb);
    float l20 = getLuma(texture(u_texture, v_texCoord + vec2(-1.0,  1.0) * texel).rgb);
    float l21 = getLuma(texture(u_texture, v_texCoord + vec2( 0.0,  1.0) * texel).rgb);
    float l22 = getLuma(texture(u_texture, v_texCoord + vec2( 1.0,  1.0) * texel).rgb);

    float gx = (l02 + 2.0 * l12 + l22) - (l00 + 2.0 * l10 + l20);
    float gy = (l20 + 2.0 * l21 + l22) - (l00 + 2.0 * l01 + l02);
    float edge = clamp(sqrt(gx * gx + gy * gy) * u_strokeIntensity * 2.5, 0.0, 1.0);

    // Cross-hatching for dark tonal values
    float hatch = 1.0;
    float density = max(u_hatchDensity, 4.0);
    
    // Diagonal hatching 1: 45 degrees
    float d1 = mod(fragCoord.x + fragCoord.y, density);
    // Diagonal hatching 2: -45 degrees
    float d2 = mod(fragCoord.x - fragCoord.y, density);
    // Vertical hatching
    float d3 = mod(fragCoord.x, density * 0.75);

    if (l11 < 0.65) {
        if (d1 < 1.2) hatch *= 0.65;
    }
    if (l11 < 0.45) {
        if (d2 < 1.2) hatch *= 0.60;
    }
    if (l11 < 0.25) {
        if (d3 < 1.2) hatch *= 0.50;
    }

    // Combine pencil contour line with tonal shading
    float graphite = (1.0 - edge) * hatch * (0.35 + 0.65 * l11);
    
    // Paper texture grain
    float grain = (hash(fragCoord) - 0.5) * 0.04;
    
    // Off-white sketchbook paper tone
    vec3 paperTone = vec3(0.96, 0.94, 0.90) + grain;
    vec3 pencilColor = vec3(0.12, 0.12, 0.14); // Graphite grey
    
    vec3 finalColor = mix(pencilColor, paperTone, clamp(graphite, 0.0, 1.0));

    fragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
}
