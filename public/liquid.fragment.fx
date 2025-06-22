precision highp float;

// Uniforms
uniform vec3 colorA;
uniform vec3 colorB;
uniform float time;

// Varying
varying vec2 vUV;
varying float vElevation;

void main(void) {
    // Mélanger les couleurs en fonction de l'élévation
    float mixRatio = (vElevation + 1.0) * 0.5;
    vec3 color = mix(colorA, colorB, mixRatio);
    
    // Ajouter un effet de brillance
    float brightness = pow(vElevation, 2.0) * 0.5 + 0.5;
    color += brightness * 0.2;
    
    // Effet de transparence sur les bords
    float alpha = smoothstep(0.0, 0.1, vUV.y) * smoothstep(1.0, 0.9, vUV.y) *
                smoothstep(0.0, 0.1, vUV.x) * smoothstep(1.0, 0.9, vUV.x);
                
    gl_FragColor = vec4(color, alpha * 0.9);
}