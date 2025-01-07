import { ResizeSystem } from 'engine/systems/ResizeSystem.js';
import { UpdateSystem } from 'engine/systems/UpdateSystem.js';

import { GLTFLoader } from 'engine/loaders/GLTFLoader.js';
import { LitRenderer } from 'engine/renderers/LitRenderer.js';
import { FirstPersonController } from 'engine/controllers/FirstPersonController.js';

import { Camera, Model } from 'engine/core.js';

import {
    calculateAxisAlignedBoundingBox,
    mergeAxisAlignedBoundingBoxes,
} from 'engine/core/MeshUtils.js';

import { Physics } from './Physics.js';

const canvas = document.querySelector('canvas');
const renderer = new LitRenderer(canvas);

await renderer.initialize();

const loader = new GLTFLoader();
//await loader.load(new URL('./scene/scene.gltf', import.meta.url));
await loader.load(new URL('./scene/pingpong_table_luc.gltf', import.meta.url));

const scene = loader.loadScene(loader.defaultScene);

const camera = loader.loadNode('Camera');
camera.addComponent(new FirstPersonController(camera, canvas));
camera.isDynamic = true;
camera.aabb = {
    min: [-0.2, -0.2, -0.2],
    max: [0.2, 0.2, 0.2],
};

loader.loadNode('Cube').isStatic = true;
const plane = loader.loadNode('Cube');
loader.loadNode('Plane').isStatic = true;

plane.addComponent({
    update(t,dt){
        const transform = plane.components[0];
        let x = 0;
        transform.translation = [x,0,0];
    }   
});

for(let i = 1;i<11;i++){//1-10
    let string = "";
    if(i >= 10) loader.loadNode("Cube.0"+i).isStatic = true;
    if(i < 10) loader.loadNode("Cube.00"+i).isStatic = true;
}

for(let i = 1;i<17;i++){//1-16
    let string = "";
    if(i >= 10) loader.loadNode("Plane.0"+i).isStatic = true;
    if(i < 10) loader.loadNode("Plane.00"+i).isStatic = true;
}
    








const physics = new Physics(scene);
scene.traverse(node => {
    const model = node.getComponentOfType(Model);
    if (!model) {
        return;
    }
    const boxes = model.primitives.map(primitive => calculateAxisAlignedBoundingBox(primitive.mesh));
    node.aabb = mergeAxisAlignedBoundingBoxes(boxes);
});

function update(time, dt) {
    scene.traverse(node => {
        for (const component of node.components) {
            component.update?.(time, dt);
        }
    });

    physics.update(time, dt);
}

function render() {
    renderer.render(scene, camera);
}

function resize({ displaySize: { width, height }}) {
    camera.getComponentOfType(Camera).aspect = width / height;
}

new ResizeSystem({ canvas, resize }).start();
new UpdateSystem({ update, render }).start();