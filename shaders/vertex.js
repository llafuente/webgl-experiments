uniform mat4 projectorWorldViewProjTransform;
varying vec4 projectorTexCoord;

varying vec2 vUv;
varying vec3 vecPos;
varying vec3 vecNormal;

%%worldpos_vertex%%
%%shadowmap_pars_vertex%%

void main() {
    vec4 v4_position = vec4(position, 1.0 );
    vecPos = (modelMatrix * v4_position).xyz;
    vecNormal = (modelMatrix * vec4(normal, 0.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4(vecPos, 1.0);

    vUv = uv;

    projectorTexCoord = projectorWorldViewProjTransform * v4_position;
    //projectorTexCoord.xy = 0.5 * projectorTexCoord.xy + 0.5;

    %%shadowmap_vertex%%
}
