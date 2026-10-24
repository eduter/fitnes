import body from '../assets/body.png';
import history from '../assets/history.png';
import home from '../assets/home.png';
import move from '../assets/move.png';
import plan from '../assets/plan.png';

/** Destinations that have a drawn symbol. */
type IconName = 'home' | 'plan' | 'move' | 'body' | 'history';

/**
 * Reference symbols reduced to the screen's four subpalettes.
 * Each picture is 32×32. Holes from the source became black, the universal color.
 */
const icons: Record<IconName, string> = {
    home,
    plan,
    move,
    body,
    history,
};

export type { IconName };
export { icons };
