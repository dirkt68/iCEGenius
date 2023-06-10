import * as vscode from "vscode"; // vscode api
import * as fs from "fs"; // filesystem traversal
import { exec, ChildProcess } from "child_process"; // command execution api

export class Handler {
    private pathToSuite: string;
    private autoOpenGTK: boolean;

    private currSim: ChildProcess | undefined;
    private currBuild: ChildProcess | undefined;

    private outputConsole: vscode.OutputChannel;

    // constructor to init the Handler
    constructor() {
        // grab user configurations for the extension
        const config: vscode.WorkspaceConfiguration =
            vscode.workspace.getConfiguration("iCEGenius-extension");

        // set the path to the tools, if none found default to C:\oss-cad-suite
        this.pathToSuite = config.get("oss-cad-suite-path", "C:\\oss-cad-suite");
        // this command will automatically run gtkwave after simulation compiles unless otherwise specified
        this.autoOpenGTK = config.get("auto-open-gtkwave", true);

        // create global output channel
        this.outputConsole = vscode.window.createOutputChannel("iCEGenius");
    }

    // function to execute automatic simulation
    public simulate() {
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
    public buildAndUpload() {
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
    private cleanup(buildOrSim: string){
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
