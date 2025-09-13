const express = require("express");
const axios = require("axios");
const pool = require('../heatmap_db'); // pg Pool instance

const router = express.Router();

// URL of the API that gives building data
//const CCTV_API_URL ="http://172.20.10.3:5000/api/crowd_all"; //"http://10.90.249.214:5000/api/crowd_all";
//this is for local testing with sample_buildings.js
//add correct API URL when deploying
const CCTV_API_URL = "http://localhost:3000/api/buildings";
// Define API base URL
const API_BASE_URL = "https://ynqcwlpuzgcdqoslmgqy.supabase.co/rest/v1";

// Define headers
const headers = {
  apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlucWN3bHB1emdjZHFvc2xtZ3F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMzI3NzAsImV4cCI6MjA3MjkwODc3MH0.R5iu6lfMuQy6monisDOUA2sf6_94ZIzFDiC0QJK_OZg",
  Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlucWN3bHB1emdjZHFvc2xtZ3F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMzI3NzAsImV4cCI6MjA3MjkwODc3MH0.R5iu6lfMuQy6monisDOUA2sf6_94ZIzFDiC0QJK_OZg"
};

function getMapID(building_id) {
  switch (building_id) {
    case "C9":        return "B20";
    case "C10":       return "B19";
    case "B1":        return "B11";
    case "C8":        return "B34";
    case "B2":        return "B32";
    case "C11/C12":   return "B31";
    case "C13":       return "B28";
    case "D16/D17":   return "B24";
    case "D18":       return "B29";
    case "D20/D21":   return "B2";
    case "A22":       return "B13";
    case "A25":       return "B6";
    case "D15":       return "B30";
    case "B3":        return "B33";
    case "B4":        return "B16";
    case "B5":        return "B7";
    case "B6":        return "B12";
    case "A28":       return "B15";
    default:          return building_id;
  }
}

//module.exports = getMapID;

// Function to calculate heatmap color
function getHeatmapColor(current, capacity) {
  if (capacity <= 0) return "#cccccc"; // gray for invalid capacity
  const ratio = current / capacity;

  if (ratio < 0.2) return "#22c55e"; // green
  if (ratio < 0.5) return "#eab308"; // light green
  if (ratio < 0.8) return "#f97316"; // yellow
  //if (ratio < 0.9) return "#ef4444"; // orange
  return "#ef4444"; // red
}
function pick(obj, keys) {
  return keys.reduce((result, key) => {
    if (obj.hasOwnProperty(key)) {
      if(key=="Build_Name") result["building_name"] = obj[key];
      if(key=="building_id") result["building_id"] = obj[key];
      if(key=="total_count") result["current_crowd"] = obj[key];
      
      //result[key] = obj[key];
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
    const dbResult = await pool.query("SELECT b.building_id,b.building_name,cs.current_crowd,b.building_capacity,cs.color,cs.status_timestamp FROM buildings b JOIN current_status cs ON b.building_id = cs.building_id");
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
    //const response = await axios.get(`${API_BASE_URL}/BUILDING`, { headers });


    const buildings = response.data.data || response.data;
    //console.log(`Fetched ${buildings} buildings from API.`);
    
    const coloredBuildings = [];

    for (let building of buildings) {
      const color = getHeatmapColor(building.total_count, capacityMap[building.building_id] );
      const timestamp = new Date().toLocaleString();

      coloredBuildings.push({ ...pick(building, ["building_id","Build_Name", "total_count"]),building_capacity:capacityMap[building.building_id] , color, status_timestamp: timestamp });

      // Insert or update current_status table
      await pool.query(
        `INSERT INTO current_status (building_id, current_crowd, color, status_timestamp)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (building_id)
         DO UPDATE SET current_crowd = EXCLUDED.current_crowd,
                       color = EXCLUDED.color,
                       status_timestamp = EXCLUDED.status_timestamp`,
        [building.building_id, building.total_count, color, timestamp]
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

