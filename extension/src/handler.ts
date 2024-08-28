import * as vscode from "vscode"; // vscode api
import { appendFileSync, createWriteStream, unlinkSync, writeFile } from "fs"; // filesystem stuff
import { glob } from "glob"; // file collection
import path = require("path"); // filename printing
import { ChildProcessWithoutNullStreams, exec, spawn } from "child_process"; // execute command line stuff
import fetch from "node-fetch";
import { DH_STATES, DownloaderHelper, DownloadInfoStats, Stats } from "node-downloader-helper";

export class Handler {
    private pathToSuite: string;
    private autoOpenGTK: boolean;

    private currSim: boolean;
    private currBuild: boolean;

    private outputConsole: vscode.OutputChannel;
    private tempFilesToDelete: string[];

    private architecture = process.arch; // x64 or arm64
    private platform = process.platform; // win32, linux, darwin
    private config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("icegenius-extension");

    // eslint-disable-next-line @typescript-eslint/naming-convention
    private ENV_CMD: string = "";

    // constructor to init the Handler
    constructor() {

        // create global output channel
        this.outputConsole = vscode.window.createOutputChannel("iCEGenius");

        // set the path to the tools, if none found install it
        this.pathToSuite = this.config.get("oss-cad-suite-path", "");
        if (this.pathToSuite === "") {
            this.outputConsole.show();
            this.outputConsole.appendLine("oss-cad-suite path not found. Installing...");
            this.installOssCadSuite();
        }

        // if on windows, need to activate batch file to set env variables correctly
        if (this.platform === "win32") {
            this.ENV_CMD = this.pathToSuite + "environment.bat";
        }

        // this command will automatically run gtkwave after simulation compiles unless otherwise specified
        this.autoOpenGTK = this.config.get("auto-open-gtkwave", true);

        // create an array to hold files that need to be deleted when cleanup is called
        this.tempFilesToDelete = [];

        // setup resource checking vars
        this.currBuild = false;
        this.currSim = false;
    }

    // method to compile the verilog into a simulation
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
            this.currSim = false;
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
        const CD_CMD: string = `cd ${fixedPath}`;
        const PREFIX: string = `${this.pathToSuite}bin/`;
        const IVERILOG_CMD: string = `${PREFIX}iverilog -o sim -c ${textFilePath}`;
        const VVP_CMD: string = `${PREFIX}vvp sim`;

        // build full set of commands based on if the user wants to open gtkwave
        let FULL_CMD: string = `${IVERILOG_CMD} && ${VVP_CMD}`;

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
            this.currBuild = false;
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
        const PREFIX: string = `${this.pathToSuite}bin/`;
        const YOSYS_CMD: string = `${PREFIX}yosys -s synth.ys`; // run synthesis command
        const NEXTPNR_CMD: string = `${PREFIX}nextpnr-ice40 -v --json out.json --pcf ${pcf} --lp384 --package qn32 --asc out.asc`; // run implementation
        const ICEPACK_CMD: string = `${PREFIX}icepack out.asc bitstream.bin`; // generate bitstream
        const PROG_CMD: string = `echo PROGRAMMER NOT DONE`; // ! NOT DONE flash to board

        let FULL_CMD = `${YOSYS_CMD} && ${NEXTPNR_CMD} && ${ICEPACK_CMD} && ${PROG_CMD}`;

        // run command
        this.runCommand(FULL_CMD, fixedPath);
        return;
    }

    private async runCommand(command: string, path: string) {
        try { // attempt to successfully run all simulation commands 
            if (this.platform === "win32") {
                command = `${this.ENV_CMD} && ${command}`;
            }

            this.outputConsole.appendLine(`Executing ${command}`);

            // spawn new process and run command
            let childOut = spawn(command, { shell: true, cwd: path });

            // listen to stdout and stderr and output data live
            childOut.stdout.on('data', (data: string) => {
                this.outputConsole.appendLine(data);
            });

            childOut.stderr.on('data', (data: string) => {
                this.outputConsole.appendLine(data);
            });

            // after process exits, either emit the code and/or run gtkwave
            childOut.on('close', (code: number) => {
                if (code !== 0) {
                    this.outputConsole.appendLine(`Exited with code ${code}!`);
                    this.cleanup();
                    return;
                }
                this.outputConsole.appendLine("Exited successfully (code 0)");
                // open gtkwave automatically if true and simulation is happening
                if (this.autoOpenGTK && this.currSim) {
                    const vcdFile = glob.sync(path + '/**/*.vcd')[0];
                    const GTK_CMD: string = `${this.pathToSuite}bin/gtkwave ${vcdFile}`;
                    if (this.platform === "win32") {
                        exec(`${this.ENV_CMD} && ${GTK_CMD}`);
                    }
                    else {
                        exec(`${GTK_CMD}`);
                    }
                }
                this.cleanup();
                this.outputConsole.appendLine("==================== Finished ====================\n");
            });
        }
        // if a command fails, return it to the user so they might fix
        catch (cmd_err: any) {
            this.outputConsole.appendLine("Something went wrong!");
            this.printErrToConsole(cmd_err);
            this.outputConsole.appendLine("Hint: If the error refers to \"module already declared\",");
            this.outputConsole.appendLine("temporarily remove any `include statements throughout your .v files");
            this.outputConsole.appendLine("This may result in red squiggles, but will fix actual simulation");
            this.outputConsole.appendLine("==================== Finished ====================\n");
            this.cleanup();
        }
    }

    // method to install the oss-cad-suite onto the machine
    private async installOssCadSuite() {
        // use github rest api to get latest release
        const api = "https://api.github.com/repos/YosysHQ/oss-cad-suite-build/releases/latest";
        try {
            const responseAPI = await fetch(api);
            if (!responseAPI.ok) {
                this.outputConsole.appendLine("Response not ok!");
                return;
            }
            const data = await responseAPI.json() as any;

            // based on platform and architecture, download the appropriate file
            let archiveName = "";
            let downloadUrl = "";
            if (this.platform === "win32") {
                this.pathToSuite = `${process.env.APPDATA}`;
                archiveName = data.assets[4].name;
                downloadUrl = data.assets[4].browser_download_url;
            } else if (this.platform === "darwin" && this.architecture === "arm64") {
                this.pathToSuite = "/usr/local/opt/";
                archiveName = data.assets[0].name;
                downloadUrl = data.assets[0].browser_download_url;
            } else if (this.platform === "darwin" && this.architecture === "x64") {
                this.pathToSuite = "/usr/local/opt/";
                archiveName = data.assets[1].name;
                downloadUrl = data.assets[1].browser_download_url;
            } else if (this.platform === "linux" && this.architecture === "arm64") {
                this.pathToSuite = "/opt/";
                archiveName = data.assets[2].name;
                downloadUrl = data.assets[2].browser_download_url;
            } else if (this.platform === "linux" && this.architecture === "x64") {
                this.pathToSuite = "/opt/";
                archiveName = data.assets[3].name;
                downloadUrl = data.assets[3].browser_download_url;
            } else {
                throw new Error(`Unknown platform/architecture combination: got ${this.platform} / ${this.architecture}`);
            }

            this.outputConsole.appendLine(`Downloading archive from ${downloadUrl}`);

            // download file from the url
            const downloader = new DownloaderHelper(downloadUrl, this.pathToSuite);
            downloader.on("download", (stats: DownloadInfoStats) => {
                this.outputConsole.appendLine(`Size: ${stats.totalSize}B`);
            });
            downloader.on("timeout", () => {
                throw new Error("Timeout while downloading...");
            });
            downloader.on('error', (err) => { throw err; });
            downloader.on('end', () => {
                this.outputConsole.appendLine('Download Completed!');
                // execute .exe or tar to unzip
                this.outputConsole.appendLine(`Unpacking ${archiveName}...`);

                let command: string = "";
                let extractor: ChildProcessWithoutNullStreams;

                if (this.platform === "darwin" || this.platform === "linux") {
                    command = "tar -xvzf ";
                }

                // run extractor with extra command if on linux or macos, or just run .exe file on windows
                extractor = spawn(`${command + this.pathToSuite + '/' + archiveName}`, {
                    cwd: this.pathToSuite
                });
                extractor.stdout.on("data", (data) => {
                    this.outputConsole.appendLine(data);
                });
                extractor.stderr.on("data", (data) => {
                    this.outputConsole.appendLine(data);
                });
                extractor.on("error", (err) => {
                    throw err;
                });

                // update path when everything is done
                extractor.on("close", () => {
                    this.outputConsole.appendLine("Done unpacking!");
                    // on mac, allow execution of quarantied files using activate script
                    if (this.platform === "darwin") {
                        exec(`${this.pathToSuite + "/oss-cad-suite/activate"}}`);
                    }

                    // update path after setup is complete
                    this.pathToSuite = this.pathToSuite + "/oss-cad-suite";

                    // on windows, update env cmd and add correct delimiter
                    this.pathToSuite += "/";
                    if (this.platform === "win32") {
                        this.ENV_CMD = this.pathToSuite + "environment.bat";
                    }
                    else {
                        this.ENV_CMD = "";
                    }

                    this.config.update("oss-cad-suite-path", this.pathToSuite, true);
                });
            });
            downloader.on("progress.throttled", (stats: Stats) => {
                this.outputConsole.append(".");
            });
            await downloader.start();
        } catch (error) {
            this.outputConsole.appendLine("Failed to install oss-cad-suite!");
            this.printErrToConsole(error);
        }
    }

    // method to print errors to the console
    private printErrToConsole(err: any) {
        if (typeof err === 'string') {
            this.outputConsole.appendLine(`Error: ${err}`);
        }
        else if (err instanceof Error) {
            this.outputConsole.appendLine(`Error: ${err.message}`);
        }
        else { // just in case something goes horrifically wrong
            this.outputConsole.appendLine("Unknown Error Occurred");
        }
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

}
