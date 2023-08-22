import * as THREE from "three";
import * as CANNON from "cannon-es";
import CannonDebugger from "cannon-es-debugger";

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

let world, timestep, cannonDebugger;
let boxBody, groundBody;
let chaseCam, chaseCamPivot;
let view = new THREE.Vector3();
let speed = 0,
  maxSpeed = 1,
  acceleration = 0.25,
  angle = 0;
let speederModel;
let soundSpeeder;

initCannon();
initThree();
initChaseCam();
initSound();
initModel();

function initChaseCam() {
  chaseCam = new THREE.Object3D();
  chaseCam.position.set(0, 0, 0);

  chaseCamPivot = new THREE.Object3D();
  chaseCam.position.set(0, 200, -300);

  chaseCam.add(chaseCamPivot);
  scene.add(chaseCam);
}

function initModel() {
  const loader = new GLTFLoader();
  loader.load("./assets/models/speeder.gltf", function (gltf) {
    speederModel = gltf.scene;
    speederModel.scale.set(0.02, 0.02, 0.02);
    speederModel.position.copy(boxBody.position);
    speederModel.quaternion.copy(boxBody.quaternion);

    speederModel.add(chaseCam);
    scene.add(speederModel);
  });
}

function initSound() {
  const listener = new THREE.AudioListener();
  camera.add(listener);

  soundSpeeder = new THREE.Audio(listener);

  const audioLoader = new THREE.AudioLoader();
  audioLoader.load("./assets/sounds/aud.mp3", function (buffer) {
    soundSpeeder.setBuffer(buffer);
    soundSpeeder.setLoop(true);
    soundSpeeder.setVolume(0.5);
  });
}
function initCannon() {
  timestep = 1 / 60;

  world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.81, 0),
  });

  const boxPhysMaterial = new CANNON.Material();
  const groundPhysMaterial = new CANNON.Material();

  const groundBoxContactMat = new CANNON.ContactMaterial(
    boxPhysMaterial,
    groundPhysMaterial,
    {
      restitution: 0.1,
    }
  );

  world.addContactMaterial(groundBoxContactMat);

  groundBody = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Plane(),
    material: groundPhysMaterial,
  });
  world.addBody(groundBody);
  groundBody.quaternion.setFromAxisAngle(
    new CANNON.Vec3(1, 0, 0),
    -Math.PI / 2
  );

  boxBody = new CANNON.Body({
    mass: 500,
    shape: new CANNON.Box(new CANNON.Vec3(2, 1.5, 3)),
    position: new CANNON.Vec3(0, 10, 0),
    material: boxPhysMaterial,
  });

  world.addBody(boxBody);
  cannonDebugger = new CannonDebugger(scene, world, {
    color: 0x0000ff,
  });
}

function initThree() {
  const ambientLight = new THREE.AmbientLight(0xffffff);
  scene.add(ambientLight);

  const texture = new THREE.TextureLoader().load(
    "./assets/textures/concrete/diff.jpg"
  );
  const displacementMap = new THREE.TextureLoader().load(
    "./assets/textures/concrete/disp.png"
  );
  const norm = new THREE.TextureLoader().load(
    "./assets/textures/concrete/norm.png"
  );
  const arm = new THREE.TextureLoader().load(
    "./assets/textures/concrete/arm.jpg"
  );
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(64, 64);
  displacementMap.wrapS = THREE.RepeatWrapping;
  displacementMap.wrapT = THREE.RepeatWrapping;
  displacementMap.repeat.set(64, 64);
  arm.wrapS = THREE.RepeatWrapping;
  arm.wrapT = THREE.RepeatWrapping;
  arm.repeat.set(64, 64);

  const planeGeometry = new THREE.PlaneGeometry(1000, 1000, 64, 64);
  const planeMaterial = new THREE.MeshStandardMaterial({
    map: texture,
    displacementMap: displacementMap,
    displacementScale: 1,
    aoMap: arm,
    roughnessMap: arm,
  });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  scene.add(plane);
  plane.position.copy(groundBody.position);
  plane.quaternion.copy(groundBody.quaternion);
}

document.onkeydown = (event) => {
  switch (event.key) {
    case "w":
      speed += acceleration;
      if (speed > maxSpeed) speed = maxSpeed;
      if (!soundSpeeder.isPlaying) soundSpeeder.play();
      break;
    case "s":
      speed -= acceleration;
      if (speed < 0) {
        speed = 0;
      }
      if (speed === 0) {
        if (soundSpeeder.isPlaying) soundSpeeder.stop();
      }
      break;
    case "a":
      angle += Math.PI / 180;
      break;
    case "d":
      angle -= Math.PI / 180;
      break;
  }

  boxBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), angle);
};

function moveSpeeder() {
  boxBody.position.x += speed * Math.sin(angle);
  boxBody.position.z += speed * Math.cos(angle);

  if (speederModel) {
    speederModel.position.copy(boxBody.position);
    speederModel.quaternion.copy(boxBody.quaternion);

    camera.lookAt(speederModel.position);
  }
}

function animate() {
  world.step(timestep);
  // cannonDebugger.update();
  moveSpeeder();
  updateChaseCam();
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

function updateChaseCam() {
  chaseCamPivot.getWorldPosition(view);
  if (view.y < 1) view.y = 1;
  camera.position.lerpVectors(camera.position, view, 1);
}

window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
