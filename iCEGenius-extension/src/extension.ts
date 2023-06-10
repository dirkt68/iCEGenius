import * as vscode from 'vscode';
import { Handler } from "./handler";

export function activate(context: vscode.ExtensionContext) {

	const helper: Handler = new Handler(); // instantiate handler with functions

	// register the two commands
	let simulator: vscode.Disposable = vscode.commands.registerCommand('iCEGenius-extension.sim', () => {
		helper.simulate();
	});
	let builder: vscode.Disposable = vscode.commands.registerCommand('iCEGenius-extension.buildAndUpload', () => { 
		helper.buildAndUpload();
	});

	// let vscode know about them
	context.subscriptions.push(simulator);
	context.subscriptions.push(builder);
}

// This method is called when your extension is deactivated
export function deactivate() {}
