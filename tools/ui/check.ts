import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, type Page } from 'playwright-core';
import type { WorkoutSession } from '../../src/domain/session.ts';
import { checkPicture } from '../nes/check.ts';
import { decodePng } from '../nes/png.ts';
import { nativePixels } from '../nes/scale.ts';

const origin = 'http://127.0.0.1:5179';
const output = resolve(process.env.UI_CHECK_OUT ?? 'work/ui');

async function main(): Promise<void> {
    mkdirSync(output, { recursive: true });
    const browser = await chromium.launch({
        executablePath: process.env.CHROME_PATH ?? '/usr/bin/chromium',
        headless: true,
        args: ['--no-sandbox'],
    });
    const server = spawn(
        process.execPath,
        ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5179', '--strictPort'],
        { stdio: 'ignore' }
    );
    const reports: { file: string; status: string; problems: unknown }[] = [];
    try {
        await waitForServer();
        const context = await browser.newContext({ viewport: { width: 256, height: 480 }, deviceScaleFactor: 1 });
        const page = await context.newPage();
        page.setDefaultTimeout(10000);
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await visit(page, '/');
        await shot(page, 'home-empty');
        await page.evaluate(`(${seedSource})()`);
        const routes: Record<string, string> = {
            home: '/',
            picker: '/workouts/start',
            workouts: '/templates',
            'workout-edit': '/templates/tmpl-rows',
            'workout-new': '/templates/new',
            exercises: '/exercises',
            'exercise-edit': '/exercises/ex-bent-over-row',
            'exercise-new': '/exercises/new',
            weight: '/bodyweight',
            history: '/sessions',
            start: '/sessions/start/tmpl-rows',
            session: '/sessions/demo-session',
            completed: '/sessions/old-session',
            settings: '/settings',
            data: '/data',
        };
        for (const [name, route] of Object.entries(routes)) {
            await visit(page, route);
            await shot(page, name);
        }
        await visit(page, '/sessions/demo-session');
        await page.getByRole('spinbutton', { name: 'kg total', exact: true }).fill('47.5');
        await page.getByRole('button', { name: 'Log set >', exact: true }).click();
        await page.waitForFunction("document.querySelector('.current-set__name')?.textContent==='Plank'");
        await shot(page, 'session-duration');
        await page.reload();
        await page.getByRole('article', { name: 'Current set' }).waitFor();
        let saved = await page.evaluate<WorkoutSession>(`(${readSession})()`);
        assert.equal(saved.results[1]?.load.kind, 'external');
        assert.equal(saved.results[1]?.load.kind === 'external' ? saved.results[1].load.weight.value : undefined, 47.5);
        await page.getByRole('button', { name: 'Log set >', exact: true }).click();
        await page.waitForFunction("document.querySelector('.current-set__name')?.textContent==='Dumbbell curl'");
        await shot(page, 'session-per-side');
        await page.getByRole('spinbutton', { name: 'Left Reps', exact: true }).fill('9');
        await page.getByRole('spinbutton', { name: 'Right Reps', exact: true }).fill('7');
        await page.getByRole('button', { name: 'Log set >', exact: true }).click();
        await page.getByText('All sets logged', { exact: true }).waitFor();
        await shot(page, 'session-all-logged');
        await page.getByRole('button', { name: 'Finish', exact: true }).click();
        await page.getByRole('button', { name: 'Reopen', exact: true }).waitFor();
        await page.reload();
        await page.getByRole('button', { name: 'Reopen', exact: true }).waitFor();
        saved = await page.evaluate<WorkoutSession>(`(${readSession})()`);
        const sides = saved.results[3]?.measurement;
        assert.deepEqual(sides?.countBasis === 'perSide' ? sides.sides : undefined, { left: 9, right: 7 });
        assert.ok(saved.completedAt);
        await page.getByRole('button', { name: 'Reopen', exact: true }).click();
        await page.getByRole('button', { name: 'Finish', exact: true }).waitFor();
        await page.locator('.session-overview>summary').click();
        await page.getByRole('button', { name: 'Undo Bänkpress set 1', exact: true }).click();
        await page.waitForFunction("document.querySelector('.current-set__name')?.textContent==='Bänkpress'");
        await shot(page, 'session-overview');
        await visit(page, '/templates/tmpl-rows');
        await page.locator('.planned-set__summary').first().click();
        await shot(page, 'workout-expanded');
        await visit(page, '/bodyweight');
        await page.getByRole('spinbutton', { name: 'Value', exact: true }).fill('81.5');
        await page.getByRole('button', { name: 'Add', exact: true }).click();
        await page.getByText('81.5 kg', { exact: true }).waitFor();
        await shot(page, 'weight-added');
        await visit(page, '/data');
        await page.getByRole('button', { name: 'Show current data', exact: true }).click();
        await page.waitForFunction("document.querySelector('textarea')?.value.includes('81.5')");
        await shot(page, 'data-export');
        const backup = await page.locator('textarea').inputValue();
        page.on('dialog', (dialog) => void dialog.accept());
        await page.locator('textarea').fill('{invalid');
        await page.getByRole('button', { name: 'Replace all local data', exact: true }).click();
        await page.locator('.validation-errors').waitFor();
        await shot(page, 'data-invalid');
        await page.locator('textarea').fill(backup);
        await page.getByRole('button', { name: 'Replace all local data', exact: true }).click();
        await page.getByText(/Replaced local data/).waitFor();
        await shot(page, 'data-imported');
        const phone = await browser.newContext({
            viewport: { width: 390, height: 844 },
            deviceScaleFactor: 3,
            storageState: await context.storageState({ indexedDB: true }),
        });
        const mobile = await phone.newPage();
        await visit(mobile, '/sessions/demo-session');
        const phoneBytes = await mobile.screenshot({ path: resolve(output, 'workout-phone.png') });
        const image = decodePng(phoneBytes);
        // The 390px/DPR3 viewport has a 1024-device-pixel column, starting at device x=73
        const data = new Uint8Array(1024 * image.height * 3);
        for (let y = 0; y < image.height; y++) {
            data.set(image.data.subarray((y * image.width + 73) * 3, (y * image.width + 1097) * 3), y * 1024 * 3);
        }
        const report = checkPicture(nativePixels({ width: 1024, height: image.height, data }, 4));
        reports.push({ file: 'workout-phone.png (content rectangle x=73,width=1024,scale=4)', ...report });
        assert.equal(report.status, 'pass', JSON.stringify(report));
        assert.deepEqual(errors, []);
        console.log(
            `${reports.length} NES captures passed; logging, reload, duration, per-side counts, finish/reopen/undo, bodyweight, import/export passed`
        );
    } finally {
        writeFileSync(resolve(output, 'nes-reports.json'), `${JSON.stringify(reports, null, 2)}\n`);
        await browser.close();
        server.kill();
    }

    async function shot(page: Page, name: string): Promise<void> {
        const pixels = await page.screenshot({ path: resolve(output, `${name}.png`), fullPage: true });
        assert.equal(await page.evaluate('document.documentElement.scrollWidth'), 256, `${name} overflows`);
        const report = checkPicture(decodePng(pixels));
        reports.push({ file: `${name}.png`, ...report });
        assert.equal(report.status, 'pass', `${name}: ${JSON.stringify(report)}`);
    }
}

async function visit(page: Page, route: string): Promise<void> {
    await page.goto(origin + route);
    await page.locator('main[aria-busy=false]').waitFor();
    await page.evaluate('document.fonts.ready');
}

async function waitForServer(): Promise<void> {
    for (let attempt = 0; attempt < 100; attempt++) {
        try {
            if ((await fetch(origin)).ok) {
                return;
            }
        } catch {
            /* Vite may still be binding the test port */
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error('The UI test server did not start on port 5179');
}

const readSession = "async()=>{const {db}=await import('/src/db/database.ts');return db.sessions.get('demo-session')}";
const seedSource = `async () => {
    const {db}=await import('/src/db/database.ts');
    const {rowTemplate}=await import('/src/test/domainFixtures.ts');
    const {plank,dumbbellCurl}=await import('/src/domain/examples.ts');
    const {createSessionFromTemplate}=await import('/src/domain/session.ts');
    const {draftResultFromPrescription}=await import('/src/domain/recordSession.ts');
    const {validateWorkoutTemplate}=await import('/src/domain/validateWorkoutTemplate.ts');
    const template=rowTemplate();template.name='Upper body';template.exercises[0].name='Bänkpress';
    const add=(exercise,prescription)=>{const n=template.sets.length+1;template.exercises.push(structuredClone(exercise));template.sets.push({id:'set-'+n,exerciseId:exercise.id,prescription});template.sequence.push({id:'entry-'+n,plannedSetId:'set-'+n});};
    add(plank,{measurement:{measurement:'duration',countBasis:'total',seconds:30},executionMode:'bilateral',load:{kind:'bodyweight'}});
    add(dumbbellCurl,{measurement:{measurement:'repetitions',countBasis:'perSide',reps:10},executionMode:'unilateral',load:{kind:'external',basis:'perSide',weight:{value:12,unit:'kg'}}});
    const parsed=validateWorkoutTemplate(template);if(!parsed.ok)throw new Error(JSON.stringify(parsed.errors));
    await db.templates.put(parsed.value);
    await db.bodyweightMeasurements.put({id:'bw-demo',measuredAt:Date.now()-100000,value:81,unit:'kg'});
    const old=createSessionFromTemplate({id:'old-session',template,startedAt:Date.now()-86400000});
    old.results=template.sequence.map((entry,i)=>draftResultFromPrescription(entry.id,template.sets[i].prescription,old.startedAt+1000));old.completedAt=old.startedAt+3600000;
    const session=createSessionFromTemplate({id:'demo-session',template,startedAt:Date.now()-60000,bodyweight:{id:'bw-demo',measuredAt:Date.now()-100000,value:81,unit:'kg'}});
    session.results=[draftResultFromPrescription(template.sequence[0].id,template.sets[0].prescription,session.startedAt+1000)];
    await db.sessions.bulkPut([old,session]);
}`;

await main();
