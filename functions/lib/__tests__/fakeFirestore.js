"use strict";
/**
 * Minimal in-memory stand-in for the Admin SDK Firestore surface actually used
 * by the trusted Cloud Functions: `collection(name).doc(id?)`, `.get()` /
 * `.set()` / `.update()`, simple equality `.where()` queries, and
 * `.batch()`/`.commit()`.
 *
 * This lets business logic be unit tested without the Firestore emulator
 * (which needs a local Java runtime) and without initializing the Admin SDK.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FakeFirestore = void 0;
exports.asFirestore = asFirestore;
class FakeDocRef {
    constructor(store, id, path) {
        this.store = store;
        this.id = id;
        this.path = path;
    }
    async get() {
        const data = this.store.get(this.path);
        return {
            exists: data !== undefined,
            id: this.id,
            data: () => data
        };
    }
    async set(data) {
        this.store.set(this.path, data);
    }
    async update(data) {
        const existing = this.store.get(this.path) ?? {};
        this.store.set(this.path, { ...existing, ...data });
    }
}
class FakeQuery {
    constructor(store, collectionName, clauses) {
        this.store = store;
        this.collectionName = collectionName;
        this.clauses = clauses;
    }
    where(field, _op, value) {
        return new FakeQuery(this.store, this.collectionName, [...this.clauses, { field, value }]);
    }
    async get() {
        const prefix = `${this.collectionName}/`;
        const docs = [];
        for (const [path, data] of this.store.entries()) {
            if (!path.startsWith(prefix)) {
                continue;
            }
            const matches = this.clauses.every(({ field, value }) => data[field] === value);
            if (matches) {
                const id = path.slice(prefix.length);
                docs.push({ exists: true, id, data: () => data });
            }
        }
        return { empty: docs.length === 0, docs };
    }
}
class FakeCollectionRef {
    constructor(store, name, idCounter) {
        this.store = store;
        this.name = name;
        this.idCounter = idCounter;
    }
    doc(id) {
        const docId = id ?? `auto-${this.name}-${this.idCounter.n++}`;
        return new FakeDocRef(this.store, docId, `${this.name}/${docId}`);
    }
    where(field, op, value) {
        return new FakeQuery(this.store, this.name, []).where(field, op, value);
    }
}
class FakeWriteBatch {
    constructor(store) {
        this.store = store;
        this.operations = [];
    }
    set(ref, data) {
        this.operations.push(() => this.store.set(ref.path, data));
        return this;
    }
    update(ref, data) {
        this.operations.push(() => {
            const existing = this.store.get(ref.path) ?? {};
            this.store.set(ref.path, { ...existing, ...data });
        });
        return this;
    }
    async commit() {
        this.operations.forEach((op) => op());
    }
}
class FakeFirestore {
    constructor() {
        this.store = new Map();
        this.idCounter = { n: 0 };
    }
    collection(name) {
        return new FakeCollectionRef(this.store, name, this.idCounter);
    }
    batch() {
        return new FakeWriteBatch(this.store);
    }
    /** Test setup helper: seed a document directly, bypassing the batch API. */
    seed(collection, id, data) {
        this.store.set(`${collection}/${id}`, data);
    }
    /** Test assertion helper: read a document directly. */
    read(collection, id) {
        return this.store.get(`${collection}/${id}`);
    }
}
exports.FakeFirestore = FakeFirestore;
/** Cast to the Admin SDK type the production code expects. */
function asFirestore(fake) {
    return fake;
}
