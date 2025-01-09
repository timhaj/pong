import { ResizeSystem } from "engine/systems/ResizeSystem.js";
import { UpdateSystem } from "engine/systems/UpdateSystem.js";

import { quat } from "glm";
import { GLTFLoader } from "engine/loaders/GLTFLoader.js";
import { LitRenderer } from "engine/renderers/LitRenderer.js";
import { FirstPersonController } from "engine/controllers/FirstPersonController.js";
import { TouchController } from "engine/controllers/TouchController.js";

import { Camera, Model, Node, Transform, Material } from "engine/core.js";

import {
    calculateAxisAlignedBoundingBox,
    mergeAxisAlignedBoundingBoxes,
} from "engine/core/MeshUtils.js";

import { Physics } from "./Physics.js";
import { Light } from "../engine/renderers/Light.js";


const canvas = document.querySelector("canvas");
const renderer = new LitRenderer(canvas);

await renderer.initialize();

const loader = new GLTFLoader();
//await loader.load(new URL('./scene/scene.gltf', import.meta.url));
await loader.load(new URL("./scene/pingpong_final_texture.gltf", import.meta.url));

const scene = loader.loadScene(loader.defaultScene);

let camera = loader.loadNode("Camera");
camera.addComponent(new FirstPersonController(camera, canvas));
camera.isDynamic = true;
camera.aabb = {
    min: [-1, -1, -1],
    max: [1, 1, 1],
};
const camera_transform = camera.getComponentOfType(Transform); //dolocimo zacetne pozicije kamere
camera_transform.translation = [0, 1, 5];

let button = document.createElement("button");
button.id = "game_button";
game_gumb(button);

let button_stopTime = document.createElement("button");
button_stopTime.id = "button_stopTime";
stopTime_gumb(button_stopTime);

LoadOurNodes();
add_light();

let game_mode = false; //za spreminjanje kamere false je FP, true je TOUCH
let game_zone = false; //pregleduje ce smo v coni igranja

const lopar = loader.loadNode("Circle");
loader.loadNode("Plane").isStatic = true;
lopar.aabb = {
    min: [-0.2, -2, -0.2],
    max: [0.2, 2, 0.2],
};
lopar.racket = true;


const ball = loader.loadNode("Sphere");
let score = document.createElement("button");
score.id = "score_button";
score.hidden = true;
document.body.appendChild(score);
showScore(score);

Object.assign(ball, {
    isDynamic: true,
    ballin: true,
    velocity: [2, 0, 6],
    acceleration: [0, -9.8, 0],
    restitution: 0.8,
    friction: 0.92,
    airResistance: 0.02,
    deltaTime: 1 / 500,
    coll: false,
    stopTime: false,
    ourBounces: 0,
    theirBounces: 0,
    score: 0,
    winAnimation: false,
    lopar: lopar,
    positions: [[ [-1,1,-5],[2,0,6] ]],
    inSound: false,
});

let ball_t = ball.getComponentOfType(Transform);
ball_t.translation = [-1, 1, -5];





ball.addComponent({
    //gravitacija
    update(t, dt) {
        function updateBallPositionWithCollision() {
           
            if (ball.stopTime) {
                return;
            }
            ball.velocity[1] += ball.acceleration[1] * ball.deltaTime;

            ball.velocity[0] -= ball.velocity[0] * ball.airResistance * ball.deltaTime; // Drag on x-axis
            ball.velocity[2] -= ball.velocity[2] * ball.airResistance * ball.deltaTime; // Drag on y-axis

            //console.log(JSON.stringify(ball.velocity));
            // Update position with velocity
            if (!ball.coll && !ball.stopTime) {
                ball_t.translation[1] += ball.velocity[1] * ball.deltaTime; // Y movement
            }

            ball_t.translation[0] += ball.velocity[0] * ball.deltaTime; // X movement
            ball_t.translation[2] += ball.velocity[2] * ball.deltaTime; // Z movement

            if (Math.abs(ball.velocity[0]) < 0.065) {
                ball.velocity[0] = 0;
            }
            if (Math.abs(ball.velocity[2]) < 0.065) {
                ball.velocity[2] = 0;
            }
        }
        updateBallPositionWithCollision();



    },
});

//premikanje loparja
let keys = {
    KeyW: false,
    KeyA: false,
    KeyD: false,
    KeyS: false,
    KeyQ: false,
    KeyE: false,
    KeyX: false,
    KeyC: false,
};

document.addEventListener("keydown", keydownHandler);
document.addEventListener("keyup", keyupHandler);

function keydownHandler(e) {
    keys[e.code] = true;
}

function keyupHandler(e) {
    keys[e.code] = false;
}

ball.lopar.addComponent({
    //premikanje loparja ko smo za mizo
    update(t, dt) {
        if (!game_mode) {
            return;
        }
        const transform = ball.lopar.getComponentOfType(Transform);

        //boundries
        if (transform.translation[1] < 0.53) {
            transform.translation[1] = 0.53;
        }
        if (transform.translation[1] > 1) {
            transform.translation[1] = 1;
        }

        if (transform.translation[0] > 2.1) {
            transform.translation[0] = 2.1;
        }

        if (transform.translation[0] < -2.1) {
            transform.translation[0] = -2.1;
        }

        if (keys["KeyW"]) {
            transform.translation = [
                transform.translation[0],
                transform.translation[1] + 0.01,
                transform.translation[2],
            ];
        }
        if (keys["KeyS"]) {
            transform.translation = [
                transform.translation[0],
                transform.translation[1] - 0.01,
                transform.translation[2],
            ];
        }
        if (keys["KeyD"]) {
            transform.translation = [
                transform.translation[0] + 0.01,
                transform.translation[1],
                transform.translation[2],
            ];
        }
        if (keys["KeyA"]) {
            transform.translation = [
                transform.translation[0] - 0.01,
                transform.translation[1],
                transform.translation[2],
            ];
        }
        // Rotation
        const rotationSpeed = 0.01; // Speed of rotation
        if (keys["KeyQ"]) {
            const deltaRotation = quat.create();
            quat.setAxisAngle(deltaRotation, [0, 1, 0], rotationSpeed);
            quat.multiply(transform.rotation, deltaRotation, transform.rotation);
        }
        if (keys["KeyE"]) {
            const deltaRotation = quat.create();
            quat.setAxisAngle(deltaRotation, [0, 1, 0], -rotationSpeed);
            quat.multiply(transform.rotation, deltaRotation, transform.rotation);
        }
        // Vertical rotation (pitch) with X and C
        if (keys["KeyX"]) {
            const deltaRotation = quat.create();
            quat.setAxisAngle(deltaRotation, [1, 0, 0], rotationSpeed); // Rotacija okrog osi X
            quat.multiply(transform.rotation, deltaRotation, transform.rotation);
        }
        if (keys["KeyC"]) {
            const deltaRotation = quat.create();
            quat.setAxisAngle(deltaRotation, [1, 0, 0], -rotationSpeed); // Rotacija okrog osi X
            quat.multiply(transform.rotation, deltaRotation, transform.rotation);
        }
    },
});

// Shranjevanje prejšnjega položaja kamere
let previousPosition = null;

camera.addComponent({
    update(t, dt) {
        const transform = camera.getComponentOfType(Transform);

        // Shranimo trenutni položaj, če prejšnji še ni bil inicializiran
        if (!previousPosition) {
            previousPosition = { ...transform.translation }; // Kopiramo trenutni položaj
        }

        if (
            transform.translation[0] < 3 &&
            transform.translation[0] > -3 &&
            transform.translation[2] < 5 &&
            transform.translation[2] > 0.7 &&
            !game_mode
        ) {
            document.body.appendChild(button);
            game_zone = true;
        } else {
            if (document.getElementById("game_button")) {
                document.body.removeChild(button);
            }
            game_zone = false;
        }
    },
});

const physics = new Physics(scene);
scene.traverse((node) => {
    const model = node.getComponentOfType(Model);
    if (!model) {
        return;
    }
    const boxes = model.primitives.map((primitive) =>
        calculateAxisAlignedBoundingBox(primitive.mesh)
    );
    node.aabb = mergeAxisAlignedBoundingBoxes(boxes);
});

function update(time, dt) {
    scene.traverse((node) => {
        for (const component of node.components) {
            component.update?.(time, dt);
        }
    });
    physics.update(time, dt);
}

function render() {
    renderer.render(scene, camera);
}

function resize({ displaySize: { width, height } }) {
    camera.getComponentOfType(Camera).aspect = width / height;
}

new ResizeSystem({ canvas, resize }).start();
new UpdateSystem({ update, render }).start();

function add_light() {
    const light = new Node();
    light.addComponent(
        new Transform({
            translation: [-0.15, 11, -2],
        })
    );
    light.addComponent(
        new Light({
            intensity: 21,
            color: [1, 1, 1],
            attenuation: [0.000001, 0.05, 0.00001],
        })
    );
    scene.addChild(light);

    const red1 = new Node();
    red1.addComponent(
        new Transform({
            translation: [17, 2, -17],
        })
    );
    red1.addComponent(
        new Light({
            intensity: 10,
            color: [1, 0, 0],
        })
    );
    scene.addChild(red1);

    const red2 = new Node();
    red2.addComponent(
        new Transform({
            translation: [9, 2, -17],
        })
    );
    red2.addComponent(
        new Light({
            intensity: 10,
            color: [1, 0, 0],
        })
    );
    scene.addChild(red2);

    const red3 = new Node();
    red3.addComponent(
        new Transform({
            translation: [1, 2, -17],
        })
    );
    red3.addComponent(
        new Light({
            intensity: 10,
            color: [1, 0, 0],
        })
    );
    scene.addChild(red3);

    const red4 = new Node();
    red4.addComponent(
        new Transform({
            translation: [-7, 2, -17],
        })
    );
    red4.addComponent(
        new Light({
            intensity: 10,
            color: [1, 0, 0],
        })
    );
    scene.addChild(red4);

    const red5 = new Node();
    red5.addComponent(
        new Transform({
            translation: [-15, 2, -17],
        })
    );
    red5.addComponent(
        new Light({
            intensity: 10,
            color: [1, 0, 0],
        })
    );
    scene.addChild(red5);




    //blue
    const blue1 = new Node();
    blue1.addComponent(
        new Transform({
            translation: [17, 2, 17],
        })
    );
    blue1.addComponent(
        new Light({
            intensity: 10,
            color: [0, 0, 1],
        })
    );
    scene.addChild(blue1);

    const blue2 = new Node();
    blue2.addComponent(
        new Transform({
            translation: [9, 2, 17],
        })
    );
    blue2.addComponent(
        new Light({
            intensity: 10,
            color: [0, 0, 1],
        })
    );
    scene.addChild(blue2);

    const blue3 = new Node();
    blue3.addComponent(
        new Transform({
            translation: [1, 2, 17],
        })
    );
    blue3.addComponent(
        new Light({
            intensity: 10,
            color: [0, 0, 1],
        })
    );
    scene.addChild(blue3);

    const blue4 = new Node();
    blue4.addComponent(
        new Transform({
            translation: [-7, 2, 17],
        })
    );
    blue4.addComponent(
        new Light({
            intensity: 10,
            color: [0, 0, 1],
        })
    );
    scene.addChild(blue4);

    const blue5 = new Node();
    blue5.addComponent(
        new Transform({
            translation: [-15, 2, 17],
        })
    );
    blue5.addComponent(
        new Light({
            intensity: 10,
            color: [0, 0, 1],
        })
    );
    scene.addChild(blue5);

}

function LoadOurNodes() {
    loader.loadNode("Cone").isStatic = true;
    loader.loadNode("Circle").isStatic = true;
    loader.loadNode("Circle.001").isStatic = true;

    loader.loadNode("Cylinder").isStatic = true;

    for (let i = 1; i < 47; i++) {
        //1-46
        let string = "";
        //if(i >= 100) loader.loadNode("Cylinder."+i).isStatic = true;
        if (i >= 10) loader.loadNode("Cylinder.0" + i).isStatic = true;
        if (i < 10) loader.loadNode("Cylinder.00" + i).isStatic = true;
    }

    for (let i = 1; i < 50; i++) {
        //1-49
        let string = "";
        if (i >= 100) loader.loadNode("Cube." + i).isStatic = true;
        if (i <= 99 && i >= 10) loader.loadNode("Cube.0" + i).isStatic = true;
        if (i < 10) loader.loadNode("Cube.00" + i).isStatic = true;
    }

    for (let i = 1; i < 85; i++) {
        //1-84
        let string = "";
        if (i >= 100) loader.loadNode("Plane." + i).isStatic = true;
        if (i <= 99 && i >= 10) loader.loadNode("Plane.0" + i).isStatic = true;
        if (i < 10) loader.loadNode("Plane.00" + i).isStatic = true;
    }
}

function game_gumb(button) {
    button.innerText = "Pritisni enter za začetek"; // Besedilo na gumbu

    // Nastavitve stila za absolutno pozicioniranje nad canvasom
    button.style.position = "absolute";
    button.style.top = "10px"; // Razdalja od vrha
    button.style.left = "50%"; // Poravnava na sredino
    button.style.transform = "translateX(-50%)"; // Centriranje guma na sredino
    button.style.zIndex = "1000"; // Postavi gumb nad vse ostale elemente

    document.addEventListener("keydown", (event) => {
        if (
            (event.key === "Enter" && game_zone && !game_mode) ||
            (event.key === "Enter" && game_mode)
        ) {
            // Preveri, ali je bila pritisnjena tipka Enter
            game_mode = !game_mode; // Obrne vrednost game_mode (true/false)
            if (game_mode) {
                //FP -> TOUCH

                camera = null;
                camera = loader.loadNode("Camera");
                camera.removeComponentsOfType(FirstPersonController);
                camera.addComponent(new TouchController(camera, canvas, { distance: 5 }));
                document.body.appendChild(button_stopTime);
                score.hidden = false;


            } else {
                //pride v FP
                ball.score = 0; //reset score
                //STOP TIME????
                camera = null;
                camera = loader.loadNode("Camera");
                camera.removeComponentsOfType(TouchController);
                camera.addComponent(new FirstPersonController(camera, canvas));

                if (document.getElementById("button_stopTime")) {
                    document.body.removeChild(button_stopTime);
                }
                score.hidden = true;
                const transform = camera.getComponentOfType(Transform);
                transform.translation = [0, 1, 5];
            }
            camera.isDynamic = true;
            camera.aabb = {
                min: [-0.2, -2, -0.2],
                max: [0.2, 2, 0.2],
            };
        }
    });
}

function stopTime_gumb(button) {
    button.innerText = "Stop Time [T]"; // Besedilo na gumbu

    // Nastavitve stila za gumb
    button.style.position = "absolute";
    button.style.top = "10px"; // Razdalja od vrha
    button.style.right = "10px"; // Razdalja od desnega roba
    button.style.width = "150px"; // Širina gumba
    button.style.height = "50px"; // Višina gumba
    button.style.fontSize = "16px"; // Velikost pisave
    button.style.textAlign = "center"; // Poravnava besedila na sredino
    button.style.lineHeight = "50px"; // Vertikalna poravnava besedila
    button.style.backgroundColor = "#007BFF"; // Barva ozadja
    button.style.color = "#FFFFFF"; // Barva besedila
    button.style.border = "none"; // Odstrani robove
    button.style.borderRadius = "8px"; // Zaokroži robove

    button.style.zIndex = "1000"; // Postavi gumb nad vse ostale elemente

    // Dodaj event listener za tipko T
    document.addEventListener("keydown", (event) => {
        if (event.key === "T" || (event.key === "t" && game_mode)) {
            if (ball.stopTime) {
                button.innerText = "Stop Time [T]"; // Besedilo na gumbu
            } else {
                button.innerText = "Time stopped"; // Besedilo na gumbu
            }
            ball.stopTime = !ball.stopTime;
        }
    });
}

function showScore(button){
    button.innerText = "Stevilo tock: 0"; // Besedilo na gumbu

    // Nastavitve stila za gumb
    button.style.position = "absolute";
    button.style.transform = "translateX(-50%)"; // Centriranje gumba na sredino
    button.style.top = "10px"; // Razdalja od vrha
    button.style.left = "50%"; // Centriranje od levega roba
    button.style.width = "150px"; // Širina gumba
    button.style.height = "50px"; // Višina gumba
    button.style.fontSize = "16px"; // Velikost pisave
    button.style.textAlign = "center"; // Poravnava besedila na sredino
    button.style.lineHeight = "50px"; // Vertikalna poravnava besedila
    button.style.backgroundColor = "#007BFF"; // Barva ozadja
    button.style.color = "#FFFFFF"; // Barva besedila
    button.style.border = "none"; // Odstrani robove
    button.style.borderRadius = "8px"; // Zaokroži robove

    button.style.zIndex = "1000"; // Postavi gumb nad vse ostale elemente
}
