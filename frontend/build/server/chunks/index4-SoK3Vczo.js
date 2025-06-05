console.log("Database functionality has been migrated to the Go backend");
const dbProxy = new Proxy(
  {},
  {
    get: (target, prop) => {
      console.warn(`Attempted to access database method '${String(prop)}' directly. Database access is now handled by the Go backend.`);
      return (...args) => {
        console.warn(`Called database method '${String(prop)}' with args:`, args);
        console.warn("This is a no-op as database access is now handled by the Go backend.");
        return Promise.resolve([]);
      };
    }
  }
);
const db = dbProxy;

export { db as d };
//# sourceMappingURL=index4-SoK3Vczo.js.map
