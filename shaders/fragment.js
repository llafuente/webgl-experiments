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

    /*
    gl_FragColor.r = 0.0;
    gl_FragColor.g = 0.0;
    gl_FragColor.b = 1.0;
    */
    //gl_FragColor = texture2D(tex0, vUv);
    //gl_FragColor = texture2D(tex0, _projectorTexCoord.xy) * addedLights;

    // no lights - camera projection
    //vec2 uv = gl_FragCoord.xy / resolution.xy;
    //uv.y = 1.0 - uv.y;
    //gl_FragColor = texture2D(tex0, uv);

    //gl_FragColor.r = gl_FragCoord.x  / resolution.x;
    //gl_FragColor.r = 0.0;
    //gl_FragColor.g = 1.0;
}
