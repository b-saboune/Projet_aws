document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const currentOperandEl = document.getElementById('currentOperand');
    const previousOperandEl = document.getElementById('previousOperand');
    const historyListEl = document.getElementById('historyList');
    const historyPanel = document.getElementById('historyPanel');
    const themeIcon = document.getElementById('themeIcon');
    const angleModeBtn = document.getElementById('angleModeBtn');
    const sciPanel = document.getElementById('scientificPanel');
    const sciToggleIcon = document.getElementById('sciToggleIcon');
    
    // State
    let currentOperand = '0';
    let previousOperand = '';
    let operation = undefined;
    let memory = 0;
    let history = JSON.parse(localStorage.getItem('calcHistory')) || [];
    let isRadian = false; // false = DEG, true = RAD
    let shouldResetScreen = false;

    // Initialize UI
    updateDisplay();
    renderHistory();
    applySavedTheme();

    /** 
     * Core Calculator Methods
     */
    function appendNumber(number) {
        if (currentOperand === '0' && number !== '.') {
            currentOperand = number;
        } else {
            if (number === '.' && currentOperand.includes('.')) return;
            // Prevent numbers from becoming impossibly long on screen
            if (currentOperand.length >= 16 && !shouldResetScreen) return;
            
            if (shouldResetScreen) {
                currentOperand = number;
                shouldResetScreen = false;
            } else {
                currentOperand += number;
            }
        }
    }

    function chooseOperation(op) {
        if (currentOperand === '') return;
        if (previousOperand !== '') {
            compute();
        }
        operation = op;
        previousOperand = currentOperand;
        currentOperand = '';
    }

    function compute() {
        let computation;
        const prev = parseFloat(previousOperand);
        const current = parseFloat(currentOperand);
        
        if (isNaN(prev) || isNaN(current)) return;

        switch (operation) {
            case '+': computation = prev + current; break;
            case '−': computation = prev - current; break;
            case '×': computation = prev * current; break;
            case '÷': 
                if (current === 0) {
                    showError("Erreur (÷0)");
                    return;
                }
                computation = prev / current; 
                break;
            case 'xʸ': computation = Math.pow(prev, current); break;
            default: return;
        }

        computation = precise(computation);
        const expr = `${previousOperand} ${operation} ${currentOperand}`;
        
        currentOperand = computation.toString();
        operation = undefined;
        previousOperand = '';
        shouldResetScreen = true;

        addToHistory(expr, currentOperand);
    }

    function computeScientic(action) {
        const current = parseFloat(currentOperand);
        // We can do pi and e even if current is something, they just replace screen
        if (isNaN(current) && action !== 'pi' && action !== 'e') return;

        let res;
        const toRad = angle => isRadian ? angle : angle * (Math.PI / 180);

        switch (action) {
            case 'sqrt':
                if (current < 0) { showError("Erreur (<0)"); return; }
                res = Math.sqrt(current); break;
            case 'square': res = Math.pow(current, 2); break;
            case 'log': 
                if (current <= 0) { showError("Erreur"); return; }
                res = Math.log10(current); break;
            case 'ln': 
                if (current <= 0) { showError("Erreur"); return; }
                res = Math.log(current); break;
            case 'sin': res = Math.sin(toRad(current)); break;
            case 'cos': res = Math.cos(toRad(current)); break;
            case 'tan': 
                if (Math.abs(Math.cos(toRad(current))) < 1e-10) { showError("Erreur"); return; }
                res = Math.tan(toRad(current)); break;
            case 'pi': res = Math.PI; shouldResetScreen = true; break;
            case 'e': res = Math.E; shouldResetScreen = true; break;
            case 'fact':
                if (current < 0 || !Number.isInteger(current) || current > 170) { showError("Erreur"); return; }
                res = factorial(current); break;
        }

        if (res !== undefined) {
            let expr = '';
            if (action === 'pi') expr = 'π';
            else if (action === 'e') expr = 'e';
            else expr = `${action}(${currentOperand})`;

            res = precise(res);
            currentOperand = res.toString();
            shouldResetScreen = true;
            if (action !== 'pi' && action !== 'e') addToHistory(expr, currentOperand);
            updateDisplay();
        }
    }

    function computeAction(action) {
        switch(action) {
            case 'clear':
                currentOperand = '0';
                previousOperand = '';
                operation = undefined;
                shouldResetScreen = false;
                break;
            case 'delete':
                if (shouldResetScreen) break;
                currentOperand = currentOperand.toString().slice(0, -1);
                if (currentOperand === '' || currentOperand === '-') currentOperand = '0';
                break;
            case 'percent':
                const curr = parseFloat(currentOperand);
                if (isNaN(curr)) return;
                currentOperand = precise(curr / 100).toString();
                shouldResetScreen = true;
                break;
            case 'calculate':
                compute();
                break;
        }
    }

    function handleMemory(action) {
        const curr = parseFloat(currentOperand) || 0;
        switch(action) {
            case 'mc': memory = 0; break;
            case 'mr': currentOperand = memory.toString(); shouldResetScreen = true; break;
            case 'm-plus': memory += curr; shouldResetScreen = true; break;
            case 'm-minus': memory -= curr; shouldResetScreen = true; break;
        }
        updateDisplay();
    }

    /**
     * Helpers
     */
    function updateDisplay() {
        if (currentOperand.length > 12) {
            currentOperandEl.style.fontSize = '2.2rem';
        } else if (currentOperand.length > 8) {
            currentOperandEl.style.fontSize = '2.8rem';
        } else {
            currentOperandEl.style.fontSize = '3.2rem';
        }

        currentOperandEl.innerText = formatNumber(currentOperand);
        if (operation != null) {
            previousOperandEl.innerText = `${formatNumber(previousOperand)} ${operation}`;
        } else {
            previousOperandEl.innerText = previousOperand;
        }
    }

    function formatNumber(number) {
        if (number === '-' || typeof number === 'string' && number.includes('Erreur')) return number;
        const stringNumber = number.toString();
        const integerDigits = parseFloat(stringNumber.split('.')[0]);
        const decimalDigits = stringNumber.split('.')[1];
        let integerDisplay;
        
        if (isNaN(integerDigits)) {
            integerDisplay = '';
        } else {
            // we use format mostly for commas, etc.
            integerDisplay = integerDigits.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
        }
        
        if (decimalDigits != null) {
            return `${integerDisplay},${decimalDigits}`;
        } else {
            return integerDisplay;
        }
    }

    function precise(num) {
        // Fix typical JS floating point nonsense by converting to 14 places of precision,
        // then back to a float so trailing zeros are chopped
        return parseFloat(num.toPrecision(14));
    }

    function factorial(n) {
        if (n === 0 || n === 1) return 1;
        let res = 1;
        for (let i = 2; i <= n; i++) res *= i;
        return res;
    }

    function showError(msg) {
        currentOperand = msg;
        shouldResetScreen = true;
        updateDisplay();
        setTimeout(() => {
            currentOperand = '0';
            updateDisplay();
        }, 1500);
    }

    /**
     * History & Storage
     */
    function addToHistory(expr, result) {
        history.unshift({ expr, result });
        if (history.length > 25) history.pop();
        localStorage.setItem('calcHistory', JSON.stringify(history));
        renderHistory();
    }

    function renderHistory() {
        historyListEl.innerHTML = '';
        history.forEach(item => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.innerHTML = `
                <div class="history-expr">${item.expr} =</div>
                <div class="history-result">${formatNumber(item.result)}</div>
            `;
            li.addEventListener('click', () => {
                currentOperand = item.result.toString();
                shouldResetScreen = true;
                updateDisplay();
                // If we're on mobile/tablet view (history overlays the app), close it after selecting
                if (window.innerWidth <= 720) {
                    historyPanel.classList.add('hidden');
                }
            });
            historyListEl.appendChild(li);
        });
    }

    document.getElementById('clearHistoryBtn').addEventListener('click', () => {
        history = [];
        localStorage.removeItem('calcHistory');
        renderHistory();
    });

    /**
     * UI Interactions & Event Binding
     */
    // Event delegation for the main keypad
    document.querySelector('.calculator').addEventListener('click', (e) => {
        const btn = e.target.closest('.btn');
        const memBtn = e.target.closest('.mem-btn');
        
        if (btn) {
            createRipple(e, btn);
            // small tactile feedback if supported in browser/mobile context: 
            if (navigator.vibrate) navigator.vibrate(20);

            if (btn.classList.contains('number')) appendNumber(btn.dataset.value);
            else if (btn.classList.contains('operator')) chooseOperation(btn.dataset.operator);
            else if (btn.classList.contains('action')) computeAction(btn.dataset.action);
            else if (btn.classList.contains('sci')) {
                if(btn.dataset.action === 'toggle-angle') {
                    isRadian = !isRadian;
                    btn.innerText = isRadian ? 'RAD' : 'DEG';
                } else if(btn.dataset.action === 'power') {
                    chooseOperation('xʸ');
                } else if(btn.dataset.action === 'paren-left' || btn.dataset.action === 'paren-right') {
                    showError("Non implémenté");
                } else {
                    computeScientic(btn.dataset.action);
                }
            }
            updateDisplay();
        }

        if (memBtn) {
            handleMemory(memBtn.dataset.action);
        }
    });

    // Toggle Scientific Panel
    document.getElementById('sciToggleBtn').addEventListener('click', (e) => {
        const btn = e.currentTarget;
        btn.classList.toggle('open');
        if (sciPanel.classList.contains('show')) {
            sciPanel.classList.remove('show');
        } else {
            sciPanel.classList.add('show');
        }
    });

    // Toggle History Drawer
    document.getElementById('historyToggle').addEventListener('click', () => {
        historyPanel.classList.toggle('hidden');
    });

    // Theme Toggle
    document.getElementById('themeToggle').addEventListener('click', () => {
        const doc = document.documentElement;
        const isDark = doc.getAttribute('data-theme') === 'dark';
        
        doc.setAttribute('data-theme', isDark ? 'light' : 'dark');
        themeIcon.className = isDark ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
        localStorage.setItem('calcTheme', isDark ? 'light' : 'dark');
    });

    function applySavedTheme() {
        // Assume default dark is handled by HTML attr if nothing is saved
        const savedTheme = localStorage.getItem('calcTheme');
        if (savedTheme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            themeIcon.className = 'fa-solid fa-moon';
        }
    }

    // Ripple Micro-animation generator
    function createRipple(event, button) {
        const circle = document.createElement('span');
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;

        const rect = button.getBoundingClientRect();
        // Fallback or exact coordinates
        const x = event.clientX ? event.clientX - rect.left - radius : 0;
        const y = event.clientY ? event.clientY - rect.top - radius : 0;

        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${x}px`;
        circle.style.top = `${y}px`;
        circle.classList.add('ripple');

        const existingRipple = button.querySelector('.ripple');
        if (existingRipple) {
            existingRipple.remove();
        }
        button.appendChild(circle);
    }

    // Keyboard support
    document.addEventListener('keydown', (e) => {
        // Filter out function keys, arrows, etc. that shouldn't trigger calc inputs
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        
        if (e.key >= '0' && e.key <= '9') appendNumber(e.key);
        if (e.key === '.' || e.key === ',') appendNumber('.');
        if (e.key === '+' || e.key === '-') chooseOperation(e.key === '-' ? '−' : '+');
        if (e.key === '*') chooseOperation('×');
        if (e.key === '/') chooseOperation('÷');
        if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); computeAction('calculate'); }
        if (e.key === 'Backspace') computeAction('delete');
        if (e.key === 'Escape') computeAction('clear');
        if (e.key === '%') computeAction('percent');
        
        updateDisplay();
    });
});
