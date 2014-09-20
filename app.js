var App = function() {
    this.clock = new THREE.Clock();
    this.cameras = [];
    this.controls = [];
    this.shaders = {};
    this.images = {};
    this.uniforms = {};
    this.materials = {};
    this.lastEvents = {};
    this.running = false;

    this.container = document.getElementById('container');
    document.body.appendChild(this.container);

    var stats = this.stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    this.container.appendChild(stats.domElement);
};

App.prototype = jQuery.extend({}, EventEmitter.prototype);

App.prototype.container = null;
App.prototype.clock = null;
App.prototype.stats = null;
App.prototype.cameras = null;
App.prototype.lastSelectedCamera = null;
App.prototype.controls = null;
App.prototype.renderer = null;
App.prototype.scene = null;
App.prototype.shaders = null;
App.prototype.images = null;
App.prototype.uniforms = null;
App.prototype.materials = null;
App.prototype.lastEvents = {};
App.prototype.running = false;

App.prototype.init = function(options) {
    this.options = jQuery.extend({
        width: 0,
        height: 0,
        cameras: [],
        images: []
    }, options || {});

    if (!this.options.cameras.length) {
        throw new Error("options.camera is empty?!");
    }

    console.log(this.options);

    var self = this;

    this.preload(function() {
        self.attachInputs();

        self.createRenderer();

        self.scene = new THREE.Scene();

        self.createCameras(self.options.cameras);
        self.createControls();

        self.createScene();
    });
};

App.prototype.start = function(force_timeout) {
    var self = this;

    this.running = true;
    self.update(force_timeout);
};

App.prototype.stop = function() {
    var self = this;

    this.running = false;
};

App.prototype.shaders = {};
App.prototype.images = {};

App.prototype.preload = function(callback) {
    // preload
    var items_to_load = 0,
        self = this;

    function apply_replacements(shader) {
        Object.keys(THREE.ShaderChunk).forEach(function(key) {
            //console.log("replacements", key);
            shader = shader.replace('%%' +key+'%%', THREE.ShaderChunk[key]);
        });

        return shader;
    }
    function loaded(name) {
        console.log("asset [", name, "] loaded: ", items_to_load);

        if (!--items_to_load) {
            callback && callback();
            self.emit("ready");
        }
    }

    var shader_list = jQuery.makeArray($("script")).filter(function(el) {
        return ["x-shader/x-vertex", "x-shader/x-fragment"].indexOf($(el).attr("type")) !== -1;
    });

    items_to_load += shader_list.length;

    shader_list.forEach(function(el) {
        var src = $(el).attr("data-src");
        if (src) {
            console.log("loading shader: ", el);
            $.ajax({
              url: src,
              complete: function(data){
                  var txt = data.responseText;
                  self.shaders[$(el).attr("id")] = apply_replacements(txt);

                  loaded(src);
               },
               dataType: 'application/javascript'
            });
        } else {
            // no need to load, it's in the body
            --items_to_load;
            this.shaders[$(el).attr("id")] = apply_replacements(el.textContent);
        }
    });

    items_to_load += this.options.images.length;

    this.options.images.forEach(function(src) {
        self.images[src] = THREE.ImageUtils.loadTexture(src, null, function() {
            loaded(src);
        }, function() {
            // error!? what to do in this case...
            loaded(src);
        });
    });
}
App.prototype.attachInputs = function() {
    var self = this;

    // jQuery mouse events
    ["click","dblclick","focusout","hover","mousedown","mouseenter","mouseleave","mousemove","mouseout","mouseover","mouseup"].forEach(function(ev_name) {
        jQuery(self.container)[ev_name](function (event) {
            event.preventDefault();
            event.stopPropagation();

            self.emit(ev_name, event);

            self.lastEvents[ev_name] = event;
        });
    });

    // touch/wheel event direct bind
    ['mousewheel', 'contextmenu', 'touchstart', 'touchend', 'touchmove', 'DOMMouseScroll'].forEach(function(ev_name) {
        self.container.addEventListener(ev_name, function (event) {
            event.preventDefault();
            event.stopPropagation();

            self.emit(ev_name, event);

            self.lastEvents[ev_name] = event;
        }, false);
    });

    // keyboard do not prevent this ones and attached to window
    ['keydown', 'keyup'].forEach(function(ev_name) {
        window.addEventListener(ev_name, function (event) {
            self.emit(ev_name, event);

            self.lastEvents[ev_name] = event;
        }, false);
    });

    function extend_mouse_events(event) {
        var i,
            px = event.clientX / self.options.width,
            py = 1 - (event.clientY / self.options.height),
            cam,
            cfg;

        if (px > 1 || py > 1) return;

        for (i = 0; i < self.cameras.length; ++i) {
            cam = self.cameras[i];
            cfg = cam.$cfg;

            if (px >= cfg.left &&
                px <= cfg.right &&
                py >= cfg.bottom &&
                py <= cfg.top) {

                // add relative-to-camera-screen coords
                var cameraH = (cfg.top - cfg.bottom) * self.options.height;

                event.camera = cam;

                event.cameraX = event.clientX - (cfg.left * self.options.width);
                event.cameraIY = (event.clientY - ((1 - cfg.top) * self.options.height));
                event.cameraY = cameraH - event.cameraIY;

                event.cameraRelX = event.cameraX / self.options.width;
                event.cameraRelIY = event.cameraIY / self.options.height;
                event.cameraRelY = event.cameraY / self.options.height;

                return ;
            }
        }

    }

    // custom behaviors, we should add more like mouseup/move/over
    this.on("mousedown", function(event) {
        // choose the valid camera
        extend_mouse_events(event);
        if (event.camera) {
            console.log("select camera", event.camera.$cfg.id);
            self.lastSelectedCamera = event.camera;
        }

        // raise more specific-events

        // The value of which will be 1 for the left button, 2 for the middle button, or 3 for the right button.
        switch(event.which) {
        case 1:
            this.emit("left-mousedown", event);
            break;
        case 2:
            this.emit("middle-mousedown", event);
            break;
        case 3:
            this.emit("right-mousedown", event);
            break;
        }
    });

};

App.prototype.createScene = function() {
    throw new Exception("implement this!");
};

App.prototype.createRenderer = function() {
    var renderer = this.renderer = new THREE.WebGLRenderer();
    renderer.setSize(this.options.width, this.options.height);

    renderer.shadowMapEnabled = true;
    renderer.shadowMapSoft = false;
    //renderer.shadowMapType = THREE.PCFShadowMap;
    //renderer.shadowMapType = THREE.BasicShadowMap;
    renderer.shadowMapType = THREE.PCFSoftShadowMap;

    this.container.appendChild(renderer.domElement);
};

/**
 * position
 * lookAt
 * frameStarted
 * frameEnded
 */
App.prototype.createCameras = function(camera_cfg) {
    camera_cfg.forEach(function(cfg) {
        cfg.aspectRatio = cfg.aspectRatio || 1;
        cfg.overrideMaterial = cfg.overrideMaterial || null;

        cfg.height = (cfg.top - cfg.bottom) * this.options.height;
        cfg.width = (cfg.right - cfg.left) * this.options.width;

        var height = cfg.height * 0.5 / cfg.aspectRatio;
        var width = cfg.width * 0.5 / cfg.aspectRatio;

        console.log("create camera", cfg.id, width, ",", height);

        var camera = new THREE.OrthographicCamera(
            width, -width,
            height, -height,
            10,
            5000
       );

        //camera.fov = Math.PI / 4;
        //camera.updateProjectionMatrix();

        if (cfg.position) {
            camera.position.x = cfg.position.x;
            camera.position.y = cfg.position.y;
            camera.position.z = cfg.position.z;
        }

        if (cfg.lookAt) {
            camera.lookAt(cfg.lookAt);
        }

        camera.$cfg = cfg;

        cfg.helpers = {
            frustum: new THREE.CameraHelper(camera),
            origin: new THREE.Mesh(new THREE.SphereGeometry(5, 5, 5), new THREE.MeshBasicMaterial({ color: 0x000088 }))
        };

        var self = this;

        camera.debug = function() {
            if (self.scene.children.indexOf(camera.helper) === -1) {
                cfg.helpers.origin.position.copy(camera.position);

                self.scene.add(cfg.helpers.frustum);
                self.scene.add(cfg.helpers.origin);
            } else {
                self.scene.remove(cfg.helpers.frustum);
                self.scene.remove(cfg.helpers.origin);
            }
        }

        this.cameras.push(camera);
    }.bind(this));

    this.lastSelectedCamera = this.cameras[0];
}
App.prototype.createControls = function() {
/*
    var controls = new THREE.OrbitControls(this);
    this.controls.push(controls);
    return ;


    var controls = new THREE.OrthographicTrackballControls(this);

    controls.lookSpeed = 0.0125;
    controls.movementSpeed = 500;
    controls.noFly = false;
    controls.lookVertical = true;
    controls.constrainVertical = true;
    controls.verticalMin = 1.5;
    controls.verticalMax = 2.0;

    controls.lon = 250;

    this.controls.push(controls);
*/
    this.controls.push(new THREE.OrthographicZoom(this));
    this.controls.push(new THREE.OrthographicPan(this));
};


App.prototype.render = function(delta) {
    var i = 0,
        max = this.cameras.length,
        cfg,
        w_width = this.options.width,
        w_height = this.options.height,
        cam;

    for (i = 0; i < max; ++i) {
        cam = this.cameras[i];
        cfg = cam.$cfg;

        var left   = Math.floor(w_width  * cfg.left);
        var bottom = Math.floor(w_height * cfg.bottom);
        var width  = Math.floor(w_width  * (cfg.right - cfg.left));
        var height = Math.floor(w_height * (cfg.top - cfg.bottom));

        //console.log("scissors", cfg.id, left, bottom, width, height);

        this.scene.overrideMaterial = cam.$cfg.overrideMaterial;

        // scissor
        if (max > 1) {
            this.renderer.setViewport(left, bottom, width, height);
            this.renderer.setScissor(left, bottom, width, height);
            this.renderer.enableScissorTest (true);
        }
        this.renderer.setClearColor(cfg.background);

        cfg.frameStarted && cfg.frameStarted(delta);

        this.renderer.render(this.scene, cam);

        cfg.frameEnded && cfg.frameEnded(delta);
    }

    max = this.controls.length;
    for (i = 0; i < max; ++i) {
        this.controls[i].update(delta);
    }
};

App.prototype.update = function(force_timeout) {
    if (!this.running) return;

    var delta = this.clock.getDelta();

    if (force_timeout) {
        var self = this;
        setTimeout(function() {
            self.update(force_timeout);
        }, force_timeout);
    } else {
        requestAnimationFrame(this.update.bind(this));
    }

    this.emit("frameStart", [delta]);

    this.render(delta);
    this.stats.update();

    this.emit("frameEnded", [delta]);
};

function buildAxis(src, dst, colorHex, dashed) {
    var geom = new THREE.Geometry(),
        mat;

    if(dashed) {
        mat = new THREE.LineDashedMaterial({ linewidth: 3, color: colorHex, dashSize: 3, gapSize: 3 });
    } else {
        mat = new THREE.LineBasicMaterial({ linewidth: 3, color: colorHex });
    }

    //mat.depthTest = false;
    //mat.depthWrite = false;

    geom.vertices.push(src.clone());
    geom.vertices.push(dst.clone());
    geom.computeLineDistances(); // This one is SUPER important, otherwise dashed lines will appear as simple plain lines

    var axis = new THREE.Line(geom, mat, THREE.LinePieces);

    return axis;
}

App.prototype.displayAxes = function(length) {
    if (!this.axes) {
        length = length || 100;
        this.axes = new THREE.Object3D();

        this.axes.add(buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(length, 0, 0), 0xFF0000, false)); // +X
        this.axes.add(buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(-length, 0, 0), 0xFF0000, true)); // -X
        this.axes.add(buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, length, 0), 0x00FF00, false)); // +Y
        this.axes.add(buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -length, 0), 0x00FF00, true)); // -Y
        this.axes.add(buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, length), 0x0000FF, false)); // +Z
        this.axes.add(buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -length), 0x0000FF, true)); // -Z

        this.scene.add(this.axes);
    }
}
