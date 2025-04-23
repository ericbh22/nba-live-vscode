import * as vscode from 'vscode';
import {getLiveScore, getLiveGames} from "../APIS/NBAapi";



let pollingInterval: NodeJS.Timeout | null = null; // To hold the interval reference
let selectedGameId: string | null = null; // To hold the currently selected game's gameId
export function registerStatusBarControls(context: vscode.ExtensionContext) {
    // 🎮 Current Game Display in the Status Bar
    const gameDisplay = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 97);
    gameDisplay.text = '🏀 Select a Game';
    gameDisplay.tooltip = 'Select an active NBA game to view score';
    gameDisplay.command= ("nbalive.selectGame");
    gameDisplay.show();

    // Command registration to show a dropdown of active games
    context.subscriptions.push(vscode.commands.registerCommand('nbalive.selectGame', async () => {
        // Fetch the active games (you might want to adjust this based on your data source)
        const activeGames = await getLiveGames();

        // Check if there are any games available
        if (activeGames.length === 0) {
            vscode.window.showInformationMessage('No active NBA games at the moment.');
            return;
        }

        // Show the QuickPick dropdown with the active games
        const selectedGame = await vscode.window.showQuickPick(
            activeGames.map(game => ({
                label: `${game.homeTeam.teamTricode} vs ${game.awayTeam.teamTricode}`,
                description: `${game.awayTeam.teamTricode} ${game.awayTeam.score} : ${game.homeTeam.score} ${game.homeTeam.teamTricode}`,
                gameId: game.gameId,
            })),
            {
                placeHolder: 'Select an NBA game'
            }
        );

        if (selectedGame) {
            selectedGameId = selectedGame.gameId; // 🔥 This line was missing
            const gameLabel = selectedGame.label;
            const scores = await getLiveScore(selectedGame.gameId);
            gameDisplay.text = `🏀 ${selectedGame.label} - ${scores[0]} - ${scores[1]}`;
            startScorePolling(gameDisplay, selectedGame.gameId,gameLabel);
          }
    }));

    function startScorePolling(gameDisplay: vscode.StatusBarItem, gameId: string,gameLabel:string) {
        // Clear any previous polling interval
        if (pollingInterval) clearInterval(pollingInterval);

        // Set a new polling interval to refresh the score every second
        pollingInterval = setInterval(async () => {
            if (selectedGameId === gameId) {
                const scores = await getLiveScore(gameId);
                gameDisplay.text = `🏀 ${gameLabel}: ${scores[0]} - ${scores[1]}`;
            }
        }, 1000); // Refresh every 1000ms (1 second)
    }

    // Ensure the interval is cleared when the extension is deactivated or when the game is changed
    context.subscriptions.push({
        dispose: () => {
            if (pollingInterval) clearInterval(pollingInterval); // Clear polling when deactivated
        }
    });

}