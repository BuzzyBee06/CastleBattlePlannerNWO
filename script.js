// ======================================================
// Castle Battle Planner
// ======================================================

// ---------- Canvas ----------
const canvas = document.getElementById("battleMap");
const ctx = canvas.getContext("2d");

canvas.width = 700;
canvas.height = 700;


// ---------- Settings ----------
const SETTINGS = {

    tileSize: 16,       // pixel size of one tile

    castleSize: 12,      // castle is 12x12 tiles

    ringGap: 8,          // white tiles between castle edge and red line

    mapHalf: 20           // map extends 20 tiles in every direction (40x40 total)
};

// ---------- Selection state ----------
let selectedTile = null;             // { row, col } of a clicked EMPTY tile, ready to assign
let selectedAssignmentIndex = null;  // index into assignments[] of a clicked ASSIGNED spot

// ---------- Assigned players ----------
// each entry: { row, col, name }
let assignments = [];

// ---------- Colours ----------
const COLOURS = {

    normal: "#f7f7f7",

    border: "#999999",

    castle: "#888888",

    ring: "#ff3333",

    highlight: "#3399ff",

    assignedBorder: "#000000",

    selectedAssignedBorder: "#ff9900"

};


// ---------- Convert grid position -> screen position ----------
function toScreen(row, col){

    const s = SETTINGS.tileSize;

    return {
        x: canvas.width / 2 + (col - row) * s / 2,
        y: canvas.height / 2 + (col + row) * s / 2
    };

}


// ---------- Draw One Diamond Tile ----------
function drawTile(x, y, colour){

    const s = SETTINGS.tileSize;

    ctx.beginPath();

    ctx.moveTo(x, y - s / 2);
    ctx.lineTo(x + s / 2, y);
    ctx.lineTo(x, y + s / 2);
    ctx.lineTo(x - s / 2, y);

    ctx.closePath();

    ctx.fillStyle = colour;
    ctx.fill();

    ctx.strokeStyle = COLOURS.border;
    ctx.stroke();

}


// ---------- How far is this tile OUTSIDE the castle? ----------
function excess(n, half){

    if(n >= half) return n - half + 1;

    if(n < -half) return -half - n;

    return 0;

}

// ---------- Convert screen position -> grid tile ----------
function screenToGrid(x, y){

    const s = SETTINGS.tileSize;

    const dx = x - canvas.width / 2;
    const dy = y - canvas.height / 2;

    return {
        row: Math.round(dy / s - dx / s),
        col: Math.round(dx / s + dy / s)
    };

}

// ---------- Does this 2x2 block overlap the castle? ----------
function overlapsCastle(row, col, castleHalf){

    for(let r = row; r <= row + 1; r++){
        for(let c = col; c <= col + 1; c++){

            const du = excess(r, castleHalf);
            const dv = excess(c, castleHalf);

            if(Math.max(du, dv) === 0){
                return true;
            }

        }
    }

    return false;

}

// ---------- Does this 2x2 block overlap an existing assignment? ----------
function overlapsAssignment(row, col){

    return assignments.some(function(a){

        const rowOverlap = row <= a.row + 1 && a.row <= row + 1;
        const colOverlap = col <= a.col + 1 && a.col <= col + 1;

        return rowOverlap && colOverlap;

    });

}

// ---------- Find an assignment covering a given tile (if any) ----------
function findAssignmentAt(row, col){

    return assignments.find(function(a){

        return row >= a.row && row <= a.row + 1 &&
               col >= a.col && col <= a.col + 1;

    });

}

// ---------- Draw an assigned player's 2x2 block ----------
function drawAssignment(a, isSelected){

    const s = SETTINGS.tileSize;

    const topPt    = toScreen(a.row,     a.col);
    const rightPt  = toScreen(a.row,     a.col + 1);
    const bottomPt = toScreen(a.row + 1, a.col + 1);
    const leftPt   = toScreen(a.row + 1, a.col);

    ctx.beginPath();
    ctx.moveTo(topPt.x, topPt.y - s / 2);
    ctx.lineTo(rightPt.x + s / 2, rightPt.y);
    ctx.lineTo(bottomPt.x, bottomPt.y + s / 2);
    ctx.lineTo(leftPt.x - s / 2, leftPt.y);
    ctx.closePath();

    ctx.strokeStyle = isSelected ? COLOURS.selectedAssignedBorder : COLOURS.assignedBorder;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.lineWidth = 1;

    const centre = toScreen(a.row + 0.5, a.col + 0.5);

    ctx.fillStyle = "#000000";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(a.name, centre.x, centre.y);

}


// ---------- Draw Map ----------
function drawMap(){

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const castleHalf = SETTINGS.castleSize / 2;

    for(let row = -SETTINGS.mapHalf; row < SETTINGS.mapHalf; row++){

        for(let col = -SETTINGS.mapHalf; col < SETTINGS.mapHalf; col++){

            const pos = toScreen(row, col);

            const du = excess(row, castleHalf);
            const dv = excess(col, castleHalf);

            const ringDistance = Math.max(du, dv);

            let colour = COLOURS.normal;

            if(ringDistance === 0){
                colour = COLOURS.castle;
            }

            if(selectedTile &&
               (row === selectedTile.row || row === selectedTile.row + 1) &&
               (col === selectedTile.col || col === selectedTile.col + 1)){

                colour = COLOURS.highlight;

            }

            drawTile(pos.x, pos.y, colour);

        }

    }

    assignments.forEach(function(a, i){
        drawAssignment(a, i === selectedAssignmentIndex);
    });

    const low  = -castleHalf - SETTINGS.ringGap - 0.5;
    const high =  castleHalf + SETTINGS.ringGap - 0.5;

    const corner1 = toScreen(low,  low);
    const corner2 = toScreen(low,  high);
    const corner3 = toScreen(high, high);
    const corner4 = toScreen(high, low);

    ctx.beginPath();
    ctx.moveTo(corner1.x, corner1.y);
    ctx.lineTo(corner2.x, corner2.y);
    ctx.lineTo(corner3.x, corner3.y);
    ctx.lineTo(corner4.x, corner4.y);
    ctx.closePath();

    ctx.strokeStyle = COLOURS.ring;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.lineWidth = 1;

}

// ---------- Keep the sidebar list in sync with assignments ----------
function updatePlayerListStyles(){

    document.querySelectorAll(".player").forEach(function(playerEl){

        const name = playerEl.textContent;

        const isAssigned = assignments.some(function(a){
            return a.name === name;
        });

        playerEl.classList.toggle("assigned", isAssigned);

    });

}

// ---------- Enable/disable the Clear button ----------
function updateClearButton(){

    const btn = document.getElementById("clearBtn");

    if(btn){
        btn.disabled = (selectedAssignmentIndex === null);
    }

}

// ---------- Handle Clicks on the map ----------
canvas.addEventListener("click", function(event){

    const tile = screenToGrid(event.offsetX, event.offsetY);

    const castleHalf = SETTINGS.castleSize / 2;

    if(overlapsCastle(tile.row, tile.col, castleHalf)){
        return;
    }

    const existing = findAssignmentAt(tile.row, tile.col);

    if(existing){

        selectedAssignmentIndex = assignments.indexOf(existing);
        selectedTile = null;

    } else {

        if(overlapsAssignment(tile.row, tile.col)){
            return;   // spot already taken, ignore
        }

        selectedTile = tile;
        selectedAssignmentIndex = null;

    }

    updateClearButton();
    drawMap();

});

// ---------- Handle Player Selection ----------
document.querySelectorAll(".player").forEach(function(playerEl){

    playerEl.addEventListener("click", function(){

        const name = playerEl.textContent;

        const existing = assignments.find(function(a){
            return a.name === name;
        });

        if(existing){
            // already placed - clicking their name just shows where they are
            selectedAssignmentIndex = assignments.indexOf(existing);
            selectedTile = null;
            updateClearButton();
            drawMap();
            return;
        }

        if(!selectedTile) return;   // must select an empty tile first

        assignments.push({
            row: selectedTile.row,
            col: selectedTile.col,
            name: name
        });

        selectedTile = null;

        updateClearButton();
        updatePlayerListStyles();
        drawMap();

    });

});

// ---------- Handle Clear button ----------
const clearBtn = document.getElementById("clearBtn");

if(clearBtn){

    clearBtn.addEventListener("click", function(){

        if(selectedAssignmentIndex === null) return;

        assignments.splice(selectedAssignmentIndex, 1);

        selectedAssignmentIndex = null;

        updateClearButton();
        updatePlayerListStyles();
        drawMap();

    });

}

drawMap();