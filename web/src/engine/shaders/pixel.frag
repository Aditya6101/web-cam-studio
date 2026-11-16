#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_pixelSize;   // e.g. 6.0 to 16.0
uniform float u_ditherAmount;// e.g. 0.0 to 1.0

// 4x4 Bayer Dither Matrix normalized to [-0.5, 0.5]
float getBayer4x4(vec2 coord) {
    int x = int(mod(coord.x, 4.0));
    int y = int(mod(coord.y, 4.0));
    
    // Flattened 4x4 table values (0..15) / 16.0 - 0.5
    int index = x + y * 4;
    float d = 0.0;
    if (index == 0) d = 0.0;
    else if (index == 1) d = 8.0;
    else if (index == 2) d = 2.0;
    else if (index == 3) d = 10.0;
    else if (index == 4) d = 12.0;
    else if (index == 5) d = 4.0;
    else if (index == 6) d = 14.0;
    else if (index == 7) d = 6.0;
    else if (index == 8) d = 3.0;
    else if (index == 9) d = 11.0;
    else if (index == 10) d = 1.0;
    else if (index == 11) d = 9.0;
    else if (index == 12) d = 15.0;
    else if (index == 13) d = 7.0;
    else if (index == 14) d = 13.0;
    else if (index == 15) d = 5.0;
    
    return (d / 16.0) - 0.5;
}

void main() {
    float pixelSize = max(u_pixelSize, 2.0);
    vec2 fragCoord = v_texCoord * u_resolution;

    // Grid downsample
    vec2 blockCoord = floor(fragCoord / pixelSize) * pixelSize + vec2(pixelSize * 0.5);
    vec2 blockUV = blockCoord / u_resolution;

    vec3 col = texture(u_texture, blockUV).rgb;

    // Apply Bayer Dither based on screen-space block index
    vec2 blockIndex = floor(fragCoord / pixelSize);
    float dither = getBayer4x4(blockIndex) * (0.25 * u_ditherAmount);
    
    col += vec3(dither);

    // Quantize to 6 color levels per channel (like classic 16/32-bit hardware)
    float steps = 5.0;
    col = floor(col * steps + 0.5) / steps;

    // Pixel grid outline (CRT / retro LCD scanline effect)
    vec2 pInBlock = fract(fragCoord / pixelSize);
    float gridShade = 1.0;
    if (pixelSize >= 6.0) {
        if (pInBlock.x < 0.08 || pInBlock.y < 0.08) {
            gridShade = 0.82;
        }
    }

    fragColor = vec4(clamp(col * gridShade, 0.0, 1.0), 1.0);
}
