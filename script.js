function initGameState({ width, height, minesCount}) {
    const state = {
        minesCount,
        minesLeft: minesCount,
        isGameOver: false,
        fieldsLeft: width * height,
        fields: Array.from({ length: height }, () =>
            Array(width).fill(0)
        ),
        timerStart: undefined,
        timerInterval: undefined,
    };

    insertMines(state, minesCount);

    return state;
}

function insertMines(state, minesCount) {
    const size = state.fieldsLeft;
    const indices = new Set();
    while (indices.size < minesCount) {
        const index = Math.floor(Math.random() * size);
        indices.add(index);
    }

    const width = state.fields[0].length;
    for (const index of indices) {
        const y = Math.floor(index / width);
        const x = index % width;

        state.fields[y][x] = -1;
        updateMineNeighbors(state, x, y);
    }

    state.fieldsLeft -= minesCount;
}

function updateMineNeighbors(state, mineX, mineY) {
    const { fields } = state;
    const height = fields.length;
    const width = fields[0].length;

    const startX = Math.max(0, mineX - 1);
    const startY = Math.max(0, mineY - 1);
    const endX = Math.min(width - 1, mineX + 1);
    const endY = Math.min(height - 1, mineY + 1);

    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            if (fields[y][x] !== -1) {
                fields[y][x]++;
            }
        }
    }
}

function createFieldButtons(view, state) {
    view.grid.innerHTML = '';

    const fragment = new DocumentFragment();

    const height = state.fields.length;
    const width = state.fields[0].length;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const button = document.createElement('button');

            button.dataset.x = x;
            button.dataset.y = y;
            
            fragment.appendChild(button);
        }
    }

    view.grid.style.gridTemplateColumns = `repeat(${width}, 1fr)`;
    view.grid.style.gridTemplateRows = `repeat(${height}, 1fr)`;

    view.grid.append(fragment);
}

function getButtonPosition(button) {
    return {
        x: Number(button.dataset.x),
        y: Number(button.dataset.y)
    };
}

function initView(view, state) {
    view.reset.removeAttribute('class');
    view.minesLeft.innerText = `${state.minesLeft}`.padStart(3, '0');
    view.timer.innerText = '000';

    for (const button of view.grid.children) {
        button.innerText = '';
        button.disabled = false;
        button.removeAttribute('class');
    }
}

function restartGame(view, state, widthInput, heightInput, minesInput) {
    clearInterval(state.timerInterval);

    const newState = initGameState(
        gridValues(widthInput, heightInput, minesInput)
    );

    Object.assign(state, newState);
    createFieldButtons(view, state);
    initView(view, state);
}

function startTimer(view, state) {
    if(state.timerInterval) {
        return;
    }

    state.timerStart = new Date();
    state.timerInterval = setInterval(() => {
        const secondsElapsed = Math.floor(
            (new Date() - state.timerStart) / 1000
        );

        view.timer.innerText = `${secondsElapsed}`.padStart(3, '0');
    }, 1000);
}

function handleGameEvents(view, state, widthInput, heightInput, minesInput) {
    view.reset.addEventListener('click', () =>
        restartGame(view, state, widthInput, heightInput, minesInput)
    );
    view.grid.addEventListener('contextmenu', (event) => 
        event.preventDefault()
    );
    view.grid.addEventListener('mousedown', (event) => {
        if (state.isGameOver) {
            return;
        }

        const button = event.target;
        if (button.tagName !== 'BUTTON') {
            return;
        }

        startTimer(view, state);
        if (event.button === 2) {
            handleFieldFlag(view, state, button);
        } else {
            handleFieldReview(view, state, button);
        }

        console.log(button);
    });
}

function handleFieldFlag(view, state, button) {
    if (button.disabled) {
        return;
    }

    const isFlagged = button.classList.toggle('flagged');

    state.minesLeft += isFlagged ? -1 : 1;
    view.minesLeft.innerText = `${state.minesLeft}`.padStart(3, '0');
}

function handleFieldReview(view, state, button) {
    const {x, y} = getButtonPosition(button);

    if(button.classList.contains('flagged')) {
        return;
    }

    switch(state.fields[y][x]) {
        case -1:
            if (revealField(state, button)) {
                button.classList.add('exploded');
                view.reset.className = 'lost';
                gameOver(view, state);
            }
            break;

        case 0:
            revealEmptyArea(view.grid, state, x, y);
            break;
        
        default:
            revealField(state, button);
    }

    if (state.fieldsLeft === 0) {
        view.reset.className = 'won';
        gameOver(view, state);
    }
}

function revealEmptyArea(grid, state, x, y) {
    const height = state.fields.length;
    const width = state.fields[0].length;

    const visited = new Set();

    function visit(i, j) {
        if (i < 0 || i >= width || j < 0 || j >= height) {
            return;
        }

        const index = j * width + i;
        if (visited.has(index)) {
            return;
        }
        visited.add(index);

        revealField(state, grid.children[index]);
        if (state.fields[j][i] !== 0) {
            return;
        }

        visit(i - 1, j);
        visit(i + 1, j);
        visit(i, j - 1);
        visit(i, j + 1);
    }

    visit(x,y);
}

function gameOver(view, state) {
    clearInterval(state.timerInterval);
    state.isGameOver = true;

    for (const button of view.grid.children) {
        const { x, y } = getButtonPosition(button);

        if (state.fields[y][x] === -1) {
            revealField(state, button);
        }
    }
}

function revealField(state, button) {
    if  (button.disabled) {
        return false;
    }

    button.disabled = true;
    button.classList.remove('flagged');

    const { x, y } = getButtonPosition(button);
    const value = state.fields[y][x]
    
    switch(state.fields[y][x]) {
        case -1:
            button.classList.add('mine');
            break;

        case 0:
            state.fieldsLeft--;
            break;
        
        default:
            button.className = `value-${value}`;
            button.innerText = value;
            state.fieldsLeft--;
    }

    return true;
}

function gridValues(widthInput, heightInput, minesInput) {
    const width = Math.min(20, Math.max(5, Number(widthInput.value) || 10));
    const height = Math.min(20, Math.max(5, Number(heightInput.value) || 12));
    const minesCap = Math.min(99, width * height - 1);
    const minesCount = Math.min(minesCap, Math.max(1, Number(minesInput.value) || 12 ));

    return {
        width,
        height,
        minesCount,
    };
}

function main() {
    const widthInput = document.getElementById('width');
    const heightInput = document.getElementById('height');
    const minesInput = document.getElementById('mines');

    const view = {
        minesLeft: document.getElementById('mines-left'),
        reset: document.getElementById('reset'),
        timer: document.getElementById('timer'),
        grid: document.getElementById('grid'),
    };

    const state = initGameState(gridValues(widthInput, heightInput, minesInput));

    widthInput.addEventListener('input', () => restartGame(view, state, widthInput, heightInput, minesInput));
    heightInput.addEventListener('input', () => restartGame(view, state, widthInput, heightInput, minesInput));
    minesInput.addEventListener('input', () => restartGame(view, state, widthInput, heightInput, minesInput));

    createFieldButtons(view, state);
    initView(view, state);
    handleGameEvents(view, state, widthInput, heightInput, minesInput);
}

main();