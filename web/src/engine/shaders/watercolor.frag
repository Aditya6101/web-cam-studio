#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_bleed;          // Pigment bleed / turbulence (0.2 to 2.0, default 1.0)
uniform float u_edgeDeposition; // Edge pigment pooling (0.5 to 2.5, default 1.3)
uniform float u_paperGrain;     // Paper tooth grain (0.0 to 1.0, default 0.4)

float getLuma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

// Pseudo noise
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// Simple smooth noise for water turbulence
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
    vec2 texel = 1.0 / u_resolution;
    vec2 fragCoord = v_texCoord * u_resolution;

    // Water flow turbulence (warping UVs)
    vec2 flowOffset;
    flowOffset.x = noise(fragCoord * 0.02) - 0.5;
    flowOffset.y = noise(fragCoord * 0.02 + vec2(43.12, 17.89)) - 0.5;
    vec2 warpedUV = v_texCoord + flowOffset * (texel * 14.0 * u_bleed);

    // Multi-sample pigment bleeding
    vec3 cCenter = texture(u_texture, warpedUV).rgb;
    vec3 cN = texture(u_texture, warpedUV + vec2(0.0, 3.0) * texel).rgb;
    vec3 cS = texture(u_texture, warpedUV + vec2(0.0, -3.0) * texel).rgb;
    vec3 cE = texture(u_texture, warpedUV + vec2(3.0, 0.0) * texel).rgb;
    vec3 cW = texture(u_texture, warpedUV + vec2(-3.0, 0.0) * texel).rgb;

    vec3 blended = (cCenter * 3.0 + cN + cS + cE + cW) / 7.0;

    // Sobel edge detection for pigment deposition on dried paint edges
    float l00 = getLuma(texture(u_texture, warpedUV + vec2(-2.0, -2.0) * texel).rgb);
    float l02 = getLuma(texture(u_texture, warpedUV + vec2( 2.0, -2.0) * texel).rgb);
    float l20 = getLuma(texture(u_texture, warpedUV + vec2(-2.0,  2.0) * texel).rgb);
    float l22 = getLuma(texture(u_texture, warpedUV + vec2( 2.0,  2.0) * texel).rgb);
    float edge = sqrt((l02 - l20) * (l02 - l20) + (l22 - l00) * (l22 - l00));

    // Pigment pooling: darken contours
    float pooling = 1.0 - smoothstep(0.05, 0.25, edge) * (0.35 * u_edgeDeposition);

    // Boost pigment translucency and vibrance
    float luma = getLuma(blended);
    blended = mix(vec3(luma), blended, 1.35) * pooling;

    // Cold-press watercolor paper grain texture
    float grain = (hash(fragCoord) - 0.5) * (0.12 * u_paperGrain);
    vec3 paperTint = vec3(0.98, 0.97, 0.94) + grain;

    // Blend watercolor wash with paper
    vec3 finalColor = mix(paperTint, blended, 0.88);

    fragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
}
