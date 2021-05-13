export default /* glsl */`
#ifdef TRANSMISSION
	vec3 getVolumeTransmissionRay(vec3 n, vec3 v, float thickness, float ior, mat4 modelMatrix)
	{
		// Direction of refracted light.
		vec3 refractionVector = refract(-v, normalize(n), 1.0 / ior);

		// Compute rotation-independant scaling of the model matrix.
		vec3 modelScale;
		modelScale.x = length(vec3(modelMatrix[0].xyz));
		modelScale.y = length(vec3(modelMatrix[1].xyz));
		modelScale.z = length(vec3(modelMatrix[2].xyz));

		// The thickness is specified in local space.
		return normalize(refractionVector) * thickness * modelScale;
	}
	// Compute attenuated light as it travels through a volume.
	vec3 applyVolumeAttenuation(vec3 radiance, float transmissionDistance, vec3 attenuationColor, float attenuationDistance)
	{
		if (attenuationDistance == 0.0)
		{
			// Attenuation distance is +∞ (which we indicate by zero), i.e. the transmitted color is not attenuated at all.
			return radiance;
		}
		else
		{
			// Compute light attenuation using Beer's law.
			vec3 attenuationCoefficient = -log(attenuationColor) / attenuationDistance;
			vec3 transmittance = exp(-attenuationCoefficient * transmissionDistance); // Beer's law
			return transmittance * radiance;
		}
	}
	
	float applyIorToRoughness(float roughness, float ior)
	{
		// Scale roughness with IOR so that an IOR of 1.0 results in no microfacet refraction and
		// an IOR of 1.5 results in the default amount of microfacet refraction.
		return roughness * clamp(ior * 2.0 - 2.0, 0.0, 1.0);
	}

	const float GAMMA = 2.2;
	const float INV_GAMMA = 1.0 / GAMMA;
	// sRGB to linear approximation
	// see http://chilliant.blogspot.com/2012/08/srgb-approximations-for-hlsl.html
	vec3 sRGBToLinear3(vec3 srgbIn)
	{
		return vec3(pow(srgbIn.xyz, vec3(GAMMA)));
	}

	vec4 sRGBToLinear4(vec4 srgbIn)
	{
		return vec4(sRGBToLinear3(srgbIn.xyz), srgbIn.w);
	}

	vec3 getTransmissionSample(vec2 fragCoord, float roughness, float ior, float w, sampler2D map)
	{
		float framebufferLod = log2(float(w)) * applyIorToRoughness(roughness, ior);
		vec3 transmittedLight = textureLod(map, fragCoord.xy, framebufferLod).rgb;
		transmittedLight = sRGBToLinear3(transmittedLight);
		return transmittedLight;
	}

	vec3 getIBLVolumeRefraction(float w, sampler2D map,  const in vec3 normal, const in vec3 view, const in float perceptualRoughness, vec3 baseColor, const in vec3 specularColor,
		vec3 position, mat4 modelMatrix, mat4 viewMatrix, mat4 projMatrix, float ior, float thickness, vec3 attenuationColor, float attenuationDistance)
	{
		vec3 transmissionRay = getVolumeTransmissionRay(normal, -view, thickness, ior, modelMatrix);
		vec3 refractedRayExit = position + transmissionRay;

		// Project refracted vector on the framebuffer, while mapping to normalized device coordinates.
		 vec4 ndcPos = projMatrix * viewMatrix * vec4(refractedRayExit, 1.0);
		 vec2 refractionCoords = ndcPos.xy / ndcPos.w;
		 refractionCoords += 1.0;
		 refractionCoords /= 2.0;

		// vec2 normalizedFragCoord;
		// normalizedFragCoord.x = gl_FragCoord.x/float(resolution.x);
		// normalizedFragCoord.y = gl_FragCoord.y/float(resolution.y);
		// vec2 refractionCoords = normalizedFragCoord;

		// Sample framebuffer to get pixel the refracted ray hits.
		vec3 transmittedLight = getTransmissionSample(refractionCoords, perceptualRoughness, ior,w,map);

		vec3 attenuatedColor = applyVolumeAttenuation(transmittedLight, length(transmissionRay), attenuationColor, attenuationDistance);
  
		//We already know specular part
		return (1.0 - specularColor) * attenuatedColor * baseColor;
		//return attenuatedColor * baseColor;
	}
	#endif
	`;
	