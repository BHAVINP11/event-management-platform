/**
 * Minimal in-memory stand-in for the Admin SDK Firestore surface actually used
 * by the trusted Cloud Functions: `collection(name).doc(id?)`, `.get()` /
 * `.set()` / `.update()`, simple equality `.where()` queries, and
 * `.batch()`/`.commit()`.
 *
 * This lets business logic be unit tested without the Firestore emulator
 * (which needs a local Java runtime) and without initializing the Admin SDK.
 */
interface FakeSnapshot {
    exists: boolean;
    id: string;
    data(): Record<string, unknown> | undefined;
}
interface FakeQuerySnapshot {
    empty: boolean;
    docs: FakeSnapshot[];
}
declare class FakeDocRef {
    private readonly store;
    readonly id: string;
    readonly path: string;
    constructor(store: Map<string, Record<string, unknown>>, id: string, path: string);
    get(): Promise<FakeSnapshot>;
    set(data: Record<string, unknown>): Promise<void>;
    update(data: Record<string, unknown>): Promise<void>;
}
interface WhereClause {
    field: string;
    value: unknown;
}
declare class FakeQuery {
    private readonly store;
    private readonly collectionName;
    private readonly clauses;
    constructor(store: Map<string, Record<string, unknown>>, collectionName: string, clauses: readonly WhereClause[]);
    where(field: string, _op: '==', value: unknown): FakeQuery;
    get(): Promise<FakeQuerySnapshot>;
}
declare class FakeCollectionRef {
    private readonly store;
    private readonly name;
    private readonly idCounter;
    constructor(store: Map<string, Record<string, unknown>>, name: string, idCounter: {
        n: number;
    });
    doc(id?: string): FakeDocRef;
    where(field: string, op: '==', value: unknown): FakeQuery;
}
declare class FakeWriteBatch {
    private readonly store;
    private readonly operations;
    constructor(store: Map<string, Record<string, unknown>>);
    set(ref: FakeDocRef, data: Record<string, unknown>): FakeWriteBatch;
    update(ref: FakeDocRef, data: Record<string, unknown>): FakeWriteBatch;
    commit(): Promise<void>;
}
export declare class FakeFirestore {
    private readonly store;
    private readonly idCounter;
    collection(name: string): FakeCollectionRef;
    batch(): FakeWriteBatch;
    /** Test setup helper: seed a document directly, bypassing the batch API. */
    seed(collection: string, id: string, data: Record<string, unknown>): void;
    /** Test assertion helper: read a document directly. */
    read(collection: string, id: string): Record<string, unknown> | undefined;
}
/** Cast to the Admin SDK type the production code expects. */
export declare function asFirestore(fake: FakeFirestore): FirebaseFirestore.Firestore;
export {};
