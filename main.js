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
await loader.load(new URL("./scene/pingpong_final_texture_fixed.gltf", import.meta.url));

const scene = loader.loadScene(loader.defaultScene);

// kamera
let camera = loader.loadNode("Camera");
camera.addComponent(new FirstPersonController(camera, canvas));
camera.isDynamic = true;
camera.aabb = {
    min: [-1, -1, -1],
    max: [1, 1, 1],
};
const camera_transform = camera.getComponentOfType(Transform);
camera_transform.translation = [0, 1, 5]; // dolocimo zacetne pozicije kamere

// enter game gumb
let button = document.createElement("button");
button.id = "game_button";
game_gumb(button);

// stop gumb
let button_stopTime = document.createElement("button");
button_stopTime.id = "button_stopTime";
stopTime_gumb(button_stopTime);

// guide div
const controlsDiv = document.createElement("div");
controlsDiv.id = "controlsDiv";
displayControls(controlsDiv);

// nalozimo komponente iz .gltf in jih damo na static
LoadOurNodes();


// nalozimo luci
add_light();

let game_mode = false; // za spreminjanje kamere false je FP, true je TOUCH
let game_zone = false; // pregleduje ce smo v coni igranja

// lopar
const lopar = loader.loadNode("Circle");
lopar.aabb = {
    min: [-0.2, -2, -0.2],
    max: [0.2, 2, 0.2],
};
lopar.racket = true;

// ball
const ball = loader.loadNode("Sphere");

// score div
let score = document.createElement("button");
score.id = "score_button";
score.hidden = true;
document.body.appendChild(score);
showScore(score);

// ball object
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
    positions: [ // prvi indeks je pozicija, drugi pa startna hitrost
        // servira z leve
        [
            [-1, 1, -5], // hard 
            [2, 0, 6],
        ],

        [
            [-3, 1, -5], // easy 
            [3, 0, 6],
        ],

        [
            [-3, 1.5, -5], // mid
            [3, 0, 6],
        ],
        // servira z desne
        [
            [2.5, 1, -5], // fun mid
            [-2.5, 0, 6],
        ],

        [
            [3, 1, -5], // easy
            [-3, 0, 6],
        ],
    ],
    inSound: false,
    roundCountdown: false,
});

// zacetna pozicija zoge
let ball_t = ball.getComponentOfType(Transform);
ball_t.translation = [-1, 1, -5];

ball.addComponent({
    // premikanje zoge
    update(t, dt) {
        function updateBallPositionWithCollision() {
            if (ball.stopTime) {
                return;
            }
            ball.velocity[1] += ball.acceleration[1] * ball.deltaTime; // gravitacija

            ball.velocity[0] -= ball.velocity[0] * ball.airResistance * ball.deltaTime; // upor na x-osi
            ball.velocity[2] -= ball.velocity[2] * ball.airResistance * ball.deltaTime; // upor na y-osi

            // posodobimo pozicijo z novo hitrostjo
            if (!ball.coll && !ball.stopTime) {
                ball_t.translation[1] += ball.velocity[1] * ball.deltaTime; // Y movement
            }

            ball_t.translation[0] += ball.velocity[0] * ball.deltaTime; // X movement
            ball_t.translation[2] += ball.velocity[2] * ball.deltaTime; // Z movement

            // ce je zanemarljiva hitrost, jo ustavimo
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

// premikanje loparja
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
    // premikanje loparja ko smo za mizo
    update(t, dt) {
        if (!game_mode) {
            return;
        }
        const transform = ball.lopar.getComponentOfType(Transform);

        // meje premikanja loparja
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
        // horizontalna rotacija
        const rotationSpeed = 0.01; // hitrost rotacije
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
        // vertikalna rotacija (pitch) z X in C (os X)
        if (keys["KeyX"]) {
            const deltaRotation = quat.create();
            quat.setAxisAngle(deltaRotation, [1, 0, 0], rotationSpeed);
            quat.multiply(transform.rotation, deltaRotation, transform.rotation);
        }
        if (keys["KeyC"]) {
            const deltaRotation = quat.create();
            quat.setAxisAngle(deltaRotation, [1, 0, 0], -rotationSpeed);
            quat.multiply(transform.rotation, deltaRotation, transform.rotation);
        }
    },
});

// shranjevanje prejšnjega položaja kamere
let previousPosition = null;

camera.addComponent({
    update(t, dt) {
        const transform = camera.getComponentOfType(Transform);

        // shranimo trenutni položaj, če prejšnji še ni bil inicializiran
        if (!previousPosition) {
            previousPosition = { ...transform.translation }; // kopiramo trenutni položaj
        }

        // zraven mize se pokaze ENTER gumb
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

// osnovni renderer in requestAnimationFrame
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

// nalozimo luci
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
            translation: [8.5, 2, -17],
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
            translation: [0, 2, -17],
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
            translation: [-8.5, 2, -17],
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
            translation: [-17, 2, -17],
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
            translation: [8.5, 2, 17],
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
            translation: [0, 2, 17],
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
            translation: [-8.5, 2, 17],
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
            translation: [-17, 2, 17],
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

// nalozimo objekte
function LoadOurNodes() {
    loader.loadNode("Cone").isStatic = true;
    loader.loadNode("Circle").isStatic = true;
    loader.loadNode("Circle.001").isStatic = true;
    loader.loadNode("Plane").isStatic = true;
    loader.loadNode("Cylinder").isStatic = true;

    for (let i = 1; i < 47; i++) {
        //1-46
        if (i >= 10) loader.loadNode("Cylinder.0" + i).isStatic = true;
        if (i < 10) loader.loadNode("Cylinder.00" + i).isStatic = true;
    }

    for (let i = 1; i < 50; i++) {
        //1-49
        if (i <= 99 && i >= 10) loader.loadNode("Cube.0" + i).isStatic = true;
        if (i < 10) loader.loadNode("Cube.00" + i).isStatic = true;
    }

    for (let i = 1; i < 85; i++) {
        //1-84
        if (i <= 99 && i >= 10) loader.loadNode("Plane.0" + i).isStatic = true;
        if (i < 10) loader.loadNode("Plane.00" + i).isStatic = true;
    }
}

// game gumb functionality
function game_gumb(button) {
    button.innerText = "Pritisni ENTER za začetek";
    button.style.position = "absolute";
    button.style.top = "10px";
    button.style.left = "50%";
    button.style.transform = "translateX(-50%)";
    button.style.color = "#FFFFFF";
    button.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
    button.style.fontFamily = "'Arial', sans-serif";
    button.style.fontSize = "16px";
    button.style.borderRadius = "8px";
    button.style.border = "2px solid rgba(255, 255, 255, 0.3)";
    button.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.5)";
    button.style.lineHeight = "1.8";
    button.style.zIndex = "1000";

    document.addEventListener("keydown", (event) => {
        if (
            (event.key === "Enter" && game_zone && !game_mode) ||
            (event.key === "Enter" && game_mode)
        ) {
            // preveri, ali je bila pritisnjena tipka Enter
            game_mode = !game_mode; // obrne vrednost game_mode (true/false)
            if (game_mode) {
                // pride iz FP -> TOUCH
                camera = null;
                camera = loader.loadNode("Camera");
                camera.removeComponentsOfType(FirstPersonController);
                camera.addComponent(new TouchController(camera, canvas, { distance: 5 }));
                document.body.appendChild(button_stopTime);
                document.body.appendChild(controlsDiv);
                score.hidden = false;
            } else {
                //pride iz TOUCH -> FP
                ball.score = 0; // reset score
                camera = null;
                camera = loader.loadNode("Camera");
                camera.removeComponentsOfType(TouchController);
                camera.addComponent(new FirstPersonController(camera, canvas));
                if (document.getElementById("button_stopTime")) {
                    document.body.removeChild(button_stopTime);
                }
                if (document.getElementById("controlsDiv")) {
                    document.body.removeChild(controlsDiv);
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

// stop time functionality
function stopTime_gumb(button) {
    button.innerText = "Stop Time [T]";
    button.style.position = "absolute";
    button.style.top = "10px";
    button.style.right = "10px";
    button.style.width = "150px";
    button.style.height = "50px";
    button.style.textAlign = "center";
    button.style.color = "#FFFFFF";
    button.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
    button.style.fontFamily = "'Arial', sans-serif";
    button.style.fontSize = "16px";
    button.style.borderRadius = "8px";
    button.style.border = "2px solid rgba(255, 255, 255, 0.3)";
    button.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.5)";
    button.style.lineHeight = "1.8";
    button.style.zIndex = "1000";

    document.addEventListener("keydown", (event) => {
        if ((event.key === "T" || event.key === "t") && game_mode && !ball.roundCountdown) {
            if (ball.stopTime) {
                button.innerText = "Stop Time [T]";
            } else {
                button.innerText = "Time stopped";
            }
            ball.stopTime = !ball.stopTime;
        }
    });
}

function showScore(button) {
    button.innerText = "Stevilo tock: 0";
    button.style.position = "absolute";
    button.style.transform = "translateX(-50%)";
    button.style.top = "10px";
    button.style.left = "50%";
    button.style.width = "150px";
    button.style.height = "50px";
    button.style.textAlign = "center";
    button.style.color = "#FFFFFF";
    button.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
    button.style.fontFamily = "'Arial', sans-serif";
    button.style.fontSize = "16px";
    button.style.borderRadius = "8px";
    button.style.border = "2px solid rgba(255, 255, 255, 0.3)";
    button.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.5)";
    button.style.lineHeight = "1.8";
    button.style.zIndex = "1000";
}

function displayControls(controlsDiv) {
    controlsDiv.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 8px;">
            <div><strong>W</strong> <span style="margin-left: 15px;"></span> <span style="color: #4caf50;">↑ UP</span></div>
            <div><strong>A</strong> <span style="margin-left: 15px;"></span> <span style="color: #4caf50;">← LEFT</span></div>
            <div><strong>S</strong> <span style="margin-left: 15px;"></span> <span style="color: #4caf50;">↓ DOWN</span></div>
            <div><strong>D</strong> <span style="margin-left: 15px;"></span> <span style="color: #4caf50;">→ RIGHT</span></div>
            <div><strong>Q,E</strong> <span style="margin-left: 5px;"></span> <span style="color: #2196f3;">↺/↻ YAW</span></div>
            <div><strong>X,C</strong> <span style="margin-left: 5px;"></span> <span style="color: #ff5722;">↑/↓ PITCH</span></div>
        </div>
    `;
    controlsDiv.style.position = "fixed";
    controlsDiv.style.bottom = "10px";
    controlsDiv.style.left = "10px";
    controlsDiv.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
    controlsDiv.style.color = "white";
    controlsDiv.style.fontFamily = "'Arial', sans-serif";
    controlsDiv.style.fontSize = "16px";
    controlsDiv.style.padding = "15px";
    controlsDiv.style.borderRadius = "8px";
    controlsDiv.style.border = "2px solid rgba(255, 255, 255, 0.3)";
    controlsDiv.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.5)";
    controlsDiv.style.lineHeight = "1.8";
    controlsDiv.style.zIndex = "1000";
}
