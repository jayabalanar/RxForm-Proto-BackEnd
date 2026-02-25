const {Pool} = require("pg")
require('dotenv').config();
const client = new Pool({
    user: process.env.user,
    host: process.env.host,
    port: process.env.port,
    database: process.env.database,
    password: process.env.password,
    ssl: true
})
// const client = new Pool({
//     user: "postgres",
//     host: "localhost",
//     port: 5432,
//     database: "RxFormDB",
//     password: "root"
// })

module.exports = {
    query: (text, params) => client.query(text, params)
}