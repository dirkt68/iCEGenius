import * as vscode from "vscode"; // vscode api
import { appendFileSync, unlinkSync } from "fs"; // filesystem stuff
import { glob } from "glob"; // file collection
import path = require("path"); //
import { execSync, exec } from "child_process"; // execute command line stuff


export class Handler {
    private pathToSuite: string;
    private autoOpenGTK: boolean;

    private currSim: boolean;
    private currBuild: boolean;

    private outputConsole: vscode.OutputChannel;
    private tempFilesToDelete: string[];

    // eslint-disable-next-line @typescript-eslint/naming-convention
    private ENV_CMD: string;

    // constructor to init the Handler
    constructor() {
        // grab user configurations for the extension
        const config: vscode.WorkspaceConfiguration =
            vscode.workspace.getConfiguration("iCEGenius-extension");

        // set the path to the tools, if none found default to C:\oss-cad-suite
        this.pathToSuite = config.get("oss-cad-suite-path", "C:\\oss-cad-suite");
        this.ENV_CMD = `${this.pathToSuite}/environment.bat`;
        // this command will automatically run gtkwave after simulation compiles unless otherwise specified
        this.autoOpenGTK = config.get("auto-open-gtkwave", true);

        // create global output channel
        this.outputConsole = vscode.window.createOutputChannel("iCEGenius");

        // create an array to hold files that need to be deleted when cleanup is called
        this.tempFilesToDelete = [];

        // setup resource checking vars
        this.currBuild = false;
        this.currSim = false;
    }


    // function to execute automatic simulation
    public simulate(cwd: string) {
        // start output
        this.outputConsole.show(true);
        const currTime: Date = new Date();
        this.outputConsole.appendLine(`========== iCEGenius | ${currTime} | Simulating ==========\n`);

        // prevent execution if a previous process is still running
        if (this.currSim || this.currBuild) {
            this.outputConsole.appendLine("A process is currently running! Exiting...");
            return;
        }

        // simulation officially running
        this.currSim = true;

        // print current working directory
        this.outputConsole.appendLine(`Current directory: ${cwd}`);

        // find all *.v files that exist in the current directory and any underneath
        const fixedPath = cwd.replace(/\\/g, '/'); // need to replace \ for / for glob
        const totalFiles = glob.sync(fixedPath + '/**/*.v');

        // if none found, nothing to do so exit
        if (totalFiles.length < 1) {
            this.outputConsole.appendLine("No *.v files found , exiting...");
            return;
        }

        // create text file to save each name of the files found
        const textFilePath: string = fixedPath + '/files.txt';
        this.tempFilesToDelete.push(textFilePath); // note down file for deletion after the script ends

        // print out files found and write them to the output file
        for (const filename of totalFiles) {
            appendFileSync(textFilePath, `${filename}\n`);
            this.outputConsole.appendLine(`Files Found: ${path.basename(filename)}`);
        }

        // just for formatting
        this.outputConsole.appendLine("");

        // build commands to run
        const CD_CMD: string = `cd /d ${fixedPath}`;
        const IVERILOG_CMD: string = `iverilog -o sim -c ${textFilePath}`;
        const VVP_CMD: string = `vvp sim`;

        // build full set of commands based on if the user wants to open gtkwave
        const FULL_CMD: string = `${CD_CMD} && ${this.ENV_CMD} && ${IVERILOG_CMD} && ${VVP_CMD}`;

        try { // attempt to successfully run all simulation commands 
            this.outputConsole.appendLine(`Executing ${FULL_CMD}`);
            this.outputConsole.appendLine(execSync(FULL_CMD).toString());
            this.outputConsole.appendLine("Simulation Executed Successfully!");

            // open gtkwave automatically if true
            if (this.autoOpenGTK) {
                const vcdFile = glob.sync(fixedPath + '/**/*.vcd')[0];
                const GTK_CMD: string = `gtkwave ${vcdFile}`;
                exec(`${this.ENV_CMD} && ${GTK_CMD}`);
            }
        }
        catch (cmd_err: any) { // if a command fails, return it to the user so they might fix
            this.outputConsole.appendLine("Something went wrong!");
            if (typeof cmd_err === 'string') {
                this.outputConsole.appendLine(cmd_err);
            }
            else if (cmd_err instanceof Error) {
                this.outputConsole.appendLine(cmd_err.message);
            }
            else { // just in case something goes horrifically wrong
                this.outputConsole.appendLine("Unknown Error Occurred");
            }
            this.outputConsole.appendLine("Hint: If the error refers to \"module already declared\",");
            this.outputConsole.appendLine("temporarily remove any `include statements throughout your .v files");
            this.outputConsole.appendLine("This may result in red squiggles, but will fix actual simulation");
        }
        finally {
            // no matter what happens, delete temp files and end simulation
            this.outputConsole.appendLine("==================== Simulation Finished ====================\n");
            this.cleanup();
            this.currSim = false;
        }
        return;
    }


    // function to build project and upload it to board
    public buildAndUpload(cwd: string) {
        // 1. collect all verilog files
        // 2. run through yosys
        // 3. run through nextpnr
        // 4. run through flasher

        // remove file name from path

        this.outputConsole.show(true);
        this.outputConsole.appendLine("Building...");

        // prevent execution if a previous process is still running
        if (this.currSim || this.currBuild) {
            this.outputConsole.appendLine("A process is currently running! Exiting...");
            return;
        }

        this.outputConsole.appendLine(`Current directory: ${cwd}`);

        // find all *.v files that exist in the current directory and any underneath
        const fixedPath = cwd.replace(/\\/g, '/');
        const totalVerilogFiles = glob.sync(fixedPath + '/**/*.v');

        if (totalVerilogFiles.length < 1) {
            this.outputConsole.appendLine("No *.v files found , exiting...");
            return;
        }

        this.outputConsole.appendLine(`Files Found: ${totalVerilogFiles}`);


        this.cleanup();
        return;
    }


    // helper functions
    private cleanup() {
        for (const file of this.tempFilesToDelete) {
            unlinkSync(file);
        }
        this.tempFilesToDelete = [];
    }

}
