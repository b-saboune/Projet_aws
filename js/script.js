document.addEventListener('DOMContentLoaded', () => {
    // ---- Elements ----
    const currentOperandEl = document.getElementById('currentOperand');
    const previousOperandEl = document.getElementById('previousOperand');
    const historyListEl = document.getElementById('historyList');

    // Drawers & Panels
    const historyPanel = document.getElementById('historyPanel');
    const sciPanel = document.getElementById('scientificPanel');
    const featurePanel = document.getElementById('featurePanel');

    // Toggles
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const historyToggle = document.getElementById('historyToggle');
    const sciToggleBtn = document.getElementById('sciToggleBtn');
    const sciToggleIcon = document.getElementById('sciToggleIcon');
    const graphToggle = document.getElementById('graphToggle');
    const eqToggle = document.getElementById('eqToggle');
    const closeFeatureBtn = document.getElementById('closeFeatureBtn');

    // State
    let currentOperand = '0';
    let previousOperand = '';
    let operation = undefined;
    let memory = 0;
    let history = JSON.parse(localStorage.getItem('calcHistoryDevOps2')) || [];
    let isRadian = false;
    let shouldResetScreen = false;

    // Chart Instance
    let chartInstance = null;

    initApp();

    /** 
     * INIT 
     */
    function initApp() {
        updateDisplay();
        renderHistory();
        applySavedTheme();
        bindEvents();
    }

    /** 
     * EVENT BINDINGS
     */
    function bindEvents() {
        // Main calculator clicks
        document.querySelector('.calculator').addEventListener('click', (e) => {
            const btn = e.target.closest('.btn');
            const memBtn = e.target.closest('.mem-btn');

            // Ripple effect
            const rippleTarget = e.target.closest('.ripple-fx');
            if (rippleTarget) createRipple(e, rippleTarget);

            if (btn) handleCalculatorClick(btn);
            if (memBtn) handleMemory(memBtn.dataset.action);
        });

        // Toggles
        sciToggleBtn.addEventListener('click', toggleScientific);
        themeToggle.addEventListener('click', toggleTheme);
        historyToggle.addEventListener('click', () => togglePanel('history'));
        graphToggle.addEventListener('click', () => { togglePanel('feature'); switchTab('graphTab'); });
        eqToggle.addEventListener('click', () => { togglePanel('feature'); switchTab('eqTab'); });
        closeFeatureBtn.addEventListener('click', () => featurePanel.classList.add('hidden'));

        // Keyboard
        document.addEventListener('keydown', handleKeyboard);

        // History
        document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);

        // Feature Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => switchTab(e.currentTarget.dataset.tab));
        });

        // Graph Drawing
        document.getElementById('drawGraphBtn').addEventListener('click', drawGraph);

        // Equation Solver
        document.getElementById('solveEqBtn').addEventListener('click', solveEquation);
    }

    /** 
     * Calculator Core Logic
     */
    function handleCalculatorClick(btn) {
        if (btn.classList.contains('number')) appendNumber(btn.dataset.value);
        else if (btn.classList.contains('operator')) chooseOperation(btn.dataset.operator);
        else if (btn.classList.contains('action')) computeAction(btn.dataset.action);
        else if (btn.classList.contains('sci')) handleScientificAction(btn);

        updateDisplay();
    }

    function appendNumber(number) {
        if (currentOperand === '0' && number !== '.') {
            currentOperand = number;
        } else {
            if (number === '.' && currentOperand.includes('.')) return;
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
        if (previousOperand !== '') compute();
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
                if (current === 0) { showError("Division / 0"); return; }
                computation = prev / current;
                break;
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

    function computeAction(action) {
        switch (action) {
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

    function handleScientificAction(btn) {
        const action = btn.dataset.action;
        const current = parseFloat(currentOperand);

        if (action === 'toggle-angle') {
            isRadian = !isRadian;
            btn.innerText = isRadian ? 'RAD' : 'DEG';
            return;
        }
        if (action === 'power') { chooseOperation('xʸ'); return; }
        if (action === 'paren-left' || action === 'paren-right') { showError("Non implémenté"); return; }

        let res;
        const toRad = angle => isRadian ? angle : angle * (Math.PI / 180);

        if (isNaN(current) && action !== 'pi' && action !== 'e') return;

        switch (action) {
            case 'sqrt': if (current < 0) { showError("Erreur (<0)"); return; } res = Math.sqrt(current); break;
            case 'square': res = Math.pow(current, 2); break;
            case 'log': if (current <= 0) { showError("Erreur"); return; } res = Math.log10(current); break;
            case 'ln': if (current <= 0) { showError("Erreur"); return; } res = Math.log(current); break;
            case 'sin': res = Math.sin(toRad(current)); break;
            case 'cos': res = Math.cos(toRad(current)); break;
            case 'tan':
                if (Math.abs(Math.cos(toRad(current))) < 1e-10) { showError("Erreur"); return; }
                res = Math.tan(toRad(current));
                break;
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
        }
    }

    function handleMemory(action) {
        const curr = parseFloat(currentOperand) || 0;
        switch (action) {
            case 'mc': memory = 0; break;
            case 'mr': currentOperand = memory.toString(); shouldResetScreen = true; break;
            case 'm-plus': memory += curr; shouldResetScreen = true; break;
            case 'm-minus': memory -= curr; shouldResetScreen = true; break;
        }
        updateDisplay();
    }

    /**
     * Helpers, Formats & Fixes
     */
    function updateDisplay() {
        if (currentOperand.length > 12) currentOperandEl.style.fontSize = '2.2rem';
        else if (currentOperand.length > 8) currentOperandEl.style.fontSize = '2.8rem';
        else currentOperandEl.style.fontSize = '3.5rem';

        currentOperandEl.innerText = formatNumber(currentOperand);
        if (operation != null) {
            previousOperandEl.innerText = `${formatNumber(previousOperand)} ${operation}`;
        } else {
            previousOperandEl.innerText = previousOperand;
        }
    }

    function formatNumber(number) {
        if (number === '-' || (typeof number === 'string' && number.includes('Erreur')) || (typeof number === 'string' && number.includes('Division'))) return number;
        const stringNumber = number.toString();
        const integerDigits = parseFloat(stringNumber.split('.')[0]);
        const decimalDigits = stringNumber.split('.')[1];
        let integerDisplay = isNaN(integerDigits) ? '' : integerDigits.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
        return decimalDigits != null ? `${integerDisplay},${decimalDigits}` : integerDisplay;
    }

    function precise(num) {
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
        setTimeout(() => { currentOperand = '0'; updateDisplay(); }, 1500);
    }

    /**
     * Toggles & UI Visuals
     */
    function toggleScientific() {
        sciToggleBtn.classList.toggle('open');
        sciPanel.classList.toggle('show');
    }

    function togglePanel(panelName) {
        // Desktop Layout Strategy: We overlay them if screen is small, or slide next on big screens
        if (panelName === 'history') {
            historyPanel.classList.toggle('hidden');
            if (!featurePanel.classList.contains('hidden') && window.innerWidth <= 1000) {
                featurePanel.classList.add('hidden');
            }
        } else if (panelName === 'feature') {
            featurePanel.classList.remove('hidden');
            if (!historyPanel.classList.contains('hidden') && window.innerWidth <= 1000) {
                historyPanel.classList.add('hidden');
            }
        }
    }

    function switchTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');

        document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
        document.getElementById(tabId).classList.remove('hidden');
    }

    function toggleTheme() {
        const doc = document.documentElement;
        const isDark = doc.getAttribute('data-theme') === 'dark';
        doc.setAttribute('data-theme', isDark ? 'light' : 'dark');
        themeIcon.className = isDark ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
        localStorage.setItem('calcThemeDevOps2', isDark ? 'light' : 'dark');
    }

    function applySavedTheme() {
        const savedTheme = localStorage.getItem('calcThemeDevOps2');
        if (savedTheme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            themeIcon.className = 'fa-solid fa-moon';
        }
    }

    function createRipple(event, button) {
        const circle = document.createElement('span');
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;

        const rect = button.getBoundingClientRect();
        // Fallback for keyboard events which have no clientX/Y
        const x = event.clientX ? event.clientX - rect.left - radius : 0;
        const y = event.clientY ? event.clientY - rect.top - radius : 0;

        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${x}px`;
        circle.style.top = `${y}px`;
        circle.classList.add('ripple-element');

        const existing = button.querySelector('.ripple-element');
        if (existing) existing.remove();
        button.appendChild(circle);
    }

    function handleKeyboard(e) {
        if (e.ctrlKey || e.altKey || e.metaKey) return;

        // Disallow main calc typing if focus is in an input field (graph eq input)
        if (document.activeElement.tagName === 'INPUT') {
            if (e.key === 'Enter') {
                if (document.activeElement.id === 'graphFunction') drawGraph();
                if (['eqA', 'eqB', 'eqC'].includes(document.activeElement.id)) solveEquation();
            }
            return;
        }

        if (e.key >= '0' && e.key <= '9') { appendNumber(e.key); updateDisplay(); }
        if (e.key === '.' || e.key === ',') { appendNumber('.'); updateDisplay(); }
        if (e.key === '+' || e.key === '-') { chooseOperation(e.key === '-' ? '−' : '+'); updateDisplay(); }
        if (e.key === '*') { chooseOperation('×'); updateDisplay(); }
        if (e.key === '/') { chooseOperation('÷'); updateDisplay(); }
        if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); computeAction('calculate'); updateDisplay(); }
        if (e.key === 'Backspace') { computeAction('delete'); updateDisplay(); }
        if (e.key === 'Escape') { computeAction('clear'); updateDisplay(); }
        if (e.key === '%') { computeAction('percent'); updateDisplay(); }
    }

    /**
     * History
     */
    function addToHistory(expr, result) {
        history.unshift({ expr, result });
        if (history.length > 20) history.pop();
        localStorage.setItem('calcHistoryDevOps2', JSON.stringify(history));
        renderHistory();

        // Highlight history icon slightly to show activity
        historyToggle.classList.add('active');
        setTimeout(() => historyToggle.classList.remove('active'), 500);
    }

    function renderHistory() {
        historyListEl.innerHTML = '';
        if (history.length === 0) {
            historyListEl.innerHTML = '<li style="text-align:center; color: var(--text-secondary); padding-top: 20px;">Aucun historique</li>';
            return;
        }
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
                if (window.innerWidth <= 1000) historyPanel.classList.add('hidden');
            });
            historyListEl.appendChild(li);
        });
    }

    function clearHistory() {
        history = [];
        localStorage.removeItem('calcHistoryDevOps2');
        renderHistory();
    }

    /**
     * Graphing Function (Chart.js)
     */
    function drawGraph() {
        const funcStr = document.getElementById('graphFunction').value;
        const errEl = document.getElementById('graphError');
        const xMin = parseFloat(document.getElementById('xMin').value);
        const xMax = parseFloat(document.getElementById('xMax').value);

        errEl.innerText = '';
        if (!funcStr) { errEl.innerText = "Veuillez entrer une fonction."; return; }
        if (isNaN(xMin) || isNaN(xMax) || xMin >= xMax) { errEl.innerText = "Intervalles invalides."; return; }

        let labels = [];
        let dataXY = [];

        // Evaluate the function safely points creation
        const step = (xMax - xMin) / 100;

        // Simple security: sanitize simple math string into a rough Function
        let safeFuncStr = funcStr
            .replace(/sin/g, "Math.sin")
            .replace(/cos/g, "Math.cos")
            .replace(/tan/g, "Math.tan")
            .replace(/log/g, "Math.log10")
            .replace(/ln/g, "Math.log")
            .replace(/sqrt/g, "Math.sqrt")
            .replace(/pi/gi, "Math.PI")
            .replace(/e/gi, "Math.E")
            .replace(/\^/g, "**");

        // Prefix x with something that is passed to Function
        try {
            // new Function is safer than eval, limited scope.
            const evaluator = new Function("x", `return ${safeFuncStr};`);

            for (let x = xMin; x <= xMax; x += step) {
                let y = evaluator(x);
                if (isFinite(y)) { // Avoid graphing infinities strongly affecting chart scale
                    labels.push(x.toFixed(2));
                    dataXY.push(y);
                } else {
                    labels.push(x.toFixed(2));
                    dataXY.push(null);
                }
            }
        } catch (e) {
            errEl.innerText = "Erreur de syntaxe mathématique.";
            return;
        }

        const ctx = document.getElementById('graphCanvas').getContext('2d');

        // CSS Variables helper
        const style = getComputedStyle(document.body);
        const accent = style.getPropertyValue('--accent-primary').trim();
        const gridColor = style.getPropertyValue('--glass-border').trim();
        const fontColor = style.getPropertyValue('--text-secondary').trim();

        if (chartInstance) chartInstance.destroy();

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `f(x) = ${funcStr}`,
                    data: dataXY,
                    borderColor: accent,
                    backgroundColor: 'rgba(0, 229, 255, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    fill: false,
                    tension: 0.2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                color: fontColor,
                scales: {
                    x: {
                        grid: { color: gridColor },
                        ticks: { color: fontColor, maxTicksLimit: 10 }
                    },
                    y: {
                        grid: { color: gridColor },
                        ticks: { color: fontColor }
                    }
                },
                plugins: {
                    legend: { labels: { color: fontColor } }
                }
            }
        });
    }

    /**
     * Equation Solver (ax^2 + bx + c = 0)
     */
    function solveEquation() {
        const a = parseFloat(document.getElementById('eqA').value) || 0;
        const b = parseFloat(document.getElementById('eqB').value) || 0;
        const c = parseFloat(document.getElementById('eqC').value) || 0;

        const solBox = document.getElementById('solutionBox');
        solBox.classList.remove('hidden');

        if (a === 0) {
            // First degree: bx + c = 0 -> bx = -c -> x = -c/b
            if (b === 0) {
                if (c === 0) solBox.innerHTML = "L'équation a une infinité de solutions (0 = 0).";
                else solBox.innerHTML = "L'équation n'a pas de solution (impossible).";
            } else {
                const x = -c / b;
                solBox.innerHTML = `Solution unique : <br><b>x = ${precise(x)}</b>`;
            }
            return;
        }

        // Second degree: ax² + bx + c = 0
        const delta = (b * b) - (4 * a * c);

        if (delta < 0) {
            // Complex roots
            const real = precise(-b / (2 * a));
            const imag = precise(Math.sqrt(-delta) / (2 * a));
            solBox.innerHTML = `L'équation n'a pas de solution réelle.<br>Solutions complexes :<br><b>x₁ = ${real} - ${imag}i</b><br><b>x₂ = ${real} + ${imag}i</b>`;
        } else if (delta === 0) {
            // Double root
            const x = precise(-b / (2 * a));
            solBox.innerHTML = `Discriminant (Δ) = 0<br>Solution double : <br><b>x = ${x}</b>`;
        } else {
            // Two distinct roots
            const x1 = precise((-b - Math.sqrt(delta)) / (2 * a));
            const x2 = precise((-b + Math.sqrt(delta)) / (2 * a));
            solBox.innerHTML = `Discriminant (Δ) = ${precise(delta)}<br>Deux solutions : <br><b>x₁ = ${x1}</b><br><b>x₂ = ${x2}</b>`;
        }
    }
});
