import axios from "axios";
import { createClient } from "redis";
import express, { Request, Response } from "express";

// envs
const PORT: number = parseInt(process.env.PORT || "3000", 10);
const REDIS_HOST: string = process.env.REDIS_HOST || "redis";
const REDIS_EXPIRATION: number = parseInt(
  process.env.REDIS_EXPIRATION || "30",
  10
); // in seconds
const API_KEY: string =
  process.env.API_KEY || "ff8c5ab4b4mshd67ebae6539aed1p10679ajsn0f607079bcaf";
const CITY: string = process.env.CITY || "Tehran";

// constants
const REDIS_PORT = 6379;
const REDIS_URL = `redis://${REDIS_HOST}:${REDIS_PORT}`;

const redisClient = createClient({
  url: REDIS_URL,
});

const API_ENDPOINT: string =
  "https://weather-by-api-ninjas.p.rapidapi.com/v1/weather";

interface WeatherData {
  maxTemp: number;
  minTemp: number;
}

async function connectToRedisClient() {
  await redisClient
    .connect()
    .then(() => {
      console.log("Successfully connected to redis.");
    })
    .catch((error) => {
      throw new Error(error);
    });
}

function getWeather(city: string): Promise<any> {
  return axios.get(API_ENDPOINT, {
    params: { city },
    headers: {
      "X-RapidAPI-Key": API_KEY,
    },
  });
}

async function getCachedWeather(
  city: string,
  callback: (cachedData: WeatherData | null) => void
): Promise<void> {
  await redisClient
    .get(city)
    .then((result) => {
      if (result) {
        const { maxTemp, minTemp } = JSON.parse(result);
        console.log(`Using cached data for ${city}`);
        callback({ maxTemp, minTemp });
      } else {
        callback(null);
      }
    })
    .catch((error) => {
      console.log(`No cache found for ${city}. ${error}`);
      callback(null);
    });
}

async function cacheWeather(
  city: string,
  maxTemp: number,
  minTemp: number
): Promise<void> {
  const data: WeatherData = {
    maxTemp,
    minTemp,
  };

  await redisClient
    .setEx(city, REDIS_EXPIRATION, JSON.stringify(data))
    .then(() => {
      console.log(`Successfully cached weather data of ${city}`);
    })
    .catch((error) => {
      console.log(
        `Error ocurred while caching the weather of ${city}. ${error}`
      );
    });
}

const app: express.Application = express();

app.get("/", async (req: Request, res: Response) => {
  const city = CITY;

  getCachedWeather(city, async (cachedData) => {
    if (cachedData) {
      res.send({
        maxTemp: cachedData.maxTemp,
        minTemp: cachedData.minTemp,
      });
    } else {
      try {
        const response = await getWeather(city);
        const { max_temp, min_temp } = response.data;

        res.send({
          maxTemp: max_temp,
          minTemp: min_temp,
        });

        cacheWeather(city, max_temp, min_temp);
      } catch (error) {
        console.error(`Error fetching weather data: ${error}`);
        res.status(500).send({ error: "Internal Server Error" });
      }
    }
  });
});

connectToRedisClient();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
