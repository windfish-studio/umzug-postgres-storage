import q from 'q';
import pg from 'pg';

class UmzugPostgresStorage {
    constructor(config){

        if(config.storageOptions){
            config = config.storageOptions;
        }

        //establish the dbconnection and store in a promise.
        this.config = config;
    }

    dbConn(){
        if (this.dbConnPromise) return this.dbConnPromise
        return this.dbConnPromise = new q.Promise(function (resolve, reject) {
            var pool = new pg.Pool(this.config.database);
            pool.connect(function (err, client, done) {
                resolve({
                    client: client, done: done, pool: pool
                });
            }.bind(this));
        }.bind(this));
    }

    createMetaTableIfNotExists() {
        return this.dbConn().then(function (_o) {
            var ret_p = _o.client.query(`
                CREATE TABLE IF NOT EXISTS ${this.config.relation} (
                    "${this.config.column}" character varying(255)
                );
            `);

            ret_p.then(function () {
               _o.done();
               _o.pool.end();
            });

            return ret_p;
        }.bind(this));
    }

    safeQuery(sql){
        return this.createMetaTableIfNotExists()
            .then(function () {
                return this.dbConn().then(function (_o) {
                    var query_p = _o.client.query(sql);
                    query_p.then(function () {
                        _o.done();
                        _o.pool.end();
                    });
                    return query_p;
                });
            }.bind(this));
    }

    logMigration(migrationName) {
        var sql = `
            INSERT INTO ${this.config.relation}
                ("${this.config.column}")
            SELECT '${migrationName}'
            WHERE
            NOT EXISTS (
                SELECT "${this.config.column}" FROM ${this.config.relation} WHERE "${this.config.column}" = '${migrationName}' 
            );
        `;

        return this.safeQuery(sql);
    }

    unlogMigration(migrationName) {
        const sql = `
            DELETE FROM ${this.config.relation} 
            WHERE "${this.config.column}" = '${migrationName}' 
        `;

        return this.safeQuery(sql);
    }

    executed() {
        const sql = `
            SELECT "${this.config.column}" 
            FROM ${this.config.relation}  
            ORDER BY "${this.config.column}" ASC;
        `;

        return this.safeQuery(sql).then(function (result) {
            return result.rows.map(function (_o) {
                return _o[this.config.column];
            }.bind(this));
        }.bind(this));
    }

}

module.exports = UmzugPostgresStorage;
