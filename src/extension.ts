import * as vscode from 'vscode';
import axios from 'axios';
import { playerManager } from './players/playermanager';
import {playerGridView } from './views/playerwebview';
import { registerStatusBarControls } from './views/statusbarprovider';
// import { loginToSpotify, registerUriHandler } from './services/SpotifyService';
// import { getSpecificPlaylist, pauseSpotify, playSpotify, searchSpotify, searchSpotifyPlaylists,shuffleSpotify,skipSpotify, 
//     backSpotify,resumeSpotify,} from './services/spotifyplayer';
// import { getValidAccessToken, scheduleAutoRefresh } from './services/SpotifyService';
import { Player } from './players/player';
// import { registerStatusBarControls } from './views/statusbarprovider';
import { getLiveGames, getActivePlayersFromGame, startPollingPlayerStats , getLiveScore} from './APIS/NBAapi';;
let pollingInterval: NodeJS.Timeout | null = null;

function restartPolling(playermanager: playerManager, playergridView: playerGridView) {
	if (pollingInterval) clearInterval(pollingInterval);
  
	pollingInterval = startPollingPlayerStats(playermanager.getPlayers(), (player, stats) => {
	  if (stats) {
		playermanager.updatePlayerStats(player.personId!, stats);
  
		playergridView.postMessage({
		  type: "updatePlayers",
		  players: playermanager.getPlayers()
		});
	  }
	});
  }
export function activate(context: vscode.ExtensionContext) {
	const config = vscode.workspace.getConfiguration();
	const currentTheme = config.get<string>('workbench.colorTheme');
	const prevTheme = config.get<string>('nbaLive.previousTheme');


	registerStatusBarControls(context);
	// registerStatusBarControls(context);

    // 👇 Start polling loop after everything is initialized

    const playermanager = playerManager.getInstance(context); // singleton instance, basically creating an instnace of this class, playermanager() basically

    // Create the view provider
    const playergridView = new playerGridView(context);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(playerGridView.viewType, playergridView)); // note the .viewType, remember the viewtype we have depdfiend it ion package.json. and playergridview handles actual rendering and events 
	

	restartPolling(playermanager, playergridView);
	// context.subscriptions.push(
	// 	vscode.commands.registerCommand('nbalive.toggleLakersTheme', async () => {
	// 	  const config = vscode.workspace.getConfiguration();
	// 	  const currentTheme = config.get<string>('workbench.colorTheme');
	  
	// 	  if (currentTheme !== 'Lakers Theme') {
	// 		// Save previous theme
	// 		await config.update('nbaLive.previousTheme', currentTheme, vscode.ConfigurationTarget.Global);
	// 	  }
	  
	// 	  await config.update('workbench.colorTheme', 'Lakers Theme', vscode.ConfigurationTarget.Workspace);
	// 	  vscode.window.showInformationMessage('🏀 Switched to Lakers Theme!');
	// 	})
	//   );

	//   context.subscriptions.push(
	// 	vscode.commands.registerCommand('nbalive.restoreDefaultTheme', async () => {
	// 	  const config = vscode.workspace.getConfiguration();
	// 	  const prev = config.get<string>('nbaLive.previousTheme') ?? 'Default Dark+';
	  
	// 	  await config.update('workbench.colorTheme', prev, vscode.ConfigurationTarget.Global);
	// 	  await vscode.commands.executeCommand('workbench.action.selectTheme');
	// 	  vscode.window.showInformationMessage(`Restored theme: ${prev}`);
	// 	})
	//   );
	context.subscriptions.push(
		vscode.commands.registerCommand("nbalive.chooseGame", async() => {
		const playermanager = playerManager.getInstance(context);
		const liveGames = await getLiveGames();
		  if (liveGames.length === 0) {
			vscode.window.showErrorMessage("No live games currently available.");
			return;
		  }
	  
		  const gamePick = await vscode.window.showQuickPick(
			liveGames.map((g: any) => ({
			  label: `${g.awayTeam.teamTricode} @ ${g.homeTeam.teamTricode}`,
			  description: `Q${g.period}, ${g.awayTeam.teamTricode} ${g.awayTeam.score} : ${g.homeTeam.score} ${g.homeTeam.teamTricode} ,${g.gameClock || 'Final'}`,
			  gameId: g.gameId,
			})),
			{ placeHolder: "Select a live game" }
		  );
		if (gamePick) {
        // Update the status bar in the other file using the gameId and score
        const scores = await getLiveScore(gamePick.gameId);
        vscode.commands.executeCommand('nbalive.updateStatusBar', gamePick.label, scores[0], scores[1]);
    }
		  

	})
);
	
	context.subscriptions.push(
		vscode.commands.registerCommand("nbalive.addPlayer", async () => {
		  const playermanager = playerManager.getInstance(context);
	  
		  const liveGames = await getLiveGames();
		  if (liveGames.length === 0) {
			vscode.window.showErrorMessage("No live games currently available.");
			return;
		  }
	  
		  const gamePick = await vscode.window.showQuickPick(
			liveGames.map((g: any) => ({
			  label: `${g.awayTeam.teamTricode} @ ${g.homeTeam.teamTricode}`,
			  description: `Q${g.period} ${g.gameClock || 'Final'}`,
			  gameId: g.gameId,
			})),
			{ placeHolder: "Select a live game" }
		  );
		  if (!gamePick) return;
	  
		  const players = await getActivePlayersFromGame(gamePick.gameId);
		//   console.log(players);
		  if (players.length === 0) {
			vscode.window.showErrorMessage("No active players found.");
			return;
		  }
	  
		  const playerPick = await vscode.window.showQuickPick(
			players.map((p: any) => ({
				label: `${p.firstName} ${p.familyName}`,
				description: `#${p.jerseyNum || '–'} | ${p.position || ''}`,
				personId: p.personId,
				raw: p,
			  })),
			{ placeHolder: "Select a player to track" }
		  );
		  if (!playerPick) return;
	  
		  playermanager.addPlayer({
			name: `${playerPick.raw.firstName} ${playerPick.raw.familyName}`,
			personId: playerPick.personId,
			pts: playerPick.raw.points,
			reb: playerPick.raw.reboundsTotal,
			ast: playerPick.raw.assists,
			tov: playerPick.raw.turnovers,
		  });
		
		  playergridView.postMessage({
			type: "updatePlayers",
			players: playermanager.getPlayers()
		  });
		  // this is currently polling the player pick, which is not what we want, we wanna be polling all of our players in our player list 
		  restartPolling(playermanager, playergridView);
		}),
		vscode.commands.registerCommand("nbalive.addPlayerUI", async () => {
			const playermanager = playerManager.getInstance(context);
		
			const liveGames = await getLiveGames();
			if (liveGames.length === 0) {
			  vscode.window.showErrorMessage("No live games currently available.");
			  return;
			}
		
			const gamePick = await vscode.window.showQuickPick(
			  liveGames.map((g: any) => ({
				label: `${g.awayTeam.teamTricode} @ ${g.homeTeam.teamTricode}`,
				description: `Q${g.period} ${g.gameClock || 'Final'}`,
				gameId: g.gameId,
			  })),
			  { placeHolder: "Select a live game" }
			);
			if (!gamePick) return;
		
			const players = await getActivePlayersFromGame(gamePick.gameId);
			// console.log(players);
			if (players.length === 0) {
			  vscode.window.showErrorMessage("No active players found.");
			  return;
			}
		
			const playerPick = await vscode.window.showQuickPick(
			  players.map((p: any) => ({
				  label: `${p.firstName} ${p.familyName}`,
				  description: `#${p.jerseyNum || '–'} | ${p.position || ''}`,
				  personId: p.personId,
				  raw: p,
				})),
			  { placeHolder: "Select a player to track" }
			);
			if (!playerPick) return;
		
			playermanager.addPlayer({
			  name: `${playerPick.raw.firstName} ${playerPick.raw.familyName}`,
			  personId: playerPick.personId,
			  pts: playerPick.raw.points,
			  reb: playerPick.raw.reboundsTotal,
			  ast: playerPick.raw.assists,
			  tov: playerPick.raw.turnovers,
			});
		  
			playergridView.postMessage({
			  type: "updatePlayers",
			  players: playermanager.getPlayers()
			});
			// this is currently polling the player pick, which is not what we want, we wanna be polling all of our players in our player list 
			restartPolling(playermanager, playergridView);
		  }),
	
			
		  );
		  vscode.commands.registerCommand("nbalive.removePlayer", async () => {
			const players = playermanager.getPlayers();

			// Check if there are players to remove
			if (players.length === 0) {
			  vscode.window.showInformationMessage("No players available to remove.");
			  return;
			}
		  
			// Create the dropdown with the player names
			const playerPick = await vscode.window.showQuickPick(
			  players.map((player) => ({
				label: player.name,  // Player name
				description: `ID: ${player.personId}`, // You can add any other player information here
				playerId: player.personId, // Store player id to remove it later
			  })),
			  {
				placeHolder: "Select a player to remove",
			  }
			);
		  
			if (playerPick) {
			  // Call removePlayer with the selected playerId
			  playermanager.removePlayer(playerPick.label);
			  // Send updated players list to the webview
			  playergridView.postMessage({
				type: "updatePlayers",
				players: playermanager.getPlayers(),
			  });
		  
			  // Restart polling if needed
			  restartPolling(playermanager, playergridView);
			}			  
		});
		vscode.commands.registerCommand("nbalive.removePlayerUI", async () => {
			const players = playermanager.getPlayers();

			// Check if there are players to remove
			if (players.length === 0) {
			  vscode.window.showInformationMessage("No players available to remove.");
			  return;
			}
		  
			// Create the dropdown with the player names
			const playerPick = await vscode.window.showQuickPick(
			  players.map((player) => ({
				label: player.name,  // Player name
				description: `ID: ${player.personId}`, // You can add any other player information here
				playerId: player.personId, // Store player id to remove it later
			  })),
			  {
				placeHolder: "Select a player to remove",
			  }
			);
		  
			if (playerPick) {
			  // Call removePlayer with the selected playerId
			  playermanager.removePlayer(playerPick.label);
			  // Send updated players list to the webview
			  playergridView.postMessage({
				type: "updatePlayers",
				players: playermanager.getPlayers(),
			  });
		  
			  // Restart polling if needed
			  restartPolling(playermanager, playergridView);
			}			  
		});
		}



export function deactivate() {}