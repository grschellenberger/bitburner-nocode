export const infiltrationGames = [
    {
        name: "type it backward",
        init: function (screen) {
            const lines = getLines(getEl(screen, "p"));
            state.game.data = lines[0].split("");
        },
        play: function (screen) {
            if (!state.game.data || !state.game.data.length) {
                delete state.game.data;
                return;
            }
            pressKey(state.game.data.shift());
        },
    },
    {
        name: "type it",
        init: function (screen) {
            const lines = getLines(getEl(screen, "p"));
            state.game.data = lines[0].split("");
        },
        play: function (screen) {
            if (!state.game.data || !state.game.data.length) {
                delete state.game.data;
                return;
            }
            pressKey(state.game.data.shift());
        },
    },
    {
        name: "enter the code",
        init: function (screen) { },
        play: function (screen) {
            const h4 = getEl(screen, "h4");
            const code = h4[1].textContent;

            switch (code) {
                case "↑": pressKey("w"); break;
                case "↓": pressKey("s"); break;
                case "←": pressKey("a"); break;
                case "→": pressKey("d"); break;
            }
        },
    },
    {
        name: "close the brackets",
        init: function (screen) {
            const data = getLines(getEl(screen, "p"));
            const brackets = data.join("").split("");
            state.game.data = [];

            for (let i = brackets.length - 1; i >= 0; i--) {
                const char = brackets[i];
                switch (char) {
                    case "<": state.game.data.push(">"); break;
                    case "(": state.game.data.push(")"); break;
                    case "{": state.game.data.push("}"); break;
                    case "[": state.game.data.push("]"); break;
                }
            }
        },
        play: function (screen) {
            if (!state.game.data || !state.game.data.length) {
                delete state.game.data;
                return;
            }
            pressKey(state.game.data.shift());
        },
    },
    {
        name: "attack when his guard is down",
        init: function (screen) {
            state.game.data = "wait";
            state.game.waitFrames = 15; // Add delay for timing
        },
        play: function (screen) {
            const data = getLines(getEl(screen, "h4"));
            
            if (state.game.waitFrames > 0) {
                state.game.waitFrames--;
                return;
            }

            if ("attack" === state.game.data) {
                pressKey(" ");
                state.game.data = "done";
            }

            // Attack in next frame - instant attack sometimes fails
            if ('wait' === state.game.data && -1 !== data.indexOf("Preparing?")) {
                state.game.data = "attack";
            }
        },
    },
    {
        name: "say something nice about the guard",
        init: function (screen) { },
        play: function (screen) {
            const correct = [
                "affectionate", "agreeable", "bright", "charming", "creative",
                "determined", "energetic", "friendly", "funny", "generous",
                "gentle", "happy", "honest", "kind", "likable", "nice",
                "patient", "polite", "sincere"
            ];
            const word = getLines(getEl(screen, "h4"))[1];
            
            if (correct.includes(word.toLowerCase())) {
                pressKey(" ");
            }
        },
    },
    {
        name: "remember all the mines",
        waitFrames: 30,  // Extra time to memorize
        init: function (screen) {
            state.game.data = [];
            const rows = getEl(screen, "p");
            rows.forEach((row, y) => {
                const cells = row.textContent.split("");
                cells.forEach((cell, x) => {
                    if (cell === "1") {
                        state.game.data.push({x, y});
                    }
                });
            });
        },
        play: function (screen) {
            if (this.waitFrames > 0) {
                this.waitFrames--;
                return;
            }
            
            if (!state.game.data || !state.game.data.length) {
                delete state.game.data;
                return;
            }

            const pos = state.game.data.shift();
            const rows = getEl(screen, "p");
            if (rows[pos.y].textContent[pos.x] === "0") {
                pressKey(" ");
            }
        },
    },
    {
        name: "match the symbols",
        init: function (screen) {
            state.game.data = getLines(getEl(screen, "h5"))[0];
        },
        play: function (screen) {
            const symbols = getLines(getEl(screen, "h5"));
            if (symbols.includes(state.game.data)) {
                pressKey(" ");
            }
        },
    },
    {
        name: "cut the wires with the following properties",
        init: function (screen) {
            state.game.data = {
                rules: getLines(getEl(screen, "p")),
                currentWire: 0
            };
        },
        play: function (screen) {
            const wires = getLines(getEl(screen, "h4"));
            const wire = wires[state.game.data.currentWire];
            
            if (!wire) {
                delete state.game.data;
                return;
            }

            let shouldCut = state.game.data.rules.every(rule => {
                const [color, property] = rule.split(" wire ");
                if (wire.toLowerCase().includes(color)) {
                    return property.includes("cut");
                }
                return property.includes("don't cut");
            });

            if (shouldCut) {
                pressKey(" ");
            }
            
            state.game.data.currentWire++;
        },
    }
];

// Helper functions
function getEl(screen, tag) {
    return Array.from(screen.getElementsByTagName(tag));
}

function getLines(elements) {
    return elements.map(e => e.textContent);
}

function pressKey(key) {
    const doc = eval('document');
    const events = [
        new KeyboardEvent("keydown", { key, bubbles: true }),
        new KeyboardEvent("keypress", { key, bubbles: true }),
        new KeyboardEvent("keyup", { key, bubbles: true })
    ];
    events.forEach(event => doc.dispatchEvent(event));
}

// Game detection and management
export function detectGame(screen) {
    const title = screen.querySelector("h2")?.textContent.toLowerCase();
    return infiltrationGames.find(game => game.name === title);
}

export async function playGame(ns, state, screen) {
    try {
        const game = detectGame(screen);
        if (!game) return;

        // Initialize new game
        if (state.currentGame !== game.name) {
            state.currentGame = game.name;
            state.game = {};
            game.init(screen);
            state.stats.gamesAttempted++;
        }

        // Handle game timing
        if (game.waitFrames && game.waitFrames > 0) {
            game.waitFrames--;
            return;
        }

        // Play game
        await game.play(screen);

    } catch (error) {
        await logError("play_game", error);
        state.errors.gameErrors[state.currentGame] = 
            (state.errors.gameErrors[state.currentGame] || 0) + 1;
    }
}
