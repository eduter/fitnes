import { useParams } from '@solidjs/router';
import type { JSX } from 'solid-js';
import { ExerciseListPage } from './ExerciseListPage.tsx';

/** Open retained exercise deep links directly in the library's editor window. */
function ExerciseEditPage(): JSX.Element {
    const params = useParams();
    return <ExerciseListPage initialExerciseId={params.id} createOnMount={params.id === undefined} />;
}

export { ExerciseEditPage };
