// ======================================================
// Castle Battle Planner
// ======================================================

// ---------- Canvas ----------
const canvas = document.getElementById("battleMap");
const ctx = canvas.getContext("2d");

// ---------- Settings ----------
const SETTINGS = {

    tileSize: 26,        // recalculated automatically - this is just a starting value

    castleSize: 12,

    ringGap: 8,

    mapHalf: 14           // default view: castle + gap + red line, nothing more
};

const MIN_MAP_HALF = Math.ceil(SETTINGS.castleSize / 2) + 2;   // can't zoom in past the castle
const MAX_MAP_HALF = Math.ceil(SETTINGS.castleSize / 2) + 12;   // castle edge + 12 tiles out                                       // sensible zoomed-out limit

// ---------- Work out tile size to fill a FIXED canvas box ----------
let fixedAvailableSpace = null;   // recalculated on load and on window resize

function resizeCanvasToFit(){

    const padding = 20;

    const wrapper = document.getElementById("mapWrapper");

    const availableWidth  = wrapper.clientWidth - padding;

    let space = availableWidth * 0.95;

    space = Math.max(space, 300);   // never shrink below a usable minimum size

    fixedAvailableSpace = space;

    canvas.width  = fixedAvailableSpace;
    canvas.height = fixedAvailableSpace;

    const tilesAcross = SETTINGS.mapHalf * 2 + 1;

    SETTINGS.tileSize = fixedAvailableSpace / tilesAcross;

}

// recalculate the box size if the window is resized (e.g. rotating a phone)
window.addEventListener("resize", function(){

    resizeCanvasToFit();
    drawMap();

});

// ---------- Castle Image ----------
const castleImage = new Image();
let castleImageLoaded = false;

castleImage.onload = function(){
    castleImageLoaded = true;
    drawMap();
};

castleImage.src = "castle.jpg";


// ---------- Selection state ----------
let selectedTile = null;
let selectedAssignments = [];

// ---------- Assigned players ----------
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
        y: canvas.height / 2 + (col + row + 1) * s / 2
    };
S
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
        row: Math.round(dy / s - dx / s - 0.5),
        col: Math.round(dx / s + dy / s - 0.5)
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

// ---------- Is this assignment fully within the current visible area? ----------
function isAssignmentVisible(a){

    return a.row >= -SETTINGS.mapHalf && (a.row + 1) < SETTINGS.mapHalf &&
           a.col >= -SETTINGS.mapHalf && (a.col + 1) < SETTINGS.mapHalf;

}

// ---------- Find an assignment covering a given tile (if any) ----------
function findAssignmentAt(row, col){

    return assignments.find(function(a){

        return row >= a.row && row <= a.row + 1 &&
               col >= a.col && col <= a.col + 1;

    });

}

// ---------- Fit text into 1 or 2 lines inside a max width ----------
function fitTextBlock(text, maxWidth, maxFontSize, minFontSize){

    for(let size = maxFontSize; size >= minFontSize; size--){

        ctx.font = size + "px Arial";

        if(ctx.measureText(text).width <= maxWidth){
            return { lines: [text], fontSize: size };
        }

    }

    let splitPoint = text.indexOf(" ", Math.floor(text.length / 2) - 3);

    if(splitPoint === -1){
        splitPoint = Math.ceil(text.length / 2);
    }

    let line1 = text.slice(0, splitPoint).trim();
    let line2 = text.slice(splitPoint).trim();

    for(let size = maxFontSize; size >= minFontSize; size--){

        ctx.font = size + "px Arial";

        if(ctx.measureText(line1).width <= maxWidth &&
           ctx.measureText(line2).width <= maxWidth){

            return { lines: [line1, line2], fontSize: size };
        }

    }

    ctx.font = minFontSize + "px Arial";

    while(line2.length > 1 && ctx.measureText(line2 + "…").width > maxWidth){
        line2 = line2.slice(0, -1);
    }

    return { lines: [line1, line2 + "…"], fontSize: minFontSize };

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

    const maxWidth = s * 1.8;

    const maxFontSize = Math.max(12, Math.round(s * 0.5));
    const minFontSize = Math.max(8, Math.min(10, Math.round(s * 0.2)));

    const fit = fitTextBlock(a.name, maxWidth, maxFontSize, minFontSize);

    ctx.fillStyle = "#000000";
    ctx.font = fit.fontSize + "px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const lineHeight = fit.fontSize + 1;
    const totalHeight = fit.lines.length * lineHeight;
    const startY = centre.y - totalHeight / 2 + lineHeight / 2;

    fit.lines.forEach(function(line, i){
        ctx.fillText(line, centre.x, startY + i * lineHeight);
    });

}

// ---------- Draw the castle image, clipped to the diamond shape ----------
function drawCastleImage(){

    if(!castleImageLoaded) return;

    const castleHalf = SETTINGS.castleSize / 2;

    const low  = -castleHalf - 0.5;
    const high =  castleHalf - 0.5;

    const corner1 = toScreen(low,  low);
    const corner2 = toScreen(low,  high);
    const corner3 = toScreen(high, high);
    const corner4 = toScreen(high, low);

    ctx.save();

    ctx.beginPath();
    ctx.moveTo(corner1.x, corner1.y);
    ctx.lineTo(corner2.x, corner2.y);
    ctx.lineTo(corner3.x, corner3.y);
    ctx.lineTo(corner4.x, corner4.y);
    ctx.closePath();
    ctx.clip();

    const zoom = 1.1;
    const verticalStretch = 1.9;
    const offsetX = 2;
    const offsetY = -5;

    const width  = SETTINGS.castleSize * SETTINGS.tileSize * zoom;
    const height = width * verticalStretch;

    const centre = toScreen(-0.5, -0.5);

    ctx.drawImage(
        castleImage,
        centre.x - width / 2 + offsetX,
        centre.y - height / 2 + offsetY,
        width,
        height
    );

    ctx.restore();

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
                continue;
            }

            if(selectedTile &&
               (row === selectedTile.row || row === selectedTile.row + 1) &&
               (col === selectedTile.col || col === selectedTile.col + 1)){

                colour = COLOURS.highlight;

            }

            drawTile(pos.x, pos.y, colour);

        }

    }

    drawCastleImage();

    assignments.forEach(function(a){

        if(!isAssignmentVisible(a)) return;

        drawAssignment(a, selectedAssignments.includes(a));

    });

    if(SETTINGS.mapHalf >= castleHalf + SETTINGS.ringGap){

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
        btn.disabled = (selectedAssignments.length === 0);
        btn.textContent = selectedAssignments.length > 1
            ? "Clear Selected (" + selectedAssignments.length + ")"
            : "Clear Selected Spot";
    }

}

// ---------- Enable/disable the zoom buttons at their limits ----------
function updateZoomButtons(){

    const zoomInBtn = document.getElementById("zoomInBtn");
    const zoomOutBtn = document.getElementById("zoomOutBtn");

    if(zoomInBtn) zoomInBtn.disabled = (SETTINGS.mapHalf >= MAX_MAP_HALF);
    if(zoomOutBtn) zoomOutBtn.disabled = (SETTINGS.mapHalf <= MIN_MAP_HALF);

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

        if(event.shiftKey){

            const idx = selectedAssignments.indexOf(existing);

            if(idx === -1){
                selectedAssignments.push(existing);
            } else {
                selectedAssignments.splice(idx, 1);
            }

        } else {

            selectedAssignments = [existing];

        }

        selectedTile = null;

    } else {

        if(overlapsAssignment(tile.row, tile.col)){
            return;
        }

        selectedTile = tile;
        selectedAssignments = [];

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
            selectedAssignments = [existing];
            selectedTile = null;
            updateClearButton();
            drawMap();
            return;
        }

        if(!selectedTile) return;

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

// ---------- Handle Clear (selected) button ----------
const clearBtn = document.getElementById("clearBtn");

if(clearBtn){

    clearBtn.addEventListener("click", function(){

        if(selectedAssignments.length === 0) return;

        assignments = assignments.filter(function(a){
            return !selectedAssignments.includes(a);
        });

        selectedAssignments = [];

        updateClearButton();
        updatePlayerListStyles();
        drawMap();

    });

}

// ---------- Handle Clear All button ----------
const clearAllBtn = document.getElementById("clearAllBtn");

if(clearAllBtn){

    clearAllBtn.addEventListener("click", function(){

        if(assignments.length === 0) return;

        const confirmed = confirm("Clear ALL assigned players from the map?");

        if(!confirmed) return;

        assignments = [];
        selectedAssignments = [];

        updateClearButton();
        updatePlayerListStyles();
        drawMap();

    });

}

// ---------- Handle Player Search ----------
const searchBox = document.getElementById("playerSearch");

if(searchBox){

    searchBox.addEventListener("input", function(){

        const query = searchBox.value.toLowerCase();

        document.querySelectorAll(".player").forEach(function(playerEl){

            const name = playerEl.textContent.toLowerCase();

            playerEl.style.display = name.includes(query) ? "" : "none";

        });

    });

}

// ---------- Handle PDF Export ----------
const exportBtn = document.getElementById("exportBtn");

if(exportBtn){

    exportBtn.addEventListener("click", function(){

        const { jsPDF } = window.jspdf;

        const scaleFactor = 3;   // render 3x bigger than screen size, for a crisp PDF

        const originalWidth = canvas.width;
        const originalHeight = canvas.height;
        const originalTileSize = SETTINGS.tileSize;

        // temporarily switch to high-resolution rendering
        canvas.width  = originalWidth * scaleFactor;
        canvas.height = originalHeight * scaleFactor;
        SETTINGS.tileSize = originalTileSize * scaleFactor;

        drawMap();

        const imageData = canvas.toDataURL("image/png");

        const orientation = canvas.width >= canvas.height ? "landscape" : "portrait";

        const pdf = new jsPDF({
            orientation: orientation,
            unit: "px",
            format: [canvas.width, canvas.height]
        });

        pdf.addImage(imageData, "PNG", 0, 0, canvas.width, canvas.height);

        pdf.save("battle-map.pdf");

        // switch back to normal screen resolution
        canvas.width  = originalWidth;
        canvas.height = originalHeight;
        SETTINGS.tileSize = originalTileSize;

        drawMap();

    });

}

// ---------- Handle Zoom buttons ----------
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");

if(zoomInBtn){

    zoomInBtn.addEventListener("click", function(){

        SETTINGS.mapHalf = Math.min(MAX_MAP_HALF, SETTINGS.mapHalf + 1);

        resizeCanvasToFit();
        updateZoomButtons();
        drawMap();

    });

}

if(zoomOutBtn){

    zoomOutBtn.addEventListener("click", function(){

        SETTINGS.mapHalf = Math.max(MIN_MAP_HALF, SETTINGS.mapHalf - 1);

        resizeCanvasToFit();
        updateZoomButtons();
        drawMap();

    });

}

// ---------- Initial load ----------
resizeCanvasToFit();
updateZoomButtons();
drawMap();
