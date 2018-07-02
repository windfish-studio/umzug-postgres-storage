var UmzugPostgresStorage = require("./dist/umzug-postgres-storage.js");
var tape = require('tape');

var storage = new UmzugPostgresStorage({
    database: {
        database: "umzug_postgres_storage",
        user: "app",
        password: "catbakescookies",
        host: "localhost",
        port: 5432
    },
    relation: 'umzug_meta',
    column: 'name'
});

storage.safeQuery(`TRUNCATE umzug_meta CASCADE;`).then(function () {

    tape("logMigration should log the migration", function (t) {
        storage.logMigration('001_firstMigration').then(function () {
            storage.safeQuery(`
            SELECT name FROM umzug_meta;
        `).then(function (result) {
                t.deepEqual(result.rows, [
                    {name: '001_firstMigration'}
                ]);

                t.end();
            });
        });
    });

    tape("logMigration should log a second migration", function (t) {
        storage.logMigration('002_secondMigration').then(function () {
            storage.safeQuery(`
            SELECT name FROM umzug_meta;
        `).then(function (result) {
                t.deepEqual(result.rows, [
                    {name: '001_firstMigration'},
                    {name: '002_secondMigration'}
                ]);

                t.end();
            });
        });
    });

    tape("logMigration should not log a duplicate migration", function (t) {
        storage.logMigration('002_secondMigration').then(function(){
            return storage.logMigration('003_thirdMigration');
        }).then(function () {
            storage.safeQuery(`
            SELECT name FROM umzug_meta;
        `).then(function (result) {
                t.deepEqual(result.rows, [
                    {name: '001_firstMigration'},
                    {name: '002_secondMigration'},
                    {name: '003_thirdMigration'}
                ]);

                t.end();
            });
        });
    });

    tape("unlogMigration should remove a migration row", function (t) {
        storage.unlogMigration('003_thirdMigration').then(function () {
            storage.safeQuery(`
            SELECT name FROM umzug_meta;
        `).then(function (result) {
                t.deepEqual(result.rows, [
                    {name: '001_firstMigration'},
                    {name: '002_secondMigration'}
                ]);

                t.end();
            });
        });
    });

    tape("executed should return a list of executed migrations", function (t) {
        storage.executed().then(function (executed_ar) {
            t.deepEqual(executed_ar, [
                '001_firstMigration',
                '002_secondMigration'
            ]);

            t.end();


        });
    });
});