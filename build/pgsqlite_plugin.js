(function() {
  var callbacks, cbref, counter, getOptions, root;
  root = this;
  callbacks = {};
  counter = 0;
  cbref = function(hash) {
    var f;
    f = "cb" + (counter += 1);
    callbacks[f] = hash;
    return f;
  };
  getOptions = function(opts, success, error) {
    var cb, has_cbs;
    cb = {};
    has_cbs = false;
    if (typeof success === "function") {
      has_cbs = true;
      cb.success = success;
    }
    if (typeof error === "function") {
      has_cbs = true;
      cb.error = error;
    }
    if (has_cbs) {
      opts.callback = cbref(cb);
    }
    return opts;
  };
  root.PGSQLitePlugin = (function() {
    PGSQLitePlugin.prototype.SQLITE_OK = 0;
    PGSQLitePlugin.prototype.SQLITE_ERROR = 1;
    PGSQLitePlugin.prototype.SQLITE_INTERNAL = 2;
    PGSQLitePlugin.prototype.SQLITE_PERM = 3;
    PGSQLitePlugin.prototype.SQLITE_ABORT = 4;
    PGSQLitePlugin.prototype.SQLITE_BUSY = 5;
    PGSQLitePlugin.prototype.SQLITE_LOCKED = 6;
    PGSQLitePlugin.prototype.SQLITE_NOMEM = 7;
    PGSQLitePlugin.prototype.SQLITE_READONLY = 8;
    PGSQLitePlugin.prototype.SQLITE_INTERRUPT = 9;
    PGSQLitePlugin.prototype.SQLITE_IOERR = 10;
    PGSQLitePlugin.prototype.SQLITE_CORRUPT = 11;
    PGSQLitePlugin.prototype.SQLITE_NOTFOUND = 12;
    PGSQLitePlugin.prototype.SQLITE_FULL = 13;
    PGSQLitePlugin.prototype.SQLITE_CANTOPEN = 14;
    PGSQLitePlugin.prototype.SQLITE_PROTOCOL = 15;
    PGSQLitePlugin.prototype.SQLITE_EMPTY = 16;
    PGSQLitePlugin.prototype.SQLITE_SCHEMA = 17;
    PGSQLitePlugin.prototype.SQLITE_TOOBIG = 18;
    PGSQLitePlugin.prototype.SQLITE_CONSTRAINT = 19;
    PGSQLitePlugin.prototype.SQLITE_MISMATCH = 20;
    PGSQLitePlugin.prototype.SQLITE_MISUSE = 21;
    PGSQLitePlugin.prototype.SQLITE_NOLFS = 22;
    PGSQLitePlugin.prototype.SQLITE_AUTH = 23;
    PGSQLitePlugin.prototype.SQLITE_FORMAT = 24;
    PGSQLitePlugin.prototype.SQLITE_RANGE = 25;
    PGSQLitePlugin.prototype.SQLITE_NOTADB = 26;
    PGSQLitePlugin.prototype.SQLITE_ROW = 100;
    PGSQLitePlugin.prototype.SQLITE_DONE = 101;
    PGSQLitePlugin.prototype.openDBs = {};
    function PGSQLitePlugin(dbPath, openSuccess, openError) {
      this.dbPath = dbPath;
      this.openSuccess = openSuccess;
      this.openError = openError;
      if (!dbPath) {
        throw new Error("Cannot create a PGSQLitePlugin instance without a dbPath");
      }
      this.openSuccess || (this.openSuccess = function() {
        console.log("DB opened: " + dbPath);
      });
      this.openError || (this.openError = function(e) {
        console.log(e.message);
      });
      this.open(this.openSuccess, this.openError);
    }
    PGSQLitePlugin.handleCallback = function(ref, type, obj) {
      var _ref;
      if ((_ref = callbacks[ref]) != null) {
        if (typeof _ref[type] === "function") {
          _ref[type](obj);
        }
      }
      callbacks[ref] = null;
      delete callbacks[ref];
    };
    PGSQLitePlugin.prototype.executeSql = function(sql, success, error) {
      var opts;
      if (!sql) {
        throw new Error("Cannot executeSql without a query");
      }
      opts = getOptions({
        query: [].concat(sql || []),
        path: this.dbPath
      }, success, error);
      PhoneGap.exec("PGSQLitePlugin.backgroundExecuteSql", opts);
    };
    PGSQLitePlugin.prototype.transaction = function(fn, success, error) {
      var t;
      t = new root.PGSQLitePluginTransaction(this.dbPath);
      fn(t);
      return t.complete(success, error);
    };
    PGSQLitePlugin.prototype.open = function(success, error) {
      var opts;
      if (!(this.dbPath in this.openDBs)) {
        this.openDBs[this.dbPath] = true;
        opts = getOptions({
          path: this.dbPath
        }, success, error);
        PhoneGap.exec("PGSQLitePlugin.open", opts);
      }
    };
    PGSQLitePlugin.prototype.close = function(success, error) {
      var opts;
      if (this.dbPath in this.openDBs) {
        delete this.openDBs[this.dbPath];
        opts = getOptions({
          path: this.dbPath
        }, success, error);
        PhoneGap.exec("PGSQLitePlugin.close", opts);
      }
    };
    PGSQLitePlugin.prototype.purge = function(success, error) {
      var opts;
      opts = getOptions({
        path: this.dbPath
      }, success, error);
      PhoneGap.exec("PGSQLitePlugin.purge", opts);
    };
    PGSQLitePlugin.prototype.onError = function(e) {};
    return PGSQLitePlugin;
  })();
  root.PGSQLitePluginTransaction = (function() {
    function PGSQLitePluginTransaction(dbPath) {
      this.dbPath = dbPath;
      this.executes = [];
    }
    PGSQLitePluginTransaction.prototype.executeSql = function(sql, success, error) {
      this.executes.push(getOptions({
        query: [].concat(sql || []),
        path: this.dbPath
      }, success, error));
    };
    PGSQLitePluginTransaction.prototype.complete = function(success, error) {
      var begin_opts, commit_opts, executes, opts;
      if (this.__completed) {
        throw new Error("Transaction already run");
      }
      this.__completed = true;
      begin_opts = getOptions({
        query: ["BEGIN;"],
        path: this.dbPath
      });
      commit_opts = getOptions({
        query: ["COMMIT;"],
        path: this.dbPath
      }, success, error);
      executes = [begin_opts].concat(this.executes).concat([commit_opts]);
      opts = {
        executes: executes
      };
      PhoneGap.exec("PGSQLitePlugin.backgroundExecuteSqlBatch", opts);
      this.executes = [];
    };
    return PGSQLitePluginTransaction;
  })();
}).call(this);
