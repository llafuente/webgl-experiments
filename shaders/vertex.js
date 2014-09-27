uniform mat4 projectorWorldViewProjTransform;
varying vec4 projectorTexCoord;

varying vec2 vUv;
varying vec3 vecPos;
varying vec3 vecNormal;

#chunk shadowmap_pars_vertex

/*
#chunk lights_phong_pars_vertex
#define PHONG
varying vec3 vViewPosition;
varying vec3 vNormal;
*/
void main() {
    vec4 v4_position = vec4(position, 1.0 );
    vecPos = (modelMatrix * v4_position).xyz;
    vecNormal = (modelMatrix * vec4(normal, 0.0)).xyz;
    vUv = uv;
    projectorTexCoord = projectorWorldViewProjTransform * v4_position;

    #chunk worldpos_vertex

    #chunk shadowmap_vertex
    /*
    #chunk lights_phong_vertex
    */

    #chunk defaultnormal_vertex
    //vNormal = normalize( transformedNormal );

    #chunk default_vertex
    //vViewPosition = -mvPosition.xyz;
}
