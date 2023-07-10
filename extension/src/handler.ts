import * as vscode from "vscode"; // vscode api
import { appendFileSync, unlinkSync } from "fs"; // filesystem stuff
import { glob } from "glob"; // file collection
import path = require("path"); // filename printing
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
        const fixedPath: string = cwd.replace(/\\/g, '/'); // need to replace \ for / for glob
        const totalFiles: string[] = glob.sync(fixedPath + '/**/*.v');

        // if none found, nothing to do so exit
        if (totalFiles.length < 1) {
            this.outputConsole.appendLine("No *.v files found , exiting...");
            return;
        }

        // create text file to save each name of the files found
        const textFilePath: string = fixedPath + '/files.txt';
        this.tempFilesToDelete.push(textFilePath); // note down file for deletion after the script ends

        // print out files found and write them to the output file
        this.outputConsole.appendLine(`Found ${totalFiles.length} *.v files:`);
        for (const filename of totalFiles) {
            appendFileSync(textFilePath, `${filename}\n`);
            this.outputConsole.appendLine(`File Found: ${path.basename(filename)}`);
        }

        // just for formatting
        this.outputConsole.appendLine("");

        // build commands to run
        const CD_CMD: string = `cd /d ${fixedPath}`;
        const IVERILOG_CMD: string = `iverilog -o sim -c ${textFilePath}`;
        const VVP_CMD: string = `vvp sim`;

        // build full set of commands based on if the user wants to open gtkwave
        const FULL_CMD: string = `${CD_CMD} && ${this.ENV_CMD} && ${IVERILOG_CMD} && ${VVP_CMD}`;

        this.runCommand(FULL_CMD, fixedPath);
        return;
    }


    // function to build project and upload it to board
    public buildAndUpload(cwd: string) {
        // contraints:
        // all testbenches must be in separate files and must end with _tb (ex leds.v <- file, leds_tb.v <- testbench)
        // no modules can be included with `include statements

        this.outputConsole.show(true);
        const currTime: Date = new Date();
        this.outputConsole.appendLine(`========== iCEGenius | ${currTime} | Building ==========\n`);

        // prevent execution if a previous process is still running
        if (this.currSim || this.currBuild) {
            this.outputConsole.appendLine("A process is currently running! Exiting...");
            return;
        }

        // process is active
        this.currBuild = true;

        this.outputConsole.appendLine(`Current directory: ${cwd}`);

        // find all *.v files that exist in the current directory and any underneath
        const fixedPath: string = cwd.replace(/\\/g, '/');
        const totalVerilogFiles: string[] = glob.sync(fixedPath + '/**/*.v');
        const testbenchFiles: string[] = glob.sync(fixedPath + '/**/*_tb.v');

        // remove testbenches from list of files to use
        const verilogNoTestBenchArray: string[] = totalVerilogFiles.filter((val) => !testbenchFiles.includes(val));

        if (verilogNoTestBenchArray.length < 1) {
            this.outputConsole.appendLine("No *.v files found , exiting...");
            return;
        }

        // find all *.pcf file for i/o constraints 
        const pcfFiles: string[] = glob.sync(fixedPath + '/**/*.pcf');
        if (pcfFiles.length > 1) {
            this.outputConsole.appendLine(`More than one *.pcf file found, defaulting to file ${pcfFiles[0]}`);
            this.outputConsole.appendLine(`If this file is incorrect, remove all other pcf files except the desired one`);
        }
        else if (pcfFiles.length === 0) {
            this.outputConsole.appendLine("No *.pcf files found, cannot constrain external inputs and outputs!");
            this.outputConsole.appendLine("Exiting...");
            return;
        }
        const pcf: string = pcfFiles[0];

        // create yosys synthesis script
        // TODO: migrate to tcl?
        const ysFilePath: string = fixedPath + '/synth.ys';
        this.tempFilesToDelete.push(ysFilePath); // mark file for cleanup later

        this.outputConsole.appendLine(`Found ${verilogNoTestBenchArray.length} files:`);
        for (const filename of verilogNoTestBenchArray) {
            appendFileSync(ysFilePath, `read_verilog ${filename}\n`);
            this.outputConsole.appendLine(`File Found: ${path.basename(filename)}`);
        }

        // add final synthesis command to script
        appendFileSync(ysFilePath, `\nsynth_ice40 -device lp -json out.json`);

        // setup commands
        const CD_CMD: string = `cd /d ${fixedPath}`; // switch to cwd
        const YOSYS_CMD: string = `yosys -s synth.ys`; // run synthesis command
        const NEXTPNR_CMD: string = `nextpnr-ice40 -v --json out.json --pcf ${pcf} --lp384 --package qn32 --asc out.asc`; // run implementation
        const ICEPACK_CMD: string = `icepack out.asc bitstream.bin`; // generate bitstream
        const PROG_CMD: string = `echo PROGRAMMER NOT DONE`; // ! NOT DONE flash to board

        const FULL_CMD = `${CD_CMD} && ${this.ENV_CMD} && ${YOSYS_CMD} && ${NEXTPNR_CMD} && ${ICEPACK_CMD} && ${PROG_CMD}`;

        // run command
        this.runCommand(FULL_CMD, fixedPath);
        return;
    }


    // helper functions
    private cleanup() {
        // delete all temporary files made
        for (const file of this.tempFilesToDelete) {
            unlinkSync(file);
        }
        this.tempFilesToDelete = [];
        this.currBuild = false;
        this.currSim = false;
    }

    
    private runCommand(command: string, path:string ){
        try { // attempt to successfully run all simulation commands 
            this.outputConsole.appendLine(`Executing ${command}`);
            this.outputConsole.appendLine(execSync(command).toString());

            // open gtkwave automatically if true and simulation is happening
            if (this.autoOpenGTK && this.currSim) {
                const vcdFile = glob.sync(path + '/**/*.vcd')[0];
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
            this.outputConsole.appendLine("==================== Finished ====================\n");
            this.cleanup();
        }
    }

}
