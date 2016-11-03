/**
 * @author ApiO / https://github.com/ApiO
 * @from https://github.com/mrdoob/three.js/blob/master/examples/webgl_buffergeometry_instancing.html
 */
"use strict";

const vertexShader = (["precision highp float;"
    , "uniform float sineTime;"
    , "uniform mat4 modelViewMatrix;"
    , "uniform mat4 projectionMatrix;"
    , "attribute vec3 position;"
    , "attribute vec3 offset;"
    , "attribute vec4 color;"
    , "attribute vec4 orientationStart;"
    , "attribute vec4 orientationEnd;"
    , "varying vec3 vPosition;"
    , "varying vec4 vColor;"
    , "void main(){"
    , "	vPosition = offset * max(abs(sineTime * 2.0 + 1.0), 0.5) + position;"
    , "	vec4 orientation = normalize(mix(orientationStart, orientationEnd, sineTime));"
    , "	vec3 vcV = cross(orientation.xyz, vPosition);"
    , "	vPosition = vcV * (2.0 * orientation.w) + (cross(orientation.xyz, vcV) * 2.0 + vPosition);"
    , "	vColor = color;"
    , "	gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition, 1.0);"
    , "}"]).join("\n");

const fragmentShader = (["precision highp float;"
    , "uniform float time;"
    , "varying vec3 vPosition;"
    , "varying vec4 vColor;"
    , "void main() {"
    , "	vec4 color = vec4( vColor );"
    , "	color.r += sin( vPosition.x * 10.0 + time ) * 0.5;"
    , "	gl_FragColor = color;"
    , "}"]).join("\n");

var Leek = function (renderCallback) {
    // atr
    var self = this;
    self.container = null;
    self.camera = null;
    self.scene = null;
    self.raycaster = null;
    self.renderer = null;
    self.mouse = null;
    self.intersected = null;
    self.renderCallback = renderCallback;
    self.gui = null;
    self.config = {
        elementNumber: 1000,
        maxElementNumber: 100000,
        animate: false,
        navigation: {
            offset: 0.1,
            zMin: 1,
            zMax: 10
        },
        clearColor: 0x000000,
        defaultClearColor: 0x000000
    };
    // func
    self.start = function () {
        self.mouse = new THREE.Vector2();

        self.container = document.createElement("div");
        document.body.appendChild(self.container);

        self.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, self.config.navigation.zMin, self.config.navigation.zMax);
        self.camera.position.z = 2;

        self.scene = new THREE.Scene();

        self._loadData();

        self.raycaster = new THREE.Raycaster();

        self.renderer = new THREE.WebGLRenderer();
        if (self.renderer.extensions.get("ANGLE_instanced_arrays") === false) {
            document.getElementById("notSupported").style.display = "block";
            return;
        }
        self.renderer.setClearColor(self.config.clearColor);
        self.renderer.setPixelRatio(window.devicePixelRatio);
        self.renderer.setSize(window.innerWidth, window.innerHeight);
        self.renderer.sortObjects = false;
        self.container.appendChild(self.renderer.domElement);

        // evt
        document.addEventListener("mousemove", self.onDocumentMouseMove, false);
        document.addEventListener("click", self.onDocumentClick, false);
        document.addEventListener("wheel", self.onDocumentMouseWheel);
        window.addEventListener("resize", self.onWindowResize, false);

        self._loadGui();

        self.animate();
    };
    self._loadData = function () {
        self.geometry = new THREE.InstancedBufferGeometry();

        self.geometry.maxInstancedCount = self.config.elementNumber;

        let vertices = new THREE.BufferAttribute(new Float32Array(3 * 3), 3);
        vertices.setXYZ(0, 0.025, -0.025, 0);
        vertices.setXYZ(1, -0.025, 0.025, 0);
        vertices.setXYZ(2, 0, 0, 0.025);

        self.geometry.addAttribute("position", vertices);

        let offsets = new THREE.InstancedBufferAttribute(new Float32Array(self.config.maxElementNumber * 3), 3, 1);
        for (let i = 0, ul = offsets.count; i < ul; i++) {
            offsets.setXYZ(i, Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
        }
        self.geometry.addAttribute("offset", offsets);

        let colors = new THREE.InstancedBufferAttribute(new Float32Array(self.config.maxElementNumber * 4), 4, 1);
        for (let i = 0, ul = colors.count; i < ul; i++) {
            colors.setXYZW(i, Math.random(), Math.random(), Math.random(), Math.random());
        }
        self.geometry.addAttribute("color", colors);

        let vector = new THREE.Vector4();
        let orientationsStart = new THREE.InstancedBufferAttribute(new Float32Array(self.config.maxElementNumber * 4), 4, 1);
        for (let i = 0, ul = orientationsStart.count; i < ul; i++) {
            vector.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
            vector.normalize();
            orientationsStart.setXYZW(i, vector.x, vector.y, vector.z, vector.w);
        }
        self.geometry.addAttribute("orientationStart", orientationsStart);

        let orientationsEnd = new THREE.InstancedBufferAttribute(new Float32Array(self.config.maxElementNumber * 4), 4, 1);
        for (let i = 0, ul = orientationsEnd.count; i < ul; i++) {
            vector.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
            vector.normalize();
            orientationsEnd.setXYZW(i, vector.x, vector.y, vector.z, vector.w);
        }

        self.geometry.addAttribute("orientationEnd", orientationsEnd);

        // material
        let material = new THREE.RawShaderMaterial({
            uniforms: {
                time: { value: 1.0 },
                sineTime: { value: 1.0 }
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            side: THREE.DoubleSide,
            transparent: true
        });
        let mesh = new THREE.Mesh(self.geometry, material);
        self.scene.add(mesh);
    };
    self._loadGui = function() {
        self.gui = new dat.GUI();
        self.gui.add(self.geometry, "maxInstancedCount", 1, self.config.maxElementNumber).listen();
        self.gui.add(self.camera.position, "z", self.config.navigation.zMin, self.config.navigation.zMax).listen();
        self.gui.add(self.config, "animate").listen();
        var colorController = self.gui.addColor(self.config, "clearColor").listen();
        self.gui.add(self, "reset");
        
        // tuning
        colorController.onChange(function (value) {
            self.renderer.setClearColor(value);
        });
    };
    self.reset = function () {
        self.geometry.maxInstancedCount = self.config.elementNumber;
        self.config.animate = false;
        self.camera.position.z = 2;
        self.config.clearColor = self.config.defaultClearColor;
        self.renderer.setClearColor(self.config.clearColor);
    };
    self.onWindowResize = function () {
        self.camera.aspect = window.innerWidth / window.innerHeight;
        self.camera.updateProjectionMatrix();
        self.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    self.onDocumentMouseMove = function (event) {
        event.preventDefault();
        self.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        self.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    self.onDocumentClick = function () {
        if (self.intersected != null) {
            console.log(self.intersected.uuid);
        }
    };
    self.onDocumentMouseWheel = function (wheelEvent) {
        let value = self.camera.position.z
            + (wheelEvent.wheelDelta < 0 ? 1 : -1) * self.config.navigation.offset;

        if (value < self.config.navigation.zMin) {
            value = self.config.navigation.zMin;
        }
        else if (value > self.config.navigation.zMax) {
            value = self.config.navigation.zMax;
        }

        self.camera.position.z = value;
    };
    self.animate = function () {
        requestAnimationFrame(self.animate);
        self.render();
        if (self.renderCallback !== null) {
            self.renderCallback();
        }
    };
    self.render = function () {
        if (self.config.animate) {
            const time = performance.now();
            let object = self.scene.children[0];
            object.rotation.y = time * 0.0005;
            object.material.uniforms.time.value = time * 0.005;
            //object.material.uniforms.sineTime.value = Math.sin(object.material.uniforms.time.value * 0.05);
        }

        //// find intersections
        //self.raycaster.setFromCamera(self.mouse, self.camera);
        //const intersects = self.raycaster.intersectObjects(self.scene.children);
        //if (intersects.length > 0) {
        //    if (self.intersected !== intersects[0].object) {
        //        //console.log(intersects, self.intersected);
        //        //
        //        //debugger;
        //        //if (self.intersected) self.intersected.material.emissive.setHex(self.intersected.currentHex);
        //        //self.intersected = intersects[0].object;
        //        //self.intersected.currentHex = self.intersected.material.emissive.getHex();
        //        //self.intersected.material.emissive.setHex(0xff0000);
        //        //
        //    }
        //} else {
        //    if (self.intersected) self.intersected.material.emissive.setHex(self.intersected.currentHex);
        //    self.intersected = null;
        //}

        self.renderer.render(self.scene, self.camera);
    };
};