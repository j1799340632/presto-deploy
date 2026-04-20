import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import swaggerDocument from "../swagger.json" with { type: "json" };
import { AccessError, InputError } from "./error.js";
import {
  getEmailFromAuthorization,
  getStore,
  login,
  logout,
  register,
  save,
  setStore,
} from "./service.js";

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: "50mb" }));

const catchErrors = (fn) => async (req, res) => {
  try {
    await fn(req, res);
    await save();
  } catch (err) {
    if (err instanceof InputError) {
      res.status(400).send({ error: err.message });
    } else if (err instanceof AccessError) {
      res.status(403).send({ error: err.message });
    } else {
      console.log(err);
      res.status(500).send({ error: "A system error occurred" });
    }
  }
};

/***************************************************************
                       Auth Function
***************************************************************/

const authed = (fn) => async (req, res) => {
  const email = getEmailFromAuthorization(req.header("Authorization"));
  await fn(req, res, email);
};

app.post(
  "/admin/auth/login",
  catchErrors(async (req, res) => {
    const { email, password } = req.body;
    const token = await login(email, password);
    return res.json({ token });
  })
);

app.post(
  "/admin/auth/register",
  catchErrors(async (req, res) => {
    const { email, password, name } = req.body;
    const token = await register(email, password, name);
    return res.json({ token });
  })
);

app.post(
  "/admin/auth/logout",
  catchErrors(
    authed(async (req, res, email) => {
      await logout(email);
      return res.json({});
    })
  )
);

/***************************************************************
                       Store Functions
***************************************************************/

app.get(
  "/store",
  catchErrors(
    authed(async (req, res, email) => {
      const store = await getStore(email);
      return res.json({ store });
    })
  )
);

app.put(
  "/store",
  catchErrors(
    authed(async (req, res, email) => {
      await setStore(email, req.body.store);
      return res.json({});
    })
  )
);

/***************************************************************
                       Health Check
***************************************************************/

app.get("/ping", (req, res) => {
  return res.status(200).json({ ok: true });
});

/***************************************************************
                       Docs
***************************************************************/

app.get("/", (req, res) => res.redirect("/docs"));

app.get("/docs.json", (req, res) => {
  res.json(swaggerDocument);
});

app.get("/docs", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Swagger UI</title>
  <link
    rel="stylesheet"
    href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"
  />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: #fafafa;
    }
    #swagger-ui {
      max-width: 1200px;
      margin: 0 auto;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>

  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: "/docs.json",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>
  `);
});

/***************************************************************
                       Export (Vercel)
***************************************************************/

export default app;