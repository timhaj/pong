export class Light {

    constructor({
        color = [255, 255, 255],
        intensity = 1,
        attenuation = [0.000001, 0.005, 0.01],
        target_pos = [0,0,0],
    } = {}) {
        this.color = color;
        this.intensity = intensity;
        this.attenuation = attenuation;
        this.target_pos = target_pos;
    }

}
