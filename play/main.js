



(function () {

    const els = {
        strategy: document.getElementById('strategySelect'),
        ante: document.getElementById('anteInput'),
        bet: document.getElementById('betInput'),
        deck: document.getElementById('deckSelect'),
        openSettingsBtn: document.getElementById('openSettingsBtn'),
        openTutorialBtn: document.getElementById('openTutorialBtn'),
        settingsDialog: document.getElementById('settingsDialog'),
        tutorialDialog: document.getElementById('tutorialDialog'),
        saveRestart: document.getElementById('saveRestartBtn'),
        strategyDesc: document.getElementById('strategyDesc'),
        robotMode: document.getElementById('robotModeLabel'),

        resetMatch: document.getElementById('resetMatchBtn'),

        pot: document.getElementById('potDisplay'),
        round: document.getElementById('roundDisplay'),
        yourCard: document.getElementById('yourCard'),
        botCard: document.getElementById('botCard'),
        yourStack: document.getElementById('yourStack'),
        botStack: document.getElementById('botStack'),
        yourWin: document.getElementById('yourWin'),
        yourReraise: document.getElementById('yourReraise'),
        yourAvg: document.getElementById('yourAvg'),
        botWin: document.getElementById('botWin'),
        botReraise: document.getElementById('botReraise'),
        botAvg: document.getElementById('botAvg'),
        actionBar: document.getElementById('actionBar'),
        dealBtn: document.getElementById('dealBtn'),
        betBtn: document.getElementById('betBtn'),
        checkBtn: document.getElementById('checkBtn'),
        foldBtn: document.getElementById('foldBtn'),
        log: document.getElementById('log'),
    };


    const TIMINGS = {
        ROBOT_THINK_MS: 800,
        PRE_POT_MS: 800,
        PRE_SHOWDOWN_MS: 1000,
        POST_SHOWDOWN_MS: 1000,
        NUM_ANIM_MS: 800,
    };


    let match = {
        yourStack: 0, botStack: 0, round: 0, completed: 0, stats: {
            you: { reraise: 0, checks: 0, folds: 0, calls: 0, wins: 0 },
            bot: { reraise: 0, checks: 0, folds: 0, calls: 0, wins: 0 },
        }
    };
    let hand = null;

    function rng() { return Math.random(); }
    function drawCard() {
        const deck = els.deck.value;

        const N = deck === 'akq' ? 3 : parseInt(deck, 10);
        const k = Math.floor(rng() * N);
        return N === 1 ? 0 : k / (N - 1);
    }

    function dealTwoCards() {
        const deck = els.deck.value;
        const N = deck === 'akq' ? 3 : parseInt(deck, 10);
        if (!Number.isFinite(N) || N <= 1) {

            let a = rng();
            let b = rng();
            while (b === a) b = rng();
            return [a, b];
        }
        const i = Math.floor(rng() * N);
        let j = Math.floor(rng() * (N - 1));
        if (j >= i) j += 1;
        const a = (N === 1) ? 0 : i / (N - 1);
        const b = (N === 1) ? 0 : j / (N - 1);
        return [a, b];
    }

    function fmtCard(x, deckOverride) {
        const deck = deckOverride ?? els.deck.value;
        if (deck === 'akq') {

            const idx = Math.round(x * 2);
            return ['Q', 'K', 'A'][idx] || '?';
        }

        const N = parseInt(deck, 10);
        if (!Number.isFinite(N) || N < 1) return '?';
        const idx = Math.round(x * (N - 1));
        return (idx + 1);
    }
    function money(x) { return `$${Number(x).toFixed(2)}`; }

    function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }
    function setButtonsDisabled(disabled) {
        els.dealBtn.disabled = disabled;
        els.betBtn.disabled = disabled;
        els.checkBtn.disabled = disabled;
        els.foldBtn.disabled = disabled;
    }

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
    function parseNumericText(text) {
        if (text == null) return NaN;
        const s = String(text).replace(/[$,%\s]/g, '');
        const n = parseFloat(s);
        return isNaN(n) ? NaN : n;
    }
    function animateText(el, to, formatter, opts = {}) {
        const duration = opts.duration ?? TIMINGS.NUM_ANIM_MS;
        const now = performance.now();
        const fromCandidate = (typeof el._lastVal === 'number') ? el._lastVal : parseNumericText(el.textContent);
        const from = isNaN(fromCandidate) ? to : fromCandidate;
        if (from === to || duration <= 0) {
            el.textContent = formatter(to);
            el._lastVal = to;
            if (el._animId) cancelAnimationFrame(el._animId);
            el._animId = 0;
            return;
        }
        if (el._animId) cancelAnimationFrame(el._animId);
        const start = now;
        const total = Math.max(50, duration);
        function frame(t) {
            const p = Math.min(1, (t - start) / total);
            const e = easeOutCubic(p);
            const v = from + (to - from) * e;
            el.textContent = formatter(v);
            if (p < 1) {
                el._animId = requestAnimationFrame(frame);
            } else {
                el._lastVal = to;
                el._animId = 0;
                el.textContent = formatter(to);
            }
        }
        el._animId = requestAnimationFrame(frame);
    }

    const STRAT_DESCRIPTIONS = {
        random: 'Randomly bets, checks, calls, and folds without considering card strength.',
        safe: 'Very conservative: bets/raises only with strong cards; folds most marginal hands.',
        risky: 'Aggressive: frequently bets/raises, even with weak cards; calls more often.',
        smart: 'Equilibrium-like: uses EV thresholds to value-bet strong hands and bluff just enough.',
    };
    const STRAT_LABELS = { random: 'Random', safe: 'Safe', risky: 'Risky', smart: 'Smart' };
    function updateStrategyDescription() {
        if (!els.strategyDesc) return;
        els.strategyDesc.textContent = STRAT_DESCRIPTIONS[els.strategy.value] || '';
    }
    function updateRobotModeLabel() {
        if (!els.robotMode) return;
        els.robotMode.textContent = STRAT_LABELS[els.strategy.value] || '';
    }
    function setCardFace(el, valueText) {
        el.classList.remove('back');
        el.classList.add('face');
        el.textContent = valueText;
    }
    function setCardBack(el) {
        el.classList.remove('face');
        el.classList.add('back');
        el.textContent = '';
    }

    function flipToBack(el, duration = 250) {
        return new Promise(resolve => {
            el.style.transformOrigin = '50% 50%';
            el.style.transition = `transform ${duration}ms ease`;
            el.getBoundingClientRect();
            el.style.transform = 'perspective(600px) rotateY(90deg)';
            const onFirstEnd = () => {
                el.removeEventListener('transitionend', onFirstEnd);
                setCardBack(el);
                el.style.transition = `transform ${duration}ms ease`;
                el.getBoundingClientRect();
                el.style.transform = 'perspective(600px) rotateY(180deg)';
                const onSecondEnd = () => {
                    el.removeEventListener('transitionend', onSecondEnd);
                    el.style.transition = 'none';
                    el.style.transform = 'none';
                    el.getBoundingClientRect();
                    el.style.transition = '';
                    el.style.transformOrigin = '';
                    resolve();
                };
                el.addEventListener('transitionend', onSecondEnd);
            };
            el.addEventListener('transitionend', onFirstEnd);
        });
    }


    function flipRevealCard(el, valueText, duration = 250) {
        return new Promise(resolve => {

            el.style.transformOrigin = '50% 50%';
            el.style.transition = `transform ${duration}ms ease`;

            el.getBoundingClientRect();
            el.style.transform = 'perspective(600px) rotateY(90deg)';
            const onFirstEnd = () => {
                el.removeEventListener('transitionend', onFirstEnd);

                el.classList.remove('back');
                el.classList.add('face');
                el.textContent = '';
                const span = document.createElement('span');
                span.textContent = valueText;
                span.style.display = 'inline-block';
                span.style.transform = 'rotateY(180deg)';
                el.appendChild(span);

                el.style.transition = `transform ${duration}ms ease`;

                el.getBoundingClientRect();
                el.style.transform = 'perspective(600px) rotateY(180deg)';
                const onSecondEnd = () => {
                    el.removeEventListener('transitionend', onSecondEnd);

                    el.style.transition = 'none';
                    el.style.transform = 'none';

                    span.style.transform = 'none';

                    el.getBoundingClientRect();
                    el.style.transition = '';
                    el.style.transformOrigin = '';
                    resolve();
                };
                el.addEventListener('transitionend', onSecondEnd);
            };
            el.addEventListener('transitionend', onFirstEnd);
        });
    }
    function log(msg) {
        const div = document.createElement('div');
        div.className = 'entry';
        div.textContent = msg;
        els.log.appendChild(div);
        els.log.scrollTop = els.log.scrollHeight;
    }
    function clearLog() { els.log.innerHTML = ''; }

    function updateHeader() {
        const potVal = hand ? Number(hand.pot) : 0;
        animateText(els.pot, potVal, v => Number(v).toFixed(2));
        animateText(els.round, match.round, v => `${Math.round(v)}`);
        animateText(els.yourStack, match.yourStack, v => money(v));
        animateText(els.botStack, match.botStack, v => money(v));

        updateStrategyDescription();
        updateRobotModeLabel();



        const completed = Math.max(0, match.completed);

        const youChoices = Math.max(0, match.stats.you.reraise + match.stats.you.checks + match.stats.you.folds);
        const botChoices = Math.max(0, match.stats.bot.reraise + match.stats.bot.checks);
        const youReraisePctNum = youChoices === 0 ? 0 : Math.round((match.stats.you.reraise / youChoices) * 100);
        const botReraisePctNum = botChoices === 0 ? 0 : Math.round((match.stats.bot.reraise / botChoices) * 100);
        const youReraisePct = `${youReraisePctNum}%`;
        const botReraisePct = `${botReraisePctNum}%`;


        const youWinPctNum = completed === 0 ? 0 : Math.round((match.stats.you.wins / completed) * 100);
        const botWinPctNum = completed === 0 ? 0 : Math.round((match.stats.bot.wins / completed) * 100);
        const youWinPct = `${youWinPctNum}%`;
        const botWinPct = `${botWinPctNum}%`;
        animateText(els.yourReraise, youReraisePctNum, v => `${Math.round(v)}%`);
        animateText(els.botReraise, botReraisePctNum, v => `${Math.round(v)}%`);
        animateText(els.yourWin, youWinPctNum, v => `${Math.round(v)}%`);
        animateText(els.botWin, botWinPctNum, v => `${Math.round(v)}%`);
        const yourAvgVal = completed === 0 ? 0 : (match.yourStack / completed);
        const botAvgVal = completed === 0 ? 0 : (match.botStack / completed);
        animateText(els.yourAvg, yourAvgVal, v => money(v));
        animateText(els.botAvg, botAvgVal, v => money(v));


        function applyClass(el, cls) {
            el.classList.remove('good', 'neutral', 'bad');
            el.classList.add(cls);
        }
        function clearClass(el) {
            el.classList.remove('good', 'neutral', 'bad');
        }
        function classifyMoney(v) {
            if (v > 0) return 'good';
            if (v < 0) return 'bad';
            return 'neutral';
        }
        function classifyPercentCentered(p) {
            if (p > 50) return 'good';
            if (p < 50) return 'bad';
            return 'neutral';
        }
        if (match.completed > 0) {
            applyClass(els.yourStack, classifyMoney(match.yourStack));
            applyClass(els.botStack, classifyMoney(match.botStack));
            applyClass(els.yourAvg, classifyMoney(yourAvgVal));
            applyClass(els.botAvg, classifyMoney(botAvgVal));
            applyClass(els.yourWin, classifyPercentCentered(youWinPctNum));
            applyClass(els.botWin, classifyPercentCentered(botWinPctNum));
            applyClass(els.yourReraise, classifyPercentCentered(youReraisePctNum));
            applyClass(els.botReraise, classifyPercentCentered(botReraisePctNum));

        } else {
            clearClass(els.yourStack);
            clearClass(els.botStack);
            clearClass(els.yourAvg);
            clearClass(els.botAvg);
            clearClass(els.yourWin);
            clearClass(els.botWin);
            clearClass(els.yourReraise);
            clearClass(els.botReraise);

        }
    }

    function hideAllActionButtons() {
        els.dealBtn.style.display = 'none';
        els.betBtn.style.display = 'none';
        els.checkBtn.style.display = 'none';
        els.foldBtn.style.display = 'none';
    }
    function showActionButtons(btns) {
        hideAllActionButtons();
        for (const b of btns) { els[b].style.display = 'inline-block'; }
    }

    function params() {
        const ante = Math.max(0, parseFloat(els.ante.value) || 0);
        const bet = Math.max(0, parseFloat(els.bet.value) || 0);
        const P = 2 * ante;
        const b = bet;
        return { P, b, ante, bet };
    }


    function mdf(P, b) { return (P + b === 0) ? 0 : P / (P + b); }
    function callThreshold(P, b) { const m = mdf(P, b); return 1 - m; }
    function bluffToValueRatio(P, b) { return (P + b === 0) ? 0 : b / (P + b); }

    function newHand() {
        const { ante } = params();
        match.round += 1;
        const [you, bot] = dealTwoCards();
        hand = {
            you, bot,
            pot: 2 * ante,
            street: 'pre',
            actor: 'simultaneous',
            lastBet: 0,
            history: [],
            revealed: false,
            allowRaiseAfterBotDeals: false,
            deck: els.deck.value,

            youContrib: ante,
            botContrib: ante,
        };
        match.yourStack -= ante;
        match.botStack -= ante;
        setCardFace(els.yourCard, fmtCard(you, hand.deck));
        setCardBack(els.botCard);
        clearLog();
        log(`New hand: antes posted. You are ${hand.actor === 'you' ? 'first to act' : 'second to act'}.`);
        updateHeader();
        nextAction();
    }

    async function revealAndSettle() {
        if (!hand || hand.revealed) return;
        hand.revealed = true;
        setButtonsDisabled(true);
        const youWin = hand.you > hand.bot;
        const pot = hand.pot;


        updateHeader();
        await sleep(TIMINGS.PRE_POT_MS);
        log(`There is a total of ${money(pot)} in the pot.`);
        await flipRevealCard(els.botCard, fmtCard(hand.bot, hand.deck));
        await sleep(TIMINGS.PRE_SHOWDOWN_MS);
        log(`Showdown: Your ${fmtCard(hand.you, hand.deck)} vs Robot ${fmtCard(hand.bot, hand.deck)} — ${youWin ? 'You win' : 'Robot wins'} ${money(pot)}.`);
        await sleep(TIMINGS.POST_SHOWDOWN_MS);
        if (youWin) { match.yourStack += pot; match.stats.you.wins += 1; } else { match.botStack += pot; match.stats.bot.wins += 1; }
        hand.street = 'terminal';
        match.completed += 1;

        const youLost = youWin ? 0 : hand.youContrib;
        log(youWin ? `You won ${money(pot)}!` : `You lost ${money(youLost)}!`);
        updateHeader();
        els.dealBtn.textContent = 'Deal New Hand';
        showActionButtons(['dealBtn']);
        setButtonsDisabled(false);
    }

    async function settleWinner(winner, extraMsg) {
        const pot = hand.pot;

        if (!hand.revealed) {
            hand.revealed = true;
        }
        setButtonsDisabled(true);


        updateHeader();
        await sleep(TIMINGS.PRE_POT_MS);
        log(`There is a total of ${money(pot)} in the pot.`);
        await flipRevealCard(els.botCard, fmtCard(hand.bot, hand.deck));
        if (extraMsg) log(extraMsg);
        await sleep(TIMINGS.POST_SHOWDOWN_MS);
        if (winner === 'you') { match.yourStack += pot; match.stats.you.wins += 1; } else { match.botStack += pot; match.stats.bot.wins += 1; }
        hand.street = 'terminal';
        match.completed += 1;

        const youLost = winner === 'you' ? 0 : hand.youContrib;
        log(winner === 'you' ? `You won ${money(pot)}!` : `You lost ${money(youLost)}!`);
        updateHeader();
        els.dealBtn.textContent = 'Deal New Hand';
        showActionButtons(['dealBtn']);
        setButtonsDisabled(false);
    }

    function robotPolicy_firstToAct(x, P, b, mode) {
        if (b === 0) return 'check';
        switch (mode) {
            case 'random':
                return rng() < 0.5 ? 'bet' : 'check';
            case 'safe':
                return x >= 0.85 ? 'bet' : 'check';
            case 'risky':
                return (x >= 0.25 || rng() < 0.5) ? 'bet' : 'check';
            case 'smart': {
                const r = bluffToValueRatio(P, b);
                const Sv = 0.5;
                const v_hi = 1 - Sv;
                const l = Math.min(r * Sv, v_hi);
                const v_lo = l;
                return (x >= v_hi || x <= v_lo) ? 'bet' : 'check';
            }
            default:
                return 'check';
        }
    }
    function robotPolicy_secondToActFacingCheck(x, P, b, mode) {
        return robotPolicy_firstToAct(x, P, b, mode);
    }
    function robotPolicy_facingBet_decideCall(x, P, b, mode) {
        if (b === 0) return 'call';
        switch (mode) {
            case 'random':
                return rng() < 0.5 ? 'call' : 'fold';
            case 'safe':
                return x >= 0.9 ? 'call' : 'fold';
            case 'risky':
                return (x >= 0.25 || rng() < 0.4) ? 'call' : 'fold';
            case 'smart':
                return x >= callThreshold(P, b) ? 'call' : 'fold';
            default:
                return 'fold';
        }
    }

    function nextAction() {
        updateHeader();
        if (!hand) {
            els.dealBtn.textContent = 'Deal New Game';
            showActionButtons(['dealBtn']);
            els.betBtn.textContent = 'Raise';
            return;
        }
        if (hand.street === 'terminal') {
            els.dealBtn.textContent = 'Deal New Hand';
            showActionButtons(['dealBtn']);
            els.betBtn.textContent = 'Raise';
            return;
        }

        if (hand.street === 'decision') {
            if (hand.awaiting === 'player-response-to-bot-bet') {
                
                showActionButtons(['betBtn', 'foldBtn']);
                els.betBtn.textContent = 'Call';
            } else {
                showActionButtons(['betBtn', 'checkBtn', 'foldBtn']);
                els.betBtn.textContent = 'Raise';
            }
            return;
        }
    }


    els.betBtn.addEventListener('click', async () => {
        if (!hand || hand.street !== 'decision') return;
        const { P, b } = params();

        if (hand.awaiting === 'player-response-to-bot-bet') {
            log('You call.');
            hand.pot += b; match.yourStack -= b; hand.youContrib += b;
            match.stats.you.calls += 1;
            revealAndSettle();
            return;
        }

        match.stats.you.reraise += 1;
        log(`You raise ${money(b)}.`);
        hand.pot += b; match.yourStack -= b; hand.youContrib += b;
        if (hand.botDecision === 'bet') {
            setButtonsDisabled(true);
            await sleep(TIMINGS.ROBOT_THINK_MS);
            log(`Robot also raises ${money(b)}.`);
            hand.pot += b; match.botStack -= b; hand.botContrib += b;
            setButtonsDisabled(false);
            revealAndSettle();
        } else {
            setButtonsDisabled(true);
            await sleep(TIMINGS.ROBOT_THINK_MS);
            const decision = robotPolicy_facingBet_decideCall(hand.bot, P, b, els.strategy.value);
            if (decision === 'call') {
                log(`Robot matches ${money(b)}.`);
                hand.pot += b; match.botStack -= b; hand.botContrib += b;
                match.stats.bot.calls += 1;
                setButtonsDisabled(false);
                revealAndSettle();
            } else {
                setButtonsDisabled(false);
                match.stats.bot.folds += 1;
                settleWinner('you', 'Robot folds. You win by forfeit.');
            }
        }
    });

    els.checkBtn.addEventListener('click', async () => {
        if (!hand || hand.street !== 'decision') return;
        const { b } = params();
        match.stats.you.checks += 1;
        if (hand.botDecision === 'bet') {
            log('You check.');
            setButtonsDisabled(true);
            await sleep(TIMINGS.ROBOT_THINK_MS);
            log(`Robot raises ${money(b)}. You must Call or Fold.`);
            // Apply the robot's raise to the pot immediately
            hand.pot += b; match.botStack -= b; hand.botContrib += b;
            hand.awaiting = 'player-response-to-bot-bet';
            setButtonsDisabled(false);
            nextAction();
        } else {
            log('You check.');
            setButtonsDisabled(true);
            await sleep(TIMINGS.ROBOT_THINK_MS);
            log('Robot checks.');
            setButtonsDisabled(false);
            revealAndSettle();
        }
    });

    els.dealBtn.addEventListener('click', async () => {
        if (!hand || hand.street === 'terminal') {
            const fromTerminal = !!hand && hand.street === 'terminal';

            const { P, b, ante } = params();
            const startYourStack = match.yourStack;
            const startBotStack = match.botStack;
            const [you, bot] = dealTwoCards();
            match.round += 1;
            hand = {
                you, bot,
                pot: 2 * ante,
                street: 'decision',
                actor: 'simultaneous',
                lastBet: 0,
                history: [],
                revealed: false,
                deck: els.deck.value,
                botDecision: robotPolicy_firstToAct(bot, P, b, els.strategy.value),
                awaiting: null,
                startYourStack,
                startBotStack,

                youContrib: ante,
                botContrib: ante,
            };
            match.yourStack -= ante;
            match.botStack -= ante;
            if (hand.botDecision === 'bet') match.stats.bot.reraise += 1; else match.stats.bot.checks += 1;



            setButtonsDisabled(true);
            if (fromTerminal) {
                await Promise.all([
                    flipToBack(els.yourCard, 250),
                    flipToBack(els.botCard, 250)
                ]);
            } else {
                setCardBack(els.yourCard);
                setCardBack(els.botCard);
            }

            await flipRevealCard(els.yourCard, fmtCard(you, hand.deck), 250);
            setButtonsDisabled(false);
            clearLog();
            log('Cards dealt. Both players ante. Choose Raise, Check, or Fold.');
            nextAction();
        }
    });

    els.foldBtn.addEventListener('click', async () => {
        if (!hand || hand.street !== 'decision') return;
        const { b } = params();
        log('You chose to fold.');
        match.stats.you.folds += 1;

        const { P } = params();
        setButtonsDisabled(true);
        await sleep(TIMINGS.ROBOT_THINK_MS);
        const robotChoice = robotPolicy_firstToAct(hand.bot, P, b, els.strategy.value) === 'bet' ? 'bet' : 'fold';
        if (robotChoice === 'fold') {

            log('Robot also folds. Proceeding to showdown.');
            setButtonsDisabled(false);
            revealAndSettle();
        } else {

            log(`Robot chooses to bet ${money(b)}.`);
            hand.pot += b; match.botStack -= b; hand.botContrib += b;
            match.stats.bot.reraise += 1;
            setButtonsDisabled(false);
            settleWinner('bot', 'Robot bets; you folded. Robot wins by forfeit.');
        }
    });

    els.resetMatch.addEventListener('click', () => {
        match = {
            yourStack: 0, botStack: 0, round: 0, completed: 0, stats: {
                you: { reraise: 0, checks: 0, folds: 0, calls: 0, wins: 0 },
                bot: { reraise: 0, checks: 0, folds: 0, calls: 0, wins: 0 },
            }
        };
        hand = null;
        setCardBack(els.yourCard);
        setCardBack(els.botCard);
        clearLog();
        updateHeader();
    });

    let _deckAtOpen = null;
    let _settingsSnapshot = null;
    function isSettingsDirty() {
        if (!_settingsSnapshot) return false;
        return (
            els.strategy.value !== _settingsSnapshot.strategy ||
            els.ante.value !== _settingsSnapshot.ante ||
            els.bet.value !== _settingsSnapshot.bet ||

            els.deck.value !== _settingsSnapshot.deck
        );
    }
    function updateSaveRestartVisibility() {
        if (!els.saveRestart) return;
        els.saveRestart.style.display = isSettingsDirty() ? 'inline-block' : 'none';
    }
    els.openSettingsBtn.addEventListener('click', () => {
        _deckAtOpen = els.deck.value;
        _settingsSnapshot = {
            strategy: els.strategy.value,
            ante: els.ante.value,
            bet: els.bet.value,

            deck: els.deck.value,
        };
        if (els.saveRestart) els.saveRestart.style.display = 'none';
        els.settingsDialog.showModal();
        updateStrategyDescription();
        updateRobotModeLabel();
        updateSaveRestartVisibility();
    });


    els.settingsDialog.addEventListener('click', (e) => {
        const dialog = els.settingsDialog;
        const rect = dialog.getBoundingClientRect();
        const clickInDialog = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
        if (!clickInDialog) dialog.close('backdrop');
    });

    els.settingsDialog.addEventListener('mousedown', (e) => {
        if (e.target === els.settingsDialog) els.settingsDialog.close('backdrop');
    });

    if (els.openTutorialBtn && els.tutorialDialog) {
        els.openTutorialBtn.addEventListener('click', () => {
            els.tutorialDialog.showModal();
        });
        els.tutorialDialog.addEventListener('click', (e) => {
            const dialog = els.tutorialDialog;
            const rect = dialog.getBoundingClientRect();
            const clickInDialog = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
            if (!clickInDialog) dialog.close('backdrop');
        });
        els.tutorialDialog.addEventListener('mousedown', (e) => {
            if (e.target === els.tutorialDialog) els.tutorialDialog.close('backdrop');
        });
    }

    els.settingsDialog.addEventListener('close', () => {
        const rv = els.settingsDialog.returnValue;
        if ((rv === 'backdrop' || rv === 'cancel') && _settingsSnapshot) {
            els.strategy.value = _settingsSnapshot.strategy;
            els.ante.value = _settingsSnapshot.ante;
            els.bet.value = _settingsSnapshot.bet;

            els.deck.value = _settingsSnapshot.deck;
            if (els.saveRestart) els.saveRestart.style.display = 'none';
            updateStrategyDescription();
            updateRobotModeLabel();
            updateHeader();
        }
        _settingsSnapshot = null;
        _deckAtOpen = null;
    });


    if (els.saveRestart) {
        els.saveRestart.addEventListener('click', (e) => {
            e.preventDefault();

            match = {
                yourStack: 0, botStack: 0, round: 0, completed: 0, stats: {
                    you: { reraise: 0, checks: 0, folds: 0, calls: 0, wins: 0 },
                    bot: { reraise: 0, checks: 0, folds: 0, calls: 0, wins: 0 },
                }
            };
            hand = null;
            setCardBack(els.yourCard);
            setCardBack(els.botCard);
            clearLog();
            updateHeader();

            els.settingsDialog.close('save');
            nextAction();


            setTimeout(() => { els.dealBtn.click(); }, 0);

            els.saveRestart.style.display = 'none';
            _deckAtOpen = els.deck.value;
        });
    }


    els.ante.addEventListener('input', () => { updateHeader(); updateSaveRestartVisibility(); });
    els.bet.addEventListener('input', () => { updateHeader(); updateSaveRestartVisibility(); });
    els.strategy.addEventListener('change', () => { updateHeader(); updateSaveRestartVisibility(); });

    els.deck.addEventListener('change', () => { updateHeader(); updateSaveRestartVisibility(); });


    updateHeader();
    nextAction();

    setCardBack(els.yourCard);
    setCardBack(els.botCard);
    
    if (els.tutorialDialog) {
        try { els.tutorialDialog.showModal(); } catch (e) { }
    }
})();
