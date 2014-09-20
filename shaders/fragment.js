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

#if MAX_POINT_LIGHTS > 0
    uniform vec3 pointLightColor[MAX_POINT_LIGHTS];
    uniform vec3 pointLightPosition[MAX_POINT_LIGHTS];
    uniform float pointLightDistance[MAX_POINT_LIGHTS];
#endif

%%shadowmap_pars_fragment%%

void main() {
    vec4 _projectorTexCoord = projectorTexCoord;

    _projectorTexCoord /= projectorTexCoord.w;
    _projectorTexCoord.xy = 0.5 * projectorTexCoord.xy + 0.5;


    #if MAX_POINT_LIGHTS > 0
        // Pretty basic lambertian lighting...
        vec4 addedLights = vec4(0.0,0.0,0.0, 1.0);
        for(int l = 0; l < MAX_POINT_LIGHTS; l++) {
            vec3 lightDirection = normalize(vecPos - pointLightPosition[l]);
            addedLights.rgb += clamp(dot(-lightDirection, vecNormal), 0.0, 1.0) * pointLightColor[l];
        }

        gl_FragColor = texture2D(tex0, _projectorTexCoord.xy) + addedLights;
    #else
        gl_FragColor = texture2D(tex0, _projectorTexCoord.xy);
    #endif

    %%shadowmap_fragment%%
}
