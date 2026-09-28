const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { createSession } = require('../activities/games/discussion/group-mode.js');
const html = fs.readFileSync('activities/games/discussion/unit1-getting-to-know-you-discussion-game.html', 'utf8');
const bank = vm.runInNewContext(html.match(/const categories = ([\s\S]*?);\s*let currentCategoryIndex/)[1]);
const questionCount = bank.reduce((sum, c) => sum + c.topics.reduce((n, t) => n + t.questions.length, 0), 0);
function seeded(seed) { return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32); }
for (let size = 2; size <= 8; size++) {
    test(`${size} students: balanced roles, valid pairs, special spacing, and question reuse`, () => {
        for (let seed = 1; seed <= 30; seed++) {
            const session = createSession(size, bank, seeded(seed));
            session.startRoundTwo();
            let previous, lastSpecial = 0, normalPrompts = new Set(), promptDraws = 0;
            const types = new Set();
            for (let i = 0; i < size; i++) {
                const round = session.next();
                assert.equal(round.round, i + 1);
                assert.equal(session.next(), round, 'cannot skip the follow-up');
                types.add(round.type);
                if (round.type !== 'normal') {
                    assert.ok(round.round - lastSpecial >= 4);
                    lastSpecial = round.round;
                }
                assert.ok(round.answerer >= 1 && round.answerer <= size);
                if (round.asker !== null) {
                    assert.notEqual(round.asker, round.answerer);
                    assert.notDeepEqual([round.asker, round.answerer], previous);
                }
                if (round.prompt) {
                    if (promptDraws < questionCount) {
                        assert.ok(!normalPrompts.has(round.prompt.question), 'no repeats before bank exhausted');
                        normalPrompts.add(round.prompt.question);
                    }
                    promptDraws++;
                } else assert.equal(round.type, 'your-question');
                session.answered();
                const counts = JSON.stringify(session.students);
                session.answered();
                assert.equal(JSON.stringify(session.students), counts, 'answered is idempotent');
                for (const role of ['asked', 'answered']) {
                    const turns = session.students.map(s => s[role]);
                    assert.ok(Math.max(...turns) - Math.min(...turns) <= 3, `${role} stays balanced`);
                }
                previous = [round.asker, round.answerer];
            }
            assert.ok([...types].every(type => ['normal', 'your-question'].includes(type)));
        }
    });
}
test('fresh sessions reset roles, round, and history; invalid sizes rejected', () => {
    const session = createSession(5, bank, seeded(42));
    for (let i = 0; i < 10; i++) { session.next(); session.answered(); }
    const fresh = createSession(5, bank, seeded(42));
    assert.ok(fresh.students.every(s => s.asked === 0 && s.answered === 0));
    assert.equal(fresh.next().round, 1);
    for (const size of [1, 9, 3.5, null]) assert.throws(() => createSession(size, bank), RangeError);
});

// Exercise every unit's actual bank, including wraparound, so the shared mode
// cannot accidentally serve Unit 1 questions on another page.
const discussionDir = path.join(__dirname, '../activities/games/discussion');
for (const filename of fs.readdirSync(discussionDir).filter(name => name.endsWith('.html'))) {
    test(`${filename}: valid bank, shared mode, and complete question cycle`, () => {
        const source = fs.readFileSync(path.join(discussionDir, filename), 'utf8');
        const categories = vm.runInNewContext(source.match(/const categories = ([\s\S]*?);\s*let currentCategoryIndex/)[1]);
        assert.equal(categories.length, 4);
        const questions = [];
        for (const category of categories) {
            assert.equal(category.topics.length, 6);
            for (const topic of category.topics) {
                assert.equal(topic.questions.length, 4);
                for (const question of topic.questions) {
                    assert.equal(typeof question, 'string');
                    assert.ok(question.trim().length > 0);
                    questions.push(question);
                }
            }
        }
        assert.equal(new Set(questions).size, 96);
        assert.equal((source.match(/DiscussionGroup\.mount\(categories\)/g) || []).length, 1);
        assert.match(source, /href="group-mode\.css(?:\?[^"\s]+)?"/);
        assert.match(source, /src="group-mode\.js(?:\?[^"\s]+)?"/);
        assert.ok(source.includes('id="chooseGroup"'));
        for (const [, script] of source.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(script);
        const session = createSession(6, categories, seeded(123));
        session.startRoundTwo();
        const seen = new Set();
        let previousQuestion;
        for (let i = 0; seen.size < 96 && i < 200; i++) {
            const round = session.next();
            if (round.prompt) {
                assert.ok(questions.includes(round.prompt.question));
                assert.ok(!seen.has(round.prompt.question));
                seen.add(round.prompt.question);
                previousQuestion = round.prompt.question;
            }
            session.answered();
        }
        assert.equal(seen.size, 96);
        let next = session.next();
        if (!next.prompt) { session.answered(); next = session.next(); }
        assert.notEqual(next.prompt.question, previousQuestion);
    });
}

test('manual Round 2 keeps the unanswered question and participation', () => {
    const session = createSession(5, bank, seeded(75));
    session.next(); session.answered();
    const current = session.next();
    const counts = JSON.stringify(session.students);
    session.startRoundTwo();
    session.startRoundTwo();
    assert.equal(session.next(), current);
    assert.equal(current.phase, 2);
    assert.equal(current.phaseTurn, 1);
    assert.equal(current.limit, 5);
    assert.equal(JSON.stringify(session.students), counts);
    assert.equal(session.answered().step, 'followup');
    const next = session.next();
    assert.equal(next.phaseTurn, 2);
    assert.equal(next.phase, 2);
    assert.notEqual(next.prompt.question, current.prompt.question);
});

for (let size = 2; size <= 8; size++) {
    test(`${size} students: Round 3 rotates leaders equally without inventing answers`, () => {
        for (let seed = 1; seed <= 30; seed++) {
            const session = createSession(size, bank, seeded(seed));
            for (let i = 0; i < 1; i++) { session.next(); session.answered(); }
            session.startRoundTwo();
            const pair = session.next();
            const prompt = pair.prompt;
            const counts = JSON.stringify(session.students);
            session.startRoundThree();
            const group = session.next();
            assert.equal(group.prompt, prompt);
            assert.equal(JSON.stringify(session.students), counts);
            const answers = session.students.map(s => s.answered);
            for (let i = 0; i < size * 20; i++) {
                const discussion = session.next();
                assert.equal(discussion.phase, 3);
                assert.equal(discussion.type, 'group');
                assert.equal(discussion.answerer, null);
                assert.ok(discussion.prompt);
                const minimum = Math.min(...session.students.map(s => s.led));
                assert.equal(session.students[discussion.asker - 1].led, minimum);
                session.answered();
                const credited = JSON.stringify(session.students);
                session.answered();
                assert.equal(JSON.stringify(session.students), credited);
                assert.deepEqual(session.students.map(s => s.answered), answers);
                const led = session.students.map(s => s.led);
                assert.ok(Math.max(...led) - Math.min(...led) <= 1);
            }
            assert.ok(session.students.every(s => s.led === 20));
            session.startRoundTwo();
            assert.equal(session.next().phase, 3);
        }
    });
}
test('Round 3 can start after a completed pair follow-up without double counting it', () => {
    const session = createSession(4, bank, seeded(5));
    session.startRoundThree();
    assert.equal(session.next().phase, 1);
    session.startRoundTwo();
    session.answered();
    const counts = JSON.stringify(session.students);
    session.startRoundThree();
    session.startRoundThree();
    const discussion = session.next();
    assert.equal(discussion.phase, 3);
    assert.equal(discussion.round, 2);
    assert.equal(JSON.stringify(session.students), counts);
    const fresh = createSession(4, bank);
    assert.ok(fresh.students.every(s => s.led === 0 && s.asked === 0 && s.answered === 0));
    assert.equal(fresh.next().phase, 1);
});

for (let size = 2; size <= 8; size++) {
    test(`${size} students: one turn per student in each paired round, then open discussion`, () => {
        const session = createSession(size, bank, seeded(size));
        for (let i = 1; i <= size; i++) {
            const conversation = session.next();
            assert.equal(conversation.phase, 1);
            assert.equal(conversation.phaseTurn, i);
            assert.equal(conversation.limit, size);
            assert.equal(conversation.type, 'normal');
            assert.equal(session.next(), conversation);
            assert.equal(session.answered().step, 'complete');
        }
        for (let i = 1; i <= size; i++) {
            const conversation = session.next();
            assert.equal(conversation.phase, 2);
            assert.equal(conversation.phaseTurn, i);
            assert.equal(conversation.limit, size);
            assert.equal(session.answered().step, 'followup');
            assert.equal(conversation.phase, 2, 'last answer still requires follow-up');
        }
        assert.ok(session.students.every(s => s.asked === 2 && s.answered === 2));
        const answers = session.students.map(s => s.answered);
        assert.equal(answers.reduce((a, b) => a + b), 2 * size);
        for (let i = 1; i <= 20; i++) {
            const discussion = session.next();
            assert.equal(discussion.phase, 3);
            assert.equal(discussion.phaseTurn, i);
            assert.equal(discussion.limit, null);
            session.answered();
        }
        assert.deepEqual(session.students.map(s => s.answered), answers);
        const fresh = createSession(size, bank);
        assert.equal(fresh.next().phaseTurn, 1);
        assert.equal(fresh.next().phase, 1);
    });
}

for (let size = 2; size <= 8; size++) {
    test(`${size} students: exact asking and answering coverage across random cycles and early switches`, () => {
        for (let seed = 1; seed <= 100; seed++) {
            const session = createSession(size, bank, seeded(seed));
            let previous;
            for (let phase = 1; phase <= 2; phase++) {
                const askers = new Set(), answerers = new Set();
                for (let i = 0; i < size; i++) {
                    const c = session.next();
                    assert.equal(c.phase, phase);
                    assert.notEqual(c.asker, c.answerer);
                    assert.notDeepEqual([c.asker, c.answerer], previous);
                    askers.add(c.asker); answerers.add(c.answerer);
                    session.answered();
                    previous = [c.asker, c.answerer];
                }
                assert.equal(askers.size, size);
                assert.equal(answerers.size, size);
            }
            assert.equal(session.next().phase, 3);
            const early = createSession(size, bank, seeded(seed));
            early.next(); early.answered();
            early.next(); early.startRoundTwo();
            const askers = new Set(), answerers = new Set();
            for (let i = 0; i < size; i++) {
                const c = early.next();
                assert.equal(c.phase, 2);
                assert.notEqual(c.asker, c.answerer);
                askers.add(c.asker); answerers.add(c.answerer);
                early.answered();
            }
            assert.equal(askers.size, size);
            assert.equal(answerers.size, size);
            assert.equal(early.next().phase, 3);
        }
    });
}
