const express = require("express");
const axios = require("axios");
const pool = require('../heatmap_db'); // pg Pool instance

const router = express.Router();

// URL of the API that gives building data
//const CCTV_API_URL ="http://172.20.10.3:5000/api/crowd_all"; //"http://10.90.249.214:5000/api/crowd_all";
//this is for local testing with sample_buildings.js
//add correct API URL when deploying
const CCTV_API_URL = "http://localhost:3000/api/buildings";

// Function to calculate heatmap color
function getHeatmapColor(current, capacity) {
  if (capacity <= 0) return "#cccccc"; // gray for invalid capacity
  const ratio = current / capacity;

  if (ratio <= 0.2) return "#00ff00"; // green
  if (ratio <= 0.4) return "#a0ff00"; // light green
  if (ratio <= 0.6) return "#ffff00"; // yellow
  if (ratio <= 0.8) return "#ffa500"; // orange
  return "#ff0000"; // red
}
function pick(obj, keys) {
  return keys.reduce((result, key) => {
    if (obj.hasOwnProperty(key)) {
      
      result[key] = obj[key];
    }
    return result;
  }, {});
}
async function fetchCapacities() {
  const capacityResult = await pool.query("SELECT building_id, building_capacity FROM buildings");
  const capacityMap = {};
  for (let row of capacityResult.rows) {
    capacityMap[row.building_id] = row.building_capacity;
  }
  return capacityMap;
}



// Route to serve map data with caching
router.get("/map-data", async (req, res) => {
  try {
    // 1️ Check if cached data is recent (less than 1 minutes)
    const dbResult = await pool.query("SELECT b.building_id,b.building_name,cs.current_crowd,cs.color,cs.status_timestamp FROM buildings b JOIN current_status cs ON b.building_id = cs.building_id");
    const now = new Date();
    const capacityMap = await fetchCapacities();

    let useCache = true;

    if (dbResult.rows.length > 0) {
      // check if any row is older than 1 minutes
      console.log("--------------------------------------");
      for (let row of dbResult.rows) {
        const diff = (now - new Date(row.status_timestamp)) / 1000 / 60; // diff in minutes
        console.log(`Building ${row.building_id} data age: ${diff.toFixed(2)} minutes`);
        if (diff > 1) {
          useCache = false;
          console.log(`Cache expired for building_id ${row.building_id}, fetching fresh data.`);
          break;
        }
      }
    } else {
      useCache = false; // no data in DB
    }

    if (useCache) {
      // Return cached data from DB
      return res.json({
        success: true,
        source: "Database Cache",
        data: dbResult.rows
      });
    }

    // 2️ Otherwise fetch from API
    console.log("Fetching fresh data from Buildings API...");
    const response = await axios.get(CCTV_API_URL);
    const buildings = response.data.data || response.data;
    
    const coloredBuildings = [];

    for (let building of buildings) {
      const color = getHeatmapColor(building.current_crowd, capacityMap[building.building_id] );
      const timestamp = new Date().toLocaleString();

      coloredBuildings.push({ ...pick(building, ["building_id","building_name", "current_crowd"]), color, status_timestamp: timestamp });

      // Insert or update current_status table
      await pool.query(
        `INSERT INTO current_status (building_id, current_crowd, color, status_timestamp)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (building_id)
         DO UPDATE SET current_crowd = EXCLUDED.current_crowd,
                       color = EXCLUDED.color,
                       status_timestamp = EXCLUDED.status_timestamp`,
        [building.building_id, building.current_crowd, color, timestamp]
      );
    }

    res.json({
      success: true,
      source: "Buildings API",
      data: coloredBuildings,
    });

  } catch (error) {
    console.error("Error fetching building data:", error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
});

module.exports = router;
