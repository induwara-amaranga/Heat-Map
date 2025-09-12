// dev-server.js  (ESM; Node 18+)
// If your package.json doesn't have "type":"module", switch imports to require(...)
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/heatmap/map-data", (req, res) => {
  res.json({
    data: [
      { id: "B1",  count: 29 }, { id: "B2",  count: 75 },
      { id: "B4",  count: 40 }, { id: "B6",  count: 120 },
      { id: "B7",  count: 22 }, { id: "B8",  count: 80 }, { id: "B9",  count: 12 },
      { id: "B10", count: 10 }, { id: "B11", count: 58 }, { id: "B12", count: 95 },
      { id: "B13", count: 15 }, { id: "B14", count: 50 }, { id: "B15", count: 88 },
      { id: "B16", count: 25 }, { id: "B17", count: 70 }, { id: "B18", count: 102 },
      { id: "B19", count: 20 }, { id: "B20", count: 60 },
      { id: "B22", count: 28 }, { id: "B23", count: 9 }, { id: "B24", count: 140 },
      { id: "B28", count: 35 }, { id: "B29", count: 77 }, { id: "B30", count: 99 },
      { id: "B31", count: 26 }, { id: "B32", count: 2 }, { id: "B33", count: 115 },
      { id: "B34", count: 45 },
    ]
  });
});

app.listen(3000, () => console.log("Minimal API at http://localhost:3000/heatmap/map-data"));
