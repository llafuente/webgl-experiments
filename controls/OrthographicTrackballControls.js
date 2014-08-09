/**
 * @author Eberhard Graether / http://egraether.com/
 * @author Patrick Fuller / http://patrick-fuller.com
 */

THREE.OrthographicTrackballControls = function ( cameras, domElement ) {

	var self = this;
	var STATE = { NONE: -1, ROTATE: 0, ZOOM: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_ZOOM: 4, TOUCH_PAN: 5 };

	this.cameras = cameras;

	// choose the first one as default
	this.camera = cameras[0];
	this.domElement = ( domElement !== undefined ) ? domElement : document;

	// API

	this.enabled = true;

	this.screen = { width: 0, height: 0, offsetLeft: 0, offsetTop: 0 };
	this.radius = ( this.screen.width + this.screen.height ) / 4;

	this.rotateSpeed = 1.0;
	this.zoomSpeed = 1.2;
	this.panSpeed = 0.3;

	this.noRotate = false;
	this.noZoom = false;
	this.noPan = false;

	this.staticMoving = false;
	this.dynamicDampingFactor = 0.2;

	this.keys = [ 65 /*A*/, 83 /*S*/, 68 /*D*/ ];

	// internals

	this.target = new THREE.Vector3();

	var lastPosition = new THREE.Vector3();

	var _state = STATE.NONE,
	_prevState = STATE.NONE,

	_eye = new THREE.Vector3(),

	_rotateStart = new THREE.Vector3(),
	_rotateEnd = new THREE.Vector3(),

	_zoomStart = new THREE.Vector2(),
	_zoomEnd = new THREE.Vector2(),
	_zoomFactor = 1,

	_touchZoomDistanceStart = 0,
	_touchZoomDistanceEnd = 0,

	_panStart = new THREE.Vector2(),
	_panEnd = new THREE.Vector2();

	// for reset

	this.target0 = this.target.clone();
	this.position0 = this.camera.position.clone();
	this.up0 = this.camera.up.clone();

	this.left0 = this.camera.left;
	this.right0 = this.camera.right;
	this.top0 = this.camera.top;
	this.bottom0 = this.camera.bottom;
	this.center0 = new THREE.Vector2((this.left0 + this.right0) / 2.0, (this.top0 + this.bottom0) / 2.0);

	// events

	var changeEvent = { type: 'change' };


	// methods

	this.handleResize = function () {

		this.screen.width = window.innerWidth;
		this.screen.height = window.innerHeight;

		this.screen.offsetLeft = 0;
		this.screen.offsetTop = 0;

		this.radius = ( this.screen.width + this.screen.height ) / 4;

	};

	this.handleEvent = function ( event ) {

		if ( typeof this[ event.type ] == 'function' ) {

			this[ event.type ]( event );

		}

	};

	this.getMouseOnScreen = function ( clientX, clientY ) {

		return new THREE.Vector2(
			( clientX - self.screen.offsetLeft ) / self.radius * 0.5,
			( clientY - self.screen.offsetTop ) / self.radius * 0.5
		);

	};

	this.getMouseProjectionOnBall = function ( clientX, clientY ) {

		var mouseOnBall = new THREE.Vector3(
			( clientX - self.screen.width * 0.5 - self.screen.offsetLeft ) / self.radius,
			( self.screen.height * 0.5 + self.screen.offsetTop - clientY ) / self.radius,
			0.0
		);

		var length = mouseOnBall.length();

		if ( length > 1.0 ) {

			mouseOnBall.normalize();

		} else {

			mouseOnBall.z = Math.sqrt( 1.0 - length * length );

		}

		_eye.copy( self.camera.position ).sub( self.target );

		var projection = self.camera.up.clone().setLength( mouseOnBall.y );
		projection.add( self.camera.up.clone().cross( _eye ).setLength( mouseOnBall.x ) );
		projection.add( _eye.setLength( mouseOnBall.z ) );

		return projection;

	};

	this.rotateCamera = function () {

		var angle = Math.acos( _rotateStart.dot( _rotateEnd ) / _rotateStart.length() / _rotateEnd.length() );

		if ( angle ) {

			var axis = ( new THREE.Vector3() ).crossVectors( _rotateStart, _rotateEnd ).normalize(),
				quaternion = new THREE.Quaternion();

			angle *= self.rotateSpeed;

			quaternion.setFromAxisAngle( axis, -angle );

			_eye.applyQuaternion( quaternion );
			self.camera.up.applyQuaternion( quaternion );

			_rotateEnd.applyQuaternion( quaternion );

			if ( self.staticMoving ) {

				_rotateStart.copy( _rotateEnd );

			} else {

				quaternion.setFromAxisAngle( axis, angle * ( self.dynamicDampingFactor - 1.0 ) );
				_rotateStart.applyQuaternion( quaternion );

			}

		}

	};

	this.zoomCamera = function () {

		if ( _state === STATE.TOUCH_ZOOM ) {

			var factor = _touchZoomDistanceStart / _touchZoomDistanceEnd;
			_touchZoomDistanceStart = _touchZoomDistanceEnd;
			_zoomFactor *= factor;

			self.camera.left = _zoomFactor * self.left0 + ( 1 - _zoomFactor ) *  self.center0.x;
			self.camera.right = _zoomFactor * self.right0 + ( 1 - _zoomFactor ) *  self.center0.x;
			self.camera.top = _zoomFactor * self.top0 + ( 1 - _zoomFactor ) *  self.center0.y;
			self.camera.bottom = _zoomFactor * self.bottom0 + ( 1 - _zoomFactor ) *  self.center0.y;

		} else {

			var factor = 1.0 + ( _zoomEnd.y - _zoomStart.y ) * self.zoomSpeed;

			if ( factor !== 1.0 && factor > 0.0 ) {
				_zoomFactor *= factor;

				self.camera.left = _zoomFactor * self.left0 + ( 1 - _zoomFactor ) *  self.center0.x;
				self.camera.right = _zoomFactor * self.right0 + ( 1 - _zoomFactor ) *  self.center0.x;
				self.camera.top = _zoomFactor * self.top0 + ( 1 - _zoomFactor ) *  self.center0.y;
				self.camera.bottom = _zoomFactor * self.bottom0 + ( 1 - _zoomFactor ) *  self.center0.y;

				if ( self.staticMoving ) {

					_zoomStart.copy( _zoomEnd );

				} else {

					_zoomStart.y += ( _zoomEnd.y - _zoomStart.y ) * this.dynamicDampingFactor;

				}

			}

		}

	};

	this.panCamera = function () {

		var mouseChange = _panEnd.clone().sub( _panStart );

		if ( mouseChange.lengthSq() ) {

			mouseChange.multiplyScalar( _eye.length() * self.panSpeed );

			var pan = _eye.clone().cross( self.camera.up ).setLength( mouseChange.x );
			pan.add( self.camera.up.clone().setLength( mouseChange.y ) );

			self.camera.position.add( pan );
			self.target.add( pan );

			if ( self.staticMoving ) {

				_panStart = _panEnd;

			} else {

				_panStart.add( mouseChange.subVectors( _panEnd, _panStart ).multiplyScalar( self.dynamicDampingFactor ) );

			}

		}

	};

	this.update = function () {

		_eye.subVectors( self.camera.position, self.target );

		if ( !self.noRotate ) {

			self.rotateCamera();

		}

		if ( !self.noZoom ) {

			self.zoomCamera();
			self.camera.updateProjectionMatrix();

		}

		if ( !self.noPan ) {

			self.panCamera();

		}

		self.camera.position.addVectors( self.target, _eye );

		self.camera.lookAt( self.target );

		if ( lastPosition.distanceToSquared( self.camera.position ) > 0 ) {

			self.dispatchEvent( changeEvent );

			lastPosition.copy( self.camera.position );

		}

	};

	this.reset = function () {

		_state = STATE.NONE;
		_prevState = STATE.NONE;

		self.target.copy( self.target0 );
		self.camera.position.copy( self.position0 );
		self.camera.up.copy( self.up0 );

		_eye.subVectors( self.camera.position, self.target );

		self.camera.left = self.left0;
		self.camera.right = self.right0;
		self.camera.top = self.top0;
		self.camera.bottom = self.bottom0;

		self.camera.lookAt( self.target );

		self.dispatchEvent( changeEvent );

		lastPosition.copy( self.camera.position );

	};

	// listeners

	function keydown( event ) {

		if ( self.enabled === false ) return;

		window.removeEventListener( 'keydown', keydown );

		_prevState = _state;

		if ( _state !== STATE.NONE ) {

			return;

		} else if ( event.keyCode === self.keys[ STATE.ROTATE ] && !self.noRotate ) {

			_state = STATE.ROTATE;

		} else if ( event.keyCode === self.keys[ STATE.ZOOM ] && !self.noZoom ) {

			_state = STATE.ZOOM;

		} else if ( event.keyCode === self.keys[ STATE.PAN ] && !self.noPan ) {

			_state = STATE.PAN;

		}

	}

	function keyup( event ) {

		if ( self.enabled === false ) return;

		_state = _prevState;

		window.addEventListener( 'keydown', keydown, false );

	}

	function mousedown( event ) {

		if ( self.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		// choose the valid camera
		var i,
			px = event.clientX / SCREEN_WIDTH,
			py = 1 - (event.clientY / SCREEN_HEIGHT),
			cam;

		for (i = 0; i < self.cameras.length; ++i) {
			console.log(i, px, py, self.cameras[i].$cfg);
			cam = self.cameras[i];

			if (px >= cam.$cfg.left &&
				py >= cam.$cfg.bottom &&
				px <= cam.$cfg.left + cam.$cfg.width &&
				py <= cam.$cfg.bottom + cam.$cfg.height) {
				self.camera = cam;
			}
		}



		if ( _state === STATE.NONE ) {
			_state = event.button;
		}

		if ( _state === STATE.ROTATE && !self.noRotate ) {

			_rotateStart = _rotateEnd = self.getMouseProjectionOnBall( event.clientX, event.clientY );

		} else if ( _state === STATE.ZOOM && !self.noZoom ) {

			_zoomStart = _zoomEnd = self.getMouseOnScreen( event.clientX, event.clientY );

		} else if ( _state === STATE.PAN && !self.noPan ) {

			_panStart = _panEnd = self.getMouseOnScreen( event.clientX, event.clientY );

		}

		document.addEventListener( 'mousemove', mousemove, false );
		document.addEventListener( 'mouseup', mouseup, false );

	}

	function mousemove( event ) {

		if ( self.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		if ( _state === STATE.ROTATE && !self.noRotate ) {

			_rotateEnd = self.getMouseProjectionOnBall( event.clientX, event.clientY );

		} else if ( _state === STATE.ZOOM && !self.noZoom ) {

			_zoomEnd = self.getMouseOnScreen( event.clientX, event.clientY );

		} else if ( _state === STATE.PAN && !self.noPan ) {

			_panEnd = self.getMouseOnScreen( event.clientX, event.clientY );

		}

	}

	function mouseup( event ) {

		if ( self.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		_state = STATE.NONE;

		document.removeEventListener( 'mousemove', mousemove );
		document.removeEventListener( 'mouseup', mouseup );

	}

	function mousewheel( event ) {

		if ( self.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		var delta = 0;

		if ( event.wheelDelta ) { // WebKit / Opera / Explorer 9

			delta = event.wheelDelta / 40;

		} else if ( event.detail ) { // Firefox

			delta = - event.detail / 3;

		}

		_zoomStart.y += delta * 0.01;

	}

	function touchstart( event ) {

		if ( self.enabled === false ) return;

		switch ( event.touches.length ) {

			case 1:
				_state = STATE.TOUCH_ROTATE;
				_rotateStart = _rotateEnd = self.getMouseProjectionOnBall( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				break;

			case 2:
				_state = STATE.TOUCH_ZOOM;
				var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				_touchZoomDistanceEnd = _touchZoomDistanceStart = Math.sqrt( dx * dx + dy * dy );
				break;

			case 3:
				_state = STATE.TOUCH_PAN;
				_panStart = _panEnd = self.getMouseOnScreen( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				break;

			default:
				_state = STATE.NONE;

		}

	}

	function touchmove( event ) {

		if ( self.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		switch ( event.touches.length ) {

			case 1:
				_rotateEnd = self.getMouseProjectionOnBall( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				break;

			case 2:
				var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				_touchZoomDistanceEnd = Math.sqrt( dx * dx + dy * dy )
				break;

			case 3:
				_panEnd = self.getMouseOnScreen( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				break;

			default:
				_state = STATE.NONE;

		}

	}

	function touchend( event ) {

		if ( self.enabled === false ) return;

		switch ( event.touches.length ) {

			case 1:
				_rotateStart = _rotateEnd = self.getMouseProjectionOnBall( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				break;

			case 2:
				_touchZoomDistanceStart = _touchZoomDistanceEnd = 0;
				break;

			case 3:
				_panStart = _panEnd = self.getMouseOnScreen( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				break;

		}

		_state = STATE.NONE;

	}

	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );

	this.domElement.addEventListener( 'mousedown', mousedown, false );

	this.domElement.addEventListener( 'mousewheel', mousewheel, false );
	this.domElement.addEventListener( 'DOMMouseScroll', mousewheel, false ); // firefox

	this.domElement.addEventListener( 'touchstart', touchstart, false );
	this.domElement.addEventListener( 'touchend', touchend, false );
	this.domElement.addEventListener( 'touchmove', touchmove, false );

	window.addEventListener( 'keydown', keydown, false );
	window.addEventListener( 'keyup', keyup, false );

	this.handleResize();

};

THREE.OrthographicTrackballControls.prototype = Object.create( THREE.EventDispatcher.prototype );
