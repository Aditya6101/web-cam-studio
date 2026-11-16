#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_edgeSensitivity; // e.g. 0.25 to 1.5
uniform float u_colorBands;       // e.g. 4.0 to 10.0
uniform float u_saturation;       // e.g. 1.25

// Relative luminance
float getLuma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

// Adjust saturation
vec3 adjustSaturation(vec3 color, float sat) {
    float luma = getLuma(color);
    return mix(vec3(luma), color, sat);
}

void main() {
    vec2 texel = 1.0 / u_resolution;
    
    // Sample 3x3 neighborhood for edge detection & smoothing
    vec3 c00 = texture(u_texture, v_texCoord + vec2(-1.0, -1.0) * texel).rgb;
    vec3 c01 = texture(u_texture, v_texCoord + vec2( 0.0, -1.0) * texel).rgb;
    vec3 c02 = texture(u_texture, v_texCoord + vec2( 1.0, -1.0) * texel).rgb;
    vec3 c10 = texture(u_texture, v_texCoord + vec2(-1.0,  0.0) * texel).rgb;
    vec3 c11 = texture(u_texture, v_texCoord).rgb;
    vec3 c12 = texture(u_texture, v_texCoord + vec2( 1.0,  0.0) * texel).rgb;
    vec3 c20 = texture(u_texture, v_texCoord + vec2(-1.0,  1.0) * texel).rgb;
    vec3 c21 = texture(u_texture, v_texCoord + vec2( 0.0,  1.0) * texel).rgb;
    vec3 c22 = texture(u_texture, v_texCoord + vec2( 1.0,  1.0) * texel).rgb;

    // Luminance values
    float l00 = getLuma(c00);
    float l01 = getLuma(c01);
    float l02 = getLuma(c02);
    float l10 = getLuma(c10);
    float l12 = getLuma(c12);
    float l20 = getLuma(c20);
    float l21 = getLuma(c21);
    float l22 = getLuma(c22);

    // Sobel operator for edge gradient
    float gx = (l02 + 2.0 * l12 + l22) - (l00 + 2.0 * l10 + l20);
    float gy = (l20 + 2.0 * l21 + l22) - (l00 + 2.0 * l01 + l02);
    float edge = sqrt(gx * gx + gy * gy) * u_edgeSensitivity;

    // Color smoothing: average neighboring pixels to reduce noise
    vec3 smoothCol = (c00 + c01 + c02 + c10 + c11 * 4.0 + c12 + c20 + c21 + c22) / 12.0;
    
    // Saturation boost
    smoothCol = adjustSaturation(smoothCol, u_saturation);

    // Quantize color into discrete bands
    float bands = max(u_colorBands, 2.0);
    vec3 quantized = floor(smoothCol * bands + 0.5) / bands;

    // Apply ink outline
    float edgeFactor = 1.0 - smoothstep(0.18, 0.45, edge);
    
    // Ink outlines can have a slight dark blue/charcoal tint instead of pure black for a comic book look
    vec3 inkColor = vec3(0.04, 0.05, 0.08);
    vec3 finalColor = mix(inkColor, quantized, edgeFactor);

    fragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
}
