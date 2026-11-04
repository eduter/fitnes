import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const SOURCE = 'https://github.com/libretro/libretro-fceumm.git';
const COMMIT = 'e0f3086a8104f8fbbe49a2615b10401504a9533f';
const directory = resolve('work/nes-emulator-core');
if (process.platform !== 'linux') {
    throw new Error(
        'The setup command is tested on Linux; supply a compatible prebuilt FCEUmm libretro core on other systems'
    );
}
mkdirSync(directory, { recursive: true });
function git(args: string[]): string {
    return execFileSync('git', args, { cwd: directory, encoding: 'utf8' }).trim();
}
if (!existsSync(resolve(directory, '.git'))) {
    git(['init']);
    git(['remote', 'add', 'origin', SOURCE]);
}
if (git(['remote', 'get-url', 'origin']) !== SOURCE) {
    throw new Error('The emulator cache belongs to a different source repository');
}
if (git(['status', '--porcelain'])) {
    throw new Error('The emulator source cache has local changes; preserve them before replacing this cache');
}
git(['fetch', '--depth', '1', 'origin', COMMIT]);
git(['checkout', '--detach', COMMIT]);
execFileSync('make', ['-f', 'Makefile.libretro', '-j4', 'WANT_32BPP=1'], { cwd: directory, stdio: 'inherit' });
console.log(resolve(directory, 'fceumm_libretro.so'));
