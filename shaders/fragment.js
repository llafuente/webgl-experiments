#ifdef GL_ES
    precision highp float;
#endif

varying vec2 vUv;
varying vec3 vecPos;
varying vec3 vecNormal;

varying vec4 projectorTexCoord;

uniform float time;

uniform vec2 resolution;
uniform sampler2D tex0;

#chunk shadowmap_pars_fragment

/*
#chunk lights_phong_pars_fragment
float specularStrength = 1.0;

uniform vec3 diffuse;
uniform float opacity;

uniform vec3 ambient;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
*/

void main() {
    vec4 _projectorTexCoord = projectorTexCoord;

    _projectorTexCoord /= projectorTexCoord.w;
    _projectorTexCoord.xy = 0.5 * projectorTexCoord.xy + 0.5;

    gl_FragColor = texture2D(tex0, _projectorTexCoord.xy);

    /*
    #/chunk lights_phong_fragment
    */

    #chunk shadowmap_fragment
}
