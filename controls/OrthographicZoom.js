THREE.OrthographicZoom = function (app, domElement ) {
    this.app = app;

    var STATE = {
            NONE: -1,
            ROTATE: 0,
            ZOOM: 1,
            PAN: 2,
            TOUCH_ROTATE: 3,
            TOUCH_ZOOM: 4,
            TOUCH_PAN: 5
        },
        self = this;

    this.zoomStart = new THREE.Vector2();
    this.zoomEnd = new THREE.Vector2();
    this.zoomFactor = 1;
    this.zoomSpeed = 1.2;

    // what this does ?
    this.staticMoving = false;

    function enable_wrap(callback) {
        return function() {
            console.log("enable_wrap", self.enabled);
            if ( self.enabled === false ) return;

            callback.apply(self, arguments);
        };
    }

    this.app.on( 'mousewheel', enable_wrap(this.mousewheel), false );
    this.app.on( 'DOMMouseScroll', enable_wrap(this.mousewheel), false ); // firefox
}

THREE.OrthographicZoom.prototype.enabled = true;

THREE.OrthographicZoom.prototype.mousewheel = function (event) {
    var cam = this.app.lastSelectedCamera,
        cfg = cam.$cfg;

    if (event.wheelDelta > 0 || event.detail > 0) {
        cfg.aspectRatio *= 2;
    } else {
        cfg.aspectRatio /= 2;
    }

    var height = cfg.height * 0.5 / cfg.aspectRatio,
        width = cfg.width * 0.5 / cfg.aspectRatio;

    cam.left = width;
    cam.right = -width;
    cam.top = height;
    cam.bottom = -height;

    cam.updateProjectionMatrix();
};


THREE.OrthographicZoom.prototype.update = function () {
};
