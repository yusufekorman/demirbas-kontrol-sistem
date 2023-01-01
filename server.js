const express = require("express");
const app = express();
const cors = require("cors");
const { QuickDB } = require("quick.db");
const db = new QuickDB();

const TOKEN = "#8923509345093"

const STATUS_CODE_STATES = {
  SUCCESS: 0, //* Başarılı
  MISSING_DATA_ERROR: 1, //* Eksik veri gönderilmiş
  NONE_BODY_ERROR: 2, //* Veri gönderilmemiş
  RETURN_NONE_DATA_ERROR: 3, //* Geri döndürülecek veri yok
};

//setting view engine to ejs
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.sendFile(__dirname + '/public/index.html')
})


app.get("/assets/:filename", (req, res) => {
  res.sendFile(__dirname + '/public/assets/' + req.params.filename)
})

app.post("/demirbas_ozellik_duzenle", async (req, res) => {
  if (req.body) {
    if (req.body.token != TOKEN) return res.json({ message: "İzinsiz giriş!" })
    if (!req.body.id || !req.body.month_id || !req.body.attrs)
      return res.json({
        message: "İsim zorunlu bir parametre dir.",
        statusCode: STATUS_CODE_STATES.MISSING_DATA_ERROR,
      });

    const { id, month_id, attrs } = req.body;
    let allData = [];
    const datas = await db.get(`unit_${month_id}`);
    allData = datas.map(d => {
      if (d.id === id) {
        d.attrs = attrs;
      }

      return d;
    });
    
    await db.set(`unit_${month_id}`, allData);

    res.json({
      message: "Demirbaş özellikleri başarıyla düzenlendi.",
      statusCode: STATUS_CODE_STATES.SUCCESS,
    });
  } else {
    return res.json({
      message: "En azından veri gönderseydin?",
      statusCode: STATUS_CODE_STATES.NONE_BODY_ERROR,
    });
  }
});

app.post("/demirbas_listele", async (req, res) => {
  if (!req.body)
    return res.json({
      message: "Filtre yoksa cevap da yok krdşm",
      statusCode: STATUS_CODE_STATES.MISSING_DATA_ERROR,
    });

  if (req.body.token != TOKEN) return res.json({ message: "İzinsiz giriş!" })

  let response = [];
  let message = "";
  let statusCode = 0;

  let date = new Date();
  let year = date.getUTCFullYear().toString().slice(2).toString();
  let month = (
    date.getMonth() + 1 > 9 ? date.getMonth() + 1 : "0" + (date.getMonth() + 1)
  ).toString(); // returns 1 - 12

  switch (req.body.filter.type) {
    case "this_year": //? Bu yıl içinde eklenen bütün demirbaşları listeler.
      for (let i = 1; i <= 12; i++) {
        let mon = i > 9 ? i : "0" + i.toString();
        const has = await db.has(`unit_${year + "" + mon}`);
        if (has) {
          const data = await db.get(`unit_${year + "" + mon}`);
          response.push(...data);
        }
      }

      message = "Bu yıl içinde eklenen bütün demirbaşlar listelendi.";
      statusCode = STATUS_CODE_STATES.SUCCESS;
      break;

    case "this_month": //? Bu ay içinde eklenen bütün demirbaşları listeler.
      const has = await db.has(`unit_${year + month}`);
      if (has) {
        const data = await db.get(`unit_${year + month}`);
        response.push(...data);

        message = "Bu ay içinde eklenen bütün demirbaşlar listelendi.";
        statusCode = STATUS_CODE_STATES.SUCCESS;
      } else {
        message = "Veri yoh.";
        statusCode = STATUS_CODE_STATES.RETURN_NONE_DATA_ERROR;
      }
      break;

    case "year": //? Belirtilen yıl içinde eklenen bütün demirbaşları listeler.
      let filterValueYear1;
      try {
        filterValueYear1 = String(req.body.filter?.value) || year;
      } catch (error) {}

      for (let i = 1; i <= 12; i++) {
        let mon = i > 9 ? i : "0" + i.toString();
        const has = await db.has(`unit_${filterValueYear1 + mon}`);
        if (has) {
          const data = await db.get(`unit_${filterValueYear1 + mon}`);
          response.push(...data);

          message = "Bu yıl içinde eklenen bütün demirbaşlar listelendi.";
          statusCode = STATUS_CODE_STATES.SUCCESS;
        }
      }

      if (response.length === 0) {
        message = "Veri yoh.";
        statusCode = STATUS_CODE_STATES.RETURN_NONE_DATA_ERROR;
      }

      break;

    case "year_month": //? Belirtilen ay ve yıl içinde eklenen bütün demirbaşları listeler.
      let filterValueYear;
      let filterValueMonth;

      try {
        filterValueYear = String(req.body.filter?.value[0]) || year;
        filterValueMonth = String(req.body.filter?.value[1]) || month;
      } catch (error) {}

      const has1 = await db.has(`unit_${filterValueYear + filterValueMonth}`);
      if (has1) {
        const data = await db.get(`unit_${filterValueYear + filterValueMonth}`);
        response.push(...data);

        message = "Bu ay ve yıl içinde eklenen bütün demirbaşlar listelendi.";
        statusCode = STATUS_CODE_STATES.SUCCESS;
      } else {
        message = "Veri yoh.";
        statusCode = STATUS_CODE_STATES.RETURN_NONE_DATA_ERROR;
      }
      break;

    default:
      break;
  }

  res.json({
    data: response || [],
    message,
    statusCode,
  });
});

app.post("/yeni_demirbas", async (req, res) => {
  if (req.body) {
    if (req.body.token != TOKEN) return res.json({ message: "İzinsiz giriş!" })
    if (!req.body.name)
      return res.json({
        message: "İsim zorunlu bir parametre dir.",
        statusCode: STATUS_CODE_STATES.MISSING_DATA_ERROR,
      });
    if (!req.body.attrs)
      return res.json({
        message: "Özellikler zorunlu bir parametre dir.",
        statusCode: STATUS_CODE_STATES.MISSING_DATA_ERROR,
      });

    const { name, attrs } = req.body;

    let date = new Date();
    let month = (
      date.getMonth() + 1 > 9
        ? date.getMonth() + 1
        : "0" + (date.getMonth() + 1)
    ).toString(); // returns 1 - 12
    let year = date.getUTCFullYear().toString().slice(2).toString();

    const obj = {
      id: Date.now().toString(36),
      name,
      month_id: year + month,
      attrs,
    };

    await db.push(`unit_${year + month}`, obj);

    res.json({
      data: obj,
      message: "Demirbaş başarıyla eklendi.",
      statusCode: STATUS_CODE_STATES.SUCCESS,
    });
  } else {
    return res.json({
      message: "En azından veri gönderseydin?",
      statusCode: STATUS_CODE_STATES.NONE_BODY_ERROR,
    });
  }
});

app.post("/demirbas_sil", async (req, res) => {
  if (req.body) {
    if (req.body.token != TOKEN) return res.json({ message: "İzinsiz giriş!" })
    if (!req.body.id)
      return res.json({
        message: "ID zorunlu bir parametre dir.",
        statusCode: STATUS_CODE_STATES.MISSING_DATA_ERROR,
      });

    if (!req.body.month_id)
      return res.json({
        message: "Month ID zorunlu bir parametre dir.",
        statusCode: STATUS_CODE_STATES.MISSING_DATA_ERROR,
      });

    const unitData = await db.get(`unit_${req.body.month_id}`);
    await db.set(
      `unit_${req.body.month_id}`,
      unitData.filter((d) => d.id != req.body.id)
    );

    res.json({
      message: `${req.body.id} başarıyla silindi.`,
      statusCode: STATUS_CODE_STATES.SUCCESS,
    });
  }
});

app.listen(80, () => {
  console.log("Server is running on port 80 in localhost:80/#8923509345093");
});
