import { useNavigate } from '@solidjs/router';
import { createSignal, type JSX, Show } from 'solid-js';
import gymUrl from '../../art/home/gym.png?url';
import { useAppData } from '../app/AppData.tsx';
import { Button, ConfirmDialog, Popover } from '../components/Controls/index.ts';
import { RecordWeightForm } from '../components/dialog/RecordWeightForm.tsx';
import { formatMass } from '../domain/convertWeight.ts';

/** Home keeps frequent actions beside the adopted gym artwork. */
function HomePage(): JSX.Element {
    const app = useAppData();
    const navigate = useNavigate();
    const [weightOpen, setWeightOpen] = createSignal(false);
    const [readingDirty, setReadingDirty] = createSignal(false);
    const [discardReading, setDiscardReading] = createSignal(false);
    const [message, setMessage] = createSignal('');
    let trigger: HTMLElement | undefined;
    const active = () => app.sessions().find((session) => session.completedAt === undefined);
    return (
        <section class="home-page" aria-label="Home">
            <ConfirmDialog
                open={discardReading()}
                onOpenChange={setDiscardReading}
                message="Discard unsaved reading?"
                onConfirm={() => setWeightOpen(false)}
                mount={document.getElementById('root') ?? undefined}
            />
            <img
                class="home-art"
                src={gymUrl}
                width="256"
                height="200"
                alt="Pixel art gym with a lifter training under the No Excuses sign"
            />
            <div class="home-actions">
                <Show when={active()}>
                    {(session) => <Button onPress={() => navigate(`/sessions/${session().id}`)}>Resume workout</Button>}
                </Show>
                <Button disabled={app.loadState() !== 'ready'} onPress={() => navigate('/workouts')}>
                    Start workout
                </Button>
                <Button
                    disabled={app.loadState() !== 'ready'}
                    onPress={(event) => {
                        trigger = event.currentTarget;
                        setMessage('');
                        setWeightOpen(true);
                    }}
                >
                    Record weight
                </Button>
            </div>
            <Show when={message()}>
                <p class="home-status" role="status">
                    {message()}
                </p>
            </Show>
            <Popover
                open={weightOpen()}
                onOpenChange={(open) => {
                    if (!open && readingDirty()) {
                        setDiscardReading(true);
                    } else {
                        setWeightOpen(open);
                    }
                }}
                label="Record weight"
                anchor={() => trigger}
                returnFocus={() => trigger}
                mount={document.getElementById('root') ?? undefined}
            >
                <RecordWeightForm
                    onDirtyChange={setReadingDirty}
                    onCancel={() => setWeightOpen(false)}
                    onRecorded={(weight) => {
                        setWeightOpen(false);
                        setMessage(`Recorded ${formatMass(weight, app.massUnit(), 1)}.`);
                    }}
                />
            </Popover>
        </section>
    );
}

export { HomePage };
