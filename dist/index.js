(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define("AudioRecorder", [], factory);
	else if(typeof exports === 'object')
		exports["AudioRecorder"] = factory();
	else
		root["AudioRecorder"] = factory();
})(typeof self !== 'undefined' ? self : this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//

exports.default = {
	props: {
		errors: {
			default: function _default() {
				return {};
			}
		},

		startingData: {
			default: function _default() {
				return {};
			}
		}
	},

	data: function data() {
		return {
			contentItem: {
				title: '',
				description: '',
				recording: {
					start: null,
					end: null,
					duration: null,
					audioSrc: null
				}
			},

			currentTime: 0,

			svgHeight: 70,

			state: 'stopped',
			audioPlaying: false,

			svgId: FirebaseKey(),

			recorder: null
		};
	},

	/* life cycle */

	created: function created() {

		if (Object.keys(this.startingData).length) {
			this.contentItem = this.startingData;
			this.state = 'has-audio';

			return;
		}

		this.$emit('value', this.contentItem);
	},
	mounted: function mounted() {

		// initialize the volume rectangles
		// that jump and bounce as you record

		var svg = d3.select('#' + this.svgId);
		var w = 500;

		for (var i = 0; i < 128; i += 1) {

			svg.append('rect').attr('class', 'visualizer-rect').attr('height', '2px').attr('width', '2px').attr('rx', '1px').attr('ry', '1px').attr('x', i * (w / 128)).attr('y', this.svgHeight - 1).attr('transform', 'translate(-2 -2)').style('fill', '#e3e3e3');
		}
	},
	beforeDestroy: function beforeDestroy() {

		if (this.state === 'recording') {
			this.stopRecording();
		}
	},


	methods: {
		toggleRecorder: function toggleRecorder() {

			if (this.state === 'recording') {
				this.stopRecording();

				this.state = 'stopped';
			} else if (this.state === 'stopped') {
				this.startRecording();

				this.state = 'recording';
			}
		},
		startRecording: function startRecording() {
			var _this = this;

			GetMedia({ video: false, audio: true }).then(function (localMediaStream) {

				// set up recorder
				var options = {
					mimeType: 'video/webm;codecs=vp9'
				};
				var recordedChunks = [];
				var recorder = new MediaRecorder(localMediaStream, options);

				recorder.addEventListener('dataavailable', function (e) {
					var data = e.data;


					if (data.size > 0) {
						recordedChunks.push(data);
					}
				});

				var visualizingAnimation = null;

				recorder.addEventListener('start', function () {

					_this.contentItem.recording.start = new Date().getTime();

					// set up visualizer
					var audioContext = new AudioContext(); // create context for our audio
					var audioSource = audioContext.createMediaStreamSource(localMediaStream); // hook stream into said context
					var analyser = audioContext.createAnalyser(); // make an analyzer

					// set this. I guess it defines the range of values you will get from getByteTimeDomainData..?
					// Maybe? I don't know. You have Google.
					analyser.fftSize = 128;

					// anyways. you create this array for getByteTimeDomainData to work with.
					// The only requirement I know of is that the parameter for your Uint8Array
					// *must* be equal to analyser.fftsize or else... idk
					var dataArray = new Uint8Array(analyser.fftSize);

					// this line isn't explicitly in any examples that I could find. It connects
					// your audio to your analyser
					audioSource.connect(analyser);

					var rectangles = d3.selectAll('.visualizer-rect');
					var visualizerHeight = 30;

					var getHeight = function getHeight(i, e) {
						var datum = dataArray[i];
						var ratio = (datum - analyser.fftSize) / analyser.fftSize;

						// minimum height
						var min = 2;

						if (e) {
							// this is why the bars fall slowly
							// it makes the min either 2, or 3
							// less than the current height
							min = Math.max(e.getBBox().height - 3, 2);
						}

						return Math.max(4 * ratio * visualizerHeight, min);
					};

					var startAudioVisualizingAnimation = function startAudioVisualizingAnimation() {

						// this is the reason this is recursive
						visualizingAnimation = window.requestAnimationFrame(startAudioVisualizingAnimation);

						// This changes dataArray to be what we want. For some reason, this will
						// continue to function as expected even though it is mutating dataArray.
						// Again, just don't question it.
						analyser.getByteTimeDomainData(dataArray);

						rectangles.attr('height', function (d, i, nodes) {
							return getHeight(i, nodes[i]);
						}).attr('y', function (d, i, nodes) {
							var height = nodes[i].getBBox().height;

							return _this.svgHeight - height;
						});
					};

					startAudioVisualizingAnimation();
				});

				recorder.addEventListener('stop', function () {

					// turn off visualizing animtion
					window.cancelAnimationFrame(visualizingAnimation);

					// turn off mic
					var audioChannels = localMediaStream.getTracks();
					audioChannels.forEach(function (channel) {
						return channel.stop();
					});

					// should always be true... probably
					if (recordedChunks.length) {
						_this.state = 'has-audio';
					}

					if (!recordedChunks.length) {
						_this.state = 'error';
						_this.recordingError = 'We were unable to record at this time. Please try again later.';

						return;
					}

					// gather metadata and assign new audio to player
					var currentTime = new Date().getTime();
					var duration = currentTime - _this.contentItem.recording.start;
					var audioBlob = new Blob(recordedChunks);

					_this.contentItem.recording.end = currentTime;
					_this.contentItem.recording.duration = duration;
					_this.contentItem.recording.audioSrc = URL.createObjectURL(audioBlob);

					var audioKey = FirebaseKey();
					_this.$emit('item-to-upload', {
						key: audioKey,
						blob: audioBlob
					});
				});

				_this.recorder = recorder;

				recorder.start();
			});
		},
		stopRecording: function stopRecording() {
			this.recorder.stop();
		},


		GetTime: GetTime

	}
};
module.exports = exports['default'];

/***/ }),
/* 1 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__babel_loader_node_modules_vue_loader_lib_selector_type_script_index_0_main_vue__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__babel_loader_node_modules_vue_loader_lib_selector_type_script_index_0_main_vue___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0__babel_loader_node_modules_vue_loader_lib_selector_type_script_index_0_main_vue__);
/* harmony namespace reexport (unknown) */ for(var __WEBPACK_IMPORT_KEY__ in __WEBPACK_IMPORTED_MODULE_0__babel_loader_node_modules_vue_loader_lib_selector_type_script_index_0_main_vue__) if(__WEBPACK_IMPORT_KEY__ !== 'default') (function(key) { __webpack_require__.d(__webpack_exports__, key, function() { return __WEBPACK_IMPORTED_MODULE_0__babel_loader_node_modules_vue_loader_lib_selector_type_script_index_0_main_vue__[key]; }) }(__WEBPACK_IMPORT_KEY__));
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__node_modules_vue_loader_lib_template_compiler_index_id_data_v_4c2805bf_hasScoped_false_buble_transforms_node_modules_vue_loader_lib_template_compiler_preprocessor_engine_pug_node_modules_vue_loader_lib_selector_type_template_index_0_main_vue__ = __webpack_require__(8);
var disposed = false
function injectStyle (ssrContext) {
  if (disposed) return
  __webpack_require__(2)
}
var normalizeComponent = __webpack_require__(7)
/* script */


/* template */

/* template functional */
var __vue_template_functional__ = false
/* styles */
var __vue_styles__ = injectStyle
/* scopeId */
var __vue_scopeId__ = null
/* moduleIdentifier (server only) */
var __vue_module_identifier__ = null
var Component = normalizeComponent(
  __WEBPACK_IMPORTED_MODULE_0__babel_loader_node_modules_vue_loader_lib_selector_type_script_index_0_main_vue___default.a,
  __WEBPACK_IMPORTED_MODULE_1__node_modules_vue_loader_lib_template_compiler_index_id_data_v_4c2805bf_hasScoped_false_buble_transforms_node_modules_vue_loader_lib_template_compiler_preprocessor_engine_pug_node_modules_vue_loader_lib_selector_type_template_index_0_main_vue__["a" /* default */],
  __vue_template_functional__,
  __vue_styles__,
  __vue_scopeId__,
  __vue_module_identifier__
)
Component.options.__file = "src\\main.vue"

/* hot reload */
if (false) {(function () {
  var hotAPI = require("vue-hot-reload-api")
  hotAPI.install(require("vue"), false)
  if (!hotAPI.compatible) return
  module.hot.accept()
  if (!module.hot.data) {
    hotAPI.createRecord("data-v-4c2805bf", Component.options)
  } else {
    hotAPI.reload("data-v-4c2805bf", Component.options)
  }
  module.hot.dispose(function (data) {
    disposed = true
  })
})()}

/* harmony default export */ __webpack_exports__["default"] = (Component.exports);


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(3);
if(typeof content === 'string') content = [[module.i, content, '']];
if(content.locals) module.exports = content.locals;
// add the styles to the DOM
var update = __webpack_require__(5)("eea19394", content, false, {});
// Hot Module Replacement
if(false) {
 // When the styles change, update the <style> tags
 if(!content.locals) {
   module.hot.accept("!!../node_modules/css-loader/index.js!../node_modules/vue-loader/lib/style-compiler/index.js?{\"vue\":true,\"id\":\"data-v-4c2805bf\",\"scoped\":false,\"hasInlineConfig\":false}!../node_modules/sass-loader/lib/loader.js!../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./main.vue", function() {
     var newContent = require("!!../node_modules/css-loader/index.js!../node_modules/vue-loader/lib/style-compiler/index.js?{\"vue\":true,\"id\":\"data-v-4c2805bf\",\"scoped\":false,\"hasInlineConfig\":false}!../node_modules/sass-loader/lib/loader.js!../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./main.vue");
     if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
     update(newContent);
   });
 }
 // When the module is disposed, remove the <style> tags
 module.hot.dispose(function() { update(); });
}

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(4)(false);
// imports


// module
exports.push([module.i, "\n.audio-recorder .recorder {\n  margin: 15px 0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  position: relative;\n}\n.audio-recorder .recorder svg {\n    position: absolute;\n    top: 0;\n    left: 0;\n    width: 100%;\n    z-index: 1;\n    pointer-events: none;\n}\n.audio-recorder .recorder p {\n    font-size: 12px;\n    text-transform: uppercase;\n    letter-spacing: 2px;\n    color: #4a5155;\n}\n.audio-recorder .recorder .player {\n    position: absolute;\n    top: 0;\n    left: 0;\n    right: 0;\n    bottom: 0;\n    background-color: rgba(40, 165, 231, 0.15);\n}\n.audio-recorder .recorder .player:not(.has-audio) {\n      opacity: 0;\n      pointer-events: none;\n}\n.audio-recorder .recorder .record-button {\n    height: 70px;\n    width: 50px;\n    margin: 0 10px;\n    position: relative;\n    z-index: 1;\n    transition: opacity 0.2s ease;\n}\n.audio-recorder .recorder .record-button.recording::before {\n      height: 40px;\n      width: 40px;\n      border-radius: 5px;\n      background-color: #e57374;\n}\n.audio-recorder .recorder .record-button.recording::after {\n      height: 0;\n      width: 0;\n}\n.audio-recorder .recorder .record-button.has-audio {\n      opacity: 0;\n      pointer-events: none;\n}\n.audio-recorder .recorder .record-button:active::before {\n      height: 20px;\n      width: 20px;\n}\n.audio-recorder .recorder .record-button:active::after {\n      height: 30px;\n      width: 30px;\n}\n.audio-recorder .recorder .record-button::before {\n      height: 50px;\n      width: 50px;\n      background-color: #e77c7d;\n}\n.audio-recorder .recorder .record-button::after {\n      height: 30px;\n      width: 30px;\n      background-color: #ed9d9e;\n}\n.audio-recorder .recorder .record-button::before, .audio-recorder .recorder .record-button::after {\n      content: ' ';\n      position: absolute;\n      top: 50%;\n      left: 50%;\n      transform: translate(-50%, -50%);\n      border-radius: 50%;\n      cursor: pointer;\n      transition: height 0.2s ease, width 0.2s ease, background-color 0.2s ease;\n}\n.audio-recorder .recorder .record-button span {\n      position: absolute;\n      top: 50%;\n      transform: translateY(-50%);\n      font-size: 12px;\n      text-transform: uppercase;\n      letter-spacing: 2px;\n      color: #4a5155;\n      white-space: nowrap;\n      padding: 0 10px;\n}\n.audio-recorder .recorder .record-button span:nth-child(1) {\n        right: 100%;\n}\n.audio-recorder .recorder .record-button span:nth-child(2) {\n        left: 100%;\n}\n", ""]);

// exports


/***/ }),
/* 4 */
/***/ (function(module, exports) {

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
// css base code, injected by the css-loader
module.exports = function(useSourceMap) {
	var list = [];

	// return the list of modules as css string
	list.toString = function toString() {
		return this.map(function (item) {
			var content = cssWithMappingToString(item, useSourceMap);
			if(item[2]) {
				return "@media " + item[2] + "{" + content + "}";
			} else {
				return content;
			}
		}).join("");
	};

	// import a list of modules into the list
	list.i = function(modules, mediaQuery) {
		if(typeof modules === "string")
			modules = [[null, modules, ""]];
		var alreadyImportedModules = {};
		for(var i = 0; i < this.length; i++) {
			var id = this[i][0];
			if(typeof id === "number")
				alreadyImportedModules[id] = true;
		}
		for(i = 0; i < modules.length; i++) {
			var item = modules[i];
			// skip already imported module
			// this implementation is not 100% perfect for weird media query combinations
			//  when a module is imported multiple times with different media queries.
			//  I hope this will never occur (Hey this way we have smaller bundles)
			if(typeof item[0] !== "number" || !alreadyImportedModules[item[0]]) {
				if(mediaQuery && !item[2]) {
					item[2] = mediaQuery;
				} else if(mediaQuery) {
					item[2] = "(" + item[2] + ") and (" + mediaQuery + ")";
				}
				list.push(item);
			}
		}
	};
	return list;
};

function cssWithMappingToString(item, useSourceMap) {
	var content = item[1] || '';
	var cssMapping = item[3];
	if (!cssMapping) {
		return content;
	}

	if (useSourceMap && typeof btoa === 'function') {
		var sourceMapping = toComment(cssMapping);
		var sourceURLs = cssMapping.sources.map(function (source) {
			return '/*# sourceURL=' + cssMapping.sourceRoot + source + ' */'
		});

		return [content].concat(sourceURLs).concat([sourceMapping]).join('\n');
	}

	return [content].join('\n');
}

// Adapted from convert-source-map (MIT)
function toComment(sourceMap) {
	// eslint-disable-next-line no-undef
	var base64 = btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap))));
	var data = 'sourceMappingURL=data:application/json;charset=utf-8;base64,' + base64;

	return '/*# ' + data + ' */';
}


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

/*
  MIT License http://www.opensource.org/licenses/mit-license.php
  Author Tobias Koppers @sokra
  Modified by Evan You @yyx990803
*/

var hasDocument = typeof document !== 'undefined'

if (typeof DEBUG !== 'undefined' && DEBUG) {
  if (!hasDocument) {
    throw new Error(
    'vue-style-loader cannot be used in a non-browser environment. ' +
    "Use { target: 'node' } in your Webpack config to indicate a server-rendering environment."
  ) }
}

var listToStyles = __webpack_require__(6)

/*
type StyleObject = {
  id: number;
  parts: Array<StyleObjectPart>
}

type StyleObjectPart = {
  css: string;
  media: string;
  sourceMap: ?string
}
*/

var stylesInDom = {/*
  [id: number]: {
    id: number,
    refs: number,
    parts: Array<(obj?: StyleObjectPart) => void>
  }
*/}

var head = hasDocument && (document.head || document.getElementsByTagName('head')[0])
var singletonElement = null
var singletonCounter = 0
var isProduction = false
var noop = function () {}
var options = null
var ssrIdKey = 'data-vue-ssr-id'

// Force single-tag solution on IE6-9, which has a hard limit on the # of <style>
// tags it will allow on a page
var isOldIE = typeof navigator !== 'undefined' && /msie [6-9]\b/.test(navigator.userAgent.toLowerCase())

module.exports = function (parentId, list, _isProduction, _options) {
  isProduction = _isProduction

  options = _options || {}

  var styles = listToStyles(parentId, list)
  addStylesToDom(styles)

  return function update (newList) {
    var mayRemove = []
    for (var i = 0; i < styles.length; i++) {
      var item = styles[i]
      var domStyle = stylesInDom[item.id]
      domStyle.refs--
      mayRemove.push(domStyle)
    }
    if (newList) {
      styles = listToStyles(parentId, newList)
      addStylesToDom(styles)
    } else {
      styles = []
    }
    for (var i = 0; i < mayRemove.length; i++) {
      var domStyle = mayRemove[i]
      if (domStyle.refs === 0) {
        for (var j = 0; j < domStyle.parts.length; j++) {
          domStyle.parts[j]()
        }
        delete stylesInDom[domStyle.id]
      }
    }
  }
}

function addStylesToDom (styles /* Array<StyleObject> */) {
  for (var i = 0; i < styles.length; i++) {
    var item = styles[i]
    var domStyle = stylesInDom[item.id]
    if (domStyle) {
      domStyle.refs++
      for (var j = 0; j < domStyle.parts.length; j++) {
        domStyle.parts[j](item.parts[j])
      }
      for (; j < item.parts.length; j++) {
        domStyle.parts.push(addStyle(item.parts[j]))
      }
      if (domStyle.parts.length > item.parts.length) {
        domStyle.parts.length = item.parts.length
      }
    } else {
      var parts = []
      for (var j = 0; j < item.parts.length; j++) {
        parts.push(addStyle(item.parts[j]))
      }
      stylesInDom[item.id] = { id: item.id, refs: 1, parts: parts }
    }
  }
}

function createStyleElement () {
  var styleElement = document.createElement('style')
  styleElement.type = 'text/css'
  head.appendChild(styleElement)
  return styleElement
}

function addStyle (obj /* StyleObjectPart */) {
  var update, remove
  var styleElement = document.querySelector('style[' + ssrIdKey + '~="' + obj.id + '"]')

  if (styleElement) {
    if (isProduction) {
      // has SSR styles and in production mode.
      // simply do nothing.
      return noop
    } else {
      // has SSR styles but in dev mode.
      // for some reason Chrome can't handle source map in server-rendered
      // style tags - source maps in <style> only works if the style tag is
      // created and inserted dynamically. So we remove the server rendered
      // styles and inject new ones.
      styleElement.parentNode.removeChild(styleElement)
    }
  }

  if (isOldIE) {
    // use singleton mode for IE9.
    var styleIndex = singletonCounter++
    styleElement = singletonElement || (singletonElement = createStyleElement())
    update = applyToSingletonTag.bind(null, styleElement, styleIndex, false)
    remove = applyToSingletonTag.bind(null, styleElement, styleIndex, true)
  } else {
    // use multi-style-tag mode in all other cases
    styleElement = createStyleElement()
    update = applyToTag.bind(null, styleElement)
    remove = function () {
      styleElement.parentNode.removeChild(styleElement)
    }
  }

  update(obj)

  return function updateStyle (newObj /* StyleObjectPart */) {
    if (newObj) {
      if (newObj.css === obj.css &&
          newObj.media === obj.media &&
          newObj.sourceMap === obj.sourceMap) {
        return
      }
      update(obj = newObj)
    } else {
      remove()
    }
  }
}

var replaceText = (function () {
  var textStore = []

  return function (index, replacement) {
    textStore[index] = replacement
    return textStore.filter(Boolean).join('\n')
  }
})()

function applyToSingletonTag (styleElement, index, remove, obj) {
  var css = remove ? '' : obj.css

  if (styleElement.styleSheet) {
    styleElement.styleSheet.cssText = replaceText(index, css)
  } else {
    var cssNode = document.createTextNode(css)
    var childNodes = styleElement.childNodes
    if (childNodes[index]) styleElement.removeChild(childNodes[index])
    if (childNodes.length) {
      styleElement.insertBefore(cssNode, childNodes[index])
    } else {
      styleElement.appendChild(cssNode)
    }
  }
}

function applyToTag (styleElement, obj) {
  var css = obj.css
  var media = obj.media
  var sourceMap = obj.sourceMap

  if (media) {
    styleElement.setAttribute('media', media)
  }
  if (options.ssrId) {
    styleElement.setAttribute(ssrIdKey, obj.id)
  }

  if (sourceMap) {
    // https://developer.chrome.com/devtools/docs/javascript-debugging
    // this makes source maps inside style tags work properly in Chrome
    css += '\n/*# sourceURL=' + sourceMap.sources[0] + ' */'
    // http://stackoverflow.com/a/26603875
    css += '\n/*# sourceMappingURL=data:application/json;base64,' + btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))) + ' */'
  }

  if (styleElement.styleSheet) {
    styleElement.styleSheet.cssText = css
  } else {
    while (styleElement.firstChild) {
      styleElement.removeChild(styleElement.firstChild)
    }
    styleElement.appendChild(document.createTextNode(css))
  }
}


/***/ }),
/* 6 */
/***/ (function(module, exports) {

/**
 * Translates the list format produced by css-loader into something
 * easier to manipulate.
 */
module.exports = function listToStyles (parentId, list) {
  var styles = []
  var newStyles = {}
  for (var i = 0; i < list.length; i++) {
    var item = list[i]
    var id = item[0]
    var css = item[1]
    var media = item[2]
    var sourceMap = item[3]
    var part = {
      id: parentId + ':' + i,
      css: css,
      media: media,
      sourceMap: sourceMap
    }
    if (!newStyles[id]) {
      styles.push(newStyles[id] = { id: id, parts: [part] })
    } else {
      newStyles[id].parts.push(part)
    }
  }
  return styles
}


/***/ }),
/* 7 */
/***/ (function(module, exports) {

/* globals __VUE_SSR_CONTEXT__ */

// IMPORTANT: Do NOT use ES2015 features in this file.
// This module is a runtime utility for cleaner component module output and will
// be included in the final webpack user bundle.

module.exports = function normalizeComponent (
  rawScriptExports,
  compiledTemplate,
  functionalTemplate,
  injectStyles,
  scopeId,
  moduleIdentifier /* server only */
) {
  var esModule
  var scriptExports = rawScriptExports = rawScriptExports || {}

  // ES6 modules interop
  var type = typeof rawScriptExports.default
  if (type === 'object' || type === 'function') {
    esModule = rawScriptExports
    scriptExports = rawScriptExports.default
  }

  // Vue.extend constructor export interop
  var options = typeof scriptExports === 'function'
    ? scriptExports.options
    : scriptExports

  // render functions
  if (compiledTemplate) {
    options.render = compiledTemplate.render
    options.staticRenderFns = compiledTemplate.staticRenderFns
    options._compiled = true
  }

  // functional template
  if (functionalTemplate) {
    options.functional = true
  }

  // scopedId
  if (scopeId) {
    options._scopeId = scopeId
  }

  var hook
  if (moduleIdentifier) { // server build
    hook = function (context) {
      // 2.3 injection
      context =
        context || // cached call
        (this.$vnode && this.$vnode.ssrContext) || // stateful
        (this.parent && this.parent.$vnode && this.parent.$vnode.ssrContext) // functional
      // 2.2 with runInNewContext: true
      if (!context && typeof __VUE_SSR_CONTEXT__ !== 'undefined') {
        context = __VUE_SSR_CONTEXT__
      }
      // inject component styles
      if (injectStyles) {
        injectStyles.call(this, context)
      }
      // register component module identifier for async chunk inferrence
      if (context && context._registeredComponents) {
        context._registeredComponents.add(moduleIdentifier)
      }
    }
    // used by ssr in case component is cached and beforeCreate
    // never gets called
    options._ssrRegister = hook
  } else if (injectStyles) {
    hook = injectStyles
  }

  if (hook) {
    var functional = options.functional
    var existing = functional
      ? options.render
      : options.beforeCreate

    if (!functional) {
      // inject component registration as beforeCreate hook
      options.beforeCreate = existing
        ? [].concat(existing, hook)
        : [hook]
    } else {
      // for template-only hot-reload because in that case the render fn doesn't
      // go through the normalizer
      options._injectStyles = hook
      // register for functioal component in vue file
      options.render = function renderWithStyleInjection (h, context) {
        hook.call(context)
        return existing(h, context)
      }
    }
  }

  return {
    esModule: esModule,
    exports: scriptExports,
    options: options
  }
}


/***/ }),
/* 8 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
var render = function() {
  var _vm = this
  var _h = _vm.$createElement
  var _c = _vm._self._c || _h
  return _c("div", { staticClass: "audio-recorder" }, [
    _c(
      "div",
      { staticClass: "text-description" },
      [
        _c("text-input", {
          attrs: {
            placeholder: "Type a title for your recording",
            label: "title",
            error: _vm.errors.title,
            "class-list": "h2",
            "initial-value": _vm.contentItem.title
          },
          on: {
            value: function($event) {
              _vm.contentItem.title = $event
            }
          }
        }),
        _c("text-input", {
          attrs: {
            placeholder: "Type a description for your recording",
            label: "description",
            error: _vm.errors.description,
            "class-list": "p",
            "initial-value": _vm.contentItem.description
          },
          on: {
            value: function($event) {
              _vm.contentItem.description = $event
            }
          }
        })
      ],
      1
    ),
    _c(
      "div",
      { staticClass: "recorder" },
      [
        _c("svg", {
          staticClass: "visualizer",
          attrs: { id: _vm.svgId, height: "70px" }
        }),
        _c("player", {
          class: _vm.state,
          attrs: {
            src: _vm.contentItem.recording.audioSrc,
            duration: _vm.contentItem.recording.duration
          }
        }),
        _c(
          "div",
          {
            staticClass: "record-button noselect",
            class: _vm.state,
            on: { click: _vm.toggleRecorder }
          },
          [
            _c("span", [_vm._v("click to")]),
            _c("span", [
              _vm._v(_vm._s(_vm.state === "recording" ? "stop" : "record"))
            ])
          ]
        )
      ],
      1
    )
  ])
}
var staticRenderFns = []
render._withStripped = true
var esExports = { render: render, staticRenderFns: staticRenderFns }
/* harmony default export */ __webpack_exports__["a"] = (esExports);
if (false) {
  module.hot.accept()
  if (module.hot.data) {
    require("vue-hot-reload-api")      .rerender("data-v-4c2805bf", esExports)
  }
}

/***/ })
/******/ ]);
});
//# sourceMappingURL=index.js.map