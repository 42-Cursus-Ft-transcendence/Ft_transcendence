precision highp float;

// Attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

// Uniforms
uniform mat4 world;
uniform mat4 worldView;
uniform mat4 worldViewProjection;
uniform float time;
uniform float noiseScale;
uniform float waveHeight;

// Varying
varying vec2 vUV;
varying float vElevation;

void main(void) {
    vUV = uv;
    
    // L'élévation est déjà calculée dans le code JavaScript
    vElevation = position.y / waveHeight;
    
    // Envoyer la position finale
    gl_Position = worldViewProjection * vec4(position, 1.0);
}