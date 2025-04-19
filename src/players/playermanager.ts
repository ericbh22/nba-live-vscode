// src/providers/AlbumManager.ts
import * as vscode from 'vscode';
import {Player} from "./player";

import * as fs from 'fs'; // used to read and write to files 
import * as path from 'path'; // convenience 

let extensionStorageFolder: string = '';
let playerPath: string;
export class playerManager { // we need to write export otherwise this class is not exportable...
    private static instance: playerManager; // private basically means not global basicallyt ther same as _instance = None in python :AlbumManager is just type hinting 

    private _onPlayerChange = new vscode.EventEmitter<void>();
    private _players: Player[] = [];
    readonly onDidPlayerCHange = this._onPlayerChange.event;
    // store preferences 
    constructor(private context?: vscode.ExtensionContext) { // we path trhough the context into this constructor, context contains subscriptions, and global storage 
        if (context) {
            extensionStorageFolder = context.globalStorageUri.fsPath; // so this is where our extension is stored 
            playerPath = path.join(extensionStorageFolder, 'player.json'); // and we add player.json to it, this is always safe as we are just returning a string 
            if (!fs.existsSync(extensionStorageFolder)) {  // if the path exists 
                fs.mkdirSync(extensionStorageFolder, { recursive: true });  //create the path if it doesnt already exist, saves us from crashes, rmbr we just need the path to exist here, before we were doing string checks 
            }

            this.loadPlayerFile(); //  Try loading albums from file
        }
    }
    public static getInstance(context?: vscode.ExtensionContext): playerManager {
        if (!playerManager.instance) {
            playerManager.instance = new playerManager(context);
            if (context) {
                playerManager.instance.loadPlayerFile(); // Load albums when context is available
            }
        }
        return playerManager.instance;
    }
    // Add a new album
    addPlayer(player: Player): Player {
        const newPlayer: Player = {
            ...player, // take existing album data 
            position: this.calculateNextPosition()
        }; // generates a new album with a unique ID 
        this._players.push(newPlayer); // append the albunm 
        // we might ned to add smthn to save permanentlky 
        this._onPlayerChange.fire();
        this.savePlayertoFile();
        return newPlayer;
    }
    // Remove an album
    removePlayer(playerName: string): void {
        this._players = this._players.filter(player => player.name !== playerName); // goes through the list and removes the album if it isnt what we want, the arrow is basically a callback function, kinda like lambda,  
        const temp = this._players;
        this._players = [];
        for (var album of temp){
            this.addPlayer(album); // this can be done so we basically reinsert all the albums to prevent gaps after deleting from the middle 
        }
        this._onPlayerChange.fire();
        this.savePlayertoFile();
    } 
    getPlayers(): Player[] {
        return [...this._players];
    } // returns a shallow copy 


    private loadPlayerFile() {
        if (fs.existsSync(playerPath)) { // if path exists 
            try {
                const raw = fs.readFileSync(playerPath, 'utf8'); //try read the json files, we read it as a string so its not in raw binary 
                const parsed = JSON.parse(raw); // now turn it into a ts array we can use 
                if (Array.isArray(parsed)) { // conver to js array 
                    this._players = parsed;
                    this._onPlayerChange.fire();
                    console.log('Albums loaded from file:', parsed);
                }
            } catch (e) {
                console.error('Error loading albums file:', e);
                this._players = [];
            }
        } else {
            this.savePlayertoFile(); // create an empty file
        }
    }
    
    private savePlayertoFile() {
        try {
            fs.writeFileSync(playerPath, JSON.stringify(this._players, null, 2)); // write it to file 
            // console.log('Albums saved to file.');
        } catch (e) {
            console.error('Error saving albums file:', e);
        }
    }

    private calculateNextPosition(): { row: number; column: number } {
        const maxRows = 2;
        const maxColumns = 2;

        // Find the first empty spot in our grid system 
        for (let row = 0; row < maxRows; row++) {
            for (let column = 0; column < maxColumns; column++) {
                if (!this._players.some(a => 
                    a.position?.row === row && a.position?.column === column //a["position"]["row"] == row equivalent 
                )) {
                    return { row, column };
                }
            }
        }

        // If grid is full, throw an error
        throw new Error('Player grid is full');
    }

    updatePlayerStats(personId: string, stats: { pts: number; reb: number; ast: number; tov: number }) {
        const player = this._players.find((p) => p.personId === personId);
        if (stats !== null && player) {
            player.pts = stats.pts;
            player.reb = stats.reb;
            player.ast = stats.ast;
            player.tov = stats.tov;
        }
        else{
        if (player){
            player.pts = 0;
            player.reb = 0;
            player.ast = 0;
            player.tov =0;
        }
    }
    }

    

}

