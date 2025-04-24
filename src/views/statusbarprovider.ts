import * as vscode from 'vscode';
import {getLiveScore, getLiveGames, getActivePlayersFromGame,startPollingPlayerStats} from "../APIS/NBAapi";



let pollingInterval: NodeJS.Timeout | null = null; // To hold the interval reference
let selectedGameId: string | null = null; // To hold the currently selected game's gameId

let playerPollingInterval: NodeJS.Timeout | null = null;
let selectedPlayerId: string | null = null;

export function registerStatusBarControls(context: vscode.ExtensionContext) {
    // 🎮 Current Game Display in the Status Bar
    const gameDisplay = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 97);
    const playerDisplay = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left,96);
    playerDisplay.text = "Select a Player";
    playerDisplay.tooltip = "Select a player to track their stats";
    playerDisplay.command= ("nbalive.selectPlayer");
    playerDisplay.show(); 
    context.subscriptions.push(vscode.commands.registerCommand('nbalive.selectPlayer', async () => {
        if (!selectedGameId) {
            vscode.window.showErrorMessage('Please select a game first!');
            return;
        }
    
        const players = await getActivePlayersFromGame(selectedGameId);
        if (players.length === 0) {
            vscode.window.showErrorMessage("No active players found in this game.");
            return;
        }
    
        const playerPick = await vscode.window.showQuickPick(
            players.map((p: any) => ({
                label: `${p.firstName} ${p.familyName}`,
                description: `#${p.jerseyNum || '-'} | ${p.position || ''}`,
                detail: `PTS: ${p.statistics.points} REB: ${p.statistics.reboundsTotal} AST: ${p.statistics.assists}`,
                personId: p.personId,
                raw: p
            })),
            { placeHolder: "Select a player to track" }
        );
    
        if (playerPick) {
            // You could store this player globally or update another status bar
            selectedPlayerId = playerPick.personId; 
            playerDisplay.text = `👤 ${playerPick.label}: ${playerPick.detail}`;
            vscode.window.showInformationMessage(`Tracking ${playerPick.label}'s stats live.`);
            startPlayerPolling(playerDisplay,{
                name: playerPick.label,
                personId: playerPick.personId,
                pts: playerPick.raw.statistics.points,
                reb: playerPick.raw.statistics.reboundsTotal,
                ast: playerPick.raw.statistics.assists,
                tov: playerPick.raw.statistics.turnovers,
              })
        }
    }));
    function startPlayerPolling(playerDisplay:vscode.StatusBarItem,  player: any) {
        // Clear any previous polling
        if (playerPollingInterval) clearInterval(playerPollingInterval);
      
        playerPollingInterval = startPollingPlayerStats(
          [player], // wrap in array
          (trackedPlayer, stats) => {
            if (trackedPlayer.personId === selectedPlayerId && stats) {
              playerDisplay.text = `👤 ${trackedPlayer.name} | PTS: ${stats.pts} REB: ${stats.reb} AST: ${stats.ast} TO: ${stats.tov}`;
            }
          },
          5000
        );
      }

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
                gameDisplay.text = `🏀 ${gameLabel}: ${scores[0]} - ${scores[1]} | ${scores[2]}`;
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