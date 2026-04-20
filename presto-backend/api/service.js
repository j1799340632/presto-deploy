import AsyncLock from "async-lock";
import fs from "fs";
import jwt from "jsonwebtoken";
import { AccessError, InputError } from "./error.js";

const lock = new AsyncLock();

const JWT_SECRET = "llamallamaduck";
const DATABASE_FILE = "./database.json";
const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;
const USE_VERCEL_KV = !!KV_REST_API_URL && !!KV_REST_API_TOKEN;

/***************************************************************
                       State Management
***************************************************************/

let admins = {};

const update = async (admins) =>
  new Promise((resolve, reject) => {
    lock.acquire("saveData", async () => {
      try {
        if (USE_VERCEL_KV) {
          const response = await fetch(`${KV_REST_API_URL}/set/admins`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${KV_REST_API_TOKEN}`,
            },
            body: JSON.stringify({ admins }),
          });

          if (!response.ok) {
            return reject(new Error("Writing to Vercel KV failed"));
          }
        } else {
          fs.writeFileSync(
            DATABASE_FILE,
            JSON.stringify(
              {
                admins,
              },
              null,
              2
            )
          );
        }

        resolve();
      } catch (error) {
        console.log(error);
        reject(new Error("Writing to database failed"));
      }
    });
  });

export const save = () => update(admins);

export const reset = async () => {
  admins = {};
  await update(admins);
};

const init = async () => {
  try {
    if (USE_VERCEL_KV) {
      const response = await fetch(`${KV_REST_API_URL}/get/admins`, {
        headers: {
          Authorization: `Bearer ${KV_REST_API_TOKEN}`,
        },
      });

      if (!response.ok) {
        throw new Error("Reading from Vercel KV failed");
      }

      const data = await response.json();

      if (data.result) {
        const parsed = JSON.parse(data.result);
        admins = parsed.admins || {};
      } else {
        admins = {};
        await save();
      }
    } else {
      const data = JSON.parse(fs.readFileSync(DATABASE_FILE));
      admins = data.admins || {};
    }
  } catch (error) {
    console.log("WARNING: No database found, create a new one");
    admins = {};
    await save();
  }
};

await init();

/***************************************************************
                       Helper Functions
***************************************************************/

export const userLock = (callback) =>
  new Promise((resolve, reject) => {
    lock.acquire("userAuthLock", callback(resolve, reject));
  });

/***************************************************************
                       Auth Functions
***************************************************************/

export const getEmailFromAuthorization = (authorization) => {
  try {
    const token = authorization.replace("Bearer ", "");
    const { email } = jwt.verify(token, JWT_SECRET);
    if (!(email in admins)) {
      throw new AccessError("Invalid Token");
    }
    return email;
  } catch (error) {
    throw new AccessError("Invalid token");
  }
};

export const login = (email, password) =>
  userLock((resolve, reject) => {
    if (email in admins) {
      if (admins[email].password === password) {
        resolve(jwt.sign({ email }, JWT_SECRET, { algorithm: "HS256" }));
        return;
      }
    }
    reject(new InputError("Invalid username or password"));
  });

export const logout = (email) =>
  userLock((resolve, reject) => {
    admins[email].sessionActive = false;
    resolve();
  });

export const register = (email, password, name) =>
  userLock((resolve, reject) => {
    if (email in admins) {
      return reject(new InputError("Email address already registered"));
    }
    admins[email] = {
      name,
      password,
      store: {},
    };
    const token = jwt.sign({ email }, JWT_SECRET, { algorithm: "HS256" });
    resolve(token);
  });

/***************************************************************
                       Store Functions
***************************************************************/

export const getStore = (email) =>
  userLock((resolve) => {
    resolve(admins[email].store);
  });

export const setStore = (email, store) =>
  userLock((resolve) => {
    admins[email].store = store;
    resolve();
  });