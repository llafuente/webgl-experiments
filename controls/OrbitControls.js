/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 */
/*global THREE, console */

// This set of controls performs orbiting, dollying (zooming), and panning. It maintains
// the "up" direction as +Y, unlike the TrackballControls. Touch on tablet and phones is
// supported.
//
//    Orbit - left mouse / touch: one finger move
//    Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
//    Pan - right mouse, or arrow keys / touch: three finter swipe
//
// This is a drop-in replacement for (most) TrackballControls used in examples.
// That is, include this js file and wherever you see:
//    	controls = new THREE.TrackballControls(camera);
//      controls.target.z = 150;
// Simple substitute "OrbitControls" and the control should work as-is.

THREE.OrbitControls = function (app, domElement) {

	this.app = app;

	var camera = this.camera = app.cameras[0];
	this.domElement = (domElement !== undefined) ? domElement : document;

	// API

	// Set to false to disable this control
	this.enabled = true;

	// "target" sets the location of focus, where the control orbits around
	// and where it pans with respect to.
	this.target = new THREE.Vector3();

	// center is old, deprecated; use "target" instead
	this.center = this.target;

	// This option actually enables dollying in and out; left as "zoom" for
	// backwards compatibility
	this.noZoom = false;
	this.zoomSpeed = 1.0;

	// Limits to how far you can dolly in and out
	this.minDistance = 0;
	this.maxDistance = Infinity;

	// Set to true to disable this control
	this.noRotate = false;
	this.rotateSpeed = 1.0;

	// Set to true to disable this control
	this.noPan = false;
	this.keyPanSpeed = 7.0;	// pixels moved per arrow key push

	// Set to true to automatically rotate around the target
	this.autoRotate = false;
	this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

	// How far you can orbit vertically, upper and lower limits.
	// Range is 0 to Math.PI radians.
	this.minPolarAngle = 0; // radians
	this.maxPolarAngle = Math.PI; // radians

	// Set to true to disable use of the keys
	this.noKeys = false;

	// The four arrow keys
	this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

	////////////
	// internals

	var self = this;

	var EPS = 0.000001;

	var rotateStart = new THREE.Vector2();
	var rotateEnd = new THREE.Vector2();
	var rotateDelta = new THREE.Vector2();

	var panStart = new THREE.Vector2();
	var panEnd = new THREE.Vector2();
	var panDelta = new THREE.Vector2();
	var panOffset = new THREE.Vector3();

	var offset = new THREE.Vector3();

	var dollyStart = new THREE.Vector2();
	var dollyEnd = new THREE.Vector2();
	var dollyDelta = new THREE.Vector2();

	var phiDelta = 0;
	var thetaDelta = 0;
	var scale = 1;
	var pan = new THREE.Vector3();

	var lastPosition = new THREE.Vector3();
	var lastQuaternion = new THREE.Quaternion();

	var STATE = { NONE : -1, ROTATE : 0, DOLLY : 1, PAN : 2, TOUCH_ROTATE : 3, TOUCH_DOLLY : 4, TOUCH_PAN : 5 };

	var state = STATE.NONE;

	// for reset

	this.target0 = this.target.clone();
	this.position0 = this.camera.position.clone();

	// so camera.up is the orbit axis

	var quat = new THREE.Quaternion().setFromUnitVectors(camera.up, new THREE.Vector3(0, 1, 0));
	var quatInverse = quat.clone().inverse();

	// events

	var changeEvent = { type: 'change' };
	var startEvent = { type: 'start'};
	var endEvent = { type: 'end'};

	this.rotateLeft = function (angle) {

		if (angle === undefined) {

			angle = getAutoRotationAngle();

		}

		thetaDelta -= angle;

	};

	this.rotateUp = function (angle) {

		if (angle === undefined) {

			angle = getAutoRotationAngle();

		}

		phiDelta -= angle;

	};

	// pass in distance in world space to move left
	this.panLeft = function (distance) {

		var te = this.camera.matrix.elements;

		// get X column of matrix
		panOffset.set(te[ 0 ], te[ 1 ], te[ 2 ]);
		panOffset.multiplyScalar(- distance);

		pan.add(panOffset);

	};

	// pass in distance in world space to move up
	this.panUp = function (distance) {

		var te = this.camera.matrix.elements;

		// get Y column of matrix
		panOffset.set(te[ 4 ], te[ 5 ], te[ 6 ]);
		panOffset.multiplyScalar(distance);

		pan.add(panOffset);

	};

	// pass in x,y of change desired in pixel space,
	// right and down are positive
	this.pan = function (deltaX, deltaY) {

		var element = self.domElement === document ? self.domElement.body : self.domElement;

		if (self.camera.fov !== undefined) {

			// perspective
			var position = self.camera.position;
			var offset = position.clone().sub(self.target);
			var targetDistance = offset.length();

			// half of the fov is center to top of screen
			targetDistance *= Math.tan((self.camera.fov / 2) * Math.PI / 180.0);

			// we actually don't use screenWidth, since perspective camera is fixed to screen height
			self.panLeft(2 * deltaX * targetDistance / element.clientHeight);
			self.panUp(2 * deltaY * targetDistance / element.clientHeight);

		} else if (self.camera.top !== undefined) {

			// orthographic
			self.panLeft(deltaX * (self.camera.right - self.camera.left) / element.clientWidth);
			self.panUp(deltaY * (self.camera.top - self.camera.bottom) / element.clientHeight);

		} else {

			// camera neither orthographic or perspective
			console.warn('WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.');

		}

	};

	this.dollyIn = function (dollyScale) {

		if (dollyScale === undefined) {

			dollyScale = getZoomScale();

		}

		scale /= dollyScale;

	};

	this.dollyOut = function (dollyScale) {

		if (dollyScale === undefined) {

			dollyScale = getZoomScale();

		}

		scale *= dollyScale;

	};

	this.update = function () {

		var position = this.camera.position;

		offset.copy(position).sub(this.target);

		// rotate offset to "y-axis-is-up" space
		offset.applyQuaternion(quat);

		// angle from z-axis around y-axis

		var theta = Math.atan2(offset.x, offset.z);

		// angle from y-axis

		var phi = Math.atan2(Math.sqrt(offset.x * offset.x + offset.z * offset.z), offset.y);

		if (this.autoRotate) {

			this.rotateLeft(getAutoRotationAngle());

		}

		theta += thetaDelta;
		phi += phiDelta;

		// restrict phi to be between desired limits
		phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, phi));

		// restrict phi to be betwee EPS and PI-EPS
		phi = Math.max(EPS, Math.min(Math.PI - EPS, phi));

		var radius = offset.length() * scale;

		// restrict radius to be between desired limits
		radius = Math.max(this.minDistance, Math.min(this.maxDistance, radius));

		// move target to panned location
		this.target.add(pan);

		offset.x = radius * Math.sin(phi) * Math.sin(theta);
		offset.y = radius * Math.cos(phi);
		offset.z = radius * Math.sin(phi) * Math.cos(theta);

		// rotate offset back to "camera-up-vector-is-up" space
		offset.applyQuaternion(quatInverse);

		position.copy(this.target).add(offset);

		this.camera.lookAt(this.target);

		thetaDelta = 0;
		phiDelta = 0;
		scale = 1;
		pan.set(0, 0, 0);

		// update condition is:
		// min(camera displacement, camera rotation in radians)^2 > EPS
		// using small-angle approximation cos(x/2) = 1 - x^2 / 8

		if (lastPosition.distanceToSquared(this.camera.position) > EPS
		    || 8 * (1 - lastQuaternion.dot(this.camera.quaternion)) > EPS) {

			this.dispatchEvent(changeEvent);

			lastPosition.copy(this.camera.position);
			lastQuaternion.copy (this.camera.quaternion);

		}

	};


	this.reset = function () {

		state = STATE.NONE;

		this.target.copy(this.target0);
		this.camera.position.copy(this.position0);

		this.update();

	};

	function getAutoRotationAngle() {

		return 2 * Math.PI / 60 / 60 * self.autoRotateSpeed;

	}

	function getZoomScale() {

		return Math.pow(0.95, self.zoomSpeed);

	}

	function onMouseDown(event) {
		console.log("onMouseDown", arguments);

		if (self.enabled === false) return;
		event.preventDefault();

		self.camera = self.app.lastSelectedCamera;

		if (event.button === 0) {
			if (self.noRotate === true) return;

			state = STATE.ROTATE;

			rotateStart.set(event.clientX, event.clientY);

		} else if (event.button === 1) {
			if (self.noZoom === true) return;

			state = STATE.DOLLY;

			dollyStart.set(event.clientX, event.clientY);

		} else if (event.button === 2) {
			if (self.noPan === true) return;

			state = STATE.PAN;

			panStart.set(event.clientX, event.clientY);

		}

		self.app.on('mousemove', onMouseMove, false);
		self.app.on('mouseup', onMouseUp, false);
		self.dispatchEvent(startEvent);

	}

	function onMouseMove(event) {

		if (self.enabled === false) return;

		event.preventDefault();

		var element = self.domElement === document ? self.domElement.body : self.domElement;

		if (state === STATE.ROTATE) {

			if (self.noRotate === true) return;

			rotateEnd.set(event.clientX, event.clientY);
			rotateDelta.subVectors(rotateEnd, rotateStart);

			// rotating across whole screen goes 360 degrees around
			self.rotateLeft(2 * Math.PI * rotateDelta.x / element.clientWidth * self.rotateSpeed);

			// rotating up and down along whole screen attempts to go 360, but limited to 180
			self.rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight * self.rotateSpeed);

			rotateStart.copy(rotateEnd);

		} else if (state === STATE.DOLLY) {

			if (self.noZoom === true) return;

			dollyEnd.set(event.clientX, event.clientY);
			dollyDelta.subVectors(dollyEnd, dollyStart);

			if (dollyDelta.y > 0) {

				self.dollyIn();

			} else {

				self.dollyOut();

			}

			dollyStart.copy(dollyEnd);

		} else if (state === STATE.PAN) {

			if (self.noPan === true) return;

			panEnd.set(event.clientX, event.clientY);
			panDelta.subVectors(panEnd, panStart);

			self.pan(panDelta.x, panDelta.y);

			panStart.copy(panEnd);

		}

		self.update();

	}

	function onMouseUp(/* event */) {

		if (self.enabled === false) return;

		document.removeEventListener('mousemove', onMouseMove, false);
		document.removeEventListener('mouseup', onMouseUp, false);
		self.dispatchEvent(endEvent);
		state = STATE.NONE;

	}

	function onMouseWheel(event) {

		if (self.enabled === false || self.noZoom === true) return;

		event.preventDefault();
		event.stopPropagation();

		var delta = 0;

		if (event.wheelDelta !== undefined) { // WebKit / Opera / Explorer 9

			delta = event.wheelDelta;

		} else if (event.detail !== undefined) { // Firefox

			delta = - event.detail;

		}

		if (delta > 0) {

			self.dollyOut();

		} else {

			self.dollyIn();

		}

		self.update();
		self.dispatchEvent(startEvent);
		self.dispatchEvent(endEvent);

	}

	function onKeyDown(event) {

		if (self.enabled === false || self.noKeys === true || self.noPan === true) return;

		switch (event.keyCode) {

			case self.keys.UP:
				self.pan(0, self.keyPanSpeed);
				self.update();
				break;

			case self.keys.BOTTOM:
				self.pan(0, - self.keyPanSpeed);
				self.update();
				break;

			case self.keys.LEFT:
				self.pan(self.keyPanSpeed, 0);
				self.update();
				break;

			case self.keys.RIGHT:
				self.pan(- self.keyPanSpeed, 0);
				self.update();
				break;

		}

	}

	function touchstart(event) {

		if (self.enabled === false) return;

		switch (event.touches.length) {

			case 1:	// one-fingered touch: rotate

				if (self.noRotate === true) return;

				state = STATE.TOUCH_ROTATE;

				rotateStart.set(event.touches[ 0 ].pageX, event.touches[ 0 ].pageY);
				break;

			case 2:	// two-fingered touch: dolly

				if (self.noZoom === true) return;

				state = STATE.TOUCH_DOLLY;

				var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				var distance = Math.sqrt(dx * dx + dy * dy);
				dollyStart.set(0, distance);
				break;

			case 3: // three-fingered touch: pan

				if (self.noPan === true) return;

				state = STATE.TOUCH_PAN;

				panStart.set(event.touches[ 0 ].pageX, event.touches[ 0 ].pageY);
				break;

			default:

				state = STATE.NONE;

		}

		self.dispatchEvent(startEvent);

	}

	function touchmove(event) {

		if (self.enabled === false) return;

		event.preventDefault();
		event.stopPropagation();

		var element = self.domElement === document ? self.domElement.body : self.domElement;

		switch (event.touches.length) {

			case 1: // one-fingered touch: rotate

				if (self.noRotate === true) return;
				if (state !== STATE.TOUCH_ROTATE) return;

				rotateEnd.set(event.touches[ 0 ].pageX, event.touches[ 0 ].pageY);
				rotateDelta.subVectors(rotateEnd, rotateStart);

				// rotating across whole screen goes 360 degrees around
				self.rotateLeft(2 * Math.PI * rotateDelta.x / element.clientWidth * self.rotateSpeed);
				// rotating up and down along whole screen attempts to go 360, but limited to 180
				self.rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight * self.rotateSpeed);

				rotateStart.copy(rotateEnd);

				self.update();
				break;

			case 2: // two-fingered touch: dolly

				if (self.noZoom === true) return;
				if (state !== STATE.TOUCH_DOLLY) return;

				var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				var distance = Math.sqrt(dx * dx + dy * dy);

				dollyEnd.set(0, distance);
				dollyDelta.subVectors(dollyEnd, dollyStart);

				if (dollyDelta.y > 0) {

					self.dollyOut();

				} else {

					self.dollyIn();

				}

				dollyStart.copy(dollyEnd);

				self.update();
				break;

			case 3: // three-fingered touch: pan

				if (self.noPan === true) return;
				if (state !== STATE.TOUCH_PAN) return;

				panEnd.set(event.touches[ 0 ].pageX, event.touches[ 0 ].pageY);
				panDelta.subVectors(panEnd, panStart);

				self.pan(panDelta.x, panDelta.y);

				panStart.copy(panEnd);

				self.update();
				break;

			default:

				state = STATE.NONE;

		}

	}

	function touchend(/* event */) {

		if (self.enabled === false) return;

		self.dispatchEvent(endEvent);
		state = STATE.NONE;

	}

	this.app.on('contextmenu', function (event) {
		event.preventDefault();
	});
	this.app.on('mousedown', onMouseDown);
	this.app.on('mousewheel', onMouseWheel);
	this.app.on('DOMMouseScroll', onMouseWheel); // firefox

	this.app.on('touchstart', touchstart);
	this.app.on('touchend', touchend);
	this.app.on('touchmove', touchmove);

	this.app.on('keydown', onKeyDown);

	// force an update at start
	this.update();

};

THREE.OrbitControls.prototype = Object.create(THREE.EventDispatcher.prototype);
