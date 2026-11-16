#version 300 es
precision highp float;

in vec2 a_position;
in vec2 a_texCoord;

out vec2 v_texCoord;
uniform float u_mirror;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    vec2 coord = a_texCoord;
    if (u_mirror > 0.5) {
        coord.x = 1.0 - coord.x;
    }
    v_texCoord = coord;
}
