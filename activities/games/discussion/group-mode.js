/* Shared Group Mode; each discussion page supplies its own question bank. */
const DiscussionGroup = (() => {
    function createSession(size, categories, random = Math.random) {
        if (!Number.isInteger(size) || size < 2 || size > 8) throw new RangeError('Choose 2–8 students.');
        const students = Array.from({ length: size }, (_, i) => ({ number: i + 1, asked: 0, answered: 0, led: 0 }));
        const questions = categories.flatMap(category => category.topics.flatMap(topic =>
            topic.questions.map(question => ({ category: category.title, topic: topic.name, question }))));
        if (!questions.length) throw new Error('Questions are required.');
        let deck = [], previousQuestion, previous, round = 0, lastSpecial = 0, current, phase = 1, phaseTurn = 0;
        let pairCycle = [];
        const pick = items => items[Math.floor(random() * items.length)];
        function drawQuestion() {
            if (!deck.length) {
                deck = [...questions];
                for (let i = deck.length - 1; i > 0; i--) {
                    const j = Math.floor(random() * (i + 1));
                    [deck[i], deck[j]] = [deck[j], deck[i]];
                }
                if (deck.length > 1 && deck.at(-1) === previousQuestion) [deck[0], deck[deck.length - 1]] = [deck.at(-1), deck[0]];
            }
            previousQuestion = deck.pop();
            return previousQuestion;
        }
        function makePairCycle(firstPair = null) {
            // A shuffled circle gives everyone exactly one turn in each role.
            // A nonzero offset prevents self-pairs without a greedy dead end.
            const order = students.map(s => s.number).filter(n => n !== firstPair?.asker);
            for (let i = order.length - 1; i > 0; i--) {
                const j = Math.floor(random() * (i + 1));
                [order[i], order[j]] = [order[j], order[i]];
            }
            if (firstPair) order.unshift(firstPair.asker);
            const offset = firstPair ? order.indexOf(firstPair.answerer) : 1 + Math.floor(random() * (size - 1));
            const pairs = order.map((asker, i) => ({ asker, answerer: order[(i + offset) % size] }));
            if (!firstPair && pairs[0].asker === previous?.asker && pairs[0].answerer === previous?.answerer) {
                pairs.push(pairs.shift());
            }
            return pairs;
        }
        function chooseLeader() {
            const leastLed = Math.min(...students.map(s => s.led));
            let eligible = students.filter(s => s.led === leastLed);
            const leastAsked = Math.min(...eligible.map(s => s.asked));
            eligible = eligible.filter(s => s.asked === leastAsked);
            const different = eligible.filter(s => s.number !== previous?.asker);
            return pick(different.length ? different : eligible).number;
        }
        function next() {
            if (current && current.step === 'answer') return current;
            if (phase === 1 && phaseTurn >= size) startRoundTwo();
            if (phase === 2 && phaseTurn >= size) startRoundThree();
            round++;
            phaseTurn++;
            if (phase === 3) {
                current = { round, phase, phaseTurn, limit: null, type: 'group', asker: chooseLeader(), answerer: null,
                    step: 'answer', prompt: drawQuestion() };
                return current;
            }
            // At least three regular conversations between special rounds.
            const type = phase === 2 && round >= 4 && round - lastSpecial >= 4 && random() < 0.22
                ? 'your-question' : 'normal';
            if (type !== 'normal') lastSpecial = round;
            if (!pairCycle.length) pairCycle = makePairCycle();
            const pair = pairCycle[phaseTurn - 1];
            current = { round, phase, phaseTurn, limit: size, type, asker: pair.asker, answerer: pair.answerer, step: 'answer',
                prompt: type === 'your-question' ? null : drawQuestion() };
            return current;
        }
        function answered() {
            if (!current || current.step !== 'answer') return current;
            current.step = phase === 2 ? 'followup' : 'complete';
            students[current.asker - 1].asked++;
            if (phase === 3) {
                // Leading is assigned; spontaneous answers cannot be inferred.
                students[current.asker - 1].led++;
            } else {
                students[current.answerer - 1].answered++;
            }
            previous = { asker: current.asker, answerer: current.answerer };
            return current;
        }
        function startRoundTwo() {
            if (phase >= 2) return;
            phase = 2;
            phaseTurn = current?.step === 'answer' ? 1 : 0;
            lastSpecial = round;
            pairCycle = makePairCycle(current?.step === 'answer' ? current : null);
            // Keep the displayed question and pair when the facilitator switches.
            // Participation counts and the question deck continue across stages.
            if (current?.step === 'answer') {
                current.phase = 2;
                current.phaseTurn = phaseTurn;
                current.limit = size;
            }
        }
        function startRoundThree() {
            if (phase !== 2) return;
            phase = 3;
            phaseTurn = current?.step === 'answer' ? 1 : 0;
            if (current?.step === 'answer') {
                // Reuse the unanswered prompt without crediting an uncompleted pair.
                current.phase = 3;
                current.phaseTurn = phaseTurn;
                current.limit = null;
                current.type = 'group';
                current.asker = chooseLeader();
                current.answerer = null;
                current.prompt ??= drawQuestion();
            } else {
                current = undefined;
            }
        }
        return { next, answered, students, startRoundTwo, startRoundThree };
    }

    function mount(categories) {
        // Keep setup and conversation markup identical across all units.
        document.getElementById('gamePage').insertAdjacentHTML('beforebegin', `
        <section id="groupSetup" class="group-page hidden" aria-labelledby="setupTitle">
            <p class="group-eyebrow">GROUP MODE</p>
            <h2 id="setupTitle" tabindex="-1">How many students are playing?</h2>
            <div id="studentChoices" class="student-choices" role="group" aria-label="Number of students"></div>
            <div id="numberInstructions" class="hidden">
                <h3>Give everyone a number.</h3>
                <div id="studentNumbers" class="student-numbers"></div>
                <button id="startGroup" class="start-game-btn">Start Game</button>
            </div>
            <button class="nav-btn back" id="setupHome">← Mode selection</button>
        </section>

        <section id="groupGame" class="group-page hidden" aria-labelledby="groupRound">
            <header class="group-header">
                <div class="group-heading">
                    <p id="groupCategory" class="group-category"></p>
                    <h2 id="groupProgress"></h2>
                </div>
                <div class="group-round-status">
                    <p id="groupRound"></p>
                    <p id="groupPhase"></p>
                </div>
            </header>
            <div id="groupConversation" class="group-conversation" tabindex="-1" aria-label="Current conversation">
                <p id="groupSpecial" class="group-special hidden"></p>
                <h2 id="groupQuestion" class="group-question"></h2>
                <div id="groupRoles" class="group-roles"></div>
            </div>
            <div id="groupDiscussion" class="group-followup hidden">
                <p class="group-instruction">Share your ideas. Respond to someone else.</p>
                <p class="group-category">Invite someone who hasn't spoken yet.</p>
                <button id="groupDiscussionNext" class="start-game-btn">Next Discussion →</button>
            </div>
            <button id="groupAnswered" class="start-game-btn">Answered ✓</button>
            <div id="groupFollowup" class="group-followup hidden" tabindex="-1">
                <h2 id="followupTitle"></h2>
                <p id="followupInstruction" class="group-instruction"></p>
                <button id="groupIdea" class="nav-btn back" aria-expanded="false" aria-controls="followupIdeas">Need an idea?</button>
                <ul id="followupIdeas" class="followup-ideas hidden">
                    <li>Why?</li><li>Where?</li><li>When?</li><li>Who with?</li>
                    <li>How often?</li><li>What do you like about it?</li><li>What about you?</li><li>Tell me more.</li>
                </ul>
                <button id="groupNext" class="start-game-btn">Next Conversation →</button>
            </div>
            <nav class="group-session-controls" aria-label="Group session">
                <button id="groupRoundTwo" class="nav-btn">Start Round 2 →</button>
                <button id="groupRoundThree" class="nav-btn hidden">Start Round 3 →</button>
                <button id="groupRestart" class="nav-btn back">New session</button>
                <button id="groupChange" class="nav-btn back">Change students</button>
                <button id="groupHome" class="nav-btn back">Mode selection</button>
            </nav>
        </section>
        `);
        const el = id => document.getElementById(id);
        let size = null, session, current;
        const hide = (id, hidden) => el(id).classList.toggle('hidden', hidden);
        function screen(id, focusId) {
            ['homePage', 'groupSetup', 'groupGame'].forEach(page => hide(page, page !== id));
            el(focusId).focus();
        }
        function setup() {
            session = null;
            size = null;
            hide('numberInstructions', true);
            el('studentChoices').querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', 'false'));
            screen('groupSetup', 'setupTitle');
        }
        [3, 4, 5, 6, 2, 7, 8].forEach(number => {
            const button = document.createElement('button');
            button.className = 'nav-btn student-choice' + ([2, 7, 8].includes(number) ? ' extra-choice' : '');
            button.textContent = number;
            button.setAttribute('aria-label', `${number} students`);
            button.setAttribute('aria-pressed', 'false');
            button.onclick = () => {
                size = number;
                el('studentChoices').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
                el('studentNumbers').replaceChildren(...Array.from({ length: size }, (_, i) => {
                    const label = document.createElement('span');
                    label.textContent = `Student ${i + 1}`;
                    return label;
                }));
                hide('numberInstructions', false);
            };
            el('studentChoices').appendChild(button);
        });
        function renderRound() {
            current = session.next();
            el('groupRound').textContent = `Round ${current.phase} of 3`;
            el('groupPhase').textContent = ['', 'Warm-up', 'Follow-up', 'Group discussion'][current.phase];
            el('groupProgress').textContent = `Conversation ${current.phaseTurn}${current.limit ? ` of ${current.limit}` : ''}`;
            hide('groupRoundTwo', current.phase !== 1);
            hide('groupRoundThree', current.phase !== 2);
            hide('groupDiscussion', current.phase !== 3);
            hide('groupFollowup', true);
            hide('groupAnswered', current.phase === 3);
            hide('groupRoles', false);
            hide('groupSpecial', current.type !== 'your-question');
            el('groupSpecial').textContent = 'YOUR QUESTION!';
            const role = (number, label, className) => {
                const node = document.createElement('div');
                node.className = `group-student ${className}`;
                const name = document.createElement('strong');
                name.textContent = `Student ${number}`;
                const caption = document.createElement('span');
                caption.textContent = label;
                node.append(name, caption);
                return node;
            };
            const roles = [role(current.asker, current.phase === 3 ? 'ASK THE GROUP' : 'ASKS →', 'asker')];
            if (current.answerer !== null) roles.push(role(current.answerer, 'ANSWERS', 'answerer'));
            el('groupRoles').replaceChildren(...roles);
            el('groupCategory').textContent = current.prompt ? `${current.prompt.category} · ${current.prompt.topic}` : 'No question from the game this time.';
            el('groupQuestion').textContent = current.prompt?.question ?? 'Ask any question you want.';
            screen('groupGame', 'groupConversation');
        }
        function start() {
            if (size === null) return;
            session = createSession(size, categories);
            renderRound();
        }
        el('chooseGroup').onclick = setup;
        el('startGroup').onclick = start;
        el('groupRestart').onclick = start;
        el('groupChange').onclick = setup;
        el('groupRoundTwo').onclick = () => {
            session.startRoundTwo();
            renderRound();
        };
        el('groupRoundThree').onclick = () => {
            session.startRoundThree();
            renderRound();
        };
        el('groupDiscussionNext').onclick = () => {
            session.answered();
            renderRound();
        };
        ['setupHome', 'groupHome'].forEach(id => el(id).onclick = () => {
            session = null;
            screen('homePage', 'chooseGroup');
        });
        el('groupAnswered').onclick = () => {
            session.answered();
            if (current.phase === 1) {
                renderRound();
                return;
            }
            hide('groupAnswered', true);
            hide('groupRoles', true);
            hide('groupFollowup', false);
            hide('followupIdeas', true);
            el('groupIdea').setAttribute('aria-expanded', 'false');
            el('followupTitle').textContent = `Student ${current.asker}, keep it going!`;
            el('followupInstruction').textContent = 'Ask ONE more question.';
            el('groupFollowup').focus();
        };
        el('groupIdea').onclick = () => {
            const expanded = el('groupIdea').getAttribute('aria-expanded') !== 'true';
            el('groupIdea').setAttribute('aria-expanded', String(expanded));
            hide('followupIdeas', !expanded);
        };
        el('groupNext').onclick = renderRound;
    }
    return { createSession, mount };
})();
if (typeof module !== 'undefined') module.exports = DiscussionGroup;
