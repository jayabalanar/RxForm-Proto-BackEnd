
const client = require("./db/client");
const express = require("express");
const cors = require("cors");
const { randomUUID } = require("crypto");
const { sendApprovalEmail } = require('./services/email-service');

const app = express();

require("dotenv").config();

app.use(cors());
app.use(express.json());



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

app.post("/send-form-email", async (req, res) => {
  try {
    const { to, formId, firstName } = req.body;
    if (!formId) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: formId",
      });
    }
    const toEmail = process.env.VITE_EMAIL_TO;
    if (!toEmail) {
      return res.status(400).json({
        success: false,
        message: "Missing recipient: provide 'to' in body or set EMAIL_TO / VITE_EMAIL_TO",
      });
    }
    let formData = await client.query(`SELECT form_data FROM RxForm WHERE form_id = $1`, [formId]);
    console.log(formData);
    console.log(formData.rows[0].form_data);
    let res = await sendApprovalEmail(toEmail, formData.rows[0].form_data);
    console.log(res);
    if(res){
      let status = res.httpStatusCode;
      if(status == 200){
        return { success: true, message: "Email sent", data: res };
      } else {
        return { success: false, message: "Failed to send email", data: res };
      }
    } else {
      return { success: false, message: "Failed to send email", data: res };
    }
    // const { subject, text, pdfBase64 } = await getApprovalEmailContent(formData.rows[0].form_data);
    // console.log(subject);
    // console.log(text);
    // console.log(pdfBase64.slice(0, 50));
    // await sendEmailWithAttachment(toEmail, subject, text, pdfBase64 || null);
  } catch (err) {
    console.error("send-form-email error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to send email",
    });
  }
});

app.listen(4000, (err) => {
  if (err) {
    return process.exit(1)
  }
  console.log(`RxForm Backend Running:`, 4000);
})