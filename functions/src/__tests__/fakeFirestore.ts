/**
 * Minimal in-memory stand-in for the Admin SDK Firestore surface actually used
 * by the event-creation Cloud Functions: `collection(name).doc(id?)`,
 * `.get()`/`.set()`, and `.batch()`/`.commit()`.
 *
 * This lets `createIndividualEvent` / `createOrganizationEvent` be unit
 * tested without the Firestore emulator (which needs a local Java runtime)
 * and without initializing the Admin SDK.
 */

interface FakeSnapshot {
  exists: boolean;
  id: string;
  data(): Record<string, unknown> | undefined;
}

class FakeDocRef {
  constructor(
    private readonly store: Map<string, Record<string, unknown>>,
    public readonly id: string,
    public readonly path: string
  ) {}

  async get(): Promise<FakeSnapshot> {
    const data = this.store.get(this.path);
    return {
      exists: data !== undefined,
      id: this.id,
      data: () => data
    };
  }

  async set(data: Record<string, unknown>): Promise<void> {
    this.store.set(this.path, data);
  }
}

class FakeCollectionRef {
  constructor(
    private readonly store: Map<string, Record<string, unknown>>,
    private readonly name: string,
    private readonly idCounter: { n: number }
  ) {}

  doc(id?: string): FakeDocRef {
    const docId = id ?? `auto-${this.name}-${this.idCounter.n++}`;
    return new FakeDocRef(this.store, docId, `${this.name}/${docId}`);
  }
}

class FakeWriteBatch {
  private readonly operations: Array<() => void> = [];

  constructor(private readonly store: Map<string, Record<string, unknown>>) {}

  set(ref: FakeDocRef, data: Record<string, unknown>): FakeWriteBatch {
    this.operations.push(() => this.store.set(ref.path, data));
    return this;
  }

  async commit(): Promise<void> {
    this.operations.forEach((op) => op());
  }
}

export class FakeFirestore {
  private readonly store = new Map<string, Record<string, unknown>>();
  private readonly idCounter = { n: 0 };

  collection(name: string): FakeCollectionRef {
    return new FakeCollectionRef(this.store, name, this.idCounter);
  }

  batch(): FakeWriteBatch {
    return new FakeWriteBatch(this.store);
  }

  /** Test setup helper: seed a document directly, bypassing the batch API. */
  seed(collection: string, id: string, data: Record<string, unknown>): void {
    this.store.set(`${collection}/${id}`, data);
  }

  /** Test assertion helper: read a document directly. */
  read(collection: string, id: string): Record<string, unknown> | undefined {
    return this.store.get(`${collection}/${id}`);
  }
}

/** Cast to the Admin SDK type the production code expects. */
export function asFirestore(fake: FakeFirestore): FirebaseFirestore.Firestore {
  return fake as unknown as FirebaseFirestore.Firestore;
}
