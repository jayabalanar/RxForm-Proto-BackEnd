
const client = require("./db/client");
const express = require("express")
const cors = require("cors")
const { randomUUID } = require("crypto")

const app = express()

require("dotenv").config()

app.use(cors())
app.use(express.json())



app.get("/get-patient", async (req, res) => {
  try {
    const result = await client.query(`
        SELECT 
          form_data->>'firstName'      AS "firstName",
          form_data->>'lastName'       AS "lastName",
          form_data->> 'patientImage'  AS "patientImage",
          form_data->>'gender'         AS "gender",
          form_data->>'age'            AS "age",
          form_data->>'formType'       AS "formType",
          form_data->>'lastUpdatedAt'  AS "lastUpdatedAt",
          form_data->>'status'         AS "status",
          *
        FROM RxForm
        ORDER BY form_data->>'lastUpdatedAt' DESC
      `);

    res.status(200).json({
      success: true,
      data: result.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch patients"
    });
  }
});

app.post("/post-prescription", async (req, res) => {
  try {
    const payload = req.body;

    const {
      formData
    } = payload;
    console.log(formData);
    
    if (formData?.formId == null) {

      const result = await client.query(
        `INSERT INTO RxForm 
          (form_id, form_data) 
          VALUES ($1, $2)
          RETURNING *`,
        [randomUUID(), formData]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0]
      });
    }
    else {
      const result = await client.query(
        `UPDATE RxForm 
        SET form_data = ($1)
        WHERE form_id = ($2)
          RETURNING *`,
        [formData, formData?.formId]
      );
  
      res.status(200).json({
        success: true,
        data: result.rows[0]
      });

    }

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to insert prescription"
    });
  }
});

app.listen(3000, (err) => {
  if (err) {
    return process.exit(1)
  }
  console.log(`RxForm Backend Running:`, 3000);
})