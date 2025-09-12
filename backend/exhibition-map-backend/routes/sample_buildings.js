// routes/sample_buildings.js
const express = require("express");

const router = express.Router();

// Sample building data with building_id in B## format and id as integer
const sampleBuildings = [
  { id: 1, building_id: "B1", building_name: "Engineering Carpentry Shop", current_crowd: 30 },
  { id: 2, building_id: "B2", building_name: "Engineering Workshop", current_crowd: 10 },
  { id: 3, building_id: "B3", building_name: "", current_crowd: 0 },
  { id: 4, building_id: "B4", building_name: "Generator Room", current_crowd: 30 },
  { id: 5, building_id: "B5", building_name: "", current_crowd: 70 },
  { id: 6, building_id: "B6", building_name: "Structure Lab", current_crowd: 90 },
  { id: 7, building_id: "B7", building_name: "Administrative Building", current_crowd: 90 },
  { id: 8, building_id: "B8", building_name: "Canteen", current_crowd: 40 },
  { id: 9, building_id: "B9", building_name: "Lecture Room 10/11", current_crowd: 40 },
  { id: 10, building_id: "B10", building_name: "Engineering Library", current_crowd: 0 },
  { id: 11, building_id: "B11", building_name: "Department of Chemical and process Engineering", current_crowd: 0 },
  { id: 12, building_id: "B12", building_name: "Security Unit", current_crowd: 40 },
  { id: 13, building_id: "B13", building_name: "Drawing Office 2", current_crowd: 70 },
  { id: 14, building_id: "B14", building_name: "Faculty Canteen", current_crowd: 0 },
  { id: 15, building_id: "B15", building_name: "Department of Manufacturing and Industrial Engineering", current_crowd: 0 },
  { id: 16, building_id: "B16", building_name: "Professor E.O.E. Perera Theater", current_crowd: 50 },
  { id: 17, building_id: "B17", building_name: "Electronic Lab", current_crowd: 0 },
  { id: 18, building_id: "B18", building_name: "Washrooms", current_crowd: 0 },
  { id: 19, building_id: "B19", building_name: "Electrical and Electronic Workshop", current_crowd: 66 },
  { id: 20, building_id: "B20", building_name: "Department of Computer Engineering", current_crowd: 0 },
  { id: 21, building_id: "B21", building_name: "", current_crowd: 67 },
  { id: 22, building_id: "B22", building_name: "Environmental Lab", current_crowd: 33 },
  { id: 23, building_id: "B23", building_name: "Applied Mechanics Lab", current_crowd: 0 },
  { id: 24, building_id: "B24", building_name: "New Mechanics Lab", current_crowd: 80 },
  { id: 25, building_id: "B25", building_name: "", current_crowd: 100 },
  { id: 26, building_id: "B26", building_name: "", current_crowd: 0 },
  { id: 27, building_id: "B27", building_name: "", current_crowd: 0 },
  { id: 28, building_id: "B28", building_name: "Materials Lab", current_crowd: 0 },
  { id: 29, building_id: "B29", building_name: "Thermodynamics Lab", current_crowd: 0 },
  { id: 30, building_id: "B30", building_name: "Fluids Lab", current_crowd: 20 },
  { id: 31, building_id: "B31", building_name: "Surveying and Soil Lab", current_crowd: 0 },
  { id: 32, building_id: "B32", building_name: "Department of Engineering Mathematics", current_crowd: 68 },
  { id: 33, building_id: "B33", building_name: "Drawing Office 1", current_crowd: 0 },
  { id: 34, building_id: "B34", building_name: "Department of Electrical and Electronic Engineering ", current_crowd: 70 }
];

// Route to return building data
router.get("/buildings", (req, res) => {
  res.json({
    success: true,
    count: sampleBuildings.length,
    data: sampleBuildings,
  });
});

module.exports = router;
