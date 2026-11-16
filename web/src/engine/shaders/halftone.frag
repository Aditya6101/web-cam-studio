#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_dotSize; // e.g. 8.0 to 24.0

float getLuma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

void main() {
    float dotSize = max(u_dotSize, 4.0);
    vec2 fragCoord = v_texCoord * u_resolution;

    // Grid center
    vec2 cellOrigin = floor(fragCoord / dotSize) * dotSize;
    vec2 cellCenter = cellOrigin + vec2(dotSize * 0.5);
    vec2 cellUV = cellCenter / u_resolution;

    vec3 sampleCol = texture(u_texture, cellUV).rgb;
    float luma = getLuma(sampleCol);

    // Radius proportional to brightness
    float radius = (dotSize * 0.5) * sqrt(luma);
    float dist = length(fragCoord - cellCenter);

    // Smooth circular dot edge
    float circle = 1.0 - smoothstep(radius - 0.75, radius + 0.75, dist);

    // Retro amber/green CRT phosphor or vibrant print colors
    vec3 dotColor = sampleCol * 1.25;
    vec3 bgColor = vec3(0.06, 0.07, 0.09); // Dark background

    vec3 finalColor = mix(bgColor, dotColor, circle);

    fragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
}
