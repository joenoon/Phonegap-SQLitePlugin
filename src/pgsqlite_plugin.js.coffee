# Copyright (C) 2011 Joe Noon <joenoon@gmail.com>

# This file is intended to be compiled by Coffeescript WITH the top-level function wrapper

root = this

callbacks = {}

counter = 0

cbref = (hash) ->
  f = "cb#{counter+=1}"
  callbacks[f] = hash
  f

getOptions = (opts, success, error) ->
  cb = {}
  has_cbs = false
  if typeof success == "function"
    has_cbs = true
    cb.success = success
  if typeof error == "function"
    has_cbs = true
    cb.error = error
  opts.callback = cbref(cb) if has_cbs
  opts
  
class root.PGSQLitePlugin

  SQLITE_OK          :   0   # Successful result
  SQLITE_ERROR       :   1   # SQL error or missing database
  SQLITE_INTERNAL    :   2   # Internal logic error in SQLite
  SQLITE_PERM        :   3   # Access permission denied
  SQLITE_ABORT       :   4   # Callback routine requested an abort
  SQLITE_BUSY        :   5   # The database file is locked
  SQLITE_LOCKED      :   6   # A table in the database is locked
  SQLITE_NOMEM       :   7   # A malloc() failed
  SQLITE_READONLY    :   8   # Attempt to write a readonly database
  SQLITE_INTERRUPT   :   9   # Operation terminated by sqlite3_interrupt()
  SQLITE_IOERR       :  10   # Some kind of disk I/O error occurred
  SQLITE_CORRUPT     :  11   # The database disk image is malformed
  SQLITE_NOTFOUND    :  12   # Unknown opcode in sqlite3_file_control()
  SQLITE_FULL        :  13   # Insertion failed because database is full
  SQLITE_CANTOPEN    :  14   # Unable to open the database file
  SQLITE_PROTOCOL    :  15   # Database lock protocol error
  SQLITE_EMPTY       :  16   # Database is empty
  SQLITE_SCHEMA      :  17   # The database schema changed
  SQLITE_TOOBIG      :  18   # String or BLOB exceeds size limit
  SQLITE_CONSTRAINT  :  19   # Abort due to constraint violation
  SQLITE_MISMATCH    :  20   # Data type mismatch
  SQLITE_MISUSE      :  21   # Library used incorrectly
  SQLITE_NOLFS       :  22   # Uses OS features not supported on host
  SQLITE_AUTH        :  23   # Authorization denied
  SQLITE_FORMAT      :  24   # Auxiliary database format error
  SQLITE_RANGE       :  25   # 2nd parameter to sqlite3_bind out of range
  SQLITE_NOTADB      :  26   # File opened that is not a database file
  SQLITE_ROW         : 100   # sqlite3_step() has another row ready
  SQLITE_DONE        : 101   # sqlite3_step() has finished executing
    
  # All instances will interact directly on the prototype openDBs object.
  # One instance that closes a db path will remove it from any other instance's perspective as well.
  openDBs: {}
  
  constructor: (@dbPath, @openSuccess, @openError) ->
    throw new Error "Cannot create a PGSQLitePlugin instance without a dbPath" unless dbPath
    @openSuccess ||= () ->
      console.log "DB opened: #{dbPath}"
      return
    @openError ||= (e) ->
      console.log e.message
      return
    @open(@openSuccess, @openError)
  
  # Note: Class method
  @handleCallback: (ref, type, obj) ->
    callbacks[ref]?[type]?(obj)
    callbacks[ref] = null
    delete callbacks[ref]
    return
    
  executeSql: (sql, success, error) ->
    throw new Error "Cannot executeSql without a query" unless sql
    opts = getOptions({ query: [].concat(sql || []), path: @dbPath }, success, error)
    PhoneGap.exec("PGSQLitePlugin.backgroundExecuteSql", opts)
    return

  transaction: (fn, success, error) ->
    t = new root.PGSQLitePluginTransaction(@dbPath)
    fn(t)
    t.complete(success, error)
    
  open: (success, error) ->
    unless @dbPath of @openDBs
      @openDBs[@dbPath] = true
      opts = getOptions({ path: @dbPath }, success, error)
      PhoneGap.exec("PGSQLitePlugin.open", opts)
    return
  
  close: (success, error) ->
    if @dbPath of @openDBs
      delete @openDBs[@dbPath]
      opts = getOptions({ path: @dbPath }, success, error)
      PhoneGap.exec("PGSQLitePlugin.close", opts)
    return
  
  purge: (success, error) ->
    opts = getOptions({ path: @dbPath }, success, error)
    PhoneGap.exec("PGSQLitePlugin.purge", opts)
    return
  
  onError: (e) ->

class root.PGSQLitePluginTransaction
  
  constructor: (@dbPath) ->
    @executes = []
    
  executeSql: (sql, success, error) ->
    @executes.push getOptions({ query: [].concat(sql || []), path: @dbPath }, success, error)
    return
  
  complete: (success, error) ->
    throw new Error "Transaction already run" if @__completed
    @__completed = true
    begin_opts = getOptions({ query: [ "BEGIN;" ], path: @dbPath })
    commit_opts = getOptions({ query: [ "COMMIT;" ], path: @dbPath }, success, error)
    executes = [ begin_opts ].concat(@executes).concat([ commit_opts ])
    opts = { executes: executes }
    PhoneGap.exec("PGSQLitePlugin.backgroundExecuteSqlBatch", opts)
    @executes = []
    return

