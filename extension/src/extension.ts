import * as vscode from 'vscode';
import { Handler } from "./handler";

export function activate(context: vscode.ExtensionContext) {

	const helper: Handler = new Handler(); // instantiate helper class

	// register the two commands
	let simulator: vscode.Disposable = vscode.commands.registerCommand('icegenius-extension.sim', () => {
		// if a workspace is open, try and read the folders in that
		const workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined = vscode.workspace.workspaceFolders;
		// if no workspace is open, get folder from currently open file
		const currFilePath: string | undefined = vscode.window.activeTextEditor?.document.fileName;

		// parse the responses
		let folderPath: string | undefined = undefined;
		if (workspaceFolders && workspaceFolders.length > 0) {
			folderPath = workspaceFolders[0].uri.fsPath;
		}
		else if (currFilePath) {
			folderPath = currFilePath.substring(0, currFilePath.lastIndexOf("\\"));
		}

		// if nothing after that, then we kill program
		if (!folderPath) {
			vscode.window.showErrorMessage("Could not get file path, open a folder using Ctrl + K + O");
			return;
		}

		// run actual function
		helper.simulate(folderPath);
	});

	let builder: vscode.Disposable = vscode.commands.registerCommand('icegenius-extension.buildAndUpload', () => {
		// if a workspace is open, try and read the folders in that
		const workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined = vscode.workspace.workspaceFolders;
		// if no workspace is open, get folder from currently open file
		const currFilePath: string | undefined = vscode.window.activeTextEditor?.document.fileName;

		// parse the responses
		let folderPath: string | undefined = undefined;
		if (workspaceFolders && workspaceFolders.length > 0) {
			folderPath = workspaceFolders[0].uri.fsPath;
		}
		else if (currFilePath) {
			folderPath = currFilePath.substring(0, currFilePath.lastIndexOf("\\"));
		}

		// if nothing after that, then we kill program
		if (!folderPath) {
			vscode.window.showErrorMessage("Could not get file path, open a folder using Ctrl + K + O");
			return;
		}

		// run actual function
		helper.buildAndUpload(folderPath);
	});

	// let vscode know about the functions
	context.subscriptions.push(simulator);
	context.subscriptions.push(builder);
}

// This method is called when your extension is deactivated
// probably don't need?
export function deactivate() { }
