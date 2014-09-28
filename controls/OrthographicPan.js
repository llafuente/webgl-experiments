THREE.OrthographicPan = function (app, domElement) {
    this.app = app;

    var self = this;

    this.panSpeed = 0.5;

    this.panStart = new THREE.Vector3();
    this.panEnd = new THREE.Vector3();
    this.change = new THREE.Vector3();

    function enable_wrap(callback) {
        return function() {
            if (self.enabled === false) return;

            callback.apply(self, arguments);
        };
    }

    this.app.on('right-mousedown', enable_wrap(this.mousedown), false);

    this.app.on('touchstart', enable_wrap(this.touchstart), false);
    this.app.on('touchend', enable_wrap(this.touchend), false);
    this.app.on('touchmove', enable_wrap(this.touchmove), false);
};

THREE.OrthographicPan.prototype.enabled = true;

THREE.OrthographicPan.prototype.mousedown = function (event) {
    this.camera = event.camera;

    this.panStart.set(event.clientX, event.clientY, 0);
    this.panEnd.set(event.clientX, event.clientY, 0);

    this._mousemove = this.mousemove.bind(this)
    this.app.on('mousemove', this._mousemove);
    this._mouseup = this.mouseup.bind(this)
    this.app.on('mouseup', this._mouseup);
};

THREE.OrthographicPan.prototype.mousemove = function (event) {
    this.panEnd.set(event.clientX, event.clientY, 0);
};

THREE.OrthographicPan.prototype.mouseup = function (event) {
    this.app.off('mousemove', this._mousemove);
    this.app.off('mouseup', this._mouseup);
};


THREE.OrthographicPan.prototype.update = function () {
    this.change.copy(this.panEnd).sub(this.panStart);

    if (this.change.lengthSq() > 1) {
        this.change.multiplyScalar(this.panSpeed);

        this.camera.translateX(this.change.x);
        this.camera.translateY(-this.change.y);

        this.panStart.copy(this.panEnd);
    }
};
