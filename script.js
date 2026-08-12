// ======================================================
// Castle Battle Planner
// ======================================================

// ---------- Canvas ----------
const canvas = document.getElementById("battleMap");
const ctx = canvas.getContext("2d");

// ---------- Settings ----------
const SETTINGS = {

    tileSize: 26,

    castleSize: 12,

    ringGap: 8,

    mapHalf: 14
};

const MIN_MAP_HALF = Math.ceil(SETTINGS.castleSize / 2) + 2;
const MAX_MAP_HALF = Math.ceil(SETTINGS.castleSize / 2) + 12;

// ---------- Default notes text ----------
const DEFAULT_NOTES_HTML = `
<p><strong>Rally types:</strong></p>
<p><br></p>
<p><strong>Offensive Rally - Old Version</strong> - If you dont have Amadeus, use Zoe.<br>
<strong>Leader uses:</strong> Amadeus, Petra, Rosa<br>
<strong>Joiners uses:</strong> Amane, Margot, Chenko, Yeonwoo<br>
<strong>Formations:</strong> 40/10/50 or 30/10/60</p>
<p><br></p>
<p><strong>Offensive Rally - New Version</strong> - If you dont have Amadeus, use Zoe.<br>
<strong>Leader uses:</strong> Amadeus, Thrudd, Rosa<br>
<strong>Joiners uses:</strong> Amane, Margot, Chenko, Yeonwoo<br>
<strong>Formations:</strong> 50/20/30 or 40/20/40</p>
<p><br></p>
<p><strong>Primary Defensive Garrison</strong> - You use this one when you see a Saul in your garrison leader!<br>
<strong>Leader uses:</strong> Alcar, Margot, Saul<br>
<strong>Joiners uses:</strong> Hilde, Saul, Eric, Gordon<br>
<strong>Formations:</strong> 60/40/0</p>
<p><br></p>
<p><strong>Secondary Defensive Garrison</strong> - Used if your garrison leader does not have Saul.<br>
<strong>Leader uses:</strong> Alcar, Margot, Vivian<br>
<strong>Joiners uses:</strong> Saul, Eric, Gordon, Gordon<br>
<strong>Formations:</strong> 50/20/30</p>
<p><br></p>
<p>If you're a rally/garrison leader, remember to swap your strongest heroes gear to the heroes you're leading the rally/garrison with.</p>
<p><br></p>
<p><strong>Rally Join time:</strong><br>
When a Rally is started (opened), the people listed with assigned heroes join first. They have the first 30 seconds of the rally to do this (from minute 5 to minute 4:30).<br>
After the 30 seconds, everyone else from the list joins. (from minute 4:30 to minute 4).<br>
After the first minute, everyone with TG 5 can join. (from minute 4 to minute 3).<br>
After the second minute the rally opens for free for all joining. (from minute 3 to 0).</p>
<p><br></p>
<p><strong>Garrison Rules:</strong><br>
Only TG 5 level troops in the Castle Garrison.<br>
In Turret garrisons try to identify if its 60/40 formation or 50/20/30 formation.<br>
Hero gear on your heroes in the Garrison, don't matter, if you're not the garrison leader. Use the assigned hero to apply the wanted buffs.<br>
Put your best gear on the heroes you will be sending reinforcements with. Less troops injured, if a reinforcement run hits an enemy garrison.</p>
<p><br></p>
<p><strong>Free for All</strong><br>
If your name is not in the above lists, you're free for all, until told otherwise. This means you can fill any rally when the count down timer hits 2 minutes remaining. It means you're free to open rallies against enemy positions. If there is not a rally to join, open 1.<br>
Do not solo walk (solo attack), unless its at minute 0, or to hand off castle.<br>
The above counts as long as we're fighting seriously for the castle. It will be clearly called if we turn to a state where you're free to fire at will.</p>
`;


// ---------- Quill Notes Editor ----------
const NOTES_EXPORT_FONT_SCALE = 0.75;   // tweak this (try 0.75 first) if notes text still looks bigger/smaller than rally text after testing

const quill = new Quill("#notesEditor", {
    theme: "snow",
    modules: {
        toolbar: [
            [{ header: [1, 2, false] }],
            ["bold", "italic", "underline"],
            [{ color: [] }],
            ["clean"]
        ],
        keyboard: {
            bindings: {
                tab: {
                    key: 9,
                    handler: function(range){
                        this.quill.insertText(range.index, "\u00A0\u00A0\u00A0\u00A0");
                        this.quill.setSelection(range.index + 4);
                        return false;
                    }
                }
            }
        }
    }
});

quill.on("text-change", function(){
    updateNotesPageBreaks();
    saveAutoSave();
});

if(notesTitleInput){
    notesTitleInput.addEventListener("input", function(){
        saveAutoSave();
    });
}

// ---------- Make the editor genuinely match the export page (true size, scrolls horizontally if needed) ----------
function syncEditorToExportSize(){

    const exportPdfScale = 2;   // must match your PDF export's pdfScale
    const exportPageW = 612 * exportPdfScale;
    const exportMargin = 50 * exportPdfScale;
    const exportWidth = exportPageW - exportMargin * 2;

    const exportTitleFontSize = 32 * exportPdfScale * NOTES_EXPORT_FONT_SCALE;
    const exportRallyNameFontSize = 24 * exportPdfScale * NOTES_EXPORT_FONT_SCALE;
    const exportBodyFontSize = 20 * exportPdfScale * NOTES_EXPORT_FONT_SCALE;

    const editorEl = document.querySelector("#notesEditor .ql-editor");

    if(!editorEl) return;

    editorEl.style.width = exportWidth + "px";
    editorEl.style.fontSize = exportBodyFontSize + "px";

    editorEl.querySelectorAll("h1").forEach(function(el){ el.style.fontSize = exportTitleFontSize + "px"; });
    editorEl.querySelectorAll("h2").forEach(function(el){ el.style.fontSize = exportRallyNameFontSize + "px"; });

}

quill.on("text-change", function(){
    syncEditorToExportSize();
    saveAutoSave();
});

window.addEventListener("resize", function(){
    syncEditorToExportSize();
});


// ---------- Page-break guide removed - export pagination is handled automatically and reliably ----------
function updateNotesPageBreaks(){
    // intentionally left blank
}

// ---------- Convert <br> line breaks into real paragraph splits (html2canvas doesn't reliably render <br>) ----------
function normalizeBreaksForExport(container){

    container.querySelectorAll("br").forEach(function(br){

        // if this <br> is the only thing in its paragraph (a blank line),
        // leave it alone - removing it would collapse the blank line to zero height
        if(!br.nextSibling && br.parentElement.childNodes.length === 1) return;

        const parent = br.parentElement;
        const tag = parent.tagName.toLowerCase();

        const newEl = document.createElement(tag);

        let node = br.nextSibling;

        while(node){
            const next = node.nextSibling;
            newEl.appendChild(node);
            node = next;
        }

        br.remove();
        parent.after(newEl);

    });

}

 

// ---------- Load default notes text if nothing has been saved yet ----------
function initializeNotesIfEmpty(){

    if(quill){

        const currentHTML = quill.root.innerHTML.trim();
        const isEmpty = (currentHTML === "" || currentHTML === "<p><br></p>");

        if(isEmpty){
            quill.clipboard.dangerouslyPasteHTML(DEFAULT_NOTES_HTML);
        }

    }

}



// ---------- Work out tile size to fill a FIXED canvas box ----------
let fixedAvailableSpace = null;

// measures screen space and locks the canvas box size - only call on load/window resize
function measureAndSetCanvasSize(){

    const padding = 20;

    const wrapper = document.getElementById("mapWrapper");

    const availableWidth  = wrapper.clientWidth - padding;

    let space = availableWidth * 0.95;

    space = Math.max(space, 300);

    fixedAvailableSpace = space;

    canvas.width  = fixedAvailableSpace;
    canvas.height = fixedAvailableSpace;

}

// recalculates tile size to fit the CURRENT zoom level into the already-fixed box
function updateTileSizeForZoom(){

    const tilesAcross = SETTINGS.mapHalf * 2 + 1;

    SETTINGS.tileSize = fixedAvailableSpace / tilesAcross;

}

window.addEventListener("resize", function(){

    measureAndSetCanvasSize();
    updateTileSizeForZoom();
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

// ---------- Player list (loaded from players.json) ----------
let playerNames = [];

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

// ---------- Rally colours ----------
const RALLIES = [
    { name: "Rally 1", colour: "#3e23c7ff", members: [], description: "" },
    { name: "Rally 2", colour: "#88CCEE", members: [], description: "" },
    { name: "Rally 3", colour: "#26d2b6ff", members: [], description: "" },
    { name: "Rally 4", colour: "#ea81b4ff", members: [], description: "" },
    { name: "Rally 5", colour: "#e33e02ff", members: [], description: "" },
    { name: "Rally 6", colour: "#8c75e9ff", members: [], description: "" },
    { name: "Rally 7", colour: "#0b8d32ff", members: [], description: "" },
    { name: "Rally 8", colour: "#770d1dff", members: [], description: "" },
    { name: "Rally 9", colour: "#bd29d1ff", members: [], description: "" }
];

// ---------- Available joining heroes (edit this list as needed) ----------
const JOINING_HEROES = [
    "Amane", "Chenko", "Hilde", "Saul", "Eric",
    "Gordon"
];


// ---------- Convert grid position -> screen position ----------
function toScreen(row, col){

    const s = SETTINGS.tileSize;

    return {
        x: canvas.width / 2 + (col - row) * s / 2,
        y: canvas.height / 2 + (col + row + 1) * s / 2
    };

}

// ---------- Convert a hex colour (6 or 8 digit) to RGB values for PDF text colouring ----------
function hexToRgb(hex){

    let h = hex.replace("#", "");

    if(h.length === 8) h = h.slice(0, 6);   // drop alpha channel if present
    if(h.length === 3) h = h.split("").map(function(c){ return c + c; }).join("");

    const num = parseInt(h, 16);

    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
    };

}

// ---------- Move a point a fixed pixel distance toward a target point ----------
function moveToward(point, target, amount){

    const dx = target.x - point.x;
    const dy = target.y - point.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if(dist === 0) return point;

    const ratio = amount / dist;

    return {
        x: point.x + dx * ratio,
        y: point.y + dy * ratio
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

// ---------- Find an assignment covering a given tile (if any) ----------
function findAssignmentAt(row, col){

    return assignments.find(function(a){

        return row >= a.row && row <= a.row + 1 &&
               col >= a.col && col <= a.col + 1;

    });

}

// ---------- Is this assignment fully within the current visible area? ----------
function isAssignmentFullyVisible(a){

    return a.row >= -SETTINGS.mapHalf && (a.row + 1) < SETTINGS.mapHalf &&
           a.col >= -SETTINGS.mapHalf && (a.col + 1) < SETTINGS.mapHalf;

}

// ---------- Is any part of this assignment within the current visible area? ----------
function isAssignmentPartiallyVisible(a){

    return (a.row + 1) >= -SETTINGS.mapHalf && a.row < SETTINGS.mapHalf &&
           (a.col + 1) >= -SETTINGS.mapHalf && a.col < SETTINGS.mapHalf;

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

// ---------- Draw just the border of an assigned player's 2x2 block ----------
function drawAssignmentBorder(a, isSelected){

    const s = SETTINGS.tileSize;

    const topPt    = toScreen(a.row,     a.col);
    const rightPt  = toScreen(a.row,     a.col + 1);
    const bottomPt = toScreen(a.row + 1, a.col + 1);
    const leftPt   = toScreen(a.row + 1, a.col);

    const centre = toScreen(a.row + 0.5, a.col + 0.5);

    const inset = Math.max(2, s * 0.08);

    const topTip    = moveToward({ x: topPt.x,            y: topPt.y - s / 2 },    centre, inset);
    const rightTip  = moveToward({ x: rightPt.x + s / 2,   y: rightPt.y },          centre, inset);
    const bottomTip = moveToward({ x: bottomPt.x,          y: bottomPt.y + s / 2 }, centre, inset);
    const leftTip   = moveToward({ x: leftPt.x - s / 2,    y: leftPt.y },           centre, inset);

    ctx.beginPath();
    ctx.moveTo(topTip.x, topTip.y);
    ctx.lineTo(rightTip.x, rightTip.y);
    ctx.lineTo(bottomTip.x, bottomTip.y);
    ctx.lineTo(leftTip.x, leftTip.y);
    ctx.closePath();

    const rallyIndex = getPlayerRally(a.name);
    const rallyColour = (rallyIndex !== -1) ? RALLIES[rallyIndex].colour : COLOURS.assignedBorder;

    ctx.strokeStyle = isSelected ? COLOURS.selectedAssignedBorder : rallyColour;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.lineWidth = 1;

}

// ---------- Draw just the name of an assigned player, centred in their 2x2 block ----------
function drawAssignmentName(a){

    const s = SETTINGS.tileSize;

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

    // borders first - the red line will draw on top of these
    assignments.forEach(function(a){

        if(!isAssignmentPartiallyVisible(a)) return;

        drawAssignmentBorder(a, selectedAssignments.includes(a));

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

    // names last, so they always stay readable on top of the red line
    assignments.forEach(function(a){

        if(!isAssignmentPartiallyVisible(a)) return;

        drawAssignmentName(a);

    });

}

// ---------- Load player list from a published Google Sheet, then build the sidebar ----------
const PLAYERS_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRQOX9P-FouLRInDSPJvEYPygcvYVOnwcgEIDv720UyXUBFJBP_6aVdQeTPY2RHZwJESYkfviW4cUOa/pub?output=csv";

function loadPlayerList(){

    fetch(PLAYERS_SHEET_URL)
        .then(function(response){
            return response.text();
        })
        .then(function(csvText){

            playerNames = csvText
                .split("\n")
                .map(function(line){
                    return line.replace(/"/g, "").trim();
                })
                .filter(function(name){
                    return name.length > 0;
                });

            buildPlayerListUI();
            restoreAutoSave();
            removeAssignmentsForMissingPlayers();
            buildRallyOverview();
            drawMap();

        })
        .catch(function(error){
            console.error("Could not load player list from Google Sheets", error);
        });

}

// ---------- Build the rally dropdown options ----------
function buildRallyOptions(){

    const select = document.getElementById("rallySelect");

    if(!select) return;

    const noneOption = document.createElement("option");
    noneOption.value = -1;
    noneOption.textContent = "No Rally";
    select.appendChild(noneOption);

    RALLIES.forEach(function(rally, index){

        const option = document.createElement("option");
        option.id = "rallyOption-" + index;
        option.value = index;
        option.textContent = rally.name;

        select.appendChild(option);

    });

}

// ---------- Build the "who's in which rally" panel below the map ----------
function buildRallyOverview(){

    const container = document.getElementById("rallyOverviewList");

    if(!container) return;

    container.innerHTML = "";

    RALLIES.forEach(function(rally, rallyIndex){

        const card = document.createElement("div");
        card.className = "rallyCard";

        const header = document.createElement("div");
        header.className = "rallyCardHeader";

        const swatch = document.createElement("div");
        swatch.className = "rallySwatch";
        swatch.style.background = rally.colour;

        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.className = "rallyNameInput";
        nameInput.value = rally.name;

        nameInput.addEventListener("input", function(){
            rally.name = nameInput.value;
            const option = document.getElementById("rallyOption-" + rallyIndex);
            if(option) option.textContent = rally.name;
            saveAutoSave();
        });

        header.appendChild(swatch);
        header.appendChild(nameInput);
        card.appendChild(header);

        const descInput = document.createElement("textarea");
        descInput.className = "rallyDescriptionInput";
        descInput.placeholder = "Rally notes";
        descInput.rows = 2;
        descInput.value = rally.description || "";

        descInput.addEventListener("input", function(){
            rally.description = descInput.value;
            saveAutoSave();
        });

        card.appendChild(descInput);

        const list = document.createElement("ul");
        list.className = "rallyMemberList";

        if(rally.members.length === 0){

            const empty = document.createElement("div");
            empty.style.color = "#999";
            empty.style.fontSize = "13px";
            empty.textContent = "No players assigned";
            list.appendChild(empty);

        } else {

            rally.members.forEach(function(member, i){

                const row = document.createElement("li");
                row.className = "rallyMemberRow";

                // --- column 1: name + controls (~1/3 width) ---
                const nameCol = document.createElement("div");
                nameCol.className = "rallyMemberNameCol";

                const label = document.createElement("span");
                label.textContent = (i === 0 ? "★ " : "") + member.name;

                const btnGroup = document.createElement("span");
                btnGroup.className = "rallyMemberButtons";

                const leaderBtn = document.createElement("button");
                leaderBtn.textContent = "★";
                leaderBtn.title = "Make rally leader";
                leaderBtn.disabled = (i === 0);
                leaderBtn.addEventListener("click", function(){
                    makeRallyLeader(rallyIndex, member.name);
                });

                const upBtn = document.createElement("button");
                upBtn.textContent = "↑";
                upBtn.title = "Move up";
                upBtn.disabled = (i === 0);
                upBtn.addEventListener("click", function(){
                    moveRallyMember(rallyIndex, member.name, "up");
                });

                const downBtn = document.createElement("button");
                downBtn.textContent = "↓";
                downBtn.title = "Move down";
                downBtn.disabled = (i === rally.members.length - 1);
                downBtn.addEventListener("click", function(){
                    moveRallyMember(rallyIndex, member.name, "down");
                });

                const removeBtn = document.createElement("button");
                removeBtn.textContent = "×";
                removeBtn.title = "Remove from rally";
                removeBtn.addEventListener("click", function(){
                    removeFromRally(rallyIndex, member.name);
                });

                btnGroup.appendChild(leaderBtn);
                btnGroup.appendChild(upBtn);
                btnGroup.appendChild(downBtn);
                btnGroup.appendChild(removeBtn);

                nameCol.appendChild(label);
                nameCol.appendChild(btnGroup);

                // --- column 2: joining hero(es) ---
                const heroCol = document.createElement("div");
                heroCol.className = "rallyMemberHeroCol";

                const heroSelect = document.createElement("select");
                heroSelect.className = "rallyHeroSelect";
                heroSelect.multiple = true;
                heroSelect.title = "Ctrl/Cmd-click to select more than one hero";

                JOINING_HEROES.forEach(function(hero){
                    const opt = document.createElement("option");
                    opt.value = hero;
                    opt.textContent = hero;
                    opt.selected = (member.heroes || []).includes(hero);
                    heroSelect.appendChild(opt);
                });

                heroSelect.addEventListener("change", function(){

                    const selected = Array.from(heroSelect.selectedOptions).map(function(o){
                        return o.value;
                    });

                    member.heroes = selected;
                    saveAutoSave();

                });

                heroCol.appendChild(heroSelect);

                // --- column 3: free text notes ---
                const noteCol = document.createElement("div");
                noteCol.className = "rallyMemberNoteCol";

                const noteInput = document.createElement("input");
                noteInput.type = "text";
                noteInput.className = "rallyMemberNoteInput";
                noteInput.placeholder = "Notes...";
                noteInput.value = member.note || "";

                noteInput.addEventListener("input", function(){
                    member.note = noteInput.value;
                    saveAutoSave();
                });

                noteCol.appendChild(noteInput);

                row.appendChild(nameCol);
                row.appendChild(heroCol);
                row.appendChild(noteCol);

                list.appendChild(row);

            });

        }

        card.appendChild(list);

        const addRow = document.createElement("div");
        addRow.className = "rallyAddRow";

        const addSelect = document.createElement("select");
        addSelect.className = "rallyAddSelect";

        const availableNames = playerNames.filter(function(name){
            return !rally.members.some(function(m){ return m.name === name; });
        });

        if(availableNames.length === 0){
            const opt = document.createElement("option");
            opt.textContent = "No players available";
            addSelect.appendChild(opt);
            addSelect.disabled = true;
        } else {
            availableNames.forEach(function(name){
                const opt = document.createElement("option");
                opt.value = name;
                opt.textContent = name;
                addSelect.appendChild(opt);
            });
        }

        const addBtn = document.createElement("button");
        addBtn.textContent = "Add";
        addBtn.disabled = (availableNames.length === 0);
        addBtn.addEventListener("click", function(){

            const name = addSelect.value;
            const currentRally = getPlayerRally(name);

            if(currentRally !== -1 && currentRally !== rallyIndex){
                const confirmed = confirm(name + " is already in " + RALLIES[currentRally].name + ". Move them to " + rally.name + "?");
                if(!confirmed) return;
            }

            addPlayerToRally(rallyIndex, name);

        });

        addRow.appendChild(addSelect);
        addRow.appendChild(addBtn);
        card.appendChild(addRow);

        container.appendChild(card);

    });

}

// ---------- Find which rally (if any) a player belongs to ----------
function getPlayerRally(name){

    for(let i = 0; i < RALLIES.length; i++){
        if(RALLIES[i].members.some(function(m){ return m.name === name; })) return i;
    }

    return -1;

}

// ---------- Move a player into a rally (removing them from any other first) ----------
function setPlayerRally(name, rallyIndex){

    let existingHeroes = [];
    let existingNote = "";

    RALLIES.forEach(function(rally){
        const idx = rally.members.findIndex(function(m){ return m.name === name; });
        if(idx !== -1){
            existingHeroes = rally.members[idx].heroes || [];
            existingNote = rally.members[idx].note || "";
            rally.members.splice(idx, 1);
        }
    });

    if(rallyIndex >= 0 && RALLIES[rallyIndex]){
        RALLIES[rallyIndex].members.push({ name: name, heroes: existingHeroes, note: existingNote });
    }

}

// ---------- Add a player to a rally via the overview panel ----------
function addPlayerToRally(rallyIndex, name){

    setPlayerRally(name, rallyIndex);

    updatePlayerListStyles();
    buildRallyOverview();
    drawMap();
    saveAutoSave();

}

// ---------- Remove a player from their rally via the overview panel ----------
function removeFromRally(rallyIndex, name){

    setPlayerRally(name, -1);

    updatePlayerListStyles();
    buildRallyOverview();
    drawMap();
    saveAutoSave();

}

// ---------- Jump a player straight to the top (leader) of their rally ----------
function makeRallyLeader(rallyIndex, name){

    const members = RALLIES[rallyIndex].members;
    const idx = members.findIndex(function(m){ return m.name === name; });

    if(idx <= 0) return;

    const item = members[idx];
    members.splice(idx, 1);
    members.unshift(item);

    buildRallyOverview();
    saveAutoSave();

}

// ---------- Reorder a player within their rally ----------
function moveRallyMember(rallyIndex, name, direction){

    const members = RALLIES[rallyIndex].members;
    const idx = members.findIndex(function(m){ return m.name === name; });

    if(idx === -1) return;

    const swapWith = direction === "up" ? idx - 1 : idx + 1;

    if(swapWith < 0 || swapWith >= members.length) return;

    const temp = members[idx];
    members[idx] = members[swapWith];
    members[swapWith] = temp;

    buildRallyOverview();
    saveAutoSave();

}

// ---------- Build the player list in the sidebar ----------
function buildPlayerListUI(){

    const listEl = document.getElementById("playerList");

    listEl.innerHTML = "";

    playerNames.forEach(function(name){

        const div = document.createElement("div");
        div.className = "player";
        div.textContent = name;

        div.addEventListener("click", function(){
            handlePlayerClick(name);
        });

        listEl.appendChild(div);

    });

    updatePlayerListStyles();
    buildRallyOverview();

}

// ---------- Handle a click on a player's name in the sidebar ----------
function handlePlayerClick(name){

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
    buildRallyOverview();
    drawMap();
    saveAutoSave();

}

// ---------- Remove any assignments for players no longer in the current roster ----------
function removeAssignmentsForMissingPlayers(){

    const before = assignments.length;

    assignments = assignments.filter(function(a){
        return playerNames.includes(a.name);
    });

    RALLIES.forEach(function(rally){
        rally.members = rally.members.filter(function(m){
            return playerNames.includes(m.name);
        });
    });

    if(assignments.length !== before){
        saveAutoSave();
    }

}

// ---------- Keep the sidebar list in sync with assignments ----------
function updatePlayerListStyles(){

    document.querySelectorAll(".player").forEach(function(playerEl){

        const name = playerEl.textContent;

        const existing = assignments.find(function(a){
            return a.name === name;
        });

        playerEl.classList.toggle("assigned", !!existing);

        const rallyIndex = getPlayerRally(name);
        playerEl.style.borderLeftColor = (rallyIndex !== -1) ? RALLIES[rallyIndex].colour : "transparent";

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

// ---------- Auto-save to this browser (safety net against refreshes) ----------
function saveAutoSave(){

    try{

        const data = {
            assignments: assignments,
            rallyMembers: RALLIES.map(function(r){ return r.members; }),
            rallyNames: RALLIES.map(function(r){ return r.name; }),
            rallyDescriptions: RALLIES.map(function(r){ return r.description || ""; }),
            notesTitle: notesTitleInput ? notesTitleInput.value : "Notes",
            notesHTML: quill.root.innerHTML
        };

        localStorage.setItem("battlePlannerAutoSave", JSON.stringify(data));

    } catch(error){
        console.error("Auto-save failed", error);
    }

}

function restoreNotesOnly(){

    try{

        const saved = localStorage.getItem("battlePlannerAutoSave");

        if(!saved) return;

        const parsed = JSON.parse(saved);

        if(Array.isArray(parsed)) return;   // old save format, no notes info

        if(notesTitleInput) notesTitleInput.value = parsed.notesTitle || "Notes";

        if(parsed.notesHTML !== undefined){
            quill.root.innerHTML = parsed.notesHTML;
        }

    } catch(error){
        console.error("Could not restore notes", error);
    }

}

function restoreAutoSave(){

    try{

        const saved = localStorage.getItem("battlePlannerAutoSave");

        if(!saved) return;

        const parsed = JSON.parse(saved);

        if(Array.isArray(parsed)){

            assignments = parsed;   // old save format, from before rallies existed

        } else {

            assignments = parsed.assignments || [];

            if(parsed.rallyMembers){
                parsed.rallyMembers.forEach(function(members, i){
                    if(RALLIES[i]) RALLIES[i].members = members.map(function(m){
                        if(typeof m === "string") return { name: m, heroes: [], note: "" };
                        return { name: m.name, heroes: m.heroes || [], note: m.note || "" };
                    });
                });
            }

            if(parsed.rallyNames){
                parsed.rallyNames.forEach(function(name, i){
                    if(RALLIES[i]){
                        RALLIES[i].name = name;
                        const option = document.getElementById("rallyOption-" + i);
                        if(option) option.textContent = name;
                    }
                });
            }

            if(parsed.rallyDescriptions){
                parsed.rallyDescriptions.forEach(function(desc, i){
                    if(RALLIES[i]) RALLIES[i].description = desc;
                });
            }

            if(notesTitleInput) notesTitleInput.value = parsed.notesTitle || "Notes";

           quill.clipboard.dangerouslyPasteHTML((parsed.notesHTML !== undefined) ? parsed.notesHTML : DEFAULT_NOTES_HTML);
            updateNotesPageBreaks();

        }

        updatePlayerListStyles();
        buildRallyOverview();
        drawMap();

    } catch(error){
        console.error("Could not restore auto-save", error);
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
        buildRallyOverview();
        drawMap();
        saveAutoSave();

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
        buildRallyOverview();
        drawMap();
        saveAutoSave();

    });

}

// ---------- Reset button (clears saved data and reloads fresh, for testing) ----------
const resetPageBtn = document.getElementById("resetPageBtn");

if(resetPageBtn){

    resetPageBtn.addEventListener("click", function(){

        const confirmed = confirm("This will erase ALL saved data (map, rallies, notes) and reload the page fresh. Continue?");

        if(!confirmed) return;

        localStorage.removeItem("battlePlannerAutoSave");
        location.reload();

    });

}

// ---------- Handle Set Rally button ----------
const setRallyBtn = document.getElementById("setRallyBtn");

if(setRallyBtn){

    setRallyBtn.addEventListener("click", function(){

        if(selectedAssignments.length === 0) return;

        const rallySelect = document.getElementById("rallySelect");
        const rallyIndex = rallySelect ? parseInt(rallySelect.value, 10) : 0;

        const conflicts = selectedAssignments.filter(function(a){
            const current = getPlayerRally(a.name);
            return current !== -1 && current !== rallyIndex;
        });

        if(conflicts.length > 0){
            const names = conflicts.map(function(a){ return a.name; }).join(", ");
            const confirmed = confirm("This will move the following player(s) out of their current rally: " + names + ". Continue?");
            if(!confirmed) return;
        }

        selectedAssignments.forEach(function(a){
            setPlayerRally(a.name, rallyIndex);
        });

        updatePlayerListStyles();
        buildRallyOverview();
        drawMap();
        saveAutoSave();

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

// ---------- Find safe places to cut a block of HTML content into pages ----------
// Never cuts through the middle of a paragraph/line - only in the gaps between them.
function findSafePageBreaks(container, availableHeightPerPage){

    const containerTop = container.getBoundingClientRect().top;
    const units = [];

    Array.from(container.children).forEach(function(child){

        const rect = child.getBoundingClientRect();
        const top = rect.top - containerTop;
        const bottom = rect.bottom - containerTop;
        const height = bottom - top;

        if(height > availableHeightPerPage){

            // this single block is taller than a page - split it by its own lines instead
            const range = document.createRange();
            range.selectNodeContents(child);

            Array.from(range.getClientRects()).forEach(function(r){
                units.push({ top: r.top - containerTop, bottom: r.bottom - containerTop });
            });

        } else {

            units.push({ top: top, bottom: bottom });

        }

    });

    const pages = [];
    let pageStart = 0;
    let pageEnd = 0;

    units.forEach(function(u){

        if(u.bottom - pageStart > availableHeightPerPage && u.bottom > pageEnd){
            pages.push({ start: pageStart, end: pageEnd });
            pageStart = u.top;
        }

        pageEnd = u.bottom;

    });

    pages.push({ start: pageStart, end: Math.max(pageEnd, container.scrollHeight) });

    return pages;

}

// ---------- Handle PDF Export ----------
const exportBtn = document.getElementById("exportBtn");

if(exportBtn){

    exportBtn.addEventListener("click", async function(){

        const { jsPDF } = window.jspdf;

        const scaleFactor = 3;

        const originalWidth = canvas.width;
        const originalHeight = canvas.height;
        const originalTileSize = SETTINGS.tileSize;

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

        canvas.width  = originalWidth;
        canvas.height = originalHeight;
        SETTINGS.tileSize = originalTileSize;

        drawMap();

      
    // ---------- Rally page settings (tweak these) ----------
        const pdfScale = 2;   // increase/decrease this to resize the whole rally page relative to the map page

        const pageW = 612 * pdfScale;
        const pageH = 792 * pdfScale;
        const margin = 50 * pdfScale;

        const titleFontSize = 32 * pdfScale;
        const rallyNameFontSize = 24 * pdfScale;
        const bodyFontSize = 20 * pdfScale;

        const colGap = 24 * pdfScale;
        const colWidth = (pageW - margin * 2 - colGap * 2) / 3;
        const colPlayerX = margin;
        const colHeroX = margin + colWidth + colGap;
        const colNotesX = margin + (colWidth + colGap) * 2;

        // ---------- Estimate how tall a rally's block will be, without drawing it ----------
        function measureRallyHeight(rally){

            let h = rallyNameFontSize + 6;

            if(rally.description){
                pdf.setFont(undefined, "normal");
                pdf.setFontSize(bodyFontSize);
                const lines = pdf.splitTextToSize(rally.description, pageW - margin * 2);
                h += lines.length * (bodyFontSize + 4) + 10;
            }

            h += bodyFontSize + 12;   // column header row

            rally.members.forEach(function(member){

                const heroText = (member.heroes && member.heroes.length > 0) ? member.heroes.join("/") : "-";

                pdf.setFont(undefined, "normal");
                pdf.setFontSize(bodyFontSize);

                const heroLines = pdf.splitTextToSize(heroText, colWidth);
                const noteLines = member.note ? pdf.splitTextToSize(member.note, colWidth) : [""];
                const rowLines = Math.max(1, heroLines.length, noteLines.length);

                h += rowLines * (bodyFontSize + 6);

            });

            h += 30;

            return h;

        }

        pdf.addPage([pageW, pageH], "portrait");

        let y = 70;

        pdf.setFont(undefined, "bold");
        pdf.setFontSize(titleFontSize);
        pdf.setTextColor(0, 0, 0);
        pdf.text("Rally Overview", pageW / 2, y, { align: "center" });
        y += titleFontSize + 20;

        RALLIES.forEach(function(rally){

            if(rally.members.length === 0 && !rally.description) return;

            const neededHeight = measureRallyHeight(rally);

            // start a fresh page if this rally won't fit, unless we're already at the top of one
            if(y + neededHeight > pageH - margin && y > 100){
                pdf.addPage([pageW, pageH], "portrait");
                y = 60;
            }

            const rgb = hexToRgb(rally.colour);

            pdf.setFont(undefined, "bold");
            pdf.setFontSize(rallyNameFontSize);
            pdf.setTextColor(rgb.r, rgb.g, rgb.b);
            pdf.text(rally.name, margin, y);
            y += rallyNameFontSize + 6;

            pdf.setTextColor(0, 0, 0);

            if(rally.description){
                pdf.setFont(undefined, "normal");
                pdf.setFontSize(bodyFontSize);
                const descLines = pdf.splitTextToSize(rally.description, pageW - margin * 2);
                pdf.text(descLines, margin, y);
                y += descLines.length * (bodyFontSize + 4) + 10;
            }

            pdf.setFont(undefined, "bold");
            pdf.setFontSize(bodyFontSize);
            pdf.text("Player", colPlayerX, y);
            pdf.text("Joiner Hero", colHeroX, y);
            pdf.text("Notes", colNotesX, y);
            y += 8;

            pdf.setDrawColor(180, 180, 180);
            pdf.line(margin, y, pageW - margin, y);
            y += bodyFontSize + 4;

            pdf.setFont(undefined, "normal");
            pdf.setFontSize(bodyFontSize);

            rally.members.forEach(function(member){

                const heroText = (member.heroes && member.heroes.length > 0) ? member.heroes.join("/") : "-";
                const noteText = member.note || "";

                const heroLines = pdf.splitTextToSize(heroText, colWidth);
                const noteLines = noteText ? pdf.splitTextToSize(noteText, colWidth) : [""];
                const rowLines = Math.max(1, heroLines.length, noteLines.length);

                pdf.text(member.name, colPlayerX, y);
                pdf.text(heroLines, colHeroX, y);
                if(noteText) pdf.text(noteLines, colNotesX, y);

                y += rowLines * (bodyFontSize + 6);

            });

            y += 30;

        });


// ---------- Notes pages ----------
        const notesTitleText = notesTitleInput ? (notesTitleInput.value || "Notes") : "Notes";
        const notesContentHTML = quill.root.innerHTML;

        const notesContainer = document.createElement("div");
        notesContainer.style.position = "absolute";
        notesContainer.style.left = "-100000px";
        notesContainer.style.top = "0";
        notesContainer.style.boxSizing = "border-box";
        notesContainer.style.width = (pageW - margin * 2) + "px";
        notesContainer.style.background = "#ffffff";
        notesContainer.style.color = "#000000";
        notesContainer.style.fontFamily = "Arial, sans-serif";

        const notesTitleEl = document.createElement("div");
        notesTitleEl.style.boxSizing = "border-box";
        notesTitleEl.style.fontFamily = "Arial, sans-serif";
        notesTitleEl.style.fontWeight = "bold";
        notesTitleEl.style.fontSize = (32 * pdfScale * NOTES_EXPORT_FONT_SCALE) + "px";
        notesTitleEl.style.lineHeight = "1.2";
        notesTitleEl.style.marginBottom = "20px";
        notesTitleEl.style.textAlign = "center";
        notesTitleEl.textContent = notesTitleText;

        const notesBodyEl = document.createElement("div");
        notesBodyEl.style.boxSizing = "border-box";
        notesBodyEl.style.fontFamily = "Arial, sans-serif";
        notesBodyEl.style.fontSize = (20 * pdfScale * NOTES_EXPORT_FONT_SCALE) + "px";
        notesBodyEl.style.margin = "0";
        notesBodyEl.style.whiteSpace = "pre-wrap";
        notesBodyEl.style.lineHeight = "1.4";
        notesBodyEl.innerHTML = notesContentHTML;
        normalizeBreaksForExport(notesBodyEl);

        // scale any manually-applied inline font sizes to match pdfScale
        notesBodyEl.querySelectorAll("[style]").forEach(function(span){
            const match = (span.style.fontSize || "").match(/^([\d.]+)px$/);
            if(!match) return;
            span.style.fontSize = (parseFloat(match[1]) * pdfScale) + "px";
        });

        notesContainer.appendChild(notesTitleEl);
        notesContainer.appendChild(notesBodyEl);
        document.body.appendChild(notesContainer);

        await new Promise(function(resolve){
            requestAnimationFrame(function(){ requestAnimationFrame(resolve); });
        });

        const availableWidth = pageW - margin * 2;
        const availableHeight = pageH - margin * 2;

        // force consistent sizing on headings/paragraphs, since Quill's own
// heading styles don't apply outside its normal .ql-editor container
const headingSizes = {
    "H1": titleFontSize * NOTES_EXPORT_FONT_SCALE,
    "H2": rallyNameFontSize * NOTES_EXPORT_FONT_SCALE
};

notesBodyEl.querySelectorAll("h1, h2, p").forEach(function(el){

    el.style.margin = "0";

    if(headingSizes[el.tagName]){
        el.style.fontSize = headingSizes[el.tagName] + "px";
    } else {
        el.style.fontSize = (bodyFontSize * NOTES_EXPORT_FONT_SCALE) + "px";
    }

});

        // find safe break points using the actual rendered title + body together
        const wrapper = document.createElement("div");
        wrapper.appendChild(notesTitleEl.cloneNode(true));

        const bodyClone = notesBodyEl.cloneNode(true);
        Array.from(bodyClone.children).forEach(function(child){
            wrapper.appendChild(child);
        });

        wrapper.style.width = notesContainer.style.width;
        notesContainer.innerHTML = "";
        notesContainer.appendChild(wrapper);

        const pageBreaks = findSafePageBreaks(wrapper, availableHeight);

        const fullCanvas = await html2canvas(notesContainer, {
            backgroundColor: "#ffffff",
            scale: 1,
            useCORS: true,
            logging: false
        });

        document.body.removeChild(notesContainer);

        pageBreaks.forEach(function(page){

            pdf.addPage([pageW, pageH], "portrait");
            pdf.setPage(pdf.internal.getNumberOfPages());

            const sourceY = Math.max(0, Math.round(page.start));
            const sourceHeight = Math.max(1, Math.round(page.end - page.start));

            const pageCanvas = document.createElement("canvas");
            pageCanvas.width = fullCanvas.width;
            pageCanvas.height = sourceHeight;

            const pageCtx = pageCanvas.getContext("2d");
            pageCtx.fillStyle = "#ffffff";
            pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

            pageCtx.drawImage(
                fullCanvas,
                0, sourceY, fullCanvas.width, sourceHeight,
                0, 0, fullCanvas.width, sourceHeight
            );

            const pageImage = pageCanvas.toDataURL("image/png");
            const imageHeight = sourceHeight * (availableWidth / fullCanvas.width);

            pdf.addImage(pageImage, "PNG", margin, margin, availableWidth, imageHeight);

        });

        pdf.save("battle-plan.pdf");
});

}


// ---------- Handle Save Project ----------
const saveProjectBtn = document.getElementById("saveProjectBtn");

if(saveProjectBtn){

    saveProjectBtn.addEventListener("click", function(){

        const data = {
            assignments: assignments,
            rallyMembers: RALLIES.map(function(r){ return r.members; }),
            rallyNames: RALLIES.map(function(r){ return r.name; }),
            rallyDescriptions: RALLIES.map(function(r){ return r.description || ""; })
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "battle-map-save.json";
        link.click();

        URL.revokeObjectURL(url);

    });

}

// ---------- Handle Load Project ----------
const loadProjectBtn = document.getElementById("loadProjectBtn");
const loadProjectInput = document.getElementById("loadProjectInput");

if(loadProjectBtn && loadProjectInput){

    loadProjectBtn.addEventListener("click", function(){
        loadProjectInput.click();
    });

    loadProjectInput.addEventListener("change", function(event){

        const file = event.target.files[0];

        if(!file) return;

        const reader = new FileReader();

        reader.onload = function(e){

            try{

                const data = JSON.parse(e.target.result);

                assignments = data.assignments || [];
                selectedAssignments = [];
                selectedTile = null;

                if(data.rallyMembers){
                    data.rallyMembers.forEach(function(members, i){
                        if(!RALLIES[i]) return;
                        RALLIES[i].members = members.map(function(m){
                            if(typeof m === "string") return { name: m, heroes: [], note: "" };
                            return { name: m.name, heroes: m.heroes || [], note: m.note || "" };
                        });
                    });
                } else {
                    RALLIES.forEach(function(r){ r.members = []; });
                }

                if(data.rallyNames){
                    data.rallyNames.forEach(function(name, i){
                        if(RALLIES[i]){
                            RALLIES[i].name = name;
                            const option = document.getElementById("rallyOption-" + i);
                            if(option) option.textContent = name;
                        }
                    });
                }

                if(data.rallyDescriptions){
                    data.rallyDescriptions.forEach(function(desc, i){
                        if(RALLIES[i]) RALLIES[i].description = desc;
                    });
                }

                if(notesTitleInput) notesTitleInput.value = data.notesTitle || "Notes";
                quill.clipboard.dangerouslyPasteHTML((data.notesHTML !== undefined) ? data.notesHTML : "");
                updateNotesPageBreaks();

                updateClearButton();
                updatePlayerListStyles();
                buildRallyOverview();
                drawMap();
                saveAutoSave();

            } catch(error){
                alert("This file could not be read as a valid save file.");
            }

        };

        reader.readAsText(file);

        loadProjectInput.value = "";

    });

}

// ---------- Handle Zoom buttons ----------
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");

if(zoomInBtn){

    zoomInBtn.addEventListener("click", function(){

        SETTINGS.mapHalf = Math.min(MAX_MAP_HALF, SETTINGS.mapHalf + 1);

        updateTileSizeForZoom();
        updateZoomButtons();
        drawMap();

    });

}

if(zoomOutBtn){

    zoomOutBtn.addEventListener("click", function(){

        SETTINGS.mapHalf = Math.max(MIN_MAP_HALF, SETTINGS.mapHalf - 1);

        updateTileSizeForZoom();
        updateZoomButtons();
        drawMap();

    });

}

// ---------- Initial load ----------
measureAndSetCanvasSize();
updateTileSizeForZoom();
updateZoomButtons();
buildRallyOptions();
buildRallyOverview();
restoreNotesOnly();
initializeNotesIfEmpty();
loadPlayerList();
drawMap();
syncEditorToExportSize()