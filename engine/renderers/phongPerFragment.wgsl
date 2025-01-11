struct VertexInput {
    @location(0) position: vec3f,
    @location(1) texcoords: vec2f,
    @location(2) normal: vec3f,
}

struct VertexOutput {
    @builtin(position) clipPosition: vec4f,
    @location(0) position: vec3f,
    @location(1) texcoords: vec2f,
    @location(2) normal: vec3f,
}

struct FragmentInput {
    @location(0) position: vec3f,
    @location(1) texcoords: vec2f,
    @location(2) normal: vec3f,
}

struct FragmentOutput {
    @location(0) color: vec4f,
}

struct CameraUniforms {
    viewMatrix: mat4x4f,
    projectionMatrix: mat4x4f,
    position: vec3f,
}

struct LightUniforms {
    color: vec3f,
    position: vec3f,
    attenuation: vec3f,
}

struct ModelUniforms {
    modelMatrix: mat4x4f,
    normalMatrix: mat3x3f,
}

struct MaterialUniforms {
    baseFactor: vec4f,
    diffuse: f32,
    specular: f32,
    shininess: f32,
}

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(1) @binding(0) var<uniform> lights: array<LightUniforms, 11>; // Maksimalno 11 svetlobnih virov
@group(2) @binding(0) var<uniform> model: ModelUniforms;
@group(3) @binding(0) var<uniform> material: MaterialUniforms;
@group(3) @binding(1) var baseTexture: texture_2d<f32>;
@group(3) @binding(2) var baseSampler: sampler;

@vertex
fn vertex(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    // posljemo podatke naprej
    output.clipPosition = camera.projectionMatrix * camera.viewMatrix * model.modelMatrix * vec4(input.position, 1);
    output.position = (model.modelMatrix * vec4(input.position, 1)).xyz;
    output.texcoords = input.texcoords;
    output.normal = model.normalMatrix * input.normal;
    return output;
}

@fragment
fn fragment(input: FragmentInput) -> FragmentOutput {
    var output: FragmentOutput;

    let surfacePosition = input.position;
    let N = normalize(input.normal);
    let V = normalize(camera.position - surfacePosition);

    var totalDiffuseLight = vec3f(0.0);
    var totalSpecularLight = vec3f(0.0);

    // Iteracija čez vse svetlobne vir
    for (var i = 0u; i < 11; i = i + 1u) {
        let light = lights[i];
        let d = distance(surfacePosition, light.position);
        let attenuation = 1.0 / (light.attenuation.x + light.attenuation.y * d + light.attenuation.z * d * d);
       

        let L = normalize(light.position - surfacePosition);
        let R = reflect(-L, N);

        let lambert = max(dot(N, L), 0.0) * material.diffuse;
        let phong = pow(max(dot(V, R), 0.0), material.shininess) * material.specular;

        totalDiffuseLight += lambert * attenuation * light.color;
        totalSpecularLight += phong  * attenuation * light.color;
    }

    let baseColor = textureSample(baseTexture, baseSampler, input.texcoords) * material.baseFactor;
    let finalColor = baseColor.rgb * (totalDiffuseLight + 0.05) + totalSpecularLight;

    output.color = pow(vec4(finalColor, 1.0), vec4(1.0 / 2.2));

    return output;
}