import { q as defaultWindow } from "./create-id.js";
import "clsx";
import { c as createSubscriber } from "./index-server.js";
function getStorage(storageType, window) {
  switch (storageType) {
    case "local":
      return window.localStorage;
    case "session":
      return window.sessionStorage;
  }
}
class PersistedState {
  #current;
  #key;
  #serializer;
  #storage;
  #subscribe;
  #version = 0;
  constructor(key, initialValue, options = {}) {
    const {
      storage: storageType = "local",
      serializer = {
        serialize: JSON.stringify,
        deserialize: JSON.parse
      },
      syncTabs = true
    } = options;
    const window = "window" in options ? options.window : defaultWindow;
    this.#current = initialValue;
    this.#key = key;
    this.#serializer = serializer;
    if (window === void 0) return;
    const storage = getStorage(storageType, window);
    this.#storage = storage;
    const existingValue = storage.getItem(key);
    if (existingValue !== null) {
      this.#current = this.#deserialize(existingValue);
    } else {
      this.#serialize(initialValue);
    }
    if (syncTabs && storageType === "local") {
      this.#subscribe = createSubscriber();
    }
  }
  get current() {
    this.#subscribe?.();
    this.#version;
    const storageItem = this.#storage?.getItem(this.#key);
    const root = storageItem ? this.#deserialize(storageItem) : this.#current;
    const proxies = /* @__PURE__ */ new WeakMap();
    const proxy = (value) => {
      if (value === null || value?.constructor.name === "Date" || typeof value !== "object") {
        return value;
      }
      let p = proxies.get(value);
      if (!p) {
        p = new Proxy(value, {
          get: (target, property) => {
            this.#version;
            return proxy(Reflect.get(target, property));
          },
          set: (target, property, value2) => {
            this.#version += 1;
            Reflect.set(target, property, value2);
            this.#serialize(root);
            return true;
          }
        });
        proxies.set(value, p);
      }
      return p;
    };
    return proxy(root);
  }
  set current(newValue) {
    this.#serialize(newValue);
    this.#version += 1;
  }
  #handleStorageEvent = (event) => {
    if (event.key !== this.#key || event.newValue === null) return;
    this.#current = this.#deserialize(event.newValue);
    this.#version += 1;
  };
  #deserialize(value) {
    try {
      return this.#serializer.deserialize(value);
    } catch (error) {
      console.error(`Error when parsing "${value}" from persisted store "${this.#key}"`, error);
      return;
    }
  }
  #serialize(value) {
    try {
      if (value != void 0) {
        this.#storage?.setItem(this.#key, this.#serializer.serialize(value));
      }
    } catch (error) {
      console.error(`Error when writing value from persisted store "${this.#key}" to ${this.#storage}`, error);
    }
  }
}
const DEFAULT_PAGE_SIZES = {
  default: 10,
  containers: 10,
  images: 10,
  volumes: 10,
  networks: 10,
  stacks: 10
};
const tablePageSizes = new PersistedState("arcane-table-page-sizes", DEFAULT_PAGE_SIZES, {
  storage: "local",
  syncTabs: true
});
const tablePersistence = {
  // Get a page size value for a specific table
  getPageSize: (tableKey) => {
    return tablePageSizes.current[tableKey] || 10;
  },
  // Set a page size value for a specific table
  setPageSize: (tableKey, value) => {
    tablePageSizes.current = {
      ...tablePageSizes.current,
      [tableKey]: value
    };
  }
};
export {
  tablePersistence as t
};
