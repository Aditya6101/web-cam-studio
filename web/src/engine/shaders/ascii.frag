#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_charSize;   // Character grid size (8.0 to 24.0, default 12.0)
uniform float u_colorMode;  // 0.0 = Matrix Green, 1.0 = Amber CRT, 2.0 = Full Color

float getLuma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

// Procedural glyph rasterizer for normalized [0, 1] character cell
float renderChar(int glyph, vec2 uv) {
    if (glyph == 0) return 0.0; // Space

    // Level 1: '.'
    if (glyph == 1) {
        return float(length(uv - vec2(0.5, 0.2)) < 0.14);
    }
    // Level 2: ':'
    if (glyph == 2) {
        float d1 = length(uv - vec2(0.5, 0.3));
        float d2 = length(uv - vec2(0.5, 0.7));
        return float(d1 < 0.14 || d2 < 0.14);
    }
    // Level 3: '-'
    if (glyph == 3) {
        return float(abs(uv.y - 0.5) < 0.10 && uv.x > 0.2 && uv.x < 0.8);
    }
    // Level 4: '+'
    if (glyph == 4) {
        bool h = abs(uv.y - 0.5) < 0.10 && uv.x > 0.2 && uv.x < 0.8;
        bool v = abs(uv.x - 0.5) < 0.10 && uv.y > 0.2 && uv.y < 0.8;
        return float(h || v);
    }
    // Level 5: '*'
    if (glyph == 5) {
        bool h = abs(uv.y - 0.5) < 0.09 && uv.x > 0.2 && uv.x < 0.8;
        bool v = abs(uv.x - 0.5) < 0.09 && uv.y > 0.2 && uv.y < 0.8;
        vec2 p = uv - vec2(0.5);
        bool d1 = abs(p.x - p.y) < 0.11 && length(p) < 0.42;
        bool d2 = abs(p.x + p.y) < 0.11 && length(p) < 0.42;
        return float(h || v || d1 || d2);
    }
    // Level 6: '#'
    if (glyph == 6) {
        bool h1 = abs(uv.y - 0.35) < 0.09 && uv.x > 0.15 && uv.x < 0.85;
        bool h2 = abs(uv.y - 0.65) < 0.09 && uv.x > 0.15 && uv.x < 0.85;
        bool v1 = abs(uv.x - 0.35) < 0.09 && uv.y > 0.15 && uv.y < 0.85;
        bool v2 = abs(uv.x - 0.65) < 0.09 && uv.y > 0.15 && uv.y < 0.85;
        return float(h1 || h2 || v1 || v2);
    }
    // Level 7: '%'
    if (glyph == 7) {
        bool slash = abs((uv.x + uv.y) - 1.0) < 0.10 && uv.x > 0.15 && uv.x < 0.85;
        bool c1 = length(uv - vec2(0.3, 0.7)) < 0.13;
        bool c2 = length(uv - vec2(0.7, 0.3)) < 0.13;
        return float(slash || c1 || c2);
    }
    // Level 8: '@'
    if (glyph == 8) {
        float r = length(uv - vec2(0.5));
        bool outer = abs(r - 0.36) < 0.09;
        bool inner = length(uv - vec2(0.5)) < 0.16;
        return float(outer || inner);
    }
    return 0.0;
}

void main() {
    float charW = max(u_charSize, 6.0);
    float charH = charW * 1.4; // 1:1.4 aspect ratio for terminal font
    vec2 fragCoord = v_texCoord * u_resolution;

    // Grid coordinates
    vec2 cellIndex = floor(fragCoord / vec2(charW, charH));
    vec2 cellOrigin = cellIndex * vec2(charW, charH);
    vec2 cellCenter = cellOrigin + vec2(charW * 0.5, charH * 0.5);
    vec2 cellCenterUV = cellCenter / u_resolution;

    // Pixel position within cell normalized to [0, 1]
    vec2 cellUV = (fragCoord - cellOrigin) / vec2(charW, charH);

    // Sample video at cell center
    vec3 col = texture(u_texture, cellCenterUV).rgb;
    float luma = clamp(getLuma(col), 0.0, 1.0);

    // Select ASCII glyph level (0 to 8)
    int glyph = int(floor(luma * 8.99));
    float charPixel = renderChar(glyph, cellUV);

    // Scanline effect (darken every alternating row)
    float scanline = 0.85 + 0.15 * sin(fragCoord.y * 3.14159);

    // Determine color
    vec3 charColor;
    if (u_colorMode < 0.5) {
        // Matrix Green phosphor
        charColor = vec3(0.08, 0.95, 0.32);
    } else if (u_colorMode < 1.5) {
        // Amber CRT
        charColor = vec3(1.0, 0.72, 0.12);
    } else {
        // Full Color Video ASCII
        charColor = col * 1.35;
    }

    // Background terminal color (subtle faint green/amber glow)
    vec3 bgColor = vec3(0.02, 0.03, 0.04);
    vec3 finalColor = mix(bgColor, charColor * scanline, charPixel);

    fragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
}
