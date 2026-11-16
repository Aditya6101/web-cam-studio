#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_brickSize;     // e.g. 16.0 to 32.0 px
uniform float u_studStrength;  // e.g. 1.0
uniform float u_paletteSnap;   // 1.0 = snap to lego colors, 0.0 = true camera color

// Authentic classic Lego palette (16 primary tones)
const int PALETTE_SIZE = 16;
const vec3 legoPalette[16] = vec3[16](
    vec3(0.05, 0.05, 0.05), // 0: Black
    vec3(0.96, 0.96, 0.96), // 1: White
    vec3(0.79, 0.11, 0.11), // 2: Bright Red
    vec3(0.04, 0.34, 0.76), // 3: Bright Blue
    vec3(0.98, 0.81, 0.06), // 4: Bright Yellow
    vec3(0.05, 0.46, 0.22), // 5: Dark Green
    vec3(0.96, 0.43, 0.02), // 6: Bright Orange
    vec3(0.57, 0.58, 0.57), // 7: Medium Stone Grey
    vec3(0.33, 0.35, 0.35), // 8: Dark Stone Grey
    vec3(0.86, 0.77, 0.56), // 9: Brick Yellow / Tan
    vec3(0.42, 0.20, 0.11), // 10: Reddish Brown
    vec3(0.36, 0.62, 0.85), // 11: Medium Blue
    vec3(0.84, 0.24, 0.58), // 12: Bright Pink
    vec3(0.48, 0.76, 0.12), // 13: Lime Green
    vec3(0.70, 0.32, 0.07), // 14: Dark Orange
    vec3(0.62, 0.77, 0.90)  // 15: Light Aqua
);

// Nearest color snap in perceptual-weighted RGB
vec3 findNearestLegoColor(vec3 col) {
    float minDist = 1000.0;
    vec3 bestCol = col;
    // Perceptual color weights (human eye is most sensitive to green)
    vec3 w = vec3(0.299, 0.587, 0.114);
    
    for (int i = 0; i < PALETTE_SIZE; i++) {
        vec3 diff = col - legoPalette[i];
        float d = dot(diff * diff, w);
        if (d < minDist) {
            minDist = d;
            bestCol = legoPalette[i];
        }
    }
    return bestCol;
}

void main() {
    float brickSize = max(u_brickSize, 6.0);
    vec2 fragCoord = v_texCoord * u_resolution;
    
    // Grid coordinate and cell center
    vec2 cellIndex = floor(fragCoord / brickSize);
    vec2 cellOrigin = cellIndex * brickSize;
    vec2 cellCenter = cellOrigin + vec2(brickSize * 0.5);
    vec2 cellCenterUV = cellCenter / u_resolution;
    
    // Position inside cell in [-1, 1] range
    vec2 p = ((fragCoord - cellOrigin) / brickSize) * 2.0 - 1.0;
    
    // Sample color at cell center + slight multi-sample for anti-aliasing color jitter
    vec3 sampleCol = texture(u_texture, cellCenterUV).rgb;
    
    // Snap to Lego palette if enabled
    vec3 baseColor = (u_paletteSnap > 0.5) ? findNearestLegoColor(sampleCol) : sampleCol;
    
    // Stud simulation:
    // Stud outer radius is ~0.55 in normalized [-1, 1] coords
    float dist = length(p);
    float studRadius = 0.52;
    float studHeight = 0.35;
    
    // Base light direction from top-left (isometric light source)
    vec3 lightDir = normalize(vec3(-0.6, 0.7, 0.5));
    
    // Calculate normal vector
    vec3 normal = vec3(0.0, 0.0, 1.0); // Flat top plate default
    float shadow = 1.0;
    
    if (dist < studRadius) {
        // Inside or on the rim of the stud
        float rimWidth = 0.16;
        float innerRadius = studRadius - rimWidth;
        
        if (dist > innerRadius) {
            // Stud cylindrical side wall / chamfer
            float t = (dist - innerRadius) / rimWidth;
            vec2 radial = p / dist;
            // Angled normal pointing outwards and upwards
            normal = normalize(vec3(radial * sin(t * 1.57), cos(t * 1.57)));
        } else {
            // Flat top of the stud with subtle convex dome
            float t = dist / innerRadius;
            vec2 radial = p / max(dist, 0.001);
            normal = normalize(vec3(radial * t * 0.15, 0.98));
        }
    } else {
        // Outside the stud: check for stud drop shadow (bottom-right)
        vec2 shadowOffset = vec2(0.18, -0.18);
        float shadowDist = length(p - shadowOffset);
        if (shadowDist < studRadius * 1.05) {
            shadow = mix(0.72, 1.0, smoothstep(0.7 * studRadius, 1.05 * studRadius, shadowDist));
        }
    }
    
    // Brick plate bevel / grout border:
    // Top & left edges are slightly lighter, bottom & right are darker
    float borderThickness = 0.88;
    float borderHighlight = 1.0;
    if (abs(p.x) > borderThickness || abs(p.y) > borderThickness) {
        if (p.x < -borderThickness || p.y > borderThickness) {
            borderHighlight = 1.15; // Top-left bevel highlight
        } else {
            borderHighlight = 0.65; // Bottom-right groove shadow
        }
    }
    
    // Compute lighting
    float diffuse = max(dot(normal, lightDir), 0.0);
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 halfVector = normalize(lightDir + viewDir);
    float specular = pow(max(dot(normal, halfVector), 0.0), 18.0) * 0.45;
    
    // Plastic shine specular + diffuse ambient
    float ambient = 0.65;
    float lightIntensity = ambient + diffuse * 0.45 * u_studStrength;
    
    vec3 finalColor = baseColor * lightIntensity * shadow * borderHighlight + vec3(specular * u_studStrength);
    
    fragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
}
