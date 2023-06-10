/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((module) => {

module.exports = require("vscode");

/***/ }),
/* 2 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Handler = void 0;
const vscode = __webpack_require__(1); // vscode api
class Handler {
    // constructor to init the Handler
    constructor() {
        // grab user configurations for the extension
        const config = vscode.workspace.getConfiguration("iCEGenius-extension");
        // set the path to the tools, if none found default to C:\oss-cad-suite
        this.pathToSuite = config.get("oss-cad-suite-path", "C:\\oss-cad-suite");
        // this command will automatically run gtkwave after simulation compiles unless otherwise specified
        this.autoOpenGTK = config.get("auto-open-gtkwave", true);
        // create global output channel
        this.outputConsole = vscode.window.createOutputChannel("iCEGenius");
    }
    // function to execute automatic simulation
    simulate() {
        // 1. search cwd for verilog files
        // 2. create file-list.txt with all files
        // 3. run iverilog
        // 4. run vvp
        // 5. if gtkwave true, open gtkwave
        this.outputConsole.show(true);
        this.outputConsole.appendLine("Simulating Verilog...");
        // prevent execution if a previous process is still running
        if (this.currSim || this.currBuild) {
            this.outputConsole.appendLine("A process is currently running! Exiting...");
            return;
        }
        return;
    }
    // function to build project and upload it to board
    buildAndUpload() {
        // 1. collect all verilog files
        // 2. run through yosys
        // 3. run through nextpnr
        // 4. run through flash
        this.outputConsole.show(true);
        this.outputConsole.appendLine("Building...");
        // prevent execution if a previous process is still running
        if (this.currSim || this.currBuild) {
            this.outputConsole.appendLine("A process is currently running! Exiting...");
            return;
        }
        return;
    }
    // helper functions
    cleanup(buildOrSim) {
        switch (buildOrSim) {
            case "build":
                break;
            case "sim":
                break;
            default:
                break;
        }
    }
}
exports.Handler = Handler;


/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.deactivate = exports.activate = void 0;
const vscode = __webpack_require__(1);
const handler_1 = __webpack_require__(2);
function activate(context) {
    const helper = new handler_1.Handler(); // instantiate handler with functions
    // register the two commands
    let simulator = vscode.commands.registerCommand('iCEGenius-extension.sim', () => {
        helper.simulate();
    });
    let builder = vscode.commands.registerCommand('iCEGenius-extension.buildAndUpload', () => {
        helper.buildAndUpload();
    });
    // let vscode know about them
    context.subscriptions.push(simulator);
    context.subscriptions.push(builder);
}
exports.activate = activate;
// This method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=extension.js.map