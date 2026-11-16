#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_facetSize;  // Glass shard size (15.0 to 60.0, default 30.0)
uniform float u_leadWidth;  // Lead border width (0.02 to 0.15, default 0.06)
uniform float u_glassLight; // Sun transmission / bevel highlight (0.5 to 2.0, default 1.2)

// Pseudo-random 2D hash
vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453123);
}

void main() {
    float scale = max(u_facetSize, 12.0);
    vec2 pixelCoord = v_texCoord * u_resolution;
    vec2 p = pixelCoord / scale;

    vec2 n = floor(p);
    vec2 f = fract(p);

    // Voronoi F1 and F2 distance calculation
    float md1 = 8.0;
    float md2 = 8.0;
    vec2 seed1 = vec2(0.0);
    vec2 seed2 = vec2(0.0);

    for (int j = -1; j <= 1; ++j) {
        for (int i = -1; i <= 1; ++i) {
            vec2 g = vec2(float(i), float(j));
            vec2 o = hash2(n + g);
            // Jittered feature point inside grid cell
            vec2 point = g + o;
            vec2 r = point - f;
            float d = dot(r, r);

            if (d < md1) {
                md2 = md1;
                seed2 = seed1;
                md1 = d;
                seed1 = n + point;
            } else if (d < md2) {
                md2 = d;
                seed2 = n + point;
            }
        }
    }

    md1 = sqrt(md1);
    md2 = sqrt(md2);

    // Distance to edge between nearest and second-nearest seeds
    float edgeDist = md2 - md1;
    float leadThickness = clamp(u_leadWidth, 0.02, 0.18);

    // Sample color at the center of the glass shard
    vec2 sampleUV = (seed1 * scale) / u_resolution;
    sampleUV = clamp(sampleUV, 0.0, 1.0);
    vec3 glassColor = texture(u_texture, sampleUV).rgb;

    // Enhance vibrance for stained glass look (like cathedral glass)
    float luma = dot(glassColor, vec3(0.299, 0.587, 0.114));
    glassColor = mix(vec3(luma), glassColor, 1.4);

    // Facet bevel lighting: gradient from shard center
    vec2 toCenter = (seed1 * scale - pixelCoord) / scale;
    vec3 normal = normalize(vec3(toCenter, 0.7));
    vec3 lightDir = normalize(vec3(-0.6, 0.7, 0.6));
    float diffuse = max(dot(normal, lightDir), 0.0) * 0.45;
    float specular = pow(max(dot(normal, lightDir), 0.0), 16.0) * 0.35;

    vec3 litGlass = glassColor * (0.75 + diffuse * u_glassLight) + vec3(specular * u_glassLight);

    // Lead solder border: dark charcoal / iron strip
    float leadFactor = smoothstep(0.0, leadThickness, edgeDist);
    vec3 leadColor = vec3(0.08, 0.09, 0.11);

    vec3 finalColor = mix(leadColor, litGlass, leadFactor);

    fragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
}
