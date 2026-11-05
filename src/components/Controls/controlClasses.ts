/** Merge reactive caller classes while preserving each component's required base class. */
function controlClasses(base: string, props: ControlClassProps): string {
    const { class: className, classList } = props;
    const classes = new Set((className ?? '').split(/\s+/).filter(Boolean));
    for (const [group, enabled] of Object.entries(classList ?? {})) {
        for (const name of group.split(/\s+/).filter(Boolean)) {
            if (enabled) {
                classes.add(name);
            } else {
                classes.delete(name);
            }
        }
    }
    classes.add(base);
    return [...classes].join(' ');
}

interface ControlClassProps {
    class?: string;
    classList?: Record<string, boolean | undefined>;
}

export { controlClasses };
