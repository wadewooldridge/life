/**
 *  lifecode.js
 *      JavaScript code for life 0.2.
 *      Copyright (C) 2016 Wade R. Wooldridge.
 *      All rights reserved.
 */

/* Constants. */
var MIN_COL_COUNT =  10;
var DEF_COL_COUNT =  20;
var MAX_COL_COUNT = 100;
var MIN_ROW_COUNT =  10;
var DEF_ROW_COUNT =  20;
var MAX_ROW_COUNT = 100;
var MIN_STEP_DELAY = 0.0;
var DEF_STEP_DELAY = 0.5;
var MAX_STEP_DELAY = 2.0;

var ALIVE_COLOR = "darkblue";
var DEAD_COLOR = "white";

var PATTERNS = [];

/* Global data. */
var gColCount = DEF_COL_COUNT;
var gRowCount = DEF_ROW_COUNT;
var gWorldWraps = true;
var gStopOnEmptyWorld = true;
var gStepCount = 0;
var gStepDelay = DEF_STEP_DELAY;
var gRunning = false;
var gStartButtonColor = "";
var gTimer = 0;

/* Main objects that represent the world.  These are done in a single-dimension array instead of a two-dimension
    array to make lookup simpler. This allows, for example, the list of neighbor cells to be an array of indices,
    instead of an array of two-number coordinates. */
var gaWorld = [];

/* Initial setup of world; needs to happen after body load to allow access to all elements. */
/* Question: Is this the best practice mechanism to do this, for example, for setting the size of the world-table? */
$(document).ready(function(){
    console.log('Document ready: perfoming setup.');
    rebuildWorld();
    PATTERNS = [BLOCK, BEEHIVE, LOAF, BOAT, BLINKER, TOAD, BEACON, GLIDER, LWSS];

    /* Set up column count and row count range inputs. */
    var colCountRange = $("#col-count-range")/*.attr({
        min: MIN_COL_COUNT,
        max:
    });*/
    colCountRange.attr('min',MIN_COL_COUNT);
    colCountRange.max = MAX_COL_COUNT;
    colCountRange.val(DEF_COL_COUNT);
    colCountRange.change(onColCountChange);
    onColCountChange();

});

/* Callback handlers for controls. */
function onClearButton() {
    console.log("onClearButton");
    stopRunning();

    /* Clear the gaWorld array, then push that into the world-table. */
    clearWorldArray();
    updateWorldTable();
}

function onColCountChange() {
    var rangeElement = document.getElementById("col-count-range");
    var paragraphElement = document.getElementById("col-count-paragraph");
    var newColCount = rangeElement.value;

    console.log("onColCountChange: newColCount=", newColCount);
    stopRunning();
    paragraphElement.innerHTML = "Column count: " + newColCount;

    /* Save the new value as a global, and rebuild gaWorld accordingly. */
    gColCount = newColCount;
    rebuildWorld();
}

function onPatternsButton() {
    console.log("onPatternsButton");
    stopRunning();

    /* Clear the gaWorld array, so the patterns are cleanly drawn. */
    clearWorldArray();

    /* The patterns are 10x10, so fill each potential 10x10 area of the screen with a random pattern. */
    var col10Count = Math.floor(gColCount / 10);
    var row10Count = Math.floor(gRowCount / 10);

    for (var col10Num = 0; col10Num < col10Count; col10Num++) {
        for (var row10Num = 0; row10Num < row10Count; row10Num++) {
            var colBase = col10Num * 10;
            var rowBase = row10Num * 10;

            /* Pick a random pattern. */
            var pattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];

            /* Step through the 10x10 pattern and copy it onto the 10x10 area of gaWorld. */
            for (var c = 0; c < 10; c++) {
                for (var r = 0; r < 10; r++) {
                    var worldIndex = ((rowBase + r) * gColCount) + colBase + c;
                    var patternIndex = (r * 10) + c;
                    gaWorld[worldIndex].curAlive = (pattern[patternIndex] == "1");
                }
            }
        }
    }

    /* Push the new data out to the world-table on the screen. */
    updateWorldTable();
}

function onRandom10Button() {
    console.log("onRandom10Button");

    /* Set random 10% of cells alive. Purposely doesn't clear, so you can add 10% cumulatively. */
    for (var i = 0; i < (gaWorld.length / 10); i++) {
        var index = Math.floor(Math.random() * gaWorld.length);
        gaWorld[index].curAlive = true;
    }

    /* Push the new data out to the world-table on the screen. */
    updateWorldTable();
}

function onRowCountChange() {
    var rangeElement = document.getElementById("row-count-range");
    var paragraphElement = document.getElementById("row-count-paragraph");
    var newRowCount = rangeElement.value;

    console.log("onRowCountChange: newRowCount=", newRowCount);
    stopRunning();
    paragraphElement.innerHTML = "Row count: " + newRowCount;

    /* Save the new value as a global, and rebuild gaWorld accordingly. */
    gRowCount = newRowCount;
    rebuildWorld();
}

function onStartStopButton() {
    if (gRunning) {
        console.log("onStartStopButton: stopping");
        stopRunning();
    }
    else {
        console.log("onStartStopButton: starting");
        startRunning();
    }
}

function onStepDelayChange() {
    var rangeElement = document.getElementById("step-delay-range");
    var paragraphElement = document.getElementById("step-delay-paragraph");
    var newStepDelay = rangeElement.value;

    console.log("onStepDelayChange: newStepDelay=", newStepDelay);
    paragraphElement.innerHTML = "Step delay seconds: " + newStepDelay;

    /* Save the new value as a global; don't need to rebuild gaWorld. */
    gStepDelay = newStepDelay;

    /* If we are currently running, stop and recreate the interval timer. */
    if (gRunning) {
        console.log("onStepDelayChange: restarting the timer.");
        clearInterval(gTimer);
        gTimer = setInterval(stepOnce, gStepDelay * 1000);
    }
}

function onStepOnceButton() {
    console.log("onStepOnceButton");
    stepOnce();
}

function onStopEmptyChange() {
    console.log("onStopEmptyChange")
}

function onWorldWrapsChange() {
    console.log("onWorldWrapsChange");
    stopRunning();
}

/* Helper functions for controls. */
function startRunning() {
    if (gRunning) {
        console.log("startRunning: already running.");
    }
    else {
        console.log("startRunning: starting.");
        /* Change the color and text of the start/stop button. */
        var elem = document.getElementById("btn_start_stop");
        /* Question: Is there a better way to save and restore the original Bootstrap color? */
        gStartButtonColor = elem.style.backgroundColor;         // Save Bootstrap's color.
        elem.style.backgroundColor = "red";
        elem.innerHTML = "Stop";

        /* Clear the gStepCount. */
        gStepCount = 0;

        /* Clear the graph. */
        /* TBD. */

        /* Start the interval timer. */
        gTimer = setInterval(stepOnce, gStepDelay * 1000);

        /* Set the global flag. */
        gRunning = true;
    }
}

function stopRunning() {
    if (gRunning) {
        console.log("stopRunning: stopping.");
        /* Change the color and text of the start/stop button. */
        var elem = document.getElementById("btn_start_stop");
        elem.style.backgroundColor = gStartButtonColor;
        elem.innerHTML = "Start";

        /* Stop the interval timer. */
        clearInterval(gTimer);
        gTimer = 0;

        /* Set the global flag. */
        gRunning = false;
    }
    else {
        console.log("stopRunning: not currently running.")
    }
}

/* Question: Typical format of function headers? */
/* World setup: rebuild the world based on the existing parameters.
*       Note that this builds an empty world-table, and its values will be filled later.
*       This can be called during page load, or any time a world size or wrap value is changed.
*/
function rebuildWorld() {
    console.log("rebuildWorld: ", gColCount, "x", gRowCount, ": wrap=", gWorldWraps);

    /* Delete all world data. */
    /* Question: Is this sufficient to free allocated memory, or is there a better way? */
    /* Question: Should this be pre-allocated as Array(rowCount * colCount)? */
    gaWorld = [];

    /* Populate an object for each cell with the basic fields. */
    for (var rowNum = 0; rowNum < gRowCount; rowNum++) {
        for (var colNum = 0; colNum < gColCount; colNum++) {
            var index = (rowNum * gColCount) + colNum;
            var cellObject = {curAlive: false, nextAlive: false};
            cellObject.neighbors = buildNeighborArray(rowNum, colNum);
            gaWorld[index] = cellObject;
        }
    }

    /* Delete all existing rows (and implicitly cols) from world-table. */
    var worldTable = document.getElementById("world-table");
    var rowCount = worldTable.rows.length;
    for (rowNum = rowCount - 1; rowNum >= 0; rowNum--) {
        console.log("Deleting worldTable row ", rowNum);
        worldTable.deleteRow(rowNum);
    }

    /* Question: Are there issues about duplicate declarations of variables? */
    /* Populate the world-table rows and columns. */
    for (rowNum = 0; rowNum < gRowCount; rowNum++) {
        console.log("Building row ", rowNum);
        var tr = document.createElement("TR");

        for (colNum = 0; colNum < gColCount; colNum++) {
            var td = document.createElement("TD");
            td.appendChild(document.createTextNode(""));
            td.style.backgroundColor = DEAD_COLOR;
            tr.appendChild(td);
        }
        worldTable.appendChild(tr);
    }
}

/* buildNeighborArray: Given a row and column number for a cell, build an array of up to eight "neighbors": array
    indices for the neighbor cells of that cell.  If world wrap is on, there should be eight neighbor cells
    for each cell.  If world wrap is off, there will be as little as three neighbors in the corners, six neighbors
    on non-corner edges, and eight neighbors for center cells.  Doing all of these checks now to build the 
    neighbors array saves having to do the checks during step processing. */
function buildNeighborArray(rowNum, colNum) {
    /* Question: Is there any performance advantage to "loading" local variables? */
    var wrap = gWorldWraps;
    var neighbors = [];
    var rows = [rowNum];        // Current row is always valid.
    var cols = [colNum];        // Current col is always valid.

    /* Add row-1 and row+1, wrapping as necessary. */
    if (rowNum == 0) {
        if (wrap) {
            rows.push(gRowCount - 1);       // Wrap row -1 to highest row.
        }
        rows.push(rowNum + 1);
    }
    else if (rowNum == gRowCount - 1) {
        if (wrap) {
            rows.push(0);                   // Wrap highest row + 1 to row 0.
        }
        rows.push(rowNum - 1);
    }
    else {
        rows.push(rowNum - 1);              // In center, get both neighbor rows.
        rows.push(rowNum + 1);
    }

    /* Add col-1 and col+1, wrapping as necessary. */
    if (colNum == 0) {
        if (wrap) {
            cols.push(gColCount - 1);       // Wrap col -1 to highest col.
        }
        cols.push(colNum + 1);
    }
    else if (colNum == gColCount - 1) {
        if (wrap) {
            cols.push(0);                   // Wrap highest col + 1 to col 0.
        }
        cols.push(colNum - 1);
    }
    else {
        cols.push(colNum - 1);              // In center, get both neighbor cols.
        cols.push(colNum + 1);
    }

    /* Now go through each combination of rows and cols, and the only one left to filter out
       is when both row and col match the existing cell (i.e. can't be a neighbor of itself. */
    for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        var newRowNum = rows[rowIndex];
        for (var colIndex = 0; colIndex < cols.length; colIndex++) {
            var newColNum = cols[colIndex];
            if (newColNum != colNum ||
                newRowNum != rowNum) {
                neighbors.push((newRowNum * gColCount) + newColNum);
            }
        }
    }
    return neighbors;
}

/* clearWorldArray: Clear all "alive" values in gaWorld. */
function clearWorldArray() {
    console.log("clearWorldArray");
    for (var i = 0; i < (gColCount * gRowCount); i++) {
        gaWorld[i].curAlive = false;
        gaWorld[i].nextAlive = false;
    }
}

/* World operation: step once.  Main handler for world update. */
function stepOnce() {
    console.log("stepOnce");
    var isAlive;
    var aliveCount = 0;
    var i;

    /* Part 1: Update all the nextAlive values based on current neighbor states. */
    for (i = 0; i < gaWorld.length; i++){
        var neighbors = gaWorld[i].neighbors;
        var neighborsAlive = 0;

        /* Part 1a: For this cell, count how many neighbors are alive. */
        for (var n = 0; n < neighbors.length; n++) {
            if (gaWorld[neighbors[n]].curAlive) {
                neighborsAlive++;
            }
        }

        /* Part 1b: For the cell, based on curAlive and neighborsAlive, set nextAlive. */
        if (gaWorld[i].curAlive) {
            isAlive = (neighborsAlive == 2 || neighborsAlive == 3);
        }
        else {
            isAlive = (neighborsAlive == 3);
        }
        gaWorld[i].nextAlive = isAlive;
        if (isAlive) {
            aliveCount++;
        }
    }

    /* Part 2: Move all the nextAlive values back to the curAlive values. */
    for (i = 0; i < gaWorld.length; i++) {
        gaWorld[i].curAlive = gaWorld[i].nextAlive;
    }

    /* Part 3: Push the new data out to the world-table on the screen. */
    updateWorldTable();

    /* Part 4: Update the gStepCount and the graph. */
    gStepCount++;
    updateGraph(gStepCount, aliveCount);

    /* Part 5: Check if we are now empty, and stop looping if so.
       TBD: Stop if the count doesn't change for n steps, to prevent blinkers. */
    if (gRunning && gStopOnEmptyWorld && (aliveCount == 0)) {
        console.log("Stopping based on empty world.");
        stopRunning();
    }
}

function updateGraph(stepNum, aliveCount) {
    var worldSize = gColCount * gRowCount;
    var alivePercent = Math.round(aliveCount * 100 / worldSize);
    var message = "Step: " + stepNum + " = " + aliveCount + ' / ' + worldSize + " ( " + alivePercent + "%)";
    console.log("updateGraph: ", message);

    /* TBD: This is currently updating text in a paragraph; eventually we want it to plot over time. */
    var paragraphElement = document.getElementById("graph-paragraph");
    paragraphElement.innerHTML = message;
}

function updateWorldTable() {
    console.log("updateWorldTable");
    var worldTable = document.getElementById("world-table");

    for (var rowNum = 0; rowNum < gRowCount; rowNum++) {
        var tr = worldTable.rows[rowNum];
        for (var colNum = 0; colNum < gColCount; colNum++) {
            var td = tr.cells[colNum];
            if (gaWorld[(rowNum * gColCount) + colNum].curAlive) {
                td.style.backgroundColor = ALIVE_COLOR;
            }
            else {
                td.style.backgroundColor = DEAD_COLOR;
            }
        }
    }
}

/* These 10x10 patterns can be used to set up interesting starting configurations. */
var BLOCK =
    "0000000000" +
    "0011000000" +
    "0011000000" +
    "0000000000" +
    "0000000000" +
    "0000000000" +
    "0000001100" +
    "0000001100" +
    "0000000000" +
    "0000000000";

var BEEHIVE =
    "0000000000" +
    "0000011000" +
    "0000100100" +
    "0000011000" +
    "0000000000" +
    "0000000000" +
    "0000100000" +
    "0001010000" +
    "0001010000" +
    "0000100000";

var LOAF =
    "0000000000" +
    "0000000000" +
    "0000000000" +
    "0000110000" +
    "0001001000" +
    "0000101000" +
    "0000010000" +
    "0000000000" +
    "0000000000" +
    "0000000000";

var BOAT =
    "0000000000" +
    "0011000000" +
    "0010100000" +
    "0001000000" +
    "0000000000" +
    "0000000000" +
    "0000011000" +
    "0000101000" +
    "0000010000" +
    "0000000000";

var BLINKER =
    "0000000000" +
    "0111000000" +
    "0000000100" +
    "0000000100" +
    "0000000100" +
    "0010000000" +
    "0010000000" +
    "0010000000" +
    "0000011100" +
    "0000000000";

var TOAD =
    "0000000000" +
    "0011100000" +
    "0001110000" +
    "0000000000" +
    "0000000000" +
    "0000010000" +
    "0000011000" +
    "0000011000" +
    "0000001000" +
    "0000000000";

var BEACON =
    "0000000000" +
    "0000000000" +
    "0000000000" +
    "0001100000" +
    "0001100000" +
    "0000011000" +
    "0000011000" +
    "0000000000" +
    "0000000000" +
    "0000000000";

var GLIDER =
    "0000000000" +
    "0000000000" +
    "0000010000" +
    "0001010000" +
    "0000110000" +
    "0000000000" +
    "0000000000" +
    "0000000000" +
    "0000000000" +
    "0000000000";

var LWSS =
    "0000000000" +
    "0000000000" +
    "0001111000" +
    "0010001000" +
    "0000001000" +
    "0010010000" +
    "0000000000" +
    "0000000000" +
    "0000000000" +
    "0000000000";

