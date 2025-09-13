// routes/sample_buildings.js
const express = require("express");

const router = express.Router();

// Sample building data with building_id in B## format and id as integer
const sampleBuildings = [
    { id: 1, building_id: "C9", building_name: "Department of Computer Engineering", total_count: 40 },
      { id: 2, building_id: "C10", building_name: "Electrical and Electronic Workshop", total_count: 0 },
        { id: 3, building_id: "B1", building_name: "Department of Chemical and Process Engineering", total_count: 0 },
          { id: 4, building_id: "C8", building_name: "Department of Electrical and Electronic Engineering", total_count: 0 },
            { id: 5, building_id: "B2", building_name: "Mathematics/Management/Computing Centre", total_count: 0 },
              { id: 6, building_id: "C11/C12", building_name: "Surveying/Soil Lab", total_count: 0 },
                { id: 7, building_id: "C13", building_name: "Materials Lab", total_count: 0 },
                  { id: 8, building_id: "D16/D17", building_name: "New/Applied Mechanics Labs", total_count: 70 },
                    { id: 9, building_id: "D18", building_name: "Thermodynamics Lab", total_count: 0 },
                      { id: 10, building_id: "D20/D21", building_name: "Engineering Workshop/Engineering Carpentry Shop", total_count: 0 },
                        { id: 11, building_id: "A22", building_name: "Drawing Office 2", total_count: 0 },
                          { id: 12, building_id: "A25", building_name: "Structures Laboratory", total_count: 0 },
                            { id: 13, building_id: "D15", building_name: "Fluids Lab", total_count: 0 },
                              { id: 14, building_id: "B3", building_name: "Drawing Office 1", total_count: 0 },
                                { id: 15, building_id: "B4", building_name: "Professor E.O.E. Pereira Theatre", total_count: 0 },
                                  { id: 16, building_id: "B5", building_name: "Administrative Building", total_count: 0 },
                                    { id: 17, building_id: "B6", building_name: "Security Unit", total_count: 0 },
                                      { id: 18, building_id: "A28", building_name: "Department of Manufacturing and Industrial Engineering", total_count: 0 },
]

// Route to return building data
router.get("/buildings", (req, res) => {
  res.json({
    success: true,
    count: sampleBuildings.length,
    data: sampleBuildings,
  });
});

module.exports = router;
