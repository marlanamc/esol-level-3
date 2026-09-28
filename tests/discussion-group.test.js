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
            let previous, lastSpecial = 0, normalPrompts = new Set(), promptDraws = 0;
            const types = new Set();
            for (let i = 0; i < 500; i++) {
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
            assert.equal(types.size, 3);
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
        assert.ok(source.includes('href="group-mode.css"'));
        assert.ok(source.includes('src="group-mode.js"'));
        assert.ok(source.includes('id="chooseGroup"'));
        for (const [, script] of source.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(script);
        const session = createSession(6, categories, seeded(123));
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
