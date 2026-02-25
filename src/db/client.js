const {Pool} = require("pg")

const client = new Pool({
    user: "rxform_user",
    host: "dpg-d6f7hqvgi27c73coe5lg-a.singapore-postgres.render.com",
    port: 5432,
    database: "rx_form_db",
    password: "N2JDgvjtn5TawG8J1gmWjRD8KDWeduYA"
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