// Mongoose-to-PostgreSQL Compatibility Bridge
// Intercepts Mongoose model queries and translates them to PG Pool queries on Supabase Postgres.

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL || 'postgresql://postgres:W2UiPL8b2kBARJXQ@db.kpwhnpexuggkjpzduxoq.supabase.co:5432/postgres';

let pool;

function getPool() {
    if (!pool) {
        pool = new Pool({
            connectionString: SUPABASE_DB_URL,
            ssl: { rejectUnauthorized: false }
        });
        pool.on('error', (err) => {
            console.error('PostgreSQL client pool error:', err.message);
        });
    }
    return pool;
}

// Convert camelCase string to snake_case
function toSnake(str) {
    if (str === '_id') return 'id';
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Convert snake_case string to camelCase
function toCamel(str) {
    if (str === 'id') return '_id';
    return str.replace(/([-_][a-z])/g, group =>
        group.toUpperCase().replace('-', '').replace('_', '')
    );
}

// Map PostgreSQL row output to Mongoose document format
function mapRow(row) {
    if (!row) return null;
    const res = {};
    for (const k of Object.keys(row)) {
        res[toCamel(k)] = row[k];
    }
    if (row.id) {
        res._id = row.id;
    }
    return res;
}

// Deterministically pad 24-character hexadecimal ObjectIds to v4 UUIDs
function toUuid(oid) {
    if (!oid) return oid;
    if (typeof oid === 'string' && oid.length === 24 && /^[0-9a-fA-F]+$/.test(oid)) {
        return `00000000-${oid.slice(0, 4)}-${oid.slice(4, 8)}-${oid.slice(8, 12)}-${oid.slice(12)}`;
    }
    if (typeof oid === 'object' && oid.toString) {
        const s = oid.toString();
        if (s.length === 24) return toUuid(s);
    }
    return oid;
}

// Maps MongoDB tables to plural snake_case PostgreSQL tables
function getTableName(modelName) {
    const mappings = {
        Tenant: 'tenants',
        Branch: 'branches',
        Session: 'sessions',
        TurfSettings: 'turf_settings',
        Staff: 'staff',
        Coach: 'coaches',
        Student: 'students',
        Batch: 'batches',
        FeeStructure: 'fee_structures',
        Fee: 'fees',
        Booking: 'bookings',
        TurfClosure: 'turf_closures',
        Attendance: 'attendance',
        AuditLog: 'audit_logs',
        Enquiry: 'enquiries',
        InventoryItem: 'inventory_items',
        POSSale: 'pos_sales',
        ChatSession: 'chat_sessions',
        CheckInLog: 'check_in_logs'
    };
    return mappings[modelName] || `${modelName.toLowerCase()}s`;
}

// Parser that takes a MongoDB query object and produces SQL clauses + parameterized values
function parseQuery(queryObj) {
    const conditions = [];
    const values = [];
    let paramCounter = 1;

    if (!queryObj || typeof queryObj !== 'object') {
        return { whereClause: '', values: [] };
    }

    // Helper to process a single key-value query pair
    function processField(key, val) {
        const col = toSnake(key);
        const translatedVal = toUuid(val);

        if (translatedVal === null) {
            conditions.push(`${col} IS NULL`);
        } else if (typeof translatedVal === 'object' && !Array.isArray(translatedVal) && !(translatedVal instanceof Date)) {
            // It is an operator object like { $in: [...] } or { $lte: ... }
            for (const op of Object.keys(translatedVal)) {
                const opVal = toUuid(translatedVal[op]);
                if (op === '$in') {
                    conditions.push(`${col} = ANY($${paramCounter})`);
                    values.push(Array.isArray(opVal) ? opVal.map(toUuid) : [opVal]);
                    paramCounter++;
                } else if (op === '$nin') {
                    conditions.push(`NOT (${col} = ANY($${paramCounter}))`);
                    values.push(Array.isArray(opVal) ? opVal.map(toUuid) : [opVal]);
                    paramCounter++;
                } else if (op === '$lte') {
                    conditions.push(`${col} <= $${paramCounter}`);
                    values.push(opVal);
                    paramCounter++;
                } else if (op === '$gte') {
                    conditions.push(`${col} >= $${paramCounter}`);
                    values.push(opVal);
                    paramCounter++;
                } else if (op === '$lt') {
                    conditions.push(`${col} < $${paramCounter}`);
                    values.push(opVal);
                    paramCounter++;
                } else if (op === '$gt') {
                    conditions.push(`${col} > $${paramCounter}`);
                    values.push(opVal);
                    paramCounter++;
                } else if (op === '$ne') {
                    conditions.push(`${col} != $${paramCounter}`);
                    values.push(opVal);
                    paramCounter++;
                }
            }
        } else {
            // Simple equals
            conditions.push(`${col} = $${paramCounter}`);
            values.push(translatedVal);
            paramCounter++;
        }
    }

    for (const key of Object.keys(queryObj)) {
        if (key === '$or' && Array.isArray(queryObj.$or)) {
            const orConditions = [];
            for (const subQuery of queryObj.$or) {
                const subParsed = parseQuery(subQuery);
                if (subParsed.whereClause) {
                    // Re-index sub-parameters to match our parent counter
                    let sql = subParsed.whereClause;
                    const subVals = subParsed.values;
                    for (let i = 0; i < subVals.length; i++) {
                        const searchStr = `$${i + 1}`;
                        const replacementStr = `$${paramCounter}`;
                        // Replace occurrences of this parameter specifically
                        sql = sql.split(searchStr).join(replacementStr);
                        values.push(subVals[i]);
                        paramCounter++;
                    }
                    orConditions.push(`(${sql})`);
                }
            }
            if (orConditions.length > 0) {
                conditions.push(`(${orConditions.join(' OR ')})`);
            }
        } else {
            processField(key, queryObj[key]);
        }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, values };
}

// Chainable query object builder to replicate Mongoose's chainable API (.select, .sort, .limit, etc.)
class QueryBuilder {
    constructor(modelName, queryObj, operation) {
        this.modelName = modelName;
        this.tableName = getTableName(modelName);
        this.queryObj = queryObj;
        this.operation = operation; // 'find', 'findOne', 'count', 'delete'
        this._selectFields = null;
        this._sortFields = null;
        this._limitVal = null;
    }

    select(fields) {
        this._selectFields = fields;
        return this;
    }

    sort(fields) {
        this._sortFields = fields;
        return this;
    }

    limit(val) {
        this._limitVal = val;
        return this;
    }

    populate(fields) {
        // Mock populate since PostgreSQL doesn't natively populate sub-documents in-query.
        // Handled gracefully as a no-op chain step.
        return this;
    }

    then(onFulfilled, onRejected) {
        return this.execute().then(onFulfilled, onRejected);
    }

    async execute() {
        const client = getPool();
        const { whereClause, values } = parseQuery(this.queryObj);

        if (this.operation === 'count') {
            const sql = `SELECT COUNT(*) FROM ${this.tableName} ${whereClause}`;
            const res = await client.query(sql, values);
            return parseInt(res.rows[0].count, 10);
        }

        let selectCols = '*';
        if (this._selectFields && typeof this._selectFields === 'string') {
            const fields = this._selectFields.split(' ').map(f => f.trim()).filter(f => f && !f.startsWith('-'));
            if (fields.length > 0) {
                selectCols = fields.map(toSnake).join(', ');
            }
        }

        let orderClause = '';
        if (this._sortFields) {
            if (typeof this._sortFields === 'string') {
                const parts = this._sortFields.split(' ').filter(Boolean);
                const orderParts = parts.map(p => {
                    if (p.startsWith('-')) {
                        return `${toSnake(p.slice(1))} DESC`;
                    }
                    return `${toSnake(p)} ASC`;
                });
                orderClause = `ORDER BY ${orderParts.join(', ')}`;
            } else if (typeof this._sortFields === 'object') {
                const orderParts = Object.keys(this._sortFields).map(k => {
                    const dir = this._sortFields[k] === -1 ? 'DESC' : 'ASC';
                    return `${toSnake(k)} ${dir}`;
                });
                orderClause = `ORDER BY ${orderParts.join(', ')}`;
            }
        }

        let limitClause = '';
        if (this._limitVal !== null) {
            limitClause = `LIMIT ${this._limitVal}`;
        } else if (this.operation === 'findOne') {
            limitClause = `LIMIT 1`;
        }

        const sql = `SELECT ${selectCols} FROM ${this.tableName} ${whereClause} ${orderClause} ${limitClause}`;
        const res = await client.query(sql, values);

        if (this.operation === 'findOne') {
            return res.rows.length > 0 ? new Document(this.modelName, mapRow(res.rows[0])) : null;
        }

        return res.rows.map(row => new Document(this.modelName, mapRow(row)));
    }
}

// Replicates the returned Mongoose document wrapper, supporting save(), compares, and virtual IDs
class Document {
    constructor(modelName, properties = {}) {
        this._modelName = modelName;
        this._tableName = getTableName(modelName);
        this._isModifiedMap = new Set();

        for (const k of Object.keys(properties)) {
            this[k] = properties[k];
        }

        if (properties._id) {
            this._id = properties._id;
        }

        // Define getters/setters for properties to intercept modifications
        const self = this;
        for (const k of Object.keys(properties)) {
            if (k === '_id' || k === 'id') continue;
            let val = properties[k];
            Object.defineProperty(this, k, {
                get() { return val; },
                set(newVal) {
                    if (val !== newVal) {
                        val = newVal;
                        self._isModifiedMap.add(k);
                    }
                },
                enumerable: true,
                configurable: true
            });
        }
    }

    get id() {
        return this._id || this.id;
    }

    isModified(field) {
        return this._isModifiedMap.has(field);
    }

    // Compare passwords for Staff model documents
    async comparePassword(candidatePassword) {
        if (this._modelName !== 'Staff') {
            throw new Error('comparePassword is only available on Staff documents.');
        }
        return await bcrypt.compare(candidatePassword, this.password || '');
    }

    // Save changes back to Supabase
    async save() {
        const client = getPool();
        const uuid = toUuid(this._id);

        // Pre-save hook: Hash password for Staff document
        if (this._modelName === 'Staff' && (this.isModified('password') || !this.password?.startsWith('$2'))) {
            if (this.password) {
                const salt = await bcrypt.genSalt(10);
                this.password = await bcrypt.hash(this.password, salt);
            }
        }

        const keys = Object.keys(this).filter(k => !k.startsWith('_') && k !== 'id');
        const setClauses = [];
        const insertCols = ['id'];
        const insertVals = [uuid];
        const updateVals = [];
        let pCounter = 2;

        for (const k of keys) {
            const col = toSnake(k);
            const val = toUuid(this[k]);
            insertCols.push(col);
            insertVals.push(val);
            setClauses.push(`${col} = $${pCounter}`);
            updateVals.push(val);
            pCounter++;
        }

        if (uuid) {
            // Row already exists - perform UPDATE
            const sql = `UPDATE ${this._tableName} SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`;
            const res = await client.query(sql, [uuid, ...updateVals]);
            if (res.rows.length > 0) {
                const mapped = mapRow(res.rows[0]);
                for (const mk of Object.keys(mapped)) {
                    this[mk] = mapped[mk];
                }
            }
        } else {
            // Create new row - perform INSERT
            const generatedUuid = require('crypto').randomUUID();
            insertVals[0] = generatedUuid;
            const placeholders = insertCols.map((_, i) => `$${i + 1}`).join(', ');
            const sql = `INSERT INTO ${this._tableName} (${insertCols.join(', ')}) VALUES (${placeholders}) RETURNING *`;
            const res = await client.query(sql, insertVals);
            if (res.rows.length > 0) {
                const mapped = mapRow(res.rows[0]);
                for (const mk of Object.keys(mapped)) {
                    this[mk] = mapped[mk];
                }
                this._id = this.id;
            }
        }
        this._isModifiedMap.clear();
        return this;
    }

    toObject() {
        const res = {};
        for (const k of Object.keys(this)) {
            if (k.startsWith('_')) continue;
            res[k] = this[k];
        }
        res._id = this._id;
        return res;
    }

    toJSON() {
        return this.toObject();
    }
}

// Exposes standard model methods representing Mongoose ORM models
function createModel(modelName) {
    const tableName = getTableName(modelName);

    return {
        find(query = {}) {
            return new QueryBuilder(modelName, query, 'find');
        },

        findOne(query = {}) {
            return new QueryBuilder(modelName, query, 'findOne');
        },

        findById(id) {
            return this.findOne({ _id: id });
        },

        countDocuments(query = {}) {
            return new QueryBuilder(modelName, query, 'count');
        },

        async create(data) {
            const doc = new Document(modelName, data);
            return await doc.save();
        },

        async findOneAndUpdate(query, update, options = {}) {
            const doc = await this.findOne(query);
            if (!doc) {
                if (options.upsert) {
                    const mergedData = { ...query };
                    // Handle update operators like $set
                    const updateObj = update.$set || update;
                    for (const k of Object.keys(updateObj)) {
                        mergedData[k] = updateObj[k];
                    }
                    return await this.create(mergedData);
                }
                return null;
            }
            const updateObj = update.$set || update;
            for (const k of Object.keys(updateObj)) {
                doc[k] = updateObj[k];
            }
            return await doc.save();
        },

        async findByIdAndUpdate(id, update, options = {}) {
            return await this.findOneAndUpdate({ _id: id }, update, options);
        },

        async deleteOne(query) {
            const client = getPool();
            const { whereClause, values } = parseQuery(query);
            const sql = `DELETE FROM ${tableName} WHERE id IN (SELECT id FROM ${tableName} ${whereClause} LIMIT 1)`;
            const res = await client.query(sql, values);
            return { deletedCount: res.rowCount };
        },

        async deleteMany(query = {}) {
            const client = getPool();
            const { whereClause, values } = parseQuery(query);
            const sql = `DELETE FROM ${tableName} ${whereClause}`;
            const res = await client.query(sql, values);
            return { deletedCount: res.rowCount };
        },

        async findByIdAndDelete(id) {
            return await this.deleteOne({ _id: id });
        }
    };
}

// Expose fake Schema and ObjectId classes to support standard Mongoose definitions
class Schema {
    constructor(definition, options) {
        this.definition = definition;
        this.options = options;
        this.methods = {};
        this.statics = {};
    }

    pre(hook, fn) {
        // Handled custom pre hooks inside the Document wrapper
    }

    index(fields, options) {
        // Indices are pre-configured in PostgreSQL/Supabase directly
    }
}

const mongooseMock = {
    connect: async (uri) => {
        console.log('PostgreSQL compatibility bridge connecting to Supabase...');
        const pool = getPool();
        // Test connection
        await pool.query('SELECT 1');
        console.log('PostgreSQL/Supabase successfully connected.');
        return true;
    },

    disconnect: async () => {
        if (pool) {
            await pool.end();
            pool = null;
        }
    },

    Schema: Schema,

    model: (name, schema) => {
        return createModel(name);
    },

    Types: {
        ObjectId: (val) => val
    }
};

mongooseMock.Schema.Types = {
    ObjectId: 'ObjectId'
};

module.exports = mongooseMock;
