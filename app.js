var App = function() {
    this.clock = new THREE.Clock();
    this.cameras = [];
    this.controls = [];
    this.shaders = {};
    this.images = {};
    this.lastEvents = {};

    this.container = document.createElement('div');
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
App.prototype.lastEvents = {};

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

    this.attachInputs();

    this.createRenderer();

    this.scene = new THREE.Scene();

    this.createCameras(this.options.cameras);
    this.createControls();

    this.createScene();
};

App.prototype.start = function() {
    var self = this;

    this.preload(function() {
        self.update();
    });
};
App.prototype.shaders = {};
App.prototype.images = {};

App.prototype.preload = function(callback) {
    // preload
    var items_to_load = 0,
        self = this;

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
                  self.shaders[$(el).attr("id")] = txt;

                  loaded(src);
               },
               dataType: 'application/javascript'
            });
        } else {
            // no need to load, it's in the body
            --items_to_load;
            this.shaders[$(el).attr("id")] = el.textContent;
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

    ['mousedown', 'mousewheel', 'mouseup', 'mousemove', 'contextmenu', 'touchstart', 'touchend', 'touchmove', 'DOMMouseScroll'].forEach(function(ev_name) {
        //document.addEventListener(ev_name, function (event) {
        self.container.addEventListener(ev_name, function (event) {
            event.preventDefault();
            event.stopPropagation();

            self.emit(ev_name, event);

            self.lastEvents[ev_name] = event;
        }, false);
    });

    window.addEventListener('keydown', function (event) {
        //event.preventDefault();
        //event.stopPropagation();

        self.emit('keydown', event);
    }, false);

    this.on("mousedown", function(event) {
        console.log("app - onMouseDown");
        if (self.lastEvents.mousedown) {
            console.log("app - onMouseDown - diff: ",
                event.clientX - self.lastEvents.mousedown.clientX,
                event.clientY - self.lastEvents.mousedown.clientY
           );
        }
        // choose the valid camera
        var i,
            px = event.clientX / self.options.width,
            py = 1 - (event.clientY / self.options.height),
            cam;

        if (px > 1 || py > 1) return;

        for (i = 0; i < self.cameras.length; ++i) {
            console.log(i, px, py, self.cameras[i].$cfg);
            cam = self.cameras[i];

            if (px >= cam.$cfg.left &&
                px <= cam.$cfg.right &&
                py >= cam.$cfg.bottom &&
                py <= cam.$cfg.top) {
                console.log(i, "found camera");
                self.lastSelectedCamera = cam;

                // add relative-to-camera-screen coords
                var cameraH = (cam.$cfg.top - cam.$cfg.bottom) * self.options.height;
                event.cameraX = event.clientX - (cam.$cfg.left * self.options.width);
                event.cameraIY = (event.clientY - ((1 - cam.$cfg.top) * self.options.height));
                event.cameraY = cameraH - event.cameraIY;
                //console.log(event.cameraX, event.cameraY);
                return;
            }
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
    renderer.shadowMapSoft = true;
    renderer.shadowMapType = THREE.PCFShadowMap;

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

App.prototype.update = function() {
    var delta = this.clock.getDelta();

    requestAnimationFrame(this.update.bind(this));

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
