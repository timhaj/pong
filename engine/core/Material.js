export class Material {

    constructor({
        baseTexture,
        emissionTexture,
        normalTexture,
        occlusionTexture,
        roughnessTexture,
        metalnessTexture,

        baseFactor = [1, 1, 1, 1],
        emissionFactor = [0, 0, 0],
        normalFactor = 1.0,
        occlusionFactor = 1.0,
        roughnessFactor = 1.0,
        metalnessFactor = 1.0,
        diffuse = 1.0,
        specular = 1.0,
        shininess = 50.0,
    } = {}) {
        this.baseTexture = baseTexture;
        this.emissionTexture = emissionTexture;
        this.normalTexture = normalTexture;
        this.occlusionTexture = occlusionTexture;
        this.roughnessTexture = roughnessTexture;
        this.metalnessTexture = metalnessTexture;

        this.baseFactor = baseFactor;
        this.emissionFactor = emissionFactor;
        this.normalFactor = normalFactor;
        this.occlusionFactor = occlusionFactor;
        this.roughnessFactor = roughnessFactor;
        this.metalnessFactor = metalnessFactor;
        this.diffuse = diffuse;
        this.specular = specular;
        this.shininess = shininess;
    }

}
