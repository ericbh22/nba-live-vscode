const vscode = acquireVsCodeApi();
function renderPlayers(players) {
    const grid = document.getElementById("playergrid");
    grid.innerHTML = "";

    players.forEach(player => {
        const card = document.createElement("div");
        card.className = "player-card";
        card.innerHTML = `
            <div class="player-info">
                <h3>${player.name}</h3>
                <div class = "text-control">
                    <p><strong>PRA:</strong> ${player.pts !== undefined && player.reb !== undefined && player.ast !== undefined ? `${player.pts} / ${player.reb} / ${player.ast}` : "Not playing"}</p>

                </div>
            </div>
        `;
        // Set the player image as the background of the card
        const imageUrl = `https://cdn.nba.com/headshots/nba/latest/1040x760/${player.personId}.png`;
        const bgDiv = document.createElement("div");
        const shader = document.createElement("div");
        shader.className = "shader";
        bgDiv.className = "player-bg";
        bgDiv.style.backgroundImage = `url(${imageUrl})`;
        card.appendChild(bgDiv);
        card.appendChild(shader);
        grid.appendChild(card);
    });
}
  window.addEventListener('message', event => {
    const message = event.data;
    switch (message.type) {
      case 'updatePlayers':
        renderPlayers(message.players);
        break;
    }
  });
  
window.onload = () => {
    vscode.postMessage({ type: 'init' });
};

window.addEventListener('load', () => {
    const vscode = acquireVsCodeApi();
    vscode.postMessage({ type: 'init' }); // This is crucial
});
// Initialize by telling the extension we're ready
vscode.postMessage({ type: 'init' });

window.addEventListener('message', event => {
    const message = event.data;
    switch (message.type) {
        case 'updatePlayers':
        renderPlayers(message.players);
        break;
    }
});