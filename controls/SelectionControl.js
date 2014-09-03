THREE.SelectionControl = function (app, domElement) {
    var self = this;

    this.app = app;

    this.ray = new THREE.Raycaster();
    this.projector = new THREE.Projector();
    this.pointerVector = new THREE.Vector3();

    function enable_wrap(callback) {
        return function() {
            console.log("enable_wrap", self.enabled);
            if (self.enabled === false) return;

            callback.apply(self, arguments);
        };
    }

    this.app.on('middle-mousedown', enable_wrap(this.mousedown), false);
};

THREE.SelectionControl.prototype.enabled = true;

THREE.SelectionControl.prototype.mousedown = function (event) {
    this.pointerVector.set(event.cameraRelX * 2 - 1, -event.cameraRelY * 2 + 1, 0.5);

    projector.unprojectVector(this.pointerVector, event.camera);
    ray.set(event.camera.position, this.pointerVector.sub(event.camera.position).normalize());

    var intersections = ray.intersectObjects(this.app.scene.children, true);
    if (intersections.length) {
        this.app.emit("selection", intersections);
    }
};

THREE.SelectionControl.prototype.update = function () {

};
