THREE.OrthographicPan = function (app, domElement) {
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

    this.panSpeed = 1;

    this.panStart = new THREE.Vector2();
    this.panEnd = new THREE.Vector2();

    function enable_wrap(callback) {
        return function() {
            console.log("enable_wrap", self.enabled);
            if (self.enabled === false) return;

            callback.apply(self, arguments);
        };
    }

    this.app.on('right-mousedown', enable_wrap(this.mousedown), false);

    this.app.on('touchstart', enable_wrap(this.touchstart), false);
    this.app.on('touchend', enable_wrap(this.touchend), false);
    this.app.on('touchmove', enable_wrap(this.touchmove), false);
};

THREE.OrthographicZoom.prototype.enabled = true;

THREE.OrthographicZoom.prototype.mousedown = function (event) {
    // touch: event.touches[ 0 ].pageX, event.touches[ 0 ].pageY
    this.panStart = _panEnd = self.getMouseOnScreen(event.clientX, event.clientY);

    this.app.on('mousemove', this.mousemove);
    this.app.on('mouseup', this.mouseup);
};

THREE.OrthographicZoom.prototype.mousemove = function (event) {
    this.panEnd = self.getMouseOnScreen(event.clientX, event.clientY);
};

THREE.OrthographicZoom.prototype.mouseup = function (event) {
    _state = STATE.NONE;

    this.app.off('mousemove', this.mousemove);
    this.app.off('mouseup', this.mouseup);
};


THREE.OrthographicZoom.prototype.update = function () {
    var mouseChange = _panEnd.clone().sub(_panStart);

    if (mouseChange.lengthSq()) {
        mouseChange.multiplyScalar(self.panSpeed);

        self.camera.position.add(mouseChange);
        self.target.add(mouseChange);

        _panStart = _panEnd;
    }
};
