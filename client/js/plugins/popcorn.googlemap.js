
// PLUGIN: Google Maps
var googleCallback;
(function (Popcorn) {

	if (!Popcorn) {
		return;
	}

	function rightClick(event) {
		if (!event) {
			return false;
		}
		if (event.which) {
			return (event.which === 3);
		}
		if (event.button) {
			return (event.button === 2);
		}
	}

	var idx = 0, i = 0,
		_mapFired = false,
		_mapLoaded = false,
		geocoder, loadMaps;
	//google api callback 
	googleCallback = function (data) {
		// ensure all of the maps functions needed are loaded 
		// before setting _maploaded to true
		if (typeof window.google !== "undefined" && window.google.maps && window.google.maps.Geocoder && window.google.maps.LatLng) {
			geocoder = new window.google.maps.Geocoder();
			_mapLoaded = true;
		} else {
			setTimeout(function () {
				googleCallback(data);
			}, 1);
		}
	};
	// function that loads the google api
	loadMaps = function () {
		// for some reason the Google Map API adds content to the body
		if (document.body) {
			_mapFired = true;
			Popcorn.getScript("http://maps.google.com/maps/api/js?sensor=false&callback=googleCallback");
		} else {
			setTimeout(function () {
				loadMaps();
			}, 1);
		}
	};

	/**
	 * googlemap popcorn plug-in
	 * Adds a map to the target div centered on the location specified by the user
	 * Options parameter will need a start, end, target, type, zoom, lat and lng, and location
	 * -Start is the time that you want this plug-in to execute
	 * -End is the time that you want this plug-in to stop executing
	 * -Target is the id of the DOM element that you want the map to appear in. This element must be in the DOM
	 * -Type [optional] either: HYBRID (default), ROADMAP, SATELLITE, TERRAIN, STREETVIEW
	 * -Zoom [optional] defaults to 0
	 * -Heading [optional] STREETVIEW orientation of camera in degrees relative to true north (0 north, 90 true east, ect)
	 * -Pitch [optional] STREETVIEW vertical orientation of the camera (between 1 and 3 is recommended)
	 * -Lat and Lng: the coordinates of the map must be present if location is not specified.
	 * -Location: the adress you want the map to display, must be present if lat and lng are not specified.
	 * Note: using location requires extra loading time, also not specifying both lat/lng and location will
	 * cause and error.
	 *
	 * Tweening works using the following specifications:
	 * -location is the start point when using an auto generated route
	 * -tween when used in this context is a string which specifies the end location for your route
	 * Note that both location and tween must be present when using an auto generated route, or the map will not tween
	 * -interval is the speed in which the tween will be executed, a reasonable time is 1000 ( time in milliseconds )
	 * Heading, Zoom, and Pitch streetview values are also used in tweening with the autogenerated route
	 *
	 * -tween is an array of objects, each containing data for one frame of a tween
	 * -position is an object with has two paramaters, lat and lng, both which are mandatory for a tween to work
	 * -pov is an object which houses heading, pitch, and zoom paramters, which are all optional, if undefined, these values default to 0
	 * -interval is the speed in which the tween will be executed, a reasonable time is 1000 ( time in milliseconds )
	 *
	 * @param {Object} options
	 *
	 * Example:
	 var p = Popcorn("#video")
	 .googlemap({
	 start: 5, // seconds
	 end: 15, // seconds
	 type: "ROADMAP",
	 target: "map",
	 lat: 43.665429,
	 lng: -79.403323
	 } )
	 *
	 */

	Popcorn.plugin("googlemap", function (options) {
		var mapdiv, location, containerDiv, contentDiv,
			mapStarted = false,
			popcorn = this,
			isMapReady,
			paused = false,
			otherWindows, bigWindow, littleWindow, keyPress,
			_width, _height, _top, _left;

		// if this is the firest time running the plugins
		// call the function that gets the sctipt
		if (!_mapFired) {
			loadMaps();
		}

		options.map = null;

		keyPress = function (event) {
			var key = event.keyCode || event.which;
			if (key === 27) { //escape
				littleWindow();
			}
		};
		
		otherWindows = function(event) {
			if (rightClick(event)) {
				return true;
			}

			var target = event.target;
			do {
				if (target === containerDiv) {
					return true;
				}
			} while (target = target.parentNode);
			console.log('otherwindows', event);
			littleWindow();

			return false;
		};

		bigWindow = function (event) {
			if (rightClick(event)) {
				return true;
			}

			paused = popcorn.media.paused;
			popcorn.pause();
			
			if (!mapStarted) {
				isMapReady();
			}
			if (options.map) {
				options.map.getDiv().style.display = "block";
			}
			
			contentDiv.removeEventListener('click', bigWindow, false);
			window.addEventListener('click', otherWindows, true);
			
			window.addEventListener('keydown', keyPress, true);

			//most plugins shouldn't use classList, but this is a custom one, so we know it's been prepared
			containerDiv.classList.add('active');

			containerDiv.style.cssText = '';      

			if (event) {
				if (event.preventDefault) {
					event.preventDefault();
				}
				if (event.stopPropagation) {
					event.stopPropagation();
				}
				event.returnValue = false;
				event.cancelBubble = true;
			}
			return false;
		};

		littleWindow = function (event) {
			if (rightClick(event)) {
				return true;
			}
			
			if (options.map) {
				options.map.getDiv().style.display = "none";
			}

			containerDiv.classList.remove('active');
			containerDiv.style.width = _width;
			if (_top || _left) {
				containerDiv.style.top = _top;
				containerDiv.style.left = _left;
				containerDiv.style.position = 'absolute';
			}
			contentDiv.addEventListener('click', bigWindow, false);

			window.removeEventListener('keydown', keyPress, true);
			window.removeEventListener('click', otherWindows, true);

			if (!paused) {
				popcorn.play();
			}
			 
			if (event) {
				if (event.preventDefault) {
					event.preventDefault();
				}
				if (event.stopPropagation) {
					event.stopPropagation();
				}
				event.returnValue = false;
				event.cancelBubble = true;
			}

			return false;
		};

		options.loaded = false;

		// create a new div this way anything in the target div is left intact
		containerDiv = document.createElement( "div" );
		containerDiv.setAttribute('class', 'googlemap');
		containerDiv.id = "googlemap" + idx;
		if (options.width) {
			containerDiv.style.width = options.width;
		}
		if (options.height) {
			containerDiv.style.height = options.height;
		}
		containerDiv.style.display = "none";
		idx++;
		
		// ensure the target container the user chose exists
		if ( document.getElementById( options.target ) ) {
			document.getElementById( options.target ).appendChild( containerDiv );
		} else {
			throw ( "googlemap target container doesn't exist" );
		}

		if (options.top || options.left) {
			containerDiv.style.position = 'absolute';
			containerDiv.style.top = options.top;
			containerDiv.style.left = options.left;
		}
	
		contentDiv = document.createElement( "div" );
		contentDiv.style.position = 'relative';
		containerDiv.appendChild(contentDiv);

		var getImageWhenReady = function() {
			//holds off on getting this data from the network until this part of the video has loaded
			if (popcorn.media && popcorn.media.buffered) {
				var i, max, loaded = false, start, end, buffered = popcorn.media.buffered;
				for (i = 0, max = buffered.length; i < max; i++) {
					start = buffered.start(i);
					end = buffered.end(i);

					//fix stupid Firefox bug
					if (start > popcorn.media.duration) {
						start = 0;
					}

					if (start <= options.end && end >= options.start) {
						loaded = true;
						break;
					}
				}
				if (!loaded) {
					setTimeout(getImageWhenReady, 10);
					return;
				}
			}
			
			var params = [
				['center', options.center || options.location],
				['markers', options.location],
				['visible', options.location + '|' + options.center]
			];
		
			var url = 'http://maps.googleapis.com/maps/api/staticmap?sensor=false&size=320x320&maptype=roadmap&' + params.map(
			function(a) {
				return a[0] + '=' + encodeURIComponent(a[1]);
			}).join('&');

			var _image = document.createElement('img');
			_image.src = url;
			_image.style.width = '100%';

			contentDiv.appendChild(_image);
	
			contentDiv.appendChild(mapdiv);
			
			var info = document.createElement('div');
			info.setAttribute('class', 'info');
			
			info.innerHTML = '<div class="media"><span class="hiding minimize" style="float: right; margin-right: 20px;">minimize window</span>map<span class="hiding"> | <span class="popcorn-source">source</span>: <a href="' + url + '" target="_new">Google Maps</a></span></div><div><a href="' + url + '" target="_new">' + options.location + '</a></div><div class="watch">view map</div>';
			
			var minimize = info.getElementsByClassName('minimize').item(0);
			minimize.addEventListener('click', littleWindow, false);
	
			contentDiv.appendChild(info);
	 
			_width = options.width;
			_top = options.top;
			_left = options.left;
			_image.addEventListener('load', function() {
				var re = /(\d*(\.\d*)?)\s*(px|em|\%|em|rem)?/,
					match, units, width, height;
				if (options.width && !options.height) {
					match = re.exec(options.width);
					if (match && match.length > 1) {
						units = match[3] || '';
						width = parseFloat(match[1]);
						height = width * _image.height / _image.width;
						contentDiv.style.height = _height = height + units;
					}
				}
				options.loaded = true;
			}, false);
			
			contentDiv.addEventListener('click', bigWindow, false);

		};
		
		getImageWhenReady();

		var duration = options.end - options.start;
		if (isNaN(options.fadeIn)) {
			options.fadeIn = Math.min(0.25, duration / 8);
		} else if (options.fadeIn > duration) {
			options.fadeIn = duration;
		}
		duration -= options.fadeIn;
		if (isNaN(options.fadeOut)) {
			options.fadeOut = Math.min(0.25, (options.end - options.start) / 8);
		} else if (options.fadeOut > duration) {
			options.fadeIn = duration;
		}

		if (!options.type) {
			options.type = 'ROADMAP';
		}

		// create a new div this way anything in the target div is left intact
		// this is later passed on to the maps api
		mapdiv = document.createElement("div");
		mapdiv.id = "actualmap" + i;
		mapdiv.style.width = "100%";
		mapdiv.style.height = "100%";
		mapdiv.style.top = 0;
		mapdiv.style.left = 0;
		mapdiv.style.position = 'absolute';
		i++;
		

		// ensure that google maps and its functions are loaded
		// before setting up the map parameters
		isMapReady = function () {
			if (_mapLoaded) {
				if (options.location) {
					mapStarted = true;

					// calls an anonymous google function called on separate thread
					geocoder.geocode({
						"address": options.location
					}, function (results, status) {
						if (status === google.maps.GeocoderStatus.OK) {
							options.lat = results[0].geometry.location.lat();
							options.lng = results[0].geometry.location.lng();
							location = new google.maps.LatLng(options.lat, options.lng);
							options.debug = 'now i have my map';
							options.map = new google.maps.Map(mapdiv, {
								mapTypeId: google.maps.MapTypeId[options.type] || google.maps.MapTypeId.HYBRID,
								draggable: true
							});

							var marker = new google.maps.Marker({
								position: location, 
								map: options.map, 
								title: options.location
							});
						} else {
							console.log('cannot get google maps data', status);
						}
					});
				} else {
					location = new google.maps.LatLng(options.lat, options.lng);
					options.debug = 'now i have my damn map';
					options.map = new google.maps.Map(mapdiv, {
						mapTypeId: google.maps.MapTypeId[options.type] || google.maps.MapTypeId.HYBRID,
						draggable: true
					});

					var marker = new google.maps.Marker({
						position: location, 
						map: options.map, 
						title: options.location
					});
				}
			} else {
					setTimeout(function () {
						isMapReady();
					}, 5);
				}
			};

		return {
			/**
			 * @member webpage
			 * The start function will be executed when the currentTime
			 * of the video reaches the start time provided by the
			 * options variable
			 */
			start: function( event, options ) {
				var isLoaded = function() {
						if (popcorn.media.currentTime >= options.end ||
							popcorn.media.currentTime < options.start) {
							//in case loading takes so long that we're no longer inside the event
							return;
						}
					if (options.loaded) {
						containerDiv.style.display = "";
					} else {
						setTimeout(isLoaded, 1);
					}
				};
				isLoaded();

				var that = this,
						sView;

				// ensure the map has been initialized in the setup function above
				var isMapSetup = function() {
					if ( options.map ) {
						options.map.getDiv().style.display = "block";
						// reset the location and zoom just in case the user plaid with the map
						google.maps.event.trigger(options.map, 'resize');
						options.map.setCenter( location );

						// make sure options.zoom is a number
						if ( options.zoom && typeof options.zoom !== "number" ) {
							options.zoom = +options.zoom;
						}

						options.zoom = options.zoom || 8; // default to 8

						options.map.setZoom( options.zoom );

						//Make sure heading is a number
						if ( options.heading && typeof options.heading !== "number" ) {
							options.heading = +options.heading;
						}
						//Make sure pitch is a number
						if ( options.pitch && typeof options.pitch !== "number" ) {
							options.pitch = +options.pitch;
						}
					} else if (that.media.currentTime >= options.start && that.media.currentTime <= options.end) {
						setTimeout(function () {
							isMapSetup();
						}, 13);
					}
				};
				isMapSetup();
			},
			/**
			 * @member webpage
			 * The end function will be executed when the currentTime
			 * of the video reaches the end time provided by the
			 * options variable
			 */
			end: function (event, options) {
				containerDiv.style.display = "none";

				// if the map exists hide it do not delete the map just in
				// case the user seeks back to time b/w start and end
				if (options.map) {
					options.map.getDiv().style.display = "none";
				}
			},
			_teardown: function (options) {
				// the map must be manually removed
				document.getElementById(options.target).removeChild(containerDiv);
				containerDiv = contentDiv = mapdiv = options.map = location = null;
			},
			frame: function(event, options, time){
				var t = time - options.start;
				var opacity = 1;
				if (t < options.fadeIn) {
					opacity = t / options.fadeIn;
				} else if (time > options.end - options.fadeOut) {
					opacity = (options.end - time) / options.fadeOut;
				}
				containerDiv.style.opacity = opacity;
			}
		};
	}, {
		about: {
			name: "Popcorn Google Map Plugin",
			version: "0.1",
			author: "@annasob",
			website: "annasob.wordpress.com"
		},
		options: {
			start: {
				elem: "input",
				type: "text",
				label: "In"
			},
			end: {
				elem: "input",
				type: "text",
				label: "Out"
			},
			target: "map-container",
			type: {
				elem: "select",
				options: ["ROADMAP", "SATELLITE", "STREETVIEW", "HYBRID", "TERRAIN"],
				label: "Type"
			},
			zoom: {
				elem: "input",
				type: "text",
				label: "Zoom"
			},
			lat: {
				elem: "input",
				type: "text",
				label: "Lat"
			},
			lng: {
				elem: "input",
				type: "text",
				label: "Lng"
			},
			location: {
				elem: "input",
				type: "text",
				label: "Location"
			},
			heading: {
				elem: "input",
				type: "text",
				label: "Heading"
			},
			pitch: {
				elem: "input",
				type: "text",
				label: "Pitch"
			}
		}
	});
}(window.Popcorn));

