const {db_user,
    db_pass
} = process.env

module.exports = {
    cookieSecret: 'needsburstfifteensecret',
    mongo: {
        development: {
        connectionString: `mongodb://${db_user}:${encodeURIComponent(db_pass)}@ds019796.mlab.com:19796/jonsdb`,
        },
        production: {
        connectionString: `mongodb://${db_user}:${encodeURIComponent(db_pass)}@ds019796.mlab.com:19796/jonsdb`,
        },
        },
    };