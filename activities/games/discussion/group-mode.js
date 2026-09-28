/* Shared Group Mode; each discussion page supplies its own question bank. */
const DiscussionGroup = (() => {
    function createSession(size, categories, random = Math.random) {
        if (!Number.isInteger(size) || size < 2 || size > 8) throw new RangeError('Choose 2–8 students.');
        const students = Array.from({ length: size }, (_, i) => ({ number: i + 1, asked: 0, answered: 0 }));
        const questions = categories.flatMap(category => category.topics.flatMap(topic =>
            topic.questions.map(question => ({ category: category.title, topic: topic.name, question }))));
        if (!questions.length) throw new Error('Questions are required.');
        let deck = [], previousQuestion, previous, round = 0, lastSpecial = 0, current;
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
        function next() {
            if (current && current.step !== 'followup') return current;
            round++;
            // At least three regular conversations between special rounds.
            const type = round >= 4 && round - lastSpecial >= 4 && random() < 0.22
                ? (random() < 0.5 ? 'everyone' : 'your-question') : 'normal';
            if (type !== 'normal') lastSpecial = round;
            const candidates = [];
            for (const answerer of students) {
                for (const asker of (type === 'everyone' ? [null] : students)) {
                    if (asker === answerer) continue;
                    if (asker && previous?.asker === asker.number && previous?.answerer === answerer.number) continue;
                    // Minimize projected role imbalance. All everyone-round follow-up
                    // askers count once; the answering student counts one conversation.
                    const asks = students.map(s => s.asked + Number(type === 'everyone' ? s !== answerer : s === asker));
                    const answers = students.map(s => s.answered + Number(s === answerer));
                    const balance = [...asks, ...answers].reduce((sum, count) => sum + count * count, 0);
                    const recent = previous ? Number(previous.answerer === answerer.number) + Number(asker && previous.asker === asker.number) : 0;
                    candidates.push({ asker: asker?.number ?? null, answerer: answerer.number, balance, recent });
                }
            }
            const bestBalance = Math.min(...candidates.map(c => c.balance));
            const balanced = candidates.filter(c => c.balance === bestBalance);
            const bestRecency = Math.min(...balanced.map(c => c.recent));
            const pair = pick(balanced.filter(c => c.recent === bestRecency));
            current = { round, type, asker: pair.asker, answerer: pair.answerer, step: 'answer',
                prompt: type === 'your-question' ? null : drawQuestion() };
            return current;
        }
        function answered() {
            if (!current || current.step !== 'answer') return current;
            current.step = 'followup';
            students[current.answerer - 1].answered++;
            for (const student of students) {
                if (current.type === 'everyone' ? student.number !== current.answerer : student.number === current.asker) student.asked++;
            }
            previous = { asker: current.asker, answerer: current.answerer };
            return current;
        }
        return { next, answered, students };
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
            <p id="groupCategory" class="group-category"></p>
            <p id="groupRound" class="group-eyebrow"></p>
            <div id="groupConversation" class="group-conversation" tabindex="-1" aria-label="Current conversation">
                <p id="groupSpecial" class="group-special hidden"></p>
                <div id="groupRoles" class="group-roles"></div>
                <h2 id="groupQuestion" class="group-question"></h2>
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
            el('groupRound').textContent = `Round ${current.round} · ${size} students`;
            hide('groupFollowup', true);
            hide('groupAnswered', false);
            hide('groupRoles', false);
            hide('groupSpecial', current.type === 'normal');
            el('groupSpecial').textContent = current.type === 'everyone' ? 'EVERYONE!' : 'YOUR QUESTION!';
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
            const roles = [role(current.answerer, 'ANSWERS', 'answerer')];
            if (current.asker) roles.unshift(role(current.asker, 'ASKS →', 'asker'));
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
        ['setupHome', 'groupHome'].forEach(id => el(id).onclick = () => {
            session = null;
            screen('homePage', 'chooseGroup');
        });
        el('groupAnswered').onclick = () => {
            session.answered();
            hide('groupAnswered', true);
            hide('groupRoles', true);
            hide('groupFollowup', false);
            hide('followupIdeas', true);
            el('groupIdea').setAttribute('aria-expanded', 'false');
            el('followupTitle').textContent = current.type === 'everyone' ? 'Everyone else, keep it going!' : `Student ${current.asker}, keep it going!`;
            el('followupInstruction').textContent = current.type === 'everyone'
                ? `Take turns. Each person asks Student ${current.answerer} one more question.` : 'Ask ONE more question.';
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
