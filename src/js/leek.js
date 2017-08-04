/**
 * @author ApiO / https://github.com/ApiO
 * @license MIT License
 * @from https://github.com/mrdoob/THREE.js/blob/master/examples/webgl_buffergeometry_instancing.html
 */
class Leek {
    constructor(renderCallback, compatibilityIssue) {
        this.gui = null;
        this.mouse = new THREE.Vector2();
        this.container = null;
        this.renderCallback = renderCallback;
        this.compatibilityIssue = compatibilityIssue;
        this.config = {
            pointSize: 0.05,
            width: 150,
            length: 150,
            threshold: 0.03,
            rotateY: 0,
            navigation: { offset: 0.2, axisMin: -10, axisMax: 10 },
            clearColor: 0x000000,
            defaultClearColor: 0x000000,
            /*shader: {
                vertex: { path: "../src/js/shaders/vertex.glsl", content: null },
                fragment: { path: "../src/js/shaders/fragment.glsl", content: null }
            },*/
            controls: {
                rotateSpeed: 2.0,
                zoomSpeed: 2.0,
                panSpeed: 0.8,
                noZoom: false,
                noPan: false,
                staticMoving: true,
                dynamicDampingFactor: 0.3,
                keys: [65, 83, 68]
            }
        };
        this.ctx = {
            renderer: null,
            scene: null,
            fog: null,
            controls: null,
            camera: null,
            rotateMatrix: null,
            raycaster: null,
            pointclouds: null,
            spheres: []
        };
    }

    // INTERNALS
    _getShader(shaderInfo) {
        $.ajax({
            type: "GET",
            dataType: "text",
            url: shaderInfo.path,
            success: function (data) {
                shaderInfo.content = data;
            }
        });
    }

    _loadGeometry(self) {
        const pcBuffer = Leek.generatePointcloud(new THREE.Color(0.4, 0.722, 1), self.config);
        pcBuffer.scale.set(10, 10, 10);
        pcBuffer.position.set(-5, 0, 5);
        self.ctx.scene.add(pcBuffer);

        const pcIndexed = Leek.generateIndexedPointcloud(new THREE.Color(0, 1, 0.68), self.config);
        pcIndexed.scale.set(10, 10, 10);
        pcIndexed.position.set(5, 0, 5);
        self.ctx.scene.add(pcIndexed);

        const pcIndexedOffset =
            Leek.generateIndexedWithOffsetPointcloud(new THREE.Color(1, 0.67, 0.298), self.config);
        pcIndexedOffset.scale.set(10, 10, 10);
        pcIndexedOffset.position.set(5, 0, -5);
        self.ctx.scene.add(pcIndexedOffset);

        const pcRegular = Leek.generateRegularPointcloud(new THREE.Color(0.819, 0.6, 1), self.config);
        pcRegular.scale.set(10, 10, 10);
        pcRegular.position.set(-5, 0, -5);
        self.ctx.scene.add(pcRegular);

        self.ctx.pointclouds = [pcBuffer, pcIndexed, pcIndexedOffset, pcRegular];
    }

    _loadGui() {
        const self = this;
        this.gui = new dat.GUI();

        //  builds menu
        this.gui.add(this.ctx.raycaster.params.Points, "threshold", { Absolute: 0.01, Accurate: 0.03, Ridiculous: 0.1 }).listen();
        this.gui.add(this.ctx.camera.position, "x", this.config.navigation.axisMin, this.config.navigation.axisMax).listen();
        this.gui.add(this.ctx.camera.position, "y", this.config.navigation.axisMin, this.config.navigation.axisMax).listen();
        this.gui.add(this.ctx.camera.position, "z", this.config.navigation.axisMin, this.config.navigation.axisMax).listen();

        const rotateController = this.gui.add(this.config, "rotateY", { Stopped: 0, Slow: 0.005, Fast: 0.01, Foo: 0.02 }).listen();
        rotateController.onChange(function (value) {
            self.ctx.rotateMatrix = new THREE.Matrix4().makeRotationY(value);
        });

        const colorController = this.gui.addColor(this.config, "clearColor").listen();
        this.gui.add(this, "reset");

        // special behavior
        colorController.onChange(function (value) {
            self.ctx.renderer.setClearColor(value);
        });
    }

    _initialize(self) {
        self.container = document.createElement("div");
        self.container.Id = "leek";
        document.body.appendChild(self.container);

        // scene

        self.ctx.scene = new THREE.Scene();
        self.ctx.scene.add(new THREE.AxisHelper(.5));

        // fog

        self.ctx.scene.fog = new THREE.FogExp2(0x000000, 0.08);

        // geomerties

        self._loadGeometry(self);

        // camera

        self.ctx.camera = new THREE.PerspectiveCamera(45,
            window.innerWidth / window.innerHeight,
            self.config.navigation.zMin,
            self.config.navigation.zMax);
        self.ctx.camera.position.z = 2;
        self.ctx.camera.position.y = .5;

        // raycast

        self.ctx.raycaster = new THREE.Raycaster();
        self.ctx.raycaster.params.Points.threshold = self.config.threshold;

        // renderer

        self.ctx.renderer = new THREE.WebGLRenderer();
        const extension = "ANGLE_instanced_arrays";
        if (!self.ctx.renderer.extensions.get(extension)) {
            if (compatibilityIssue) {
                compatibilityIssue();
            }
            return;
        }

        self.ctx.renderer.setClearColor(self.config.clearColor);
        self.ctx.renderer.setPixelRatio(window.devicePixelRatio);
        self.ctx.renderer.setSize(window.innerWidth, window.innerHeight);
        self.ctx.renderer.sortObjects = false;
        self.container.appendChild(self.ctx.renderer.domElement);

        // lights
        //*
        var light = new THREE.DirectionalLight(0x00ff00);
        light.position.set(1, 1, 1);
        self.ctx.scene.add(light);
        //*/
        //*
        light = new THREE.DirectionalLight(0x002288);
        light.position.set(-1, -1, -1);
        self.ctx.scene.add(light);
        //*/
        //*
        light = new THREE.AmbientLight(0x222222);
        self.ctx.scene.add(light);
        //*/

        // events

        $(document).on("keypress", function (e) { self._onKeyPress(e, self); });
        window.addEventListener("resize", function () { self._onWindowResize(self); }, false);
        self.container.addEventListener("mousemove", function () { self._onMouseMove(event, self); }, false);

        self._initializeControls(self);

        self._loadGui();

        self._animate(self);
    }

    _initializeControls(self) {
        self.ctx.controls = new THREE.TrackballControls(self.ctx.camera);

        for (let property in self.config.controls) {
            if (self.ctx.controls.hasOwnProperty(property)) {
                self.ctx.controls[property] = self.config.controls[property];
            } else {
                console.error(`Property '${property}' not found in TrackballControls`);
            }
        }
    }

    // STATICS
    static generatePointCloudGeometry(color, config) {
        const geometry = new THREE.BufferGeometry();
        const numPoints = config.width * config.length;
        const positions = new Float32Array(numPoints * 3);
        const colors = new Float32Array(numPoints * 3);
        let k = 0;
        for (let i = 0; i < config.width; i++) {
            for (let j = 0; j < config.length; j++) {
                const u = i / config.width;
                const v = j / config.length;
                const x = u - 0.5;
                const y = (Math.cos(u * Math.PI * 8) + Math.sin(v * Math.PI * 8)) / 20;
                const z = v - 0.5;
                positions[3 * k] = x;
                positions[3 * k + 1] = y;
                positions[3 * k + 2] = z;
                const intensity = (y + 0.1) * 5;
                colors[3 * k] = color.r * intensity;
                colors[3 * k + 1] = color.g * intensity;
                colors[3 * k + 2] = color.b * intensity;
                k++;
            }
        }
        geometry.addAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.addAttribute("color", new THREE.BufferAttribute(colors, 3));
        geometry.computeBoundingBox();
        return geometry;
    }

    static generatePointcloud(color, config) {
        const geometry = Leek.generatePointCloudGeometry(color, config);
        const material = new THREE.PointsMaterial({
            size: config.pointSize,
            vertexColors: THREE.VertexColors,
            shading: THREE.FlatShading
        });
        const pointcloud = new THREE.Points(geometry, material);
        return pointcloud;
    }

    static generateIndexedPointcloud(color, config) {
        const geometry = Leek.generatePointCloudGeometry(color, config);
        const numPoints = config.width * config.length;
        const indices = new Uint16Array(numPoints);
        let k = 0;
        for (let i = 0; i < config.width; i++) {
            for (let j = 0; j < config.length; j++) {
                indices[k] = k;
                k++;
            }
        }
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        const material = new THREE.PointsMaterial({
            size: config.pointSize,
            vertexColors: THREE.VertexColors,
            shading: THREE.FlatShading
        });
        const pointcloud = new THREE.Points(geometry, material);
        return pointcloud;
    }

    static generateIndexedWithOffsetPointcloud(color, config) {
        const geometry = Leek.generatePointCloudGeometry(color, config);
        const numPoints = config.width * config.length;
        const indices = new Uint16Array(numPoints);
        let k = 0;
        for (let i = 0; i < config.width; i++) {
            for (let j = 0; j < config.length; j++) {
                indices[k] = k;
                k++;
            }
        }
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        geometry.addGroup(0, indices.length);
        const material = new THREE.PointsMaterial({
            size: config.pointSize,
            vertexColors: THREE.VertexColors,
            shading: THREE.FlatShading
        });
        const pointcloud = new THREE.Points(geometry, material);
        return pointcloud;
    }

    static generateRegularPointcloud(color, config) {
        const geometry = new THREE.Geometry();
        const colors = [];
        let k = 0;
        for (let i = 0; i < config.width; i++) {
            for (let j = 0; j < config.length; j++) {
                const u = i / config.width;
                const v = j / config.length;
                const x = u - 0.5;
                const y = (Math.cos(u * Math.PI * 8) + Math.sin(v * Math.PI * 8)) / 20;
                const z = v - 0.5;
                geometry.vertices.push(new THREE.Vector3(x, y, z));
                const intensity = (y + 0.1) * 7;
                colors[k] = (color.clone().multiplyScalar(intensity));
                k++;
            }
        }
        geometry.colors = colors;
        geometry.computeBoundingBox();
        const material = new THREE.PointsMaterial({
            size: config.pointSize,
            vertexColors: THREE.VertexColors,
            shading: THREE.FlatShading
        });
        const pointcloud = new THREE.Points(geometry, material);
        return pointcloud;
    }

    // EVENTS
    _onWindowResize(self) {
        self.ctx.camera.aspect = window.innerWidth / window.innerHeight;
        self.ctx.camera.updateProjectionMatrix();

        self.ctx.renderer.setSize(window.innerWidth, window.innerHeight);

        self.ctx.controls.handleResize();
    }

    _onMouseMove(event, self) {
        event.preventDefault();
        self.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        self.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    _onKeyPress(event, self) {
        self.ctx.raycaster.setFromCamera(self.mouse, self.ctx.camera);

        const intersections = self.ctx.raycaster.intersectObjects(self.ctx.pointclouds);

        // clean previous hits
        for (let i = 0; i < self.ctx.spheres.length; i++) {
            self.ctx.scene.remove(self.ctx.spheres[i]);
        }
        self.ctx.spheres = [];

        if (intersections.length === 0) return;

        // draw new hits
        const sphereGeometry = new THREE.SphereGeometry(0.02, 32, 32);
        const firstHitMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            shading: THREE.FlatShading
        });
        const hitMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            shading: THREE.FlatShading
        });
        for (let i = 0; i < intersections.length; i++) {
            const sphere = new THREE.Mesh(sphereGeometry, i === 0 ? firstHitMaterial : hitMaterial);
            sphere.position.set(
                intersections[i].point.x,
                intersections[i].point.y,
                intersections[i].point.z);

            self.ctx.scene.add(sphere);
            self.ctx.spheres.push(sphere);
        }

        console.log(`hits '${intersections.length}'` );
    }

    // THREE JS impl
    _animate(self) {
        window.requestAnimationFrame(function () { self._animate(self); });

        self.ctx.controls.update();

        self._render(self);
    }

    _render(self) {
        if (self.config.rotateY > 0) {
            self.ctx.camera.applyMatrix(self.ctx.rotateMatrix);
            //self.ctx.camera.updateMatrixWorld();
        }

        self.ctx.renderer.render(self.ctx.scene, self.ctx.camera);

        if (self.renderCallback !== null) {
            self.renderCallback();
        }
    }

    // PUBLIC
    start() {
        // loads ressources and then _initialize application
        /*
        var self = this;
        $.when(
            self._getShader(self.config.shader.vertex),
            self._getShader(self.config.shader.fragment)
        ).then(
            function () {
                self._initialize(self);
            },
            function (data) { console.error("Loading resources failed.", data); }
            );
        */
        this._initialize(this);
    }

    reset() {
        this.config.animate = false;
        this.ctx.camera.position.x = 0;
        this.ctx.camera.position.y = .5;
        this.ctx.camera.position.z = 2;
        this.config.clearColor = this.config.defaultClearColor;
        this.ctx.renderer.setClearColor(this.config.clearColor);

        const object = this.ctx.scene.children[0];
        if (object) {
            object.rotation.y = 0.0;
        }
    }
};