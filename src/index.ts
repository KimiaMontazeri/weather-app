import axios from "axios";
import { createClient, RedisClientType, RedisClientOptions } from "redis";
import express, { Request, Response } from "express";

const PORT: number = parseInt(process.env.PORT || "3000", 10);
const REDIS_PORT: number = parseInt(process.env.REDIS_PORT || "6379", 10);
const REDIS_HOST: string = process.env.REDIS_HOST || "redis";
const REDIS_EXPIRATION: number = parseInt(
  process.env.REDIS_EXPIRATION || "30",
  10
); // in seconds
const API_KEY: string =
  process.env.API_KEY || "ff8c5ab4b4mshd67ebae6539aed1p10679ajsn0f607079bcaf";
const CITY: string = process.env.CITY || "Tehran";

const redisClient = createClient({
  socket: {
    host: REDIS_HOST,
    port: REDIS_PORT,
  },
});

const API_ENDPOINT: string =
  "https://weather-by-api-ninjas.p.rapidapi.com/v1/weather";

interface WeatherData {
  maxTemp: number;
  minTemp: number;
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
  const result = await redisClient.get(city);
  if (result) {
    const { maxTemp, minTemp } = JSON.parse(result);
    // const now = Date.now();

    // if (now - timestamp < REDIS_EXPIRATION * 1000) {
    //   console.log(`Using cached data for ${city}`);
    //   callback({ maxTemp, minTemp });
    // } else {
    //   console.log(`Cache expired for ${city}`);
    //   callback(null);
    // }

    console.log(`Using cached data for ${city}`);
    callback({ maxTemp, minTemp });
  }
  console.log(`No cache found for ${city}`);
  callback(null);
}

function cacheWeather(city: string, maxTemp: number, minTemp: number): void {
  const data: WeatherData = {
    maxTemp,
    minTemp,
  };

  redisClient.setEx(city, REDIS_EXPIRATION, JSON.stringify(data));
  redisClient.expire(city, REDIS_EXPIRATION);
}

const app: express.Application = express();

app.get("/", async (req: Request, res: Response) => {
  //   const city: string = req.params.city;
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
        const { max_temp, min_temp } = response.data.data[0];

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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
