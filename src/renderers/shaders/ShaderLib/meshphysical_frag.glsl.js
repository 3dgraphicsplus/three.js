export default /* glsl */`
#define STANDARD

#ifdef PHYSICAL
	#define REFLECTIVITY
	#define CLEARCOAT
	#define TRANSMISSION
#endif

uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;

#ifdef TRANSMISSION
	uniform float transmission;
	uniform sampler2D opaqueMap;
	uniform vec2 resolution;
	varying vec3 vWorldPosition;
	
	uniform mat4 modelMatrix;
	uniform mat4 modelViewMatrix;
	uniform mat4 projectionMatrix;
#endif

#ifdef REFLECTIVITY
	uniform float reflectivity;
#endif

#ifdef CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif

#ifdef USE_SHEEN
	uniform vec3 sheen;
#endif

varying vec3 vViewPosition;

#ifndef FLAT_SHADED

	varying vec3 vNormal;

	#ifdef USE_TANGENT

		varying vec3 vTangent;
		varying vec3 vBitangent;

	#endif

#endif

#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <bsdfs>
#include <transmission_fragment>
#include <transmissionmap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <lights_physical_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

void main() {

	#include <clipping_planes_fragment>

	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;

	#ifdef TRANSMISSION
		float totalTransmission = transmission;
	#endif

	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <transmissionmap_fragment>

	// accumulation
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>

	// modulation
	#include <aomap_fragment>

	vec3 diffuse_with_transmit = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	
	// this is a stub for the transmission model
	#ifdef TRANSMISSION
    	vec3 f_transmission = vec3(0.0);

		vec3 v = normalize(cameraPosition - vWorldPosition);
		//vec3 v = geometry.viewDir;
		vec3 n = geometry.normal;
		//if no normal
		//vec3 n = normalize(cross(dFdx(v_Position), dFdy(v_Position)));
		vec3 specularColor = reflectedLight.directSpecular + reflectedLight.indirectSpecular;

		//model-viewed position
		vec3 mPosition = vWorldPosition;

		//TODO
		vec3 f90 = vec3(1.0);
		//TODO
		float ior = 1.2/0.8;
		//TODO
		float thickness = 0.01;

		//FIXME - Do we need smaller resolution support?
		vec2 opaqueMapSize = resolution;
		
		//TODO
        vec3 attenuationColor = vec3(1.0, 1.0, 1.0);
		//TODO
        float attenuationDistance = 0.0;

		vec3 transmittedLight = getIBLVolumeRefraction(opaqueMapSize.x,opaqueMap,
			n, v,
			roughnessFactor,
			diffuse_with_transmit.rgb, specularColor,
			mPosition, modelMatrix, viewMatrix, projectionMatrix,
			ior, thickness, attenuationColor, attenuationDistance
		);

		f_transmission += totalTransmission * transmittedLight;
		diffuse_with_transmit = mix(diffuse_with_transmit, f_transmission, totalTransmission);
	#endif

	vec3 outgoingLight = diffuse_with_transmit + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;

	gl_FragColor = vec4( outgoingLight, diffuseColor.a );

	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>

}
`;
