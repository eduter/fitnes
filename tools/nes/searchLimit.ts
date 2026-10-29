/** A bounded search could not establish compliance. */
class SearchLimit extends Error {
    constructor() {
        super('Palette search exhausted its budget; compliance was not established');
    }
}

export { SearchLimit };

/** One palette-packing budget shared by all attempts for a picture. */
interface SearchBudget {
    left: number;
}

export type { SearchBudget };
