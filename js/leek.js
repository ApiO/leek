/**
 * @author ApiO / https://github.com/ApiO
 * @license MIT License
 * @from https://github.com/mrdoob/three.js/blob/master/examples/webgl_buffergeometry_instancing.html
 */
"use strict";

var Leek = function (renderCallback) {
    // atr
    var self = this;
    self.ctx =
    {
        camera: null,
        scene: null,
        renderer: null
        //raycaster: null,
    };
    self.gui = null;
    self.mouse = null;
    self.container = null;
    //self.intersected = null;
    self.renderCallback = renderCallback;
    self.config = {
        elementNumber: 1000,
        maxElementNumber: 100000,
        animate: false,
        navigation: { offset: 0.1, zMin: 1, zMax: 10 },
        clearColor: 0x000000,
        defaultClearColor: 0x000000,
        shader: {
            vertex: { path: "./js/shaders/vertex.glsl", content: null },
            fragment: { path: "./js/shaders/fragment.glsl", content: null }
        }
    };
    // init
    self.start = function () {
        // loads ressources and then initialize application
        $.when(
            self._getShader(self.config.shader.vertex),
            self._getShader(self.config.shader.fragment)
        ).then(
            self._initialize,
            function (data) { console.error("Loading resources failed.", data); }
        );
    };
    self._getShader = function (shaderInfo) {
        $.ajax({
            type: "GET",
            dataType: "text",
            url: shaderInfo.path,
            success: function (data) {
                shaderInfo.content = data;
            }
        });
    };
    self._initialize = function () {
        self.mouse = new THREE.Vector2();

        self.container = document.createElement("div");
        document.body.appendChild(self.container);

        // scene
        self.ctx.scene = new THREE.Scene();
        self._loadGeometry();

        // material
        let material = new THREE.RawShaderMaterial({
            uniforms: {
                time: { value: 1.0 },
                sineTime: { value: 1.0 }
            },
            vertexShader: self.config.shader.vertex.content,
            fragmentShader: self.config.shader.fragment.content,
            side: THREE.DoubleSide,
            transparent: true
        });

        // mesh
        let mesh = new THREE.Mesh(self.geometry, material);
        self.ctx.scene.add(mesh);

        // camera
        self.ctx.camera = new THREE.PerspectiveCamera(45,
                                        window.innerWidth / window.innerHeight,
                                        self.config.navigation.zMin,
                                        self.config.navigation.zMax);
        self.ctx.camera.position.z = 2;

        // raycast
        //self.ctx.raycaster = new THREE.Raycaster();

        // renderer
        self.ctx.renderer = new THREE.WebGLRenderer();
        if (self.ctx.renderer.extensions.get("ANGLE_instanced_arrays") === false) {
            document.getElementById("notSupported").style.display = "block";
            return;
        }
        self.ctx.renderer.setClearColor(self.config.clearColor);
        self.ctx.renderer.setPixelRatio(window.devicePixelRatio);
        self.ctx.renderer.setSize(window.innerWidth, window.innerHeight);
        self.ctx.renderer.sortObjects = false;
        self.container.appendChild(self.ctx.renderer.domElement);

        // events
        self.container.addEventListener("mousemove", self.onMouseMove, false);
        self.container.addEventListener("click", self.onClick, false);
        self.container.addEventListener("wheel", self.onMouseWheel);
        window.addEventListener("resize", self.onWindowResize, false);

        self._loadGui();

        self.animate();
    };
    self._loadGeometry = function () {
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
    };
    self._loadGui = function () {
        self.gui = new dat.GUI();

        //  builds menu
        self.gui.add(self.geometry, "maxInstancedCount", 1, self.config.maxElementNumber).listen();
        self.gui.add(self.ctx.camera.position, "z", self.config.navigation.zMin, self.config.navigation.zMax).listen();
        self.gui.add(self.config, "animate").listen();
        let colorController = self.gui.addColor(self.config, "clearColor").listen();
        self.gui.add(self, "reset");

        // special behavior
        colorController.onChange(function (value) {
            self.ctx.renderer.setClearColor(value);
        });
    };
    self.reset = function () {
        self.geometry.maxInstancedCount = self.config.elementNumber;
        self.config.animate = false;
        self.ctx.camera.position.z = 2;
        self.config.clearColor = self.config.defaultClearColor;
        self.ctx.renderer.setClearColor(self.config.clearColor);
    };
    // events
    self.onWindowResize = function () {
        self.ctx.camera.aspect = window.innerWidth / window.innerHeight;
        self.ctx.camera.updateProjectionMatrix();
        self.ctx.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    self.onMouseMove = function (event) {
        event.preventDefault();
        self.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        self.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    self.onClick = function () {
        console.info("TODO", self.mouse);
        //if (self.intersected != null) {
        //    console.log(self.intersected.uuid);
        //}
    };
    self.onMouseWheel = function (wheelEvent) {
        let value = self.ctx.camera.position.z
            + (wheelEvent.wheelDelta < 0 ? 1 : -1) * self.config.navigation.offset;

        if (value < self.config.navigation.zMin) {
            value = self.config.navigation.zMin;
        } else if (value > self.config.navigation.zMax) {
            value = self.config.navigation.zMax;
        }

        self.ctx.camera.position.z = value;
    };
    // threejs impl
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
            let object = self.ctx.scene.children[0];
            object.rotation.y = time * 0.0005;
            object.material.uniforms.time.value = time * 0.005;
            //object.material.uniforms.sineTime.value = Math.sin(object.material.uniforms.time.value * 0.05);
        }

        //// find intersections
        //self.ctx.raycaster.setFromCamera(self.mouse, self.ctx.camera);
        //const intersects = self.ctx.raycaster.intersectObjects(self.ctx.scene.children);
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

        self.ctx.renderer.render(self.ctx.scene, self.ctx.camera);
    };
};