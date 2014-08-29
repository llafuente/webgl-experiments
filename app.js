var App = function() {
    this.clock = new THREE.Clock();
    this.cameras = [];
    this.controls = [];
    this.shaders = {};
    this.images = {};

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

App.prototype.init = function(options) {
    this.options = jQuery.extend({
        width: 0,
        height: 0,
        cameras: [{
            background: 0xcc0000,
            width: 0.5,
            height: 0.5,
            left: 0,
            bottom: 0,
            position: {x: 500, y: 500, z: 500},
            lookAt: {x: 0, y: 0, z:0}
        },{
            background: 0x00cc00,
            width: 0.5,
            height: 0.5,
            left: 0.5,
            bottom: 0,
            position: {x: 1000, y: 1000, z: -1000},
            lookAt: {x: 0, y: 0, z: 0}
        },{
            background: 0x00cc00,
            width: 0.5,
            height: 0.5,
            left: 0,
            bottom: 0.5,
            position: {x: 1000, y: 1000, z: -1000},
            lookAt: {x: 0, y: 0, z: 0}
        },{
            background: 0xcc0000,
            width: 0.5,
            height: 0.5,
            left: 0.5,
            bottom: 0.5,
            position: {x: 0, y: 1000, z: 0},
            lookAt: {x: 0, y: 0, z: 0}
        }],
        images: []
    }, options || {});

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
        document.addEventListener(ev_name, function (event) {
            event.preventDefault();
            self.emit(ev_name, event);
        }, false );
    });

    window.addEventListener( 'keydown', function (event) {
        event.preventDefault();
        self.emit('keydown', event);
    }, false );

    this.on("mousedown", function(event) {
        console.log("app - onMouseDown");
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
                py >= cam.$cfg.bottom &&
                px <= cam.$cfg.left + cam.$cfg.width &&
                py <= cam.$cfg.bottom + cam.$cfg.height) {
                console.log(i, "found camera");
                self.lastSelectedCamera = cam;
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
        var width = cfg.width * this.options.width;
        var height = cfg.height * this.options.height;

        var camera = new THREE.OrthographicCamera(
            0.5 * width / - 2,
            0.5 * width / 2,
            height / 2,
            height / - 2,
            0,
            5000
        );

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
            origin: new THREE.Mesh(new THREE.SphereGeometry(5, 5, 5), new THREE.MeshBasicMaterial( { color: 0x000088 } ))
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
    var controls = new THREE.OrbitControls(this);
    this.controls.push(controls);
    return ;

    var controls = new THREE.OrthographicTrackballControls(this.cameras);

    controls.lookSpeed = 0.0125;
    controls.movementSpeed = 500;
    controls.noFly = false;
    controls.lookVertical = true;
    controls.constrainVertical = true;
    controls.verticalMin = 1.5;
    controls.verticalMax = 2.0;

    controls.lon = 250;

    this.controls.push(controls);
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

        var left   = Math.floor( w_width  * cfg.left );
        var bottom = Math.floor( w_height * cfg.bottom );
        var width  = Math.floor( w_width  * cfg.width );
        var height = Math.floor( w_height * cfg.height );

        this.renderer.setViewport( left, bottom, width, height );
        this.renderer.setScissor( left, bottom, width, height );
        this.renderer.enableScissorTest ( true );
        this.renderer.setClearColor( cfg.background );

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

    this.render(delta);
    this.stats.update();
};

function buildAxis( src, dst, colorHex, dashed ) {
    var geom = new THREE.Geometry(),
        mat;

    if(dashed) {
        mat = new THREE.LineDashedMaterial({ linewidth: 3, color: colorHex, dashSize: 3, gapSize: 3 });
    } else {
        mat = new THREE.LineBasicMaterial({ linewidth: 3, color: colorHex });
    }

    //mat.depthTest = false;
    //mat.depthWrite = false;

    geom.vertices.push( src.clone() );
    geom.vertices.push( dst.clone() );
    geom.computeLineDistances(); // This one is SUPER important, otherwise dashed lines will appear as simple plain lines

    var axis = new THREE.Line( geom, mat, THREE.LinePieces );

    return axis;
}

App.prototype.displayAxes = function(length) {
    if (!this.axes) {
        length = length || 100;
        this.axes = new THREE.Object3D();

        this.axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( length, 0, 0 ), 0xFF0000, false ) ); // +X
        this.axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( -length, 0, 0 ), 0xFF0000, true) ); // -X
        this.axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, length, 0 ), 0x00FF00, false ) ); // +Y
        this.axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, -length, 0 ), 0x00FF00, true ) ); // -Y
        this.axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, length ), 0x0000FF, false ) ); // +Z
        this.axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, -length ), 0x0000FF, true ) ); // -Z

        this.scene.add(this.axes);
    }
}
