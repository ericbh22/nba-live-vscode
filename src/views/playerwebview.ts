import * as vscode from 'vscode';


import {playerManager} from "../players/playermanager"
export class playerGridView implements vscode.WebviewViewProvider {

  public static readonly viewType = 'NBAGrid'; // class level constnat, basicaly sayting view_type musicshelfgrid 
  private view?: vscode.WebviewView; // instance properties that are local, type hinting, this view is optional 
  private playerManager: playerManager; // player manager is an isntance of playerManager, type hinting here 
  constructor(private context: vscode.ExtensionContext) {
    this.playerManager = playerManager.getInstance(context);
    // Subscribe to player changes
    this.playerManager.onDidPlayerCHange(() => {
      if (this.view) {
        this.postMessage({ 
          type: 'updatePlayers', 
          players: this.playerManager.getPlayers() 
        });
      }
    });
  }
  
  // Method to post messages to the webview
  public postMessage(message: any) {
    this.view?.webview.postMessage(message); // ?. acts as optional chaining. If this view exists, post message to the webview 
  }

  // Resolve the webview view
  public resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken) {
    this.view = webviewView;
    const webview = webviewView.webview;
    vscode.commands.executeCommand('setContext', 'nbalive', true);
    webview.html = this.getWebviewContent(webviewView.webview);
    webview.options = {
      enableScripts: true,
    };

    // Handle messages from the webview
    webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case "init":
        this.postMessage({
          type: "updatePlayers",
          players: this.playerManager.getPlayers(),
        });
        break;
        case "updatePlayers":
          this.postMessage({
            type: "updatePlayers",
            players: this.playerManager.getPlayers(),
          });
        break;

    }
    });
    webviewView.onDidDispose(() => {
      console.log('Webview disposed');
      vscode.commands.executeCommand('setContext', 'nbalive', false); // Set the context to false when the view is disposed
    });

  }

  private getWebviewContent(webview: vscode.Webview): string {
    const style = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'src', 'assets',"frontend", 'style.css'));
    const scriptJS = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'src', 'assets', "frontend", 'script.js'));
  
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>NBA Live</title>
      <link href="${style}" rel="stylesheet">
    </head>
    <body>
      <h2>🏀 Tracked Players</h2>
      <div id="playergrid" class="player-grid">
        <!-- Player cards will be dynamically inserted here -->
      </div>
      <script src="${scriptJS}"></script>
    </body>
    </html>
    `;
  }
}

// <img src="${webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'src', 'assets', 'spikepng.png'))}" class="fixed-bottom-left" />
// explanation of events
// when extension wants to talk to webview u do this.view.webview.postMessage, so ur posting a message to self.webview
// when webview talks to extension, we do vscode.postmessage, talking to the extension now 
// now we need to set up event listeners, with webview on did receive message. what this does is processes what message we recieve, and does smthn with it 
// however, our webview needs a epearte event listerner 
// so when init is send from our webview to our extension , it will go into the message listener and proces t


// so the next course of action is to make this data SAVE between runs, and then implement remove and move, and UI is basically done! Im going to quickly add remove 